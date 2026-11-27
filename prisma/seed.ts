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

// Demo books carry no ISBN on purpose: Editions are a shared cache, and sparse seed rows
// must not shadow real catalogue lookups for those ISBNs.
const demoBooks = [
  { title: "The Fellowship of the Ring", authors: ["J.R.R. Tolkien"], year: 1954, shelf: 0 },
  { title: "Gamperaliya", authors: ["Martin Wickramasinghe"], year: 1944, shelf: 0 },
  { title: "Pride and Prejudice", authors: ["Jane Austen"], year: 1813, shelf: 1 },
];

async function seedDemoWorkspace() {
  const user = await prisma.user.upsert({
    where: { email: "demo@librarycraft.local" },
    create: { email: "demo@librarycraft.local", name: "Demo Reader" },
    update: {},
  });
  if (await prisma.workspace.findUnique({ where: { slug: "demo" } })) return console.info("Demo workspace exists");

  const workspace = await prisma.workspace.create({
    data: { name: "Demo Library", slug: "demo", ownerId: user.id, planId: "free", members: { create: { userId: user.id, role: "OWNER" } } },
  });
  const workspaceId = workspace.id;
  const room = await prisma.room.create({ data: { workspaceId, name: "Living room" } });
  const bookcase = await prisma.bookcase.create({ data: { workspaceId, roomId: room.id, name: "Tall white case" } });
  const shelves = await Promise.all(
    ["Shelf 1", "Shelf 2", "Shelf 3"].map((name, position) =>
      prisma.shelf.create({ data: { workspaceId, bookcaseId: bookcase.id, name, position } }),
    ),
  );
  for (const book of demoBooks) {
    const edition = await prisma.edition.create({
      data: {
        title: book.title,
        authors: book.authors,
        authorsText: book.authors.join(" ").toLowerCase(),
        year: book.year,
        source: "MANUAL",
      },
    });
    await prisma.copy.create({ data: { workspaceId, editionId: edition.id, shelfId: shelves[book.shelf].id } });
  }
  console.info("Seeded demo workspace /demo (sign in as demo@librarycraft.local)");
}

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: plan });
  }
  console.info(`Seeded ${plans.length} plans`);
  await seedDemoWorkspace();
}

main().finally(() => prisma.$disconnect());
