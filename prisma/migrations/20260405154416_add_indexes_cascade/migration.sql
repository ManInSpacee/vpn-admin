-- CreateIndex
CREATE INDEX "Server_active_idx" ON "Server"("active");

-- CreateIndex
CREATE INDEX "UserPlan_userId_active_idx" ON "UserPlan"("userId", "active");

-- CreateIndex
CREATE INDEX "VpnProfile_userId_idx" ON "VpnProfile"("userId");
