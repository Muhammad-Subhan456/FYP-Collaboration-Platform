import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { recordQuery } from '../common/performance/query-perf';
import { getWorkspaceIdFromContext } from '../workspace/workspace-als';

/** Models that store `workspaceId` directly on the row. */
const TENANT_MODELS = new Set([
  'Team',
  'WorkspaceMembership',
  'WorkspaceInvitation',
  'GlobalAnnouncement',
  'ScheduledReminder',
  'Evaluation',
  'Proposal',
  'SupervisorRequest',
  'SupervisorInvitation',
  'Notification',
  'Announcement',
  'Deliverable',
  'DeliverableTemplate',
  'Phase',
  'Submission',
  'SubmissionAttachment',
  'WorkStreamComment',
  'WorkStreamAttachment',
  'TeamIssue',
  'TeamIssueComment',
  'TeamIssueActivity',
  'ActivityLog',
  'SubmissionEvaluation',
  'StudentPhaseResult',
]);

function relationScopeForModel(
  model: string,
  workspaceId: string,
): object | undefined {
  const RELATION_SCOPED_MODELS: Record<string, object> = {
    TeamMember: { team: { workspaceId } },
    JoinRequest: { team: { workspaceId } },
    EvaluationPanel: { evaluation: { workspaceId } },
    EvaluationAssignment: { evaluation: { workspaceId } },
    EvaluationResult: { evaluation: { workspaceId } },
    PanelEvaluator: { panel: { evaluation: { workspaceId } } },
    GlobalAnnouncementAttachment: {
      announcement: { workspaceId },
    },
    DeliverableTemplateAttachment: {
      template: { workspaceId },
    },
    DeliverableDeadlineExtension: {
      deliverable: { workspaceId },
    },
    RubricCriterion: {
      template: { workspaceId },
    },
    StudentSubmissionEvaluation: {
      submissionEvaluation: { workspaceId },
    },
    SubmissionCriterionScore: {
      studentSubmissionEvaluation: {
        submissionEvaluation: { workspaceId },
      },
    },
  };
  return RELATION_SCOPED_MODELS[model];
}

function isScopedModel(model: string | undefined, workspaceId: string) {
  if (!model || !workspaceId) {
    return false;
  }
  return TENANT_MODELS.has(model) || !!relationScopeForModel(model, workspaceId);
}

function modelDelegateName(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Cap Prisma's client pool so Nest does not open more sessions than
 * Supabase Session mode allows (often pool_size ≈ 15).
 * Override with DB_CONNECTION_LIMIT (default 5).
 */
function withPrismaPoolParams(databaseUrl: string): string {
  if (/[?&]connection_limit=/i.test(databaseUrl)) {
    return databaseUrl;
  }

  const limit = process.env.DB_CONNECTION_LIMIT?.trim() || '5';
  const timeout = process.env.DB_POOL_TIMEOUT?.trim() || '20';
  const separator = databaseUrl.includes('?') ? '&' : '?';
  return `${databaseUrl}${separator}connection_limit=${limit}&pool_timeout=${timeout}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureWhereWorkspace(args: any, model: string, workspaceId: string) {
  const relationScope = relationScopeForModel(model, workspaceId);
  args.where = args.where ?? {};
  if (relationScope) {
    args.where = { AND: [args.where, relationScope] };
    return;
  }
  if (args.where.workspaceId === undefined) {
    args.where = { AND: [args.where, { workspaceId }] };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyWorkspaceScoping(
  model: string,
  operation: string,
  args: any,
  workspaceId: string,
): any {
  const nextArgs = { ...args };

  if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
    ensureWhereWorkspace(nextArgs, model, workspaceId);
    return nextArgs;
  }

  if (
    operation === 'findFirst' ||
    operation === 'findMany' ||
    operation === 'count' ||
    operation === 'aggregate' ||
    operation === 'groupBy' ||
    operation === 'updateMany' ||
    operation === 'deleteMany'
  ) {
    ensureWhereWorkspace(nextArgs, model, workspaceId);
    return nextArgs;
  }

  // update/delete/upsert require WhereUniqueInput — handled in the extension.
  if (
    operation === 'update' ||
    operation === 'delete' ||
    operation === 'upsert'
  ) {
    return nextArgs;
  }

  if (operation === 'create') {
    nextArgs.data = nextArgs.data ?? {};
    // Only direct tenant models have workspaceId on the row itself.
    if (
      TENANT_MODELS.has(model) &&
      !relationScopeForModel(model, workspaceId)
    ) {
      if (nextArgs.data.workspaceId === undefined) {
        nextArgs.data.workspaceId = workspaceId;
      } else if (nextArgs.data.workspaceId !== workspaceId) {
        throw new ForbiddenException(
          'You cannot modify data outside your workspace',
        );
      }
    }
    return nextArgs;
  }

  if (operation === 'createMany') {
    nextArgs.data = nextArgs.data ?? [];
    if (
      TENANT_MODELS.has(model) &&
      !relationScopeForModel(model, workspaceId)
    ) {
      nextArgs.data = nextArgs.data.map((row: { workspaceId?: string }) => {
        if (row.workspaceId === undefined) {
          return { ...row, workspaceId };
        }
        if (row.workspaceId !== workspaceId) {
          throw new ForbiddenException(
          'You cannot modify data outside your workspace',
        );
        }
        return row;
      });
    }
    return nextArgs;
  }

  return nextArgs;
}

/**
 * Verify a row belongs to the current workspace before update/delete by id.
 * Returns false when the row is missing or cross-tenant.
 */
async function assertOwnedForMutation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient: () => any,
  model: string,
  id: string,
  workspaceId: string,
): Promise<boolean> {
  const delegate = modelDelegateName(model);
  const relationScope = relationScopeForModel(model, workspaceId);
  // Match findUnique scoping: filter by id and let the extension attach
  // workspace (or relation) scope.
  const where = relationScope ? { id, ...relationScope } : { id };

  const existing = await getClient()[delegate].findFirst({ where });
  return !!existing;
}

/** Post-filter a findUnique row for the active workspace (transaction-safe). */
async function rowVisibleInWorkspace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient: () => any,
  model: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  workspaceId: string,
): Promise<boolean> {
  if (!row || typeof row !== 'object') {
    return false;
  }

  // Direct tenant models carry workspaceId on the row.
  if (TENANT_MODELS.has(model) && !relationScopeForModel(model, workspaceId)) {
    if (typeof row.workspaceId === 'string') {
      return row.workspaceId === workspaceId;
    }
    // Partial `select` often omits workspaceId. Fall back to an ownership
    // probe by primary key so tenant checks stay correct.
    if (typeof row.id === 'string') {
      return assertOwnedForMutation(getClient, model, row.id, workspaceId);
    }
    // No workspaceId and no id in the payload — cannot prove tenancy.
    return false;
  }

  // Relation-scoped models: verify via a scoped findFirst by id.
  if (typeof row.id === 'string') {
    return assertOwnedForMutation(getClient, model, row.id, workspaceId);
  }

  return false;
}

/**
 * Ensure findUnique selects that use a custom `select` still return enough
 * fields for workspace post-filtering (workspaceId and/or id).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureFindUniqueSelectForTenant(model: string, args: any): any {
  if (!args?.select || typeof args.select !== 'object') {
    return args;
  }

  const isRelationScoped = !!relationScopeForModel(model, 'x');
  const isDirectTenant = TENANT_MODELS.has(model) && !isRelationScoped;

  if (!isDirectTenant && !isRelationScoped) {
    return args;
  }

  const nextSelect = { ...args.select };
  if (nextSelect.id === undefined) {
    nextSelect.id = true;
  }
  if (isDirectTenant && nextSelect.workspaceId === undefined) {
    nextSelect.workspaceId = true;
  }
  return { ...args, select: nextSelect };
}

function createWorkspaceIsolationExtension(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient: () => any,
) {
  return {
    query: {
      $allModels: {
        // findUnique on tenant models would allow cross-tenant access by id.
        // Use the same query/transaction client, then post-filter by workspace.
        // (Calling getClient().findFirst escapes interactive transactions and
        // causes P2025 on create-then-reload flows.)
        async findUnique({
          model,
          args,
          query,
        }: {
          model: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (a: any) => Promise<unknown>;
        }) {
          const workspaceId = getWorkspaceIdFromContext();
          if (!isScopedModel(model, workspaceId ?? '')) {
            return query(args);
          }

          const scopedArgs = ensureFindUniqueSelectForTenant(model, args);
          const result = await query(scopedArgs);
          if (!result) {
            return null;
          }

          const owned = await rowVisibleInWorkspace(
            getClient,
            model,
            result,
            workspaceId!,
          );
          return owned ? result : null;
        },

        async findUniqueOrThrow({
          model,
          args,
          query,
        }: {
          model: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (a: any) => Promise<unknown>;
        }) {
          const workspaceId = getWorkspaceIdFromContext();
          if (!isScopedModel(model, workspaceId ?? '')) {
            return query(args);
          }

          const scopedArgs = ensureFindUniqueSelectForTenant(model, args);
          const result = await query(scopedArgs);
          const owned = await rowVisibleInWorkspace(
            getClient,
            model,
            result,
            workspaceId!,
          );
          if (!owned) {
            throw new NotFoundException('Resource not found');
          }
          return result;
        },

        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (a: any) => Promise<unknown>;
        }) {
          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow'
          ) {
            return query(args);
          }

          const workspaceId = getWorkspaceIdFromContext();
          if (!isScopedModel(model, workspaceId ?? '')) {
            return query(args);
          }

          // update/delete by id need WhereUniqueInput.
          // Verify workspace ownership (direct or via relation), then mutate by id.
          if (
            workspaceId &&
            (operation === 'update' || operation === 'delete') &&
            args.where?.id &&
            Object.keys(args.where).length === 1
          ) {
            const owned = await assertOwnedForMutation(
              getClient,
              model,
              args.where.id,
              workspaceId,
            );

            // Do not probe a fake UUID (that surfaces as Prisma P2025).
            // Missing / cross-tenant rows are a clean 404.
            if (!owned) {
              throw new NotFoundException('Resource not found');
            }

            return query({ ...args, where: { id: args.where.id } });
          }

          const scopedArgs = applyWorkspaceScoping(
            model,
            operation,
            args,
            workspaceId!,
          );
          return query(scopedArgs);
        },
      },
    },
  };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const enableQueryPerf =
      process.env.PERF_LOG === 'true' ||
      process.env.npm_lifecycle_event === 'benchmark';

    const databaseUrl = process.env.DATABASE_URL
      ? withPrismaPoolParams(process.env.DATABASE_URL)
      : undefined;

    super({
      ...(databaseUrl
        ? {
            datasources: {
              db: { url: databaseUrl },
            },
          }
        : {}),
      ...(enableQueryPerf
        ? {
            log: [{ emit: 'event' as const, level: 'query' as const }],
          }
        : {}),
    });

    // Prisma 6 removed $use middleware — tenant isolation uses $extends.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const base = this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extended: any;
    extended = base.$extends(
      createWorkspaceIsolationExtension(() => extended),
    );

    return extended as PrismaService;
  }

  async onModuleInit() {
    const enableQueryPerf =
      process.env.PERF_LOG === 'true' ||
      process.env.npm_lifecycle_event === 'benchmark';

    if (enableQueryPerf) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (event: any) => {
        const query = String(event.query ?? '');
        const modelMatch = query.match(/FROM "public"\."(\w+)"/);
        const model = modelMatch?.[1] ?? 'unknown';
        const operation =
          query.trim().split(/\s+/)[0]?.toUpperCase() ?? 'QUERY';

        recordQuery({
          model,
          operation,
          durationMs: Number(event.duration ?? 0),
          query,
        });
      });
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
