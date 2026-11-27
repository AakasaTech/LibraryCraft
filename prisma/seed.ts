import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const proFeatures = ["bulkScan", "csv", "borrowerReminders", "coverScan"];

// Plans from docs/SPEC.md. null = unlimited. Stripe price IDs are filled in Phase 5.
export const plans = [
  { id: "free", name: "Free", maxCopies: 300, maxMembers: 2, monthlyCoverScans: 10, features: ["coverScan"] },
  { id: "pro", name: "Pro", maxCopies: null, maxMembers: 2, monthlyCoverScans: 100, features: proFeatures },
  { id: "family", name: "Family", maxCopies: null, maxMembers: 6, monthlyCoverScans: 100, features: proFeatures },
  {
    id: "organisation",
    name: "Organisation",
    maxCopies: null,
    maxMembers: null,
    monthlyCoverScans: 100,
    features: [...proFeatures, "orgTools"],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: plan });
  }
  console.info(`Seeded ${plans.length} plans`);
}

main().finally(() => prisma.$disconnect());
