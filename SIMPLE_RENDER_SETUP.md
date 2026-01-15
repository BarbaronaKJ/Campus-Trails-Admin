# Simple Guide: Deploy Admin Panel to Render (For Beginners)

This guide will help you deploy your admin panel step by step. Follow each step carefully.

## What You Need Before Starting

1. ✅ Your code is on GitHub (in a repository)
2. ✅ You have a Render account (sign up at render.com if you don't)
3. ✅ You know your MongoDB connection string (for the backend)

---

## Part 1: Deploy the Backend (API Server)

The backend is the server that handles all the data. You need to deploy this first.

### Step 1: Go to Render Dashboard

1. Open your web browser
2. Go to: https://dashboard.render.com
3. Log in to your account

### Step 2: Create New Web Service

1. Click the big blue button that says **"New +"** (top right)
2. Click **"Web Service"** from the dropdown menu

### Step 3: Connect Your GitHub

1. You'll see a page asking to connect a repository
2. Click **"Connect account"** or **"Connect GitHub"** if you haven't already
3. Authorize Render to access your GitHub
4. Find your repository: `Campus-Trails-Admin`
5. Click **"Connect"** next to it

### Step 4: Configure the Backend

Fill in these settings:

**Name:**
- Type: `campus-trails-admin-api`
- (This is just a name, you can change it)

**Environment:**
- Select: **"Node"** from the dropdown

**Region:**
- Choose the closest region to you (e.g., "Oregon (US West)")

**Branch:**
- Leave as: `main` (or `master` if that's your branch name)

**Root Directory:**
- Leave this **EMPTY** (don't type anything)

**Build Command:**
- Type: `npm install`
- (This installs all the packages needed)

**Start Command:**
- Type: `node server.js`
- (This starts your server)

### Step 5: Add Environment Variables

Scroll down to find **"Environment Variables"** section.

Click **"Add Environment Variable"** for each of these:

1. **First Variable:**
   - Key: `MONGODB_URI`
   - Value: `your-mongodb-connection-string-here`
   - (Paste your MongoDB connection string)

2. **Second Variable:**
   - Key: `JWT_SECRET`
   - Value: `your-secret-key-here`
   - (Use a long random string, like: `my-super-secret-key-12345-change-this`)

3. **Third Variable:**
   - Key: `CORS_ORIGINS`
   - Value: `https://campus-trails-admin.onrender.com`
   - (We'll update this later after deploying the frontend)

4. **Fourth Variable:**
   - Key: `PORT`
   - Value: `5001`

5. **Fifth Variable:**
   - Key: `NODE_ENV`
   - Value: `production`

### Step 6: Create the Service

1. Scroll to the bottom
2. Click the big blue button **"Create Web Service"**
3. Wait for it to build (this takes 2-5 minutes)
4. You'll see logs showing the build progress
5. When it says "Your service is live", you're done!

### Step 7: Copy Your Backend URL

1. At the top of the page, you'll see a URL like:
   `https://campus-trails-admin-api.onrender.com`
2. **Copy this URL** - you'll need it for the frontend!
3. Write it down somewhere safe

---

## Part 2: Deploy the Frontend (Static Website)

Now we'll deploy the website that users see.

### Step 1: Go Back to Render Dashboard

1. Click **"Dashboard"** in the top left
2. You should see your backend service listed

### Step 2: Create New Static Site

1. Click **"New +"** button again (top right)
2. This time, click **"Static Site"** from the dropdown

### Step 3: Connect Your GitHub (Again)

1. Find your repository: `Campus-Trails-Admin`
2. Click **"Connect"** next to it

### Step 4: Configure the Frontend

Fill in these settings:

**Name:**
- Type: `campus-trails-admin`
- (This is just a name)

**Environment:**
- Should already say: **"Static Site"**
- If not, select it from dropdown

**Branch:**
- Leave as: `main` (or `master`)

**Root Directory:**
- Leave this **EMPTY** (don't type anything)

**Build Command:**
- Type: `cd client && npm install && npm run build`
- (This builds your website)

**Publish Directory:**
- Type: `client/build`
- (This is where the built files are)

### Step 5: Add Environment Variable

Scroll down to **"Environment Variables"** section.

Click **"Add Environment Variable"**:

- Key: `REACT_APP_API_URL`
- Value: `https://campus-trails-admin-api.onrender.com`
- (Use the backend URL you copied earlier - NO trailing slash!)

**Important:** 
- Replace `campus-trails-admin-api` with YOUR actual backend service name
- Don't add `/api/admin` at the end
- Don't add a `/` at the end
- Just the base URL!

### Step 6: Fix the 404 Problem (IMPORTANT!)

Before creating, we need to fix routing. Scroll down to find **"Headers & Redirects"** or **"Routes"** section.

If you see it:
1. Click **"Add Redirect"** or **"Add Route"**
2. **Source:** Type `/*`
3. **Destination:** Type `/index.html`
4. **Type:** Select **"Rewrite"** (NOT "Redirect")
5. **Status:** `200` (if there's an option)

If you DON'T see this section:
- Don't worry, we'll fix it after deployment (see below)

### Step 7: Create the Static Site

1. Scroll to the bottom
2. Click **"Create Static Site"**
3. Wait for it to build (this takes 3-5 minutes)
4. When it says "Your site is live", you're done!

### Step 8: Fix 404 Errors (If Needed)

If you couldn't add the redirect in Step 6, do this now:

1. Go to your static site service page
2. Click **"Settings"** tab
3. Look for **"Headers & Redirects"** or **"Routes"** section
4. Click **"Add Redirect"** or **"Add Route"**
5. Fill in:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Type:** **Rewrite** (NOT Redirect)
6. Click **"Save"**
7. Go to **"Manual Deploy"** → Click **"Deploy latest commit"**

---

## Part 3: Update Backend CORS

Now we need to tell the backend to allow requests from the frontend.

### Step 1: Go to Backend Settings

1. Go to your backend service: `campus-trails-admin-api`
2. Click **"Environment"** tab
3. Find the `CORS_ORIGINS` variable

### Step 2: Update CORS

1. Click the edit icon (pencil) next to `CORS_ORIGINS`
2. Change the value to your frontend URL:
   - Example: `https://campus-trails-admin.onrender.com`
3. Click **"Save Changes"**
4. The service will automatically redeploy

---

## Part 4: Test Everything

### Step 1: Test Backend

1. Open a new browser tab
2. Go to: `https://your-backend-url.onrender.com/health`
3. You should see: `{"success":true,"message":"Admin Panel API is running",...}`
4. If you see this, backend is working! ✅

### Step 2: Test Frontend

1. Go to: `https://your-frontend-url.onrender.com`
2. You should see the login page
3. Try logging in with your admin credentials
4. If it works, everything is set up! ✅

---

## Troubleshooting

### Problem: "Build Failed"

**Solution:**
- Check the build logs (click on the failed deployment)
- Look for error messages
- Common issues:
  - Missing environment variables
  - Wrong build command
  - Node.js version issues

### Problem: "404 Error" on Frontend

**Solution:**
- Make sure you added the redirect rule (see Part 2, Step 8)
- The redirect should be: `/*` → `/index.html` (Rewrite, not Redirect)

### Problem: "Cannot connect to API" or "404" when logging in

**Solution:**
- Check that `REACT_APP_API_URL` is set correctly in frontend
- Make sure there's NO trailing slash
- Make sure backend is running (check the health endpoint)
- Check CORS_ORIGINS in backend matches your frontend URL

### Problem: "CORS Error"

**Solution:**
- Go to backend settings
- Update `CORS_ORIGINS` to include your frontend URL
- Make sure it matches exactly (including `https://`)

---

## Quick Checklist

Before you finish, make sure:

- [ ] Backend is deployed and shows "Live" status
- [ ] Backend health check works (`/health` endpoint)
- [ ] Frontend is deployed and shows "Live" status
- [ ] Frontend has `REACT_APP_API_URL` environment variable set
- [ ] Frontend has redirect rule: `/*` → `/index.html`
- [ ] Backend has `CORS_ORIGINS` set to frontend URL
- [ ] You can access the login page
- [ ] You can log in successfully

---

## Summary

You now have:
1. ✅ Backend API running on Render
2. ✅ Frontend website running on Render
3. ✅ Both connected and working together

Your admin panel is now live on the internet! 🎉

---

## Need Help?

If something doesn't work:
1. Check the build logs in Render
2. Check the browser console (F12 → Console tab)
3. Verify all environment variables are set correctly
4. Make sure both services show "Live" status
