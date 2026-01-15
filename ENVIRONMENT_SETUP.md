# Environment Variables Setup Guide

## Required Environment Variables

The admin panel backend needs these environment variables to work:

1. **MONGODB_URI** - MongoDB connection string (REQUIRED)
2. **JWT_SECRET** - Secret key for JWT tokens (REQUIRED)
3. **PORT** - Server port (optional, defaults to 5001)
4. **NODE_ENV** - Environment mode (optional, 'production' or 'development')
5. **CORS_ORIGINS** - Allowed CORS origins (optional, defaults to '*')

## Setup on Render

### Step 1: Go to Render Dashboard

1. Open [Render Dashboard](https://dashboard.render.com)
2. Find your backend service: `campus-trails-admin-api` (or similar name)
3. Click on it to open the service page

### Step 2: Navigate to Environment Tab

1. In your service page, click on **"Environment"** tab (in the left sidebar)
2. You'll see a list of environment variables

### Step 3: Add/Update Environment Variables

#### MONGODB_URI (REQUIRED)

1. Click **"Add Environment Variable"** or find existing `MONGODB_URI`
2. **Key:** `MONGODB_URI`
3. **Value:** Your MongoDB connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority`
   - Get it from: MongoDB Atlas → Clusters → Connect → Connection String
   - Or use the same one from your main Campus-Trails backend

**Example:**
```
MONGODB_URI=mongodb+srv://admin:password123@cluster0.xxxxx.mongodb.net/campus-trails?retryWrites=true&w=majority
```

#### JWT_SECRET (REQUIRED)

1. Click **"Add Environment Variable"**
2. **Key:** `JWT_SECRET`
3. **Value:** A long, random secret string
   - Generate one: Use a password generator or run: `openssl rand -base64 32`
   - Should be at least 32 characters long
   - Keep it secret! Don't share it publicly

**Example:**
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-1234567890abcdef
```

**⚠️ Important:** Use the SAME JWT_SECRET as your main backend, or users won't be able to authenticate properly!

#### PORT (Optional)

1. **Key:** `PORT`
2. **Value:** `5001` (or whatever port Render assigns)
   - Render usually sets this automatically
   - Don't change unless you know what you're doing

#### NODE_ENV (Optional)

1. **Key:** `NODE_ENV`
2. **Value:** `production`
   - This tells the app it's in production mode

#### CORS_ORIGINS (Optional)

1. **Key:** `CORS_ORIGINS`
2. **Value:** Your frontend URL(s), comma-separated
   - Example: `https://campus-trails-admin.vercel.app,https://your-domain.com`
   - Or leave empty/default for development

### Step 4: Save Changes

1. After adding/updating variables, click **"Save Changes"**
2. Render will automatically redeploy your service
3. Wait 2-3 minutes for deployment to complete

### Step 5: Verify Deployment

1. Go to **"Logs"** tab
2. Look for:
   ```
   ✅ MongoDB connected
   🚀 Admin Panel Server running on port 5001
   ```
3. If you see errors, check the logs for specific issues

## Getting Your MongoDB URI

### From MongoDB Atlas:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Log in to your account
3. Click on your cluster
4. Click **"Connect"**
5. Choose **"Connect your application"**
6. Copy the connection string
7. Replace `<password>` with your actual database password
8. Replace `<database>` with your database name (usually `campus-trails`)

### From Your Main Backend:

If your main Campus-Trails backend is already working:
1. Go to Render Dashboard
2. Open your main backend service
3. Go to **"Environment"** tab
4. Copy the `MONGODB_URI` value
5. Use the same value in the admin panel backend

## Getting Your JWT_SECRET

### Option 1: Use Same as Main Backend (Recommended)

1. Go to your main backend service on Render
2. Check the `JWT_SECRET` value
3. Use the SAME value in admin panel backend
4. This ensures tokens work across both services

### Option 2: Generate New One

```bash
# Generate a secure random secret
openssl rand -base64 32
```

Copy the output and use it as `JWT_SECRET`.

## Local Development Setup

If you want to run the backend locally:

1. Create a `.env` file in the root directory:
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   nano .env
   ```

2. Add these variables:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5001
   NODE_ENV=development
   CORS_ORIGINS=http://localhost:3000
   ```

3. Save the file (Ctrl+X, then Y, then Enter)

4. Run the server:
   ```bash
   npm start
   ```

## Verification Checklist

After setting up environment variables:

- [ ] `MONGODB_URI` is set and correct
- [ ] `JWT_SECRET` is set (same as main backend if sharing users)
- [ ] Backend deployed successfully (check logs)
- [ ] MongoDB connection successful (check logs for "✅ MongoDB connected")
- [ ] Server running (check logs for "🚀 Admin Panel Server running")

## Common Issues

### "MongoDB connection error"
- Check `MONGODB_URI` is correct
- Verify MongoDB Atlas allows connections from Render IPs (0.0.0.0/0)
- Check database credentials are correct

### "JWT verification failed"
- Make sure `JWT_SECRET` matches between services
- Check for typos or extra spaces in the value

### "CORS error"
- Add your frontend URL to `CORS_ORIGINS`
- Or set it to `*` for development (not recommended for production)

## Quick Reference

**Minimum Required Variables:**
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-here
```

**Full Setup (Recommended):**
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-here
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-url.com
```

## Need Help?

1. Check Render logs for specific error messages
2. Verify all required variables are set
3. Make sure values don't have extra spaces or quotes
4. Test MongoDB connection separately if needed
