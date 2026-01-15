# Migration Notes

This repository was moved from `/Campus-Trails/admin-panel/` to a separate repository for independent deployment.

## Changes Made

### 1. API Configuration
- Updated `client/src/services/api.js` to use `REACT_APP_API_URL` environment variable
- Updated `client/src/context/AuthContext.js` to use `REACT_APP_API_URL` environment variable
- Removed hardcoded localhost URLs

### 2. Deployment Configuration
- Added `vercel.json` for Vercel frontend deployment
- Updated `render.yaml` for Render backend deployment
- Created `.env.example` with all required environment variables

### 3. Project Structure
- Frontend: `client/` directory (deploy to Vercel)
- Backend: Root directory files (deploy to Render)
- Both can be deployed independently

## Environment Variables

### For Vercel (Frontend)
- `REACT_APP_API_URL`: Your Render backend URL (e.g., `https://campus-trails-admin-api.onrender.com`)

### For Render (Backend)
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: JWT secret key (must match main backend)
- `CORS_ORIGINS`: Comma-separated list of allowed origins (include Vercel URL)
- `PORT`: Server port (default: 5001)
- `NODE_ENV`: `production`

## Next Steps

1. **Initialize Git Repository**
   ```bash
   cd /home/barbs/GitHub/Campus-Trails-Admin
   git init
   git add .
   git commit -m "Initial commit: Admin panel separated from main repo"
   ```

2. **Create GitHub Repository**
   - Create a new repository on GitHub
   - Push the code:
     ```bash
     git remote add origin <your-github-repo-url>
     git branch -M main
     git push -u origin main
     ```

3. **Deploy Backend to Render**
   - Follow instructions in `DEPLOYMENT.md`
   - Get your Render backend URL

4. **Deploy Frontend to Vercel**
   - Follow instructions in `DEPLOYMENT.md`
   - Set `REACT_APP_API_URL` to your Render backend URL

5. **Update CORS in Render**
   - After Vercel deployment, update `CORS_ORIGINS` in Render
   - Include your Vercel URL

## Important Notes

- The admin panel backend uses the same MongoDB database as the main Campus Trails app
- JWT_SECRET must match between admin panel backend and main backend (if sharing admin accounts)
- The admin panel is now completely independent and can be deployed separately
