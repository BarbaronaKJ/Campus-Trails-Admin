# Fix "Cannot GET /api/admin" Error

## Issue
Error: `Cannot GET /api/admin`

This happens when the frontend tries to access `/api/admin` directly, which doesn't exist. The API routes are specific endpoints like `/api/admin/pins`, `/api/admin/users`, etc.

## Cause
The `REACT_APP_API_URL` environment variable might include `/api/admin` at the end, or there's a configuration issue.

## Solution

### Check Environment Variable in Render

1. Go to Render Dashboard
2. Open your **Static Site** service (`campus-trails-admin`)
3. Go to **Environment** tab
4. Find `REACT_APP_API_URL`
5. **It should be:**
   ```
   https://your-backend-service.onrender.com
   ```
   **NOT:**
   ```
   https://your-backend-service.onrender.com/api/admin
   ```

### Correct Format

- ✅ **Correct**: `https://campus-trails-admin-api.onrender.com`
- ❌ **Wrong**: `https://campus-trails-admin-api.onrender.com/api/admin`
- ❌ **Wrong**: `https://campus-trails-admin-api.onrender.com/`

### How It Works

The code constructs full URLs like this:
- Base URL: `https://backend.onrender.com` (from `REACT_APP_API_URL`)
- Full endpoint: `${baseUrl}/api/admin/pins`
- Result: `https://backend.onrender.com/api/admin/pins` ✅

If `REACT_APP_API_URL` already includes `/api/admin`:
- Base URL: `https://backend.onrender.com/api/admin` (WRONG!)
- Full endpoint: `${baseUrl}/api/admin/pins`
- Result: `https://backend.onrender.com/api/admin/api/admin/pins` ❌

## Steps to Fix

1. **Update Environment Variable:**
   - Go to Render → Static Site → Environment
   - Edit `REACT_APP_API_URL`
   - Remove `/api/admin` if it's there
   - Should be just the base backend URL
   - Save

2. **Redeploy:**
   - Go to **Manual Deploy** → **Deploy latest commit**
   - Or push a new commit

3. **Clear Browser Cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache

4. **Test:**
   - Refresh the dashboard
   - Check browser console (F12) for the API URL
   - Should show: `🔍 Services API URL: https://your-backend.onrender.com/api/admin`

## Verify

After fixing, check the browser console:
- Open DevTools (F12) → Console tab
- Look for: `🔍 Services API URL: ...`
- Should show: `https://your-backend.onrender.com/api/admin`
- Should NOT show: `https://your-backend.onrender.com/api/admin/api/admin`

## Alternative: Check Backend Routes

If the environment variable is correct, verify the backend has the routes:

1. Test backend health: `https://your-backend.onrender.com/health`
2. Test pins endpoint: `https://your-backend.onrender.com/api/admin/pins` (with auth token)

If these don't work, the backend might not be configured correctly.
