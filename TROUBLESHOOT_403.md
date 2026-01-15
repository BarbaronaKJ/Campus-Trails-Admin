# Troubleshooting 403 Forbidden Login Error

## The Problem
You're getting a `403 Forbidden` error when trying to log in with a super-admin account.

## Root Causes

### 1. Backend Not Redeployed
The backend on Render might still be running the **old code** that only allows `'admin'` role, not `'super_admin'`.

**Solution:**
1. Make sure you've pushed all changes to GitHub
2. Go to Render Dashboard → Your Backend Service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-3 minutes for deployment to complete

### 2. Account Doesn't Have super_admin Role
Your account in the database might not actually have the `'super_admin'` role set.

**Solution:**
Run the diagnostic script to check and fix:

```bash
cd /home/barbs/GitHub/Campus-Trails-Admin

# First, check your current role
node scripts/checkUserRole.js YOUR_EMAIL_HERE

# If role is not 'super_admin', set it
node scripts/setSuperAdmin.js YOUR_EMAIL_HERE

# Verify it worked
node scripts/checkUserRole.js YOUR_EMAIL_HERE
```

### 3. Check Server Logs
When you try to log in, check the Render logs. You should see:
- `🔍 Login attempt: YOUR_EMAIL - Current role: ...`
- `🔍 Role check: admin=..., super_admin=...`

If you see `super_admin=false`, your account doesn't have the role set.

## Quick Fix Steps

1. **Set your account to super_admin:**
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   node scripts/setSuperAdmin.js YOUR_EMAIL
   ```

2. **Redeploy backend on Render:**
   - Push to GitHub (if not already done)
   - Go to Render Dashboard
   - Manual Deploy → Deploy latest commit

3. **Try logging in again**

4. **Check the logs:**
   - Look for the detailed logging messages
   - Should see: `✅ Admin login successful: YOUR_EMAIL`

## Verification

After fixing, the login should work. The server logs will show:
```
🔍 Login attempt: YOUR_EMAIL - Current role: super_admin
🔍 Role check: admin=false, super_admin=true
✅ Admin login successful: YOUR_EMAIL
```

If you still get 403, check:
- ✅ Is the backend code deployed? (Check Render deployment status)
- ✅ Does your account have super_admin role? (Run checkUserRole.js)
- ✅ Are you using the correct email? (Case-sensitive, must match database)
