# Push to GitHub - Step by Step Guide

## Step 1: Create a GitHub Repository

1. Go to https://github.com and sign in (or create an account)
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `weekly-chore-calendar` (or any name you like)
   - **Description**: "A React app for managing weekly household chores with Node.js backend"
   - **Visibility**: Choose Public or Private
   - **DO NOT** check "Initialize with README" (we already have files)
4. Click **"Create repository"**

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd /Users/cedricwinbush/Desktop/projects/weekly-chore-calendar

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/weekly-chore-calendar.git

# Or if you prefer SSH:
# git remote add origin git@github.com:YOUR_USERNAME/weekly-chore-calendar.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Verify

1. Go back to your GitHub repository page
2. You should see all your files there!
3. The README.md will display automatically

## Quick Copy-Paste Commands

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
cd /Users/cedricwinbush/Desktop/projects/weekly-chore-calendar
git remote add origin https://github.com/YOUR_USERNAME/weekly-chore-calendar.git
git branch -M main
git push -u origin main
```

## If You Get Authentication Errors

### Option 1: Use GitHub CLI (Easiest)
```bash
# Install GitHub CLI if you don't have it
brew install gh

# Login
gh auth login

# Then push
git push -u origin main
```

### Option 2: Use Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. When pushing, use the token as your password:
```bash
git push -u origin main
# Username: YOUR_USERNAME
# Password: YOUR_TOKEN
```

### Option 3: Use SSH Keys
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys → New SSH key
3. Use SSH URL: `git@github.com:YOUR_USERNAME/weekly-chore-calendar.git`

## What Gets Committed

✅ **Committed:**
- All source code (frontend and backend)
- Configuration files
- Documentation files
- Package.json files

❌ **NOT Committed (thanks to .gitignore):**
- `node_modules/` (dependencies - too large)
- `.env` files (contains secrets!)
- Database files (`*.db`) (contains actual data)
- Build outputs (`dist/`)
- Editor files

## Next Steps After Pushing

1. **Add a README badge** (optional) - Shows build status, etc.
2. **Set up GitHub Actions** (optional) - Automatically test/deploy
3. **Add topics/tags** - Help others find your repo
4. **Create issues** - Track bugs and features

## Making Future Changes

After you make changes to your code:

```bash
# See what changed
git status

# Add changed files
git add .

# Commit with a message describing what you changed
git commit -m "Add new feature: user can edit chores"

# Push to GitHub
git push
```

That's it! Your code is now on GitHub! 🎉
