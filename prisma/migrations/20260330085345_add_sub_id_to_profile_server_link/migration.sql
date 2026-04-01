/*
  Warnings:

  - Added the required column `subId` to the `ProfileServerLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProfileServerLink" ADD COLUMN     "subId" TEXT NOT NULL;
