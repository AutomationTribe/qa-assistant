# Regi — AI QA Assistant

## Quick start

# 1. Start dependencies
docker-compose up -d

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Set up environment
cp .env.example .env
# Fill in your values in .env

# 4. Run DB migrations (review SQL before confirming)
cd server && npx prisma migrate dev

# 5. Start backend
cd server && npm run dev

# 6. Start frontend
cd client && npm run dev

Server: http://localhost:3001
Client: http://localhost:5173
