# Deployment Guide

## Overview

This application consists of:
- **Frontend**: React + Vite (static site)
- **Backend**: Node.js + Express + SQLite (API server)

You'll need to deploy both separately.

## Local Development

### Setup

1. Install dependencies for both frontend and backend:
```bash
npm run install:all
```

2. Start the backend server:
```bash
npm run backend:dev
```
The backend will run on `http://localhost:3001`

3. Start the frontend dev server (in a new terminal):
```bash
npm run dev
```
The frontend will run on `http://localhost:5173` and proxy API calls to the backend.

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
```

**Frontend** (`.env.local`):
```env
VITE_API_URL=http://localhost:3001/api
```

## Deployment

### Backend Deployment

#### Option 1: Railway (Recommended - Easiest)

1. Go to https://railway.app and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js
5. Set root directory to `backend`
6. Add environment variables:
   - `PORT` (Railway sets this automatically)
   - `JWT_SECRET` (generate a secure random string)
7. Deploy! Your backend will be live at `https://your-app.railway.app`
8. Copy the URL and use it for `VITE_API_URL` in frontend deployment

#### Option 2: Render

1. Go to https://render.com and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Settings:
   - **Name**: weekly-chore-calendar-backend
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables:
   - `JWT_SECRET` (generate a secure random string)
6. Deploy! Your backend will be live at `https://your-app.onrender.com`
7. Copy the URL and use it for `VITE_API_URL` in frontend deployment

#### Option 3: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. In the `backend` directory:
```bash
cd backend
fly launch
```
3. Follow prompts and deploy
4. Your backend will be live at `https://your-app.fly.dev`
5. Copy the URL and use it for `VITE_API_URL` in frontend deployment

### Frontend Deployment

#### Option 1: Vercel (Recommended)

1. Go to https://vercel.com and sign up/login (use GitHub to sign in)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a Vite project
5. **Important**: Add environment variable:
   - `VITE_API_URL` = `https://your-backend-url.com/api` (use your deployed backend URL)
6. Click "Deploy"
7. Your app will be live at `https://your-project-name.vercel.app`

#### Option 2: Netlify

1. Go to https://netlify.com and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. **Important**: Add environment variable:
   - `VITE_API_URL` = `https://your-backend-url.com/api` (use your deployed backend URL)
6. Click "Deploy site"
7. Your app will be live at `https://your-project-name.netlify.app`

#### Option 3: GitHub Pages

1. Install gh-pages: `npm install --save-dev gh-pages`
2. Update `package.json` scripts:
```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```
3. Update `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/YOUR_REPO_NAME/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```
4. Set environment variable `VITE_API_URL` in GitHub Actions or build script
5. Deploy: `npm run deploy`

## Testing Production Build Locally

1. Build frontend:
```bash
npm run build
npm run preview
```

2. Make sure backend is running:
```bash
cd backend
npm start
```

3. Set `VITE_API_URL` in `.env.local` to point to your backend

## Database

The backend uses SQLite, which is stored in `backend/db/chore_calendar.db`. 

**Important**: 
- For production, consider migrating to PostgreSQL (Railway/Render provide free PostgreSQL databases)
- SQLite files are included in `.gitignore` - each deployment will start with a fresh database
- For persistent data, use a managed database service

## Security Notes

- **JWT_SECRET**: Use a strong, random secret in production
- **CORS**: Backend allows all origins - restrict in production if needed
- **Password Hashing**: Passwords are hashed with bcrypt
- **API Authentication**: All routes except auth require valid JWT token

## Troubleshooting

- **CORS errors**: Make sure backend CORS is configured correctly
- **API not found**: Verify `VITE_API_URL` is set correctly in frontend deployment
- **Database errors**: Ensure backend has write permissions for SQLite file
- **Token expired**: Tokens expire after 7 days - users need to log in again
