# Deployment Guide

This guide covers deploying the Campus Trails Admin Panel to Vercel (frontend) and Render (backend).

## 🎯 Deployment Overview

- **Frontend (React)**: Deploy to Vercel
- **Backend (Express API)**: Deploy to Render

## 📦 Step 1: Backend Deployment (Render)

### 1.1 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the `Campus-Trails-Admin` repository

### 1.2 Configure Render Service

**Basic Settings:**
- **Name**: `campus-trails-admin-api`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: (leave empty)

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### 1.3 Set Environment Variables in Render

Add these environment variables in Render dashboard:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGINS=https://your-vercel-app.vercel.app
PORT=5001
NODE_ENV=production
```

**Important Notes:**
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Must match the secret used in main Campus Trails backend
- `CORS_ORIGINS`: Will be updated after Vercel deployment (can use `*` temporarily)

### 1.4 Deploy Backend

1. Click **"Create Web Service"**
2. Render will build and deploy your backend
3. Wait for deployment to complete
4. Note your service URL: `https://campus-trails-admin-api.onrender.com`

### 1.5 Test Backend

Visit: `https://your-service-name.onrender.com/health`

You should see:
```json
{
  "success": true,
  "message": "Admin Panel API is running",
  "timestamp": "..."
}
```

## 🚀 Step 2: Frontend Deployment (Vercel)

### 2.1 Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select the `Campus-Trails-Admin` repository

### 2.2 Configure Vercel Project

**Framework Preset:**
- Select **"Other"** or **"Create React App"**

**Root Directory:**
- Click **"Edit"** and set to: `client`
- **IMPORTANT**: This tells Vercel to treat the `client` folder as the project root

**Build Settings:**
- **Build Command**: `npm run build` (Vercel will auto-detect this)
- **Output Directory**: `build` (Vercel will auto-detect this)
- **Install Command**: `npm install` (Vercel will auto-detect this)

### 2.3 Set Environment Variables in Vercel

Add this environment variable:

```env
REACT_APP_API_URL=https://your-service-name.onrender.com
```

**Important:**
- Replace `your-service-name` with your actual Render service name
- This should be the full URL without trailing slash

### 2.4 Deploy Frontend

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend
3. Wait for deployment to complete
4. Note your Vercel URL: `https://your-app.vercel.app`

### 2.5 Update CORS in Render

After Vercel deployment, update `CORS_ORIGINS` in Render:

```env
CORS_ORIGINS=https://your-app.vercel.app,https://your-app.vercel.app
```

Then redeploy the Render service.

## ✅ Step 3: Verify Deployment

### 3.1 Test Frontend

1. Visit your Vercel URL
2. You should see the admin login page
3. Try logging in with admin credentials

### 3.2 Test Backend Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Check that API calls go to your Render backend URL

### 3.3 Common Issues

**Issue: CORS Error**
- Solution: Update `CORS_ORIGINS` in Render to include your Vercel URL

**Issue: 404 on API calls**
- Solution: Verify `REACT_APP_API_URL` in Vercel matches your Render URL exactly

**Issue: Authentication fails**
- Solution: Ensure `JWT_SECRET` in Render matches the main backend

## 🔄 Continuous Deployment

Both Vercel and Render automatically deploy on every push to the main branch.

### Manual Deployment

- **Vercel**: Go to project → Deployments → Redeploy
- **Render**: Go to service → Manual Deploy → Deploy latest commit

## 📊 Monitoring

### Render
- View logs: Service → Logs
- View metrics: Service → Metrics

### Vercel
- View logs: Project → Deployments → Click deployment → View Function Logs
- View analytics: Project → Analytics

## 🔐 Security Checklist

- [ ] `JWT_SECRET` is strong and unique
- [ ] `MONGODB_URI` uses strong password
- [ ] `CORS_ORIGINS` only includes your domains
- [ ] Environment variables are set (not hardcoded)
- [ ] MongoDB Atlas IP whitelist includes Render IPs

## 🆘 Support

If you encounter issues:
1. Check Render logs for backend errors
2. Check Vercel function logs for frontend errors
3. Verify all environment variables are set correctly
4. Test backend health endpoint directly
