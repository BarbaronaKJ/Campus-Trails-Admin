# Campus Trails Admin Panel

Admin panel for managing Campus Trails application data, users, and content.

## 🏗️ Architecture

This repository contains:
- **Frontend** (`client/`): React application (deploy to Vercel)
- **Backend** (`server.js`, `routes/`, `models/`): Express API server (deploy to Render)

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Vercel account (for frontend)
- Render account (for backend)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Campus-Trails-Admin
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   REACT_APP_API_URL=http://localhost:5001
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-key
   CORS_ORIGINS=http://localhost:3000
   PORT=5001
   NODE_ENV=development
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Start backend
   npm run dev
   
   # Terminal 2: Start frontend
   cd client
   npm start
   ```

5. **Access the admin panel**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. **Connect your repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure build settings**
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

3. **Set environment variables in Vercel**
   - `REACT_APP_API_URL`: Your Render backend URL (e.g., `https://campus-trails-admin.onrender.com`)

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch

### Backend Deployment (Render)

1. **Create a new Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service**
   - **Name**: `campus-trails-admin-api` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Root Directory**: (leave empty, root of repo)

3. **Set environment variables in Render**
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-key
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   PORT=5001
   NODE_ENV=production
   ```

4. **Deploy**
   - Render will automatically deploy on every push to main branch

5. **Update Vercel environment variable**
   - After Render deployment, update `REACT_APP_API_URL` in Vercel to point to your Render service URL

## 📁 Project Structure

```
Campus-Trails-Admin/
├── client/                 # React frontend (Vercel)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── routes/                 # Express API routes (Render)
├── models/                 # Mongoose models
├── middleware/            # Auth middleware
├── server.js              # Express server (Render)
├── package.json           # Backend dependencies
├── vercel.json            # Vercel configuration
└── README.md
```

## 🔐 Authentication

The admin panel uses JWT authentication. Create an admin account:

```bash
node scripts/createAdmin.js
```

Or use the existing admin account from the main Campus Trails backend.

## 📝 API Endpoints

All API endpoints are prefixed with `/api/admin`:

- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/verify` - Verify token
- `GET /api/admin/pins` - Get all pins
- `GET /api/admin/users` - Get all users
- `GET /api/admin/campuses` - Get all campuses
- `GET /health` - Health check

## 🛠️ Development

### Backend Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Frontend Scripts
- `cd client && npm start` - Start React dev server
- `cd client && npm run build` - Build for production

## 🔧 Troubleshooting

### Frontend can't connect to backend
- Check `REACT_APP_API_URL` in Vercel environment variables
- Ensure CORS is configured correctly in Render

### Backend connection issues
- Verify `MONGODB_URI` is correct
- Check Render logs for connection errors
- Ensure MongoDB Atlas allows connections from Render IPs

## 📄 License

ISC
