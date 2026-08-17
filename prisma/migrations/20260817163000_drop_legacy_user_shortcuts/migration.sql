-- Test data is discarded. Role and department now live only on membership tables.
TRUNCATE TABLE "User", "Workspace" CASCADE;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_teamId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workspaceId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "teamId",
DROP COLUMN "workspaceId";
