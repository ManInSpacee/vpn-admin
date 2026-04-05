/*
  Warnings:

  - A unique constraint covering the columns `[subscriptionToken]` on the table `VpnProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ProfileServerLink" DROP CONSTRAINT "ProfileServerLink_profileId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "VpnProfile_subscriptionToken_key" ON "VpnProfile"("subscriptionToken");

-- AddForeignKey
ALTER TABLE "ProfileServerLink" ADD CONSTRAINT "ProfileServerLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "VpnProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
