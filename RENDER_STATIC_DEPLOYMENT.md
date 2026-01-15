# Deploy Admin Panel to Render (Static Site)

This guide shows how to deploy the admin panel frontend as a static site on Render.

## Architecture

- **Backend API**: Node.js web service (already configured)
- **Frontend**: Static site (React build)

## Step 1: Deploy Backend API (if not already deployed)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `campus-trails-admin-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Root Directory**: (leave empty)

5. Set Environment Variables:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-key
   CORS_ORIGINS=https://campus-trails-admin.onrender.com
   PORT=5001
   NODE_ENV=production
   ```

6. Click **"Create Web Service"**
7. Note your backend URL: `https://campus-trails-admin-api.onrender.com`

## Step 2: Deploy Frontend as Static Site

### Option A: Using Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `campus-trails-admin`
   - **Environment**: `Static Site`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`
   - **Root Directory**: (leave empty)

5. Set Environment Variable:
   ```env
   REACT_APP_API_URL=https://campus-trails-admin-api.onrender.com
   ```
   (Replace with your actual backend URL)

6. Click **"Create Static Site"**

### Option B: Using render.yaml (Recommended)

The `render.yaml` file is already configured. Just:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create both services
5. Set the environment variables in each service's settings

## Step 3: Update CORS in Backend

After the static site is deployed:

1. Go to your backend service settings
2. Update `CORS_ORIGINS` environment variable:
   ```env
   CORS_ORIGINS=https://campus-trails-admin.onrender.com
   ```
3. Redeploy the backend service

## Step 4: Verify Deployment

1. Visit your static site URL: `https://campus-trails-admin.onrender.com`
2. Try logging in
3. Check browser console for any errors

## Environment Variables Summary

### Backend Service (`campus-trails-admin-api`)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret key
- `CORS_ORIGINS`: Static site URL (e.g., `https://campus-trails-admin.onrender.com`)
- `PORT`: `5001`
- `NODE_ENV`: `production`

### Frontend Static Site (`campus-trails-admin`)
- `REACT_APP_API_URL`: Backend API URL (e.g., `https://campus-trails-admin-api.onrender.com`)

## Troubleshooting

### Build Fails
- Check that `client/package.json` exists
- Verify Node.js version (should be 18+)
- Check build logs for specific errors

### 404 Errors
- Verify `REACT_APP_API_URL` is set correctly
- Check that backend is running and accessible
- Ensure CORS is configured correctly

### CORS Errors
- Update `CORS_ORIGINS` in backend to include your static site URL
- Redeploy backend after updating CORS

## Cost

- **Static Sites on Render**: Free tier available
- **Web Services**: Free tier available (spins down after inactivity)

## Alternative: Keep Backend on Render, Frontend on Vercel

If you prefer:
- Backend: Render (as configured)
- Frontend: Vercel (as previously set up)

Both work the same way - just set `REACT_APP_API_URL` to point to your Render backend.
