# Vercel Environment Variables Setup

## Issue
Getting "Error: 404" when trying to login to admin panel.

This means the frontend (Vercel) cannot connect to the backend API.

## Solution: Set REACT_APP_API_URL in Vercel

### Steps:

1. **Go to Vercel Project Settings**
   - Open your project: `campus-trails-admin` in Vercel dashboard
   - Click **Settings** (gear icon)
   - Click **Environment Variables** tab

2. **Add Environment Variable**
   - Click **"Add New"** or **"Add"** button
   - **Key**: `REACT_APP_API_URL`
   - **Value**: Your Render backend URL
     - Example: `https://campus-trails-admin-api.onrender.com`
     - **Important**: No trailing slash, no `/api/admin` at the end
     - Just the base URL of your Render service

3. **Set for All Environments**
   - Check boxes for: Production, Preview, Development
   - Or at minimum: Production

4. **Save and Redeploy**
   - Click **Save**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger redeploy

## How to Find Your Render Backend URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Open your backend service (the one you deployed for admin panel)
3. Copy the service URL (e.g., `https://campus-trails-admin-api.onrender.com`)
4. Use this exact URL as the value for `REACT_APP_API_URL`

## Verify Configuration

After setting the environment variable, the frontend will make API calls to:
```
${REACT_APP_API_URL}/api/admin/auth/login
```

So if `REACT_APP_API_URL = https://campus-trails-admin-api.onrender.com`, 
the login request will go to:
```
https://campus-trails-admin-api.onrender.com/api/admin/auth/login
```

## Common Mistakes

❌ **Wrong**: `https://campus-trails-admin-api.onrender.com/api/admin`
   - Don't include `/api/admin` in the base URL

❌ **Wrong**: `https://campus-trails-admin-api.onrender.com/`
   - Don't include trailing slash

✅ **Correct**: `https://campus-trails-admin-api.onrender.com`
   - Just the base URL

## After Setting Environment Variable

1. **Redeploy** the Vercel project (required for env vars to take effect)
2. **Clear browser cache** or use incognito mode
3. **Try logging in again**

The 404 error should be resolved once the environment variable is set correctly.
