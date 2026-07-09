import { AsyncLocalStorage } from 'node:async_hooks';

type WorkspaceStore = {
  workspaceId?: string;
};

const als = new AsyncLocalStorage<WorkspaceStore>();

export function runWithWorkspaceContext<T>(
  workspaceId: string | undefined,
  fn: () => T,
): T {
  return als.run({ workspaceId }, fn);
}

export function getWorkspaceIdFromContext(): string | undefined {
  return als.getStore()?.workspaceId;
}

