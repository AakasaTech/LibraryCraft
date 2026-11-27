import "dotenv/config";
import { execSync } from "node:child_process";

export const testDatabaseUrl = process.env.DATABASE_URL_TEST;

/** Brings the test database up to date and seeds plans. Non-destructive: tests use unique random data,
 * so rows left over from earlier runs are harmless. Shared by Vitest and Playwright. */
export function prepareTestDatabase() {
  if (!testDatabaseUrl) throw new Error("DATABASE_URL_TEST is not set (see .env.example)");
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl };
  execSync("pnpm prisma migrate deploy", { env, stdio: "inherit" });
  execSync("pnpm prisma db seed", { env, stdio: "inherit" });
}
