# Remaining Deployment Steps

## Server details
- IP: YOUR_SERVER_IP
- User: deploy
- App path: /home/deploy/regi/qa-assistant

## What is already done
- Node, PM2, Nginx, Docker, Certbot installed
- MySQL and Redis running in Docker
- Client built and copied to /var/www/regi
- server/.env file exists with all values filled in
- tsc-alias installed

## What needs to be fixed and completed

### Problem 1 — Server build path alias not resolving
The build compiles but @/ path aliases are not being rewritten.
Fix: ensure tsc-alias runs after tsc and rewrites all @/ imports in dist/

### Problem 2 — PM2 not starting
Server crashes with Cannot find module '@/lib/logger'
Fix: rebuild with tsc-alias then start PM2 from dist/index.js

### Remaining steps to complete in order:

1. Fix the server build so tsc-alias rewrites all @/ aliases in dist/
2. Verify dist/index.js contains relative paths not @/ paths after build
3. Run npx prisma migrate deploy from server directory
4. Start PM2: pm2 start dist/index.js --name regi-server
5. Run pm2 save and pm2 startup
6. Copy regi.nginx.conf to /etc/nginx/sites-available/regi
7. Enable nginx site and reload nginx
8. Run certbot for SSL on regi.intellotechnologies.com
9. Enable UFW firewall
10. Test https://regi.intellotechnologies.com/api/health returns ok

## Nginx config location
/home/deploy/regi.nginx.conf already uploaded

## Test after each step
After PM2 starts: curl http://localhost:3001/health
After Nginx: curl http://regi.intellotechnologies.com/api/health
After SSL: curl https://regi.intellotechnologies.com/api/health