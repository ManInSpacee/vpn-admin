/*
  Warnings:

  - Made the column `remoteId` on table `VpnProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "VpnProfile" ALTER COLUMN "remoteId" SET NOT NULL;
