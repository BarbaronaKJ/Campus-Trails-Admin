# Super Admin Login Fix Guide

## Quick Diagnosis

### Step 1: Check Your Account Role
Run this script to verify your account has the `super_admin` role:

```bash
cd /home/barbs/GitHub/Campus-Trails-Admin
node scripts/diagnoseLogin.js YOUR_EMAIL_HERE
```

This will show:
- Your current role
- Whether `super_admin` is in the enum
- Whether you can login

### Step 2: Set Your Account to Super Admin (if needed)
If your role is not `super_admin`, run:

```bash
# Option 1: Using .env file
node scripts/setSuperAdmin.js YOUR_EMAIL_HERE

# Option 2: Direct MongoDB URI
node scripts/setSuperAdminWithUri.js YOUR_EMAIL_HERE "YOUR_MONGODB_URI"
```

### Step 3: Verify Backend Code is Deployed
The backend on Render must have the latest code that supports `super_admin`.

**Check Render Deployment:**
1. Go to your Render dashboard
2. Check the backend service logs
3. Look for the latest deployment timestamp
4. If it's old, trigger a manual redeploy

**To Force Redeploy:**
1. Go to Render dashboard → Your backend service
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete

### Step 4: Check Backend Logs
When you attempt to login, check the Render logs. You should see:

```
🔍 Login attempt: your-email@example.com
🔍 User found: [user_id]
🔍 Current role: super_admin (type: string)
🔍 Role check: admin=false, super_admin=true
🔍 Normalized role check: isAdmin=false, isSuperAdmin=true
✅ Role check passed for your-email@example.com (super_admin)
✅ Admin login successful: your-email@example.com
```

If you see `❌ Login attempt: Non-admin user`, the backend code is outdated.

### Step 5: Verify Environment Variables
Make sure your Render backend has:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Same secret used for token generation
- `CORS_ORIGINS` - Should include your admin panel URL

## Common Issues

### Issue 1: Backend Not Redeployed
**Symptom:** Login fails with 403 even though role is `super_admin`
**Fix:** Redeploy backend on Render

### Issue 2: Wrong Role in Database
**Symptom:** `diagnoseLogin.js` shows role is not `super_admin`
**Fix:** Run `setSuperAdmin.js` script

### Issue 3: JWT_SECRET Mismatch
**Symptom:** Token verification fails
**Fix:** Ensure `JWT_SECRET` is the same in all environments

### Issue 4: Case Sensitivity
**Symptom:** Role check fails due to string comparison
**Fix:** Code now uses explicit string trimming and comparison

## Testing the Fix

1. **Verify role in database:**
   ```bash
   node scripts/diagnoseLogin.js YOUR_EMAIL
   ```

2. **Set role if needed:**
   ```bash
   node scripts/setSuperAdmin.js YOUR_EMAIL
   ```

3. **Redeploy backend on Render:**
   - Go to Render dashboard
   - Click "Manual Deploy" → "Deploy latest commit"

4. **Test login:**
   - Try logging in to admin panel
   - Check Render logs for detailed output
   - Should see `✅ Admin login successful`

## Enhanced Logging

The updated code now logs:
- Exact role value and type
- Role enum values from schema
- Step-by-step role checks
- Whether each check passes or fails

This makes it easy to see exactly where the login is failing.
