# Vercel Deployment Fix

## Issue
Vercel error: `cd: client: No such file or directory`

## ✅ Solution: Configure Build Settings in Vercel Dashboard

Since there's no "Root Directory" option visible, configure the build settings manually:

### Method 1: Override Build Command in Vercel (Recommended)

1. **Go to Vercel Project Settings**
   - Open your project: `campus-trails-admin` in Vercel dashboard
   - Click **Settings** (gear icon)
   - Click **General** tab

2. **Find "Build & Development Settings"**
   - Scroll down to find this section
   - Look for **"Override"** toggle or **"Build Command"** field

3. **Set Build Command**
   - Enable **"Override"** if there's a toggle
   - Set **Build Command** to: `cd client && npm install && npm run build`
   - Set **Output Directory** to: `client/build`
   - Set **Install Command** to: `npm install` (or leave default)

4. **Save and Redeploy**
   - Click **Save**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment

### Method 2: Use vercel.json (Current Setup)

The `vercel.json` file is already configured. Make sure:

1. **Verify vercel.json is in repository root**
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   ls -la vercel.json
   ```

2. **Commit and push vercel.json**
   ```bash
   git add vercel.json
   git commit -m "Update vercel.json configuration"
   git push
   ```

3. **Vercel should auto-detect and use vercel.json**

### Method 3: Move vercel.json to client/ directory

If the above doesn't work, you can move `vercel.json` into the `client/` directory:

1. **Move the file:**
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   mv vercel.json client/vercel.json
   ```

2. **Update client/vercel.json:**
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

3. **Commit and push:**
   ```bash
   git add client/vercel.json
   git commit -m "Move vercel.json to client directory"
   git push
   ```

## Troubleshooting

### If Build Command override doesn't appear:
- Try looking in **"Deployments"** → Click on a deployment → **"Settings"** → **"Build & Development Settings"**
- Or check if you need to enable "Advanced" settings

### If vercel.json isn't being detected:
- Make sure it's committed to git
- Check Vercel build logs to see if it mentions vercel.json
- Try Method 3 (move to client/ directory)

### Verify Repository Structure:
```bash
cd /home/barbs/GitHub/Campus-Trails-Admin
ls -la client/
```

You should see:
- `package.json`
- `src/`
- `public/`

## Current vercel.json Configuration

The repository has `vercel.json` in the root with this configuration:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [...],
  "rewrites": [...]
}
```

This should work automatically if the file is committed to git.
