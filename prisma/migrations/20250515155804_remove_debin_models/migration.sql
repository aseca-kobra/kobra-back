/*
  Warnings:

  - You are about to drop the `DebinRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DebinRequest" DROP CONSTRAINT "DebinRequest_userId_fkey";

-- DropTable
DROP TABLE "DebinRequest";

-- DropEnum
DROP TYPE "DebinStatus";
