import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";
import { env } from "@/lib/env";

// Raw client: only for global models (User, Plan, ...) and lib/ internals. Tenant data goes through getTenantDb.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
