import "server-only";
import { prisma } from "@/lib/db/client";

// Models that carry workspaceId. Add each new tenant model here in the phase that migrates it.
export const TENANT_MODELS = new Set<string>([
  "WorkspaceMember",
  "Subscription",
  "Room",
  "Bookcase",
  "Shelf",
  "Copy",
  "Tag",
  "CopyTag",
]);

const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

type Args = Record<string, unknown> & { where?: object; data?: unknown; create?: object };

export function scopeArgs(operation: string, args: Args, workspaceId: string): Args {
  const next: Args = { ...args };
  if (WHERE_OPS.has(operation)) {
    next.where = { ...args.where, workspaceId };
  } else if (operation === "create") {
    next.data = { ...(args.data as object), workspaceId };
  } else if (operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(args.data) ? args.data : [args.data];
    next.data = rows.map((row) => ({ ...(row as object), workspaceId }));
  } else if (operation === "upsert") {
    next.where = { ...args.where, workspaceId };
    next.create = { ...args.create, workspaceId };
  } else {
    throw new Error(`Tenant client does not support operation "${operation}"`);
  }
  // Callers must use scalar foreign keys (userId), not relation connects, so workspaceId can be forced.
  return next;
}

/**
 * Prisma client scoped to one workspace: every query on a tenant model is filtered by
 * workspaceId and every write sets it. Global models are not reachable through this client.
 */
export function getTenantDb(workspaceId: string) {
  return prisma.$extends({
    name: "tenant",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) {
            throw new Error(`${model} is not a tenant model; use the global client in lib/`);
          }
          return query(scopeArgs(operation, (args ?? {}) as Args, workspaceId) as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof getTenantDb>;
