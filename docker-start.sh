#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting Next.js server..."
node server.js
