#!/bin/sh
set -e
echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy
echo "Starting Next.js server..."
node server.js
