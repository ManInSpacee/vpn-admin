/*
  Warnings:

  - You are about to drop the column `inboundId` on the `ProfileServerLink` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProfileServerLink" DROP COLUMN "inboundId";

-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "inboundId" INTEGER;
