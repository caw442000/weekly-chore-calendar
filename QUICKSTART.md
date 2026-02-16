# Quick Start Guide

## First Time Setup

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Set up backend environment:**
```bash
cd backend
cp .env.example .env
# Edit .env and set JWT_SECRET to a random string
```

3. **Set up frontend environment:**
```bash
# Create .env.local in root directory
echo "VITE_API_URL=http://localhost:3001/api" > .env.local
```

## Running Locally

### Terminal 1 - Backend:
```bash
npm run backend:dev
```
Backend runs on http://localhost:3001

### Terminal 2 - Frontend:
```bash
npm run dev
```
Frontend runs on http://localhost:5173

## First Use

1. Open http://localhost:5173 in your browser
2. Click "Create Family" tab
3. Enter:
   - Family name (e.g., "Smith Family")
   - Admin email (e.g., "admin@example.com")
   - Admin password
4. Click "Create Family"
5. You'll be automatically logged in as admin

## Next Steps

- Add people in the "People" tab
- Add custom chores in the "Chores" tab  
- Assign chores using the weekly calendar grid
- Family members can log in using the "User Login" tab with their email

## Troubleshooting

**Backend won't start:**
- Make sure port 3001 is not in use
- Check that `backend/.env` exists with JWT_SECRET set

**Frontend can't connect to backend:**
- Make sure backend is running on port 3001
- Check `.env.local` has correct `VITE_API_URL`
- Restart frontend dev server after changing .env files

**Database errors:**
- Delete `backend/db/chore_calendar.db` to reset database
- Restart backend server
