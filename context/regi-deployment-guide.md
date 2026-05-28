# Regi — Complete Beginner Deployment Guide
## Host regi.intellotechnologies.com on DigitalOcean

---

## What you will end up with

By the end of this guide:
- Your app is live at https://regi.intellotechnologies.com
- Every time you push code to GitHub, it automatically deploys
- You pay $12/month billed monthly — no annual contract
- First two months are FREE (DigitalOcean gives you $200 credit)

How it all connects:

```
You push code to GitHub
         ↓
GitHub Actions runs automatically (free)
         ↓
Builds your app, then SSHes into your server
         ↓
regi.intellotechnologies.com updates in ~3 minutes
```

---

## What you need before starting

1. Your Regi code is in a GitHub repository
2. Access to your Namecheap account
3. A credit card (for DigitalOcean account — not charged for 60 days)
4. Terminal app on your laptop:
   - Mac: press Cmd+Space, type Terminal, press Enter
   - Windows: download Git Bash from https://git-scm.com/downloads
     Install it, then open Git Bash
5. About 2 hours of uninterrupted time

---

## PART 1 — Create your server on DigitalOcean

DigitalOcean calls their servers "Droplets".
You need a Droplet to run Regi.

---

### Step 1 — Create a DigitalOcean account

1. Go to https://digitalocean.com
2. Click "Sign Up"
3. Sign up with your email or Google account
4. Verify your email address
5. Add a payment method

   When adding your card, DigitalOcean charges a
   temporary $1 to verify the card. It is immediately
   refunded. You will NOT be charged for 60 days
   because of the $200 free credit.

6. You will see "$200 credit" appear in your account
   This covers about 16 months of the $12/month plan
   but the credit expires after 60 days so it covers
   your first two months completely free

---

### Step 2 — Create an SSH key

An SSH key is how your laptop connects to your server
securely without needing a password.

Think of it like a physical key. You keep the private key
(your copy) and give the public key to DigitalOcean
(the lock). Only your laptop can open that lock.

Open your Terminal or Git Bash and run this command:

```
ssh-keygen -t ed25519 -C "regi-deploy"
```

You will see these prompts — just press Enter for each one:

```
Enter file in which to save the key: [press Enter]
Enter passphrase: [press Enter]
Enter same passphrase again: [press Enter]
```

Now run this to see your public key:

```
cat ~/.ssh/id_ed25519.pub
```

You will see one long line starting with ssh-ed25519
Copy that entire line. You will need it in the next step.

---

### Step 3 — Add your SSH key to DigitalOcean

1. In DigitalOcean, click Settings in the left sidebar
2. Click Security
3. Click Add SSH Key
4. Paste the line you copied in Step 2
5. Give it a name like "My Laptop"
6. Click Add SSH Key

---

### Step 4 — Create your Droplet (server)

1. Click the green Create button (top right)
2. Click Droplets
3. Choose Region: pick the one closest to your users
   - For West Africa: London or Amsterdam (closest)
   - For Europe: Frankfurt or Amsterdam
   - For US: New York
4. Choose an image: click Ubuntu, select 24.04 LTS
5. Choose Size: click Basic, then scroll to find:
   - Regular: 2 GB RAM / 1 vCPU / 50 GB SSD
   - This costs $12/month
   - Do NOT pick the 1 GB option — Regi needs 2 GB
6. Under Authentication: select SSH Key
   You should see "My Laptop" from Step 3 — tick it
7. Hostname: type "regi-server"
8. Click Create Droplet

Wait about 30 seconds. Your server is being created.

---

### Step 5 — Get your server's IP address

Once created, you will see your Droplet listed.
Look for the IP address — it looks like: 178.62.100.50

This is YOUR_SERVER_IP. Write it down.
You will use it many times in this guide.

---

## PART 2 — Point your domain to the server

---

### Step 6 — Add a DNS record in Namecheap

This tells the internet that regi.intellotechnologies.com
should go to your new server.

1. Log into Namecheap
2. Click Domain List on the left
3. Find intellotechnologies.com, click Manage
4. Click the Advanced DNS tab
5. Click Add New Record
6. Fill in the fields:
   - Type: A Record
   - Host: regi
   - Value: YOUR_SERVER_IP (e.g. 178.62.100.50)
   - TTL: Automatic
7. Click the green Save button

DNS takes 10 to 30 minutes to work.
Check it worked by running this on your laptop:

```
ping regi.intellotechnologies.com
```

When the response shows your server IP, DNS is working.
Do not continue to Part 3 until this works.

---

## PART 3 — Set up the server

You are now going to connect to your server and
install everything Regi needs to run.

---

### Step 7 — Connect to your server

In your terminal, run:

```
ssh root@YOUR_SERVER_IP
```

The very first time, you will see:
```
The authenticity of host can't be established.
Are you sure you want to continue? (yes/no)
```

Type yes and press Enter.

You are now inside your server. The prompt looks like:
```
root@regi-server:~#
```

Everything after this point, until told otherwise,
is typed inside this server terminal.

---

### Step 8 — Create a safe user account

Running as "root" (the all-powerful admin user) is
dangerous — one wrong command can break everything.
We create a separate user called "deploy" for our work.

Run these commands one at a time.
Wait for each to finish before running the next.

```
adduser deploy
```

Type a password when asked, press Enter through the
remaining prompts (they are all optional).

```
usermod -aG sudo deploy
```

```
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

```
mkdir -p /home/deploy/logs
```

Test the new user works. Open a SECOND terminal on your
laptop (do not close the first one) and run:

```
ssh deploy@YOUR_SERVER_IP
```

If it connects without asking for a password, it worked.
Type exit to close it and go back to your first terminal.

---

### Step 9 — Install Node.js

Node.js is what runs your Regi server code.

Run these two commands:

```
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
```

```
apt install -y nodejs
```

Verify it installed correctly:

```
node --version
```

You should see something like: v20.18.0

---

### Step 10 — Install PM2

PM2 is a process manager. It keeps your Node.js server
running 24/7 and automatically restarts it if it crashes.

```
npm install -g pm2
```

---

### Step 11 — Install Nginx

Nginx is the web server. It receives traffic from the
internet and routes it — sending frontend requests to
your React app files and API requests to your Node server.

```
apt install -y nginx
```

Verify it is running:

```
systemctl status nginx
```

You should see "active (running)" in green text.
Press Q to exit this view.

---

### Step 12 — Install Docker

Docker runs your MySQL database and Redis cache in
isolated containers. This is the easiest way to
manage them on a server.

```
apt install -y docker.io docker-compose
```

```
usermod -aG docker deploy
```

Verify:

```
docker --version
```

---

### Step 13 — Install Certbot

Certbot gives you a free HTTPS certificate (the green
padlock) from Let's Encrypt.

```
apt install -y certbot python3-certbot-nginx
```

---

### Step 14 — Install Git

```
apt install -y git
```

---

## PART 4 — Start the database and cache

---

### Step 15 — Switch to the deploy user

```
su - deploy
```

Your prompt changes to:
```
deploy@regi-server:~$
```

---

### Step 16 — Upload the Docker configuration file

You downloaded docker-compose.prod.yml earlier.
Upload it from your LAPTOP to the server.

Open a NEW terminal on your laptop and run:

```
ssh deploy@YOUR_SERVER_IP "mkdir -p /home/deploy/regi"
```

Then upload the file:

```
scp ~/Downloads/docker-compose.prod.yml deploy@YOUR_SERVER_IP:/home/deploy/regi/
```

Change ~/Downloads/ to wherever you saved the file.
For example if it is on your Desktop:

```
scp ~/Desktop/docker-compose.prod.yml deploy@YOUR_SERVER_IP:/home/deploy/regi/
```

---

### Step 17 — Create database passwords

Back in your server terminal (where it shows deploy@...):

```
nano /home/deploy/regi/.env.docker
```

This opens a text editor inside the terminal.
Type these three lines, replacing the words in capitals
with passwords you choose:

```
MYSQL_ROOT_PASSWORD=CHOOSE_A_STRONG_ROOT_PASSWORD
MYSQL_PASSWORD=CHOOSE_A_STRONG_DB_PASSWORD
REDIS_PASSWORD=CHOOSE_A_STRONG_REDIS_PASSWORD
```

Example (use different passwords):
```
MYSQL_ROOT_PASSWORD=Tr7#mPx9$kQ2nR
MYSQL_PASSWORD=Bv5&wZj8!dL3sN
REDIS_PASSWORD=Hn6@qXm4%cK1eP
```

Write these passwords down somewhere safe.
You will need the DB and Redis passwords in Step 20.

To save in nano:
- Hold Ctrl and press X
- Press Y
- Press Enter

---

### Step 18 — Start MySQL and Redis

```
cd /home/deploy/regi
docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

This downloads and starts MySQL and Redis.
It takes about 1 minute the first time.

Verify both are running:

```
docker ps
```

You should see two rows — one for mysql, one for redis —
both showing "Up" in the STATUS column.

If you see them both, the database is running.

---

## PART 5 — Deploy Regi

---

### Step 19 — Clone your code onto the server

Still in the server terminal (as deploy):

```
cd /home/deploy
git clone https://github.com/YOUR_GITHUB_USERNAME/regi.git
cd regi
```

Replace YOUR_GITHUB_USERNAME with your actual GitHub username.

If your repository is private, GitHub will ask for
a username and password. For the password, you need
a GitHub Personal Access Token (not your GitHub password).

Get one here:
1. Go to github.com
2. Click your profile picture (top right)
3. Click Settings
4. Scroll down, click Developer settings
5. Click Personal access tokens → Tokens (classic)
6. Click Generate new token (classic)
7. Give it a name, tick the "repo" checkbox
8. Click Generate token
9. Copy the token — use it as the password when git asks

---

### Step 20 — Upload and fill in the environment file

You downloaded server.env.production earlier.
Before uploading, edit it on your LAPTOP to fill in values.

Open the file in any text editor (TextEdit on Mac,
Notepad on Windows) and update these lines:

**Line 1 — database password:**
```
DATABASE_URL=mysql://regi:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/regi_prod
```
Replace YOUR_MYSQL_PASSWORD with the MYSQL_PASSWORD
you set in Step 17.

**Line 2 — Redis password:**
```
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@127.0.0.1:6379
```
Replace YOUR_REDIS_PASSWORD with the REDIS_PASSWORD
you set in Step 17.

**Lines 3 and 4 — generate secret keys:**
These need to be long random strings. Generate them
by running this in your laptop terminal:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice — you get two different outputs.
Paste the first as JWT_SECRET and second as JWT_REFRESH_SECRET.

**Line 5 — encryption key:**
```
ENCRYPTION_KEY=exactly_32_characters_goes_here_
```
This MUST be exactly 32 characters. Count them.
You can use any 32 characters you like.

**Line 6 — OpenAI key:**
```
OPENAI_API_KEY=sk-your-actual-openai-key-here
```
Paste your real OpenAI API key.

Save the file. Now upload it to the server.

On your LAPTOP terminal:

```
scp ~/Downloads/server.env.production deploy@YOUR_SERVER_IP:/home/deploy/regi/server/.env
```

---

### Step 21 — Create the client environment file

On the SERVER terminal:

```
echo "VITE_API_URL=https://regi.intellotechnologies.com" > /home/deploy/regi/client/.env.production
```

---

### Step 22 — Upload the remaining deployment files

On your LAPTOP terminal, upload three more files:

```
scp ~/Downloads/deploy.sh deploy@YOUR_SERVER_IP:/home/deploy/regi/

scp ~/Downloads/ecosystem.config.js deploy@YOUR_SERVER_IP:/home/deploy/regi/
```

Back on the SERVER, make the deploy script executable:

```
chmod +x /home/deploy/regi/deploy.sh
```

---

### Step 23 — Build the server for the first time

On the SERVER:

```
cd /home/deploy/regi/server
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

The migrate deploy command creates all your database
tables. You should see:
"All migrations have been applied."

---

### Step 24 — Build the client for the first time

```
cd /home/deploy/regi/client
npm ci
npm run build
```

When finished, copy the built files to the web folder:

```
sudo mkdir -p /var/www/regi
sudo cp -r /home/deploy/regi/client/dist/* /var/www/regi/
sudo chown -R www-data:www-data /var/www/regi
```

---

### Step 25 — Start the server with PM2

```
cd /home/deploy/regi
pm2 start ecosystem.config.js
pm2 save
```

Set PM2 to start automatically if the server reboots:

```
pm2 startup
```

This prints a long command starting with "sudo env PATH=..."
Copy that entire command, paste it and press Enter.

Check the server is running:

```
pm2 status
```

Look for "regi-server" with online in green text.

Test the server responds:

```
curl http://localhost:3001/health
```

You should see: {"status":"ok"}
If you see this, your Node server is working.

---

## PART 6 — Configure Nginx and get HTTPS

---

### Step 26 — Allow file copying without password

This is needed for automated deployments later.

```
sudo visudo
```

This opens a special editor. Press the down arrow key
to go to the very last line of the file.

Add this exact line at the bottom:

```
deploy ALL=(ALL) NOPASSWD: /bin/cp -r /home/deploy/regi/client/dist/* /var/www/regi/
```

Save with Ctrl+X, then Y, then Enter.

---

### Step 27 — Set up Nginx

Upload the nginx config file from your LAPTOP:

```
scp ~/Downloads/regi.nginx.conf deploy@YOUR_SERVER_IP:/home/deploy/regi.nginx.conf
```

Back on the SERVER:

```
sudo cp /home/deploy/regi.nginx.conf /etc/nginx/sites-available/regi
sudo ln -s /etc/nginx/sites-available/regi /etc/nginx/sites-enabled/regi
```

Test the Nginx configuration is valid:

```
sudo nginx -t
```

You should see:
"nginx: configuration file test is successful"

If you see that, reload Nginx:

```
sudo systemctl reload nginx
```

Test it is working over HTTP (before adding HTTPS):

```
curl http://regi.intellotechnologies.com/api/health
```

You should see: {"status":"ok"}
If you see that, Nginx is routing traffic correctly.

---

### Step 28 — Get the free HTTPS certificate

First confirm your domain is pointing to the server:

```
ping regi.intellotechnologies.com
```

The IP shown must match YOUR_SERVER_IP.
If it does not, wait a bit longer for DNS to update.

When DNS is working, run:

```
sudo certbot --nginx -d regi.intellotechnologies.com
```

Answer the prompts:
- Enter your email address and press Enter
- Type A and press Enter (agree to terms)
- Type N and press Enter (do not share email)

Certbot automatically updates Nginx and sets up HTTPS.
You should see: "Successfully received certificate."

Test HTTPS works:

```
curl https://regi.intellotechnologies.com/api/health
```

Should return: {"status":"ok"}

Now open https://regi.intellotechnologies.com in your
browser. You should see Regi with a green padlock!

---

## PART 7 — Set up the firewall

---

### Step 29 — Enable the firewall

This blocks all ports except the ones Regi needs.

```
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

When asked "Proceed with operation?" type y and Enter.

Verify:

```
sudo ufw status
```

You should see OpenSSH and Nginx Full listed as ALLOW.

---

## PART 8 — Automate deployments with GitHub Actions

From this point forward, every push to your main branch
on GitHub will automatically deploy to your server.

---

### Step 30 — Add secrets to GitHub

GitHub needs to know your server's IP and how to connect.
These are stored as "secrets" — they are never visible
in logs or to anyone who views your repository.

1. Go to github.com and open your Regi repository
2. Click Settings (in the top menu of the repo)
3. In the left sidebar, click Secrets and variables
4. Click Actions
5. Click New repository secret

Add these four secrets one at a time:

**Secret 1:**
Name: VPS_HOST
Value: your server IP address (e.g. 178.62.100.50)
Click Add secret

**Secret 2:**
Name: VPS_USER
Value: deploy
Click Add secret

**Secret 3:**
Name: VPS_PORT
Value: 22
Click Add secret

**Secret 4 — your SSH private key:**

On your LAPTOP terminal run:

```
cat ~/.ssh/id_ed25519
```

Copy everything it shows including the dashes:
```
-----BEGIN OPENSSH PRIVATE KEY-----
lots of letters and numbers here
-----END OPENSSH PRIVATE KEY-----
```

Back on GitHub:
Name: VPS_SSH_KEY
Value: paste the entire key including the -----BEGIN and -----END lines
Click Add secret

---

### Step 31 — Add the GitHub Actions workflow to your repo

On your LAPTOP, go into your Regi project folder and
create the required folders:

Mac/Linux:
```
mkdir -p .github/workflows
```

Windows (Git Bash):
```
mkdir -p .github/workflows
```

Now create the file .github/workflows/deploy.yml
and paste exactly this content into it:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy Regi
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            server/package-lock.json
            client/package-lock.json

      - name: Verify client build
        run: |
          cd client
          npm ci
          npm run build
        env:
          VITE_API_URL: https://regi.intellotechnologies.com

      - name: Verify server build
        run: |
          cd server
          npm ci
          npm run build

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            cd /home/deploy/regi
            bash deploy.sh

      - name: Done
        if: success()
        run: echo "Deployed to regi.intellotechnologies.com"
```

Save the file.

---

### Step 32 — Push and watch it deploy

Add the file to git, commit, and push:

```
git add .github/workflows/deploy.yml
git commit -m "Add production deployment"
git push origin main
```

Now go to your GitHub repository in your browser,
click the Actions tab.

You will see a workflow called "Deploy to Production"
running. Click on it to see the live logs.

The first automated deployment takes about 5 minutes.
All steps should show green checkmarks when done.

Open https://regi.intellotechnologies.com to confirm
everything is working.

---

## You are done

Your setup now works like this every time:

```
git push origin main
         ↓
GitHub Actions (free, automatic, ~3 minutes):
  1. Checks out your code
  2. Builds the React app
  3. Builds the Node server
  4. If anything fails to build — stops here, does not deploy
  5. SSHes into your DigitalOcean server
  6. Pulls the latest code
  7. Installs dependencies
  8. Runs database migrations
  9. Rebuilds server and client
 10. Copies new files to the web folder
 11. Restarts the Node server
         ↓
https://regi.intellotechnologies.com is updated
```

---

## Quick reference — useful commands

Connect to your server:
```
ssh deploy@YOUR_SERVER_IP
```

View live server logs:
```
pm2 logs regi-server
```

Check server is running:
```
pm2 status
```

Restart server manually:
```
pm2 restart regi-server
```

Check Docker containers are running:
```
docker ps
```

View web server error logs:
```
sudo tail -f /var/log/nginx/error.log
```

Back up the database:
```
docker exec regi_mysql_1 mysqldump -u regi -pYOUR_DB_PASSWORD regi_prod > backup_$(date +%Y%m%d).sql
```

If a deployment breaks the site — roll back:
```
cd /home/deploy/regi
git log --oneline -5
git checkout THE_PREVIOUS_COMMIT_HASH
bash deploy.sh
```

---

## Costs

| Item | Cost |
|---|---|
| DigitalOcean Droplet (2GB) | $12/month |
| SSL Certificate | Free (Let's Encrypt) |
| GitHub Actions | Free |
| First 2 months | Free ($200 credit) |

No annual contract. Cancel any time.
Delete the Droplet and you stop being charged immediately.
