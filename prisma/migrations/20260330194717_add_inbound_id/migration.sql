/*
  Warnings:

  - The `inboundId` column on the `ProfileServerLink` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ProfileServerLink" DROP COLUMN "inboundId",
ADD COLUMN     "inboundId" INTEGER;
