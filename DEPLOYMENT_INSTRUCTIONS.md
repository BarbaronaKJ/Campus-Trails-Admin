# Admin Panel Deployment Instructions - Render

Since the admin panel now uses the **main backend API**, it's just a React client and should be deployed as a **Render Static Site**.

---

## 🚀 Deploy Admin Panel to Render as Static Site

### Prerequisites
- ✅ Main backend API deployed on Render (e.g., `https://campus-trails-api.onrender.com`)
- ✅ Render account
- ✅ GitHub repository with admin panel code

---

## Step 1: Go to Render Dashboard

1. **Sign in to [render.com](https://render.com)**
2. **Click "New +" in the top navigation**
3. **Select "Static Site"**

---

## Step 2: Connect Repository

1. **Connect your GitHub account** (if not already connected)
2. **Select your repository**: `Campus-Trails`
3. **Click "Connect"**

---

## Step 3: Configure Build Settings

Fill in the following settings:

- **Name**: `campus-trails-admin` (or your preferred name)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `admin-panel/client`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build` ⚠️ **Just `build` (not `admin-panel/client/build`)** - this is relative to Root Directory

⚠️ **Important**: Make sure Root Directory is set to `admin-panel/client`

---

## Step 4: Set Environment Variables

Click on **"Advanced"** or **"Environment"** section and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `REACT_APP_API_URL` | `https://campus-trails-api.onrender.com` | ⚠️ **Replace with your actual backend URL** |

⚠️ **Important Notes**:
- Use your **main backend API URL** (without `/api/admin`)
- The client code automatically adds `/api/admin` to all requests
- Example: If your backend is `https://campus-trails-api.onrender.com`, use that exact URL

---

## Step 5: Deploy

1. **Click "Create Static Site"**
2. **Wait for the build to complete** (2-5 minutes)
   - You can watch the build logs in real-time
   - Build should show: "Build successful"
3. **Your admin panel will be live at**: `https://campus-trails-admin.onrender.com` (or your chosen name)

---

## Step 6: Configure CORS in Main Backend

Since the admin panel is now on a different URL, you need to allow it in your main backend's CORS settings:

1. **Go to your main backend service on Render**
2. **Navigate to Environment tab**
3. **Find `CORS_ORIGINS` variable** (or create it if it doesn't exist)
4. **Update the value** to include your admin panel URL:
   ```
   https://campus-trails-admin.onrender.com,https://campus-trails-api.onrender.com
   ```
   ⚠️ **Replace with your actual URLs**
5. **Save and restart** your backend service

---

## Step 7: Create Admin User

After deployment, you need to create an admin user. Choose one method:

### Method 1: Using MongoDB Atlas (Easiest)

1. Go to **MongoDB Atlas** → Browse Collections
2. Find your `users` collection
3. **Find an existing user** or **create a new one**
4. **Update the user's `role` field** to `"admin"`

Or create a new user with:
```json
{
  "email": "admin@example.com",
  "password": "$2a$10$YourHashedPasswordHere",
  "username": "admin",
  "role": "admin"
}
```

### Method 2: Using Backend Script

1. **SSH into your backend** (or run locally)
2. **Run the createAdmin script**:
   ```bash
   cd backend
   node scripts/createAdmin.js
   ```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Admin panel URL is accessible (e.g., `https://campus-trails-admin.onrender.com`)
- [ ] Login page loads correctly
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] API calls work (check browser console - should see requests to `/api/admin/*`)
- [ ] No CORS errors in browser console
- [ ] CORS is properly configured in main backend

---

## 🐛 Troubleshooting

### "Cannot connect to server" or Login fails
- ✅ Check `REACT_APP_API_URL` is set correctly in Render (should be your main backend URL)
- ✅ Verify your main backend API is running: Visit `https://campus-trails-api.onrender.com/health`
- ✅ Check browser console for API errors
- ✅ Verify admin user exists with `role: "admin"` in MongoDB

### CORS Error in Browser Console
- ✅ Add your admin panel URL to main backend's `CORS_ORIGINS`
- ✅ Format: `https://campus-trails-admin.onrender.com,https://campus-trails-api.onrender.com`
- ✅ Restart your backend service after updating CORS
- ✅ Clear browser cache and try again

### Build Fails
- ✅ Check Node.js version (should be 16+ or 18+)
- ✅ Verify Root Directory is `admin-panel/client`
- ✅ Check build logs for specific errors
- ✅ Try deleting `node_modules` and rebuilding

### Admin Panel shows blank page
- ✅ Check browser console for errors
- ✅ Verify `REACT_APP_API_URL` is set correctly
- ✅ Check that build completed successfully
- ✅ Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## 📚 Quick Reference

**Main Backend API:** `https://campus-trails-api.onrender.com`  
**Admin Panel URL:** `https://campus-trails-admin.onrender.com`  
**Admin API Routes:** `https://campus-trails-api.onrender.com/api/admin/*`

**Environment Variable:**
- `REACT_APP_API_URL` = `https://campus-trails-api.onrender.com` (your main backend URL)

**CORS Configuration:**
- Add admin panel URL to main backend's `CORS_ORIGINS`

---

## 🎯 Summary

1. Deploy as **Render Static Site** (not Web Service)
2. Root Directory: `admin-panel/client`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `build`
5. Environment Variable: `REACT_APP_API_URL` = your main backend URL
6. Configure CORS in main backend
7. Create admin user in MongoDB
