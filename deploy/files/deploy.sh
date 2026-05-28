#!/bin/bash
set -e

echo "=== Regi Deployment Started at $(date) ==="
cd /home/deploy/regi

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Building server..."
cd server
npm ci --production=false
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

echo "[3/5] Building client..."
cd client
npm ci
npm run build
cd ..

echo "[4/5] Deploying client files..."
sudo cp -r client/dist/* /var/www/regi/

echo "[5/5] Restarting server..."
pm2 restart regi-server

echo "=== Deployment Complete at $(date) ==="
pm2 status
