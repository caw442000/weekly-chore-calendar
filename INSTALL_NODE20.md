# Install Node.js v20

## Option 1: Install nvm (Recommended - No sudo needed)

nvm (Node Version Manager) lets you easily switch between Node versions.

### Install nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

### Reload your shell:
```bash
source ~/.zshrc
```

### Install and use Node.js v20:
```bash
nvm install 20
nvm use 20
nvm alias default 20  # Set as default
```

### Verify:
```bash
node --version  # Should show v20.x.x
```

### Then install backend dependencies:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

## Option 2: Download Node.js v20 directly

1. Visit https://nodejs.org/
2. Download the LTS version (v20.x.x)
3. Install the .pkg file
4. Restart your terminal
5. Verify: `node --version`

## Option 3: Fix Homebrew permissions (if you prefer Homebrew)

```bash
sudo chown -R $(whoami) /opt/homebrew
brew install node@20
brew link --overwrite node@20
```

Then add to your PATH in `~/.zshrc`:
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

## After installing Node v20

Once you have Node v20 installed:

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

This should work without C++20 compilation errors!
