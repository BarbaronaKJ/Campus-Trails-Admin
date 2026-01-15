# Fix 404 Error on Render Static Site

## Issue
Getting 404 errors when navigating to routes in the React app deployed on Render.

## Cause
React Router uses client-side routing. When you navigate to `/dashboard` or `/pins`, the server tries to find a file at that path, but it doesn't exist. All routes need to be redirected to `index.html` so React Router can handle them.

## Solution

### Option 1: Add _redirects File (Recommended)

I've created `client/public/_redirects` with:
```
/*    /index.html   200
```

This file will be copied to `client/build/_redirects` during build, and Render will use it to redirect all routes to `index.html`.

**After adding this file:**
1. Commit and push to GitHub
2. Render will automatically rebuild and redeploy

### Option 2: Update render.yaml (Already Done)

The `render.yaml` has been updated with a `routes` section:
```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

This tells Render to rewrite all routes to `/index.html`.

**To apply:**
1. Commit the updated `render.yaml`
2. Go to Render Dashboard → Your Static Site → Settings
3. Click "Apply YAML" or redeploy

### Option 3: Manual Configuration in Render Dashboard

If the above don't work:

1. Go to Render Dashboard
2. Open your static site service
3. Go to **Settings** → **Headers & Redirects**
4. Add a redirect rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Type**: Rewrite (not redirect)
5. Save and redeploy

## Verify Fix

After applying the fix:

1. Visit your static site: `https://campus-trails-admin.onrender.com`
2. Try navigating to different routes (e.g., `/dashboard`, `/pins`)
3. All routes should load correctly without 404 errors

## Files Created/Updated

- ✅ `client/public/_redirects` - Redirects file for Render
- ✅ `render.yaml` - Updated with routes configuration

## Next Steps

1. Commit the changes:
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   git add client/public/_redirects render.yaml
   git commit -m "Fix 404 errors: Add redirects for React Router"
   git push
   ```

2. Render will automatically rebuild
3. Test your static site - 404 errors should be resolved
