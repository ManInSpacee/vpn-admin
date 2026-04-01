#!/bin/sh
npx prisma migrate deploy
npx tsx prisma/seed.ts
node dist/server.js
