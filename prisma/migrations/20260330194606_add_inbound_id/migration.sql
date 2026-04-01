/*
  Warnings:

  - Added the required column `inboundId` to the `ProfileServerLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProfileServerLink" ADD COLUMN     "inboundId" TEXT NOT NULL;
