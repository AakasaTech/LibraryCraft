-- CreateEnum
CREATE TYPE "EditionSource" AS ENUM ('OPENLIBRARY', 'GOOGLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReadStatus" AS ENUM ('UNREAD', 'READING', 'READ');

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "authors" TEXT[],
    "authorsText" TEXT NOT NULL DEFAULT '',
    "publisher" TEXT,
    "year" INTEGER,
    "language" TEXT,
    "pages" INTEGER,
    "coverUrl" TEXT,
    "source" "EditionSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookcase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Bookcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "bookcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Copy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "shelfId" TEXT,
    "condition" TEXT,
    "readStatus" "ReadStatus" NOT NULL DEFAULT 'UNREAD',
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Copy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyTag" (
    "workspaceId" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CopyTag_pkey" PRIMARY KEY ("copyId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Edition_isbn10_key" ON "Edition"("isbn10");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_isbn13_key" ON "Edition"("isbn13");

-- CreateIndex
CREATE INDEX "Edition_title_idx" ON "Edition"("title");

-- CreateIndex
CREATE INDEX "Room_workspaceId_idx" ON "Room"("workspaceId");

-- CreateIndex
CREATE INDEX "Bookcase_workspaceId_idx" ON "Bookcase"("workspaceId");

-- CreateIndex
CREATE INDEX "Shelf_workspaceId_idx" ON "Shelf"("workspaceId");

-- CreateIndex
CREATE INDEX "Copy_workspaceId_idx" ON "Copy"("workspaceId");

-- CreateIndex
CREATE INDEX "Copy_workspaceId_editionId_idx" ON "Copy"("workspaceId", "editionId");

-- CreateIndex
CREATE INDEX "Copy_shelfId_idx" ON "Copy"("shelfId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "CopyTag_workspaceId_idx" ON "CopyTag"("workspaceId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookcase" ADD CONSTRAINT "Bookcase_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_bookcaseId_fkey" FOREIGN KEY ("bookcaseId") REFERENCES "Bookcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTag" ADD CONSTRAINT "CopyTag_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "Copy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTag" ADD CONSTRAINT "CopyTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
