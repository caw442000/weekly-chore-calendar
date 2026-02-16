# Backend Installation Fix

## Problem
`better-sqlite3` requires C++20 compilation, but Node.js v25.2.1 needs proper C++20 compiler setup.

## ✅ Solution: Use Node.js LTS v20 (Recommended)

The easiest fix is to switch to Node.js LTS v20, which doesn't require C++20:

### Using nvm (if installed):
```bash
nvm install 20
nvm use 20
```

### Or download from nodejs.org:
Visit https://nodejs.org/ and download Node.js LTS v20

### Then reinstall backend dependencies:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Verify installation:
```bash
node --version  # Should show v20.x.x
cd backend
npm install    # Should work without errors
```

## Alternative: Fix C++ Compiler (Advanced)

If you must use Node v25:

1. Install/update Xcode Command Line Tools:
```bash
xcode-select --install
```

2. Set C++ standard and rebuild:
```bash
export CXXFLAGS="-std=c++20"
cd backend
rm -rf node_modules
npm install
```

## Why This Happens

Node.js v25 requires C++20, but `better-sqlite3` needs to be compiled with C++20 support. The default compiler setup may not have C++20 enabled. Node.js LTS v20 uses C++17, which is fully supported by better-sqlite3 without additional configuration.
