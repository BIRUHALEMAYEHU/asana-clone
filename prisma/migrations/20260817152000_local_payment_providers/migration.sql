-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "providerCustomerId" TEXT,
ADD COLUMN     "providerReference" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL DEFAULT 'PLAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_workspaceId_status_idx" ON "Payment"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerReference_key" ON "Payment"("provider", "providerReference");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
