/*
  Warnings:

  - Made the column `name` on table `VpnProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "VpnProfile" ALTER COLUMN "name" SET NOT NULL;
