# Fix 403 Forbidden Login Error

## Current Issue
You're getting `403 Forbidden` when trying to log in. This means the backend is rejecting your login attempt.

## Root Cause
The backend checks if your role is `'admin'` or `'super_admin'`. If it's not, you get 403.

## Step-by-Step Fix

### Step 1: Set Your Account to super_admin

You need to run the script to set your role in the database. Choose one method:

#### Method A: Create .env file (Recommended)
```bash
cd /home/barbs/GitHub/Campus-Trails-Admin

# Create .env file
echo 'MONGODB_URI="your_mongodb_connection_string"' > .env

# Edit it with your actual URI
nano .env

# Then run the script
node scripts/setSuperAdmin.js kenth.barbarona9@gmail.com
```

#### Method B: Pass URI directly
```bash
cd /home/barbs/GitHub/Campus-Trails-Admin

# Get your MongoDB URI from Render Dashboard → Environment → MONGODB_URI
node scripts/setSuperAdminWithUri.js kenth.barbarona9@gmail.com "YOUR_MONGODB_URI"
```

**To get MongoDB URI:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Open your backend service (`campus-trails-admin-api`)
3. Go to "Environment" tab
4. Find `MONGODB_URI` and copy the value

### Step 2: Verify the Role Was Set

After running the script, you should see:
```
✅ Successfully set kenth.barbarona9@gmail.com to super_admin role!
   New role: super_admin
```

### Step 3: Redeploy Backend on Render

The backend needs to be running the latest code that allows `super_admin`:

1. **Push to GitHub** (if not already done):
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   git add .
   git commit -m "Super-admin login fixes"
   git push
   ```

2. **Deploy on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Open your backend service
   - Click **"Manual Deploy"** → **"Deploy latest commit"**
   - Wait 2-3 minutes for deployment

### Step 4: Check Render Logs

After deployment, when you try to log in, check the Render logs. You should see:

**If role is set correctly:**
```
🔍 Login attempt: kenth.barbarona9@gmail.com - Current role: super_admin
🔍 Role check: admin=false, super_admin=true
✅ Admin login successful: kenth.barbarona9@gmail.com
```

**If role is NOT set correctly:**
```
🔍 Login attempt: kenth.barbarona9@gmail.com - Current role: student
🔍 Role check: admin=false, super_admin=false
❌ Login attempt: Non-admin user - kenth.barbarona9@gmail.com (role: student)
```

### Step 5: Try Logging In Again

After completing steps 1-3, try logging in. The 403 error should be resolved.

## Troubleshooting

### Still Getting 403?

1. **Check Render Logs**: Look for the detailed logging messages to see what role your account has
2. **Verify Role in Database**: Run the check script:
   ```bash
   node scripts/checkUserRole.js kenth.barbarona9@gmail.com
   ```
3. **Verify Backend Code**: Make sure Render deployed the latest code with super_admin support
4. **Check Email**: Make sure you're using the exact email that exists in the database (case-sensitive)

### Common Issues

- **"MONGODB_URI not found"**: Create `.env` file or use the `setSuperAdminWithUri.js` script
- **"User not found"**: The email doesn't exist in the database. Check spelling.
- **"Connection failed"**: Check your MongoDB URI is correct and accessible

## Quick Command Reference

```bash
# Set super_admin role (with .env file)
node scripts/setSuperAdmin.js YOUR_EMAIL

# Set super_admin role (with URI parameter)
node scripts/setSuperAdminWithUri.js YOUR_EMAIL "MONGODB_URI"

# Check current role
node scripts/checkUserRole.js YOUR_EMAIL
```
