import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { recordQuery } from '../common/performance/query-perf';
import { getWorkspaceIdFromContext } from '../workspace/workspace-als';

const TENANT_MODELS = new Set([
  'Team',
  'WorkspaceMembership',
  'WorkspaceInvitation',
        'GlobalAnnouncement',
        'GlobalAnnouncementAttachment',
        'ScheduledReminder',
  'Evaluation',
  'Proposal',
  'SupervisorRequest',
  'SupervisorInvitation',
  'Notification',
  'Announcement',
  'Deliverable',
  'DeliverableTemplate',
  'DeliverableTemplateAttachment',
  'Phase',
  'Submission',
  'WorkStreamComment',
  'WorkStreamAttachment',
  'TeamIssue',
  'TeamIssueComment',
  'TeamIssueActivity',
  'ActivityLog',
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
        RubricCriterion: {
          template: { workspaceId },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenUniqueWhere(where: any): any {
  if (!where || typeof where !== 'object') {
    return where ?? {};
  }

  if (where.id !== undefined && Object.keys(where).length === 1) {
    return where;
  }

  const keys = Object.keys(where);
  if (keys.length === 1) {
    const key = keys[0];
    const value = where[key];
    if (
      key !== 'id' &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return value;
    }
  }

  return where;
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

  if (operation === 'findUnique') {
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
    if (TENANT_MODELS.has(model)) {
      if (nextArgs.data.workspaceId === undefined) {
        nextArgs.data.workspaceId = workspaceId;
      } else if (nextArgs.data.workspaceId !== workspaceId) {
        throw new Error('Cross-workspace write blocked');
      }
    }
    return nextArgs;
  }

  if (operation === 'createMany') {
    nextArgs.data = nextArgs.data ?? [];
    if (TENANT_MODELS.has(model)) {
      nextArgs.data = nextArgs.data.map((row: { workspaceId?: string }) => {
        if (row.workspaceId === undefined) {
          return { ...row, workspaceId };
        }
        if (row.workspaceId !== workspaceId) {
          throw new Error('Cross-workspace write blocked');
        }
        return row;
      });
    }
    return nextArgs;
  }

  return nextArgs;
}

function createWorkspaceIsolationExtension(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClient: () => any,
) {
  return {
    query: {
      $allModels: {
        // findUnique on tenant models would allow cross-tenant access by id.
        // Redirect to findFirst with workspace filter.
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

          const scopedArgs = applyWorkspaceScoping(
            model,
            'findUnique',
            {
              ...args,
              where: flattenUniqueWhere(args.where),
            },
            workspaceId!,
          );
          const delegate = modelDelegateName(model);
          return getClient()[delegate].findFirst(scopedArgs);
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
          if (operation === 'findUnique') {
            return query(args);
          }

          const workspaceId = getWorkspaceIdFromContext();
          if (!isScopedModel(model, workspaceId ?? '')) {
            return query(args);
          }

          // update/delete by id on direct tenant models need WhereUniqueInput.
          // Verify workspace ownership, then run with id-only where.
          if (
            workspaceId &&
            TENANT_MODELS.has(model) &&
            !relationScopeForModel(model, workspaceId) &&
            (operation === 'update' || operation === 'delete') &&
            args.where?.id
          ) {
            const delegate = modelDelegateName(model);
            const existing = await getClient()[delegate].findFirst({
              where: { id: args.where.id, workspaceId },
            });

            if (!existing) {
              return query({
                ...args,
                where: { id: '00000000-0000-0000-0000-000000000000' },
              });
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

    super(
      enableQueryPerf
        ? {
            log: [{ emit: 'event', level: 'query' }],
          }
        : undefined,
    );

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
