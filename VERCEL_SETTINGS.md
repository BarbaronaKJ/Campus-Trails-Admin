# Vercel Settings Configuration

## Issue
Cannot override build settings when Framework Preset is selected.

## Solution

Since you have **Root Directory** set to `client`, Vercel automatically runs all commands from the `client/` directory. You need to update the build command to remove `cd client`.

### In Vercel Dashboard:

1. **Framework Preset**: Keep as "Create React App" (or change to "Other" if you want full control)

2. **Root Directory**: `client` ✅ (already set correctly)

3. **Build Command**: Change from:
   ```
   cd client && npm install && npm run build
   ```
   To:
   ```
   npm install && npm run build
   ```
   (Remove `cd client` since Root Directory is already `client`)

4. **Output Directory**: `build` (not `client/build`)
   - Since Root Directory is `client`, the output path is relative to `client/`
   - So `build` means `client/build`

5. **Install Command**: `npm install` ✅ (already correct)

### Alternative: Change Framework Preset to "Other"

If you want to override settings:

1. Change **Framework Preset** from "Create React App" to **"Other"**
2. This will unlock all build settings
3. Then you can set:
   - Build Command: `npm install && npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

## Why This Works

When **Root Directory** is set to `client`:
- Vercel changes into the `client/` directory first
- All commands run from `client/`
- Paths are relative to `client/`
- So `build` output directory = `client/build`
- No need for `cd client` in build command
