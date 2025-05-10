-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "relatedUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
