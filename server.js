const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection (non-blocking)
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Health check route (FIRST - must be before all other routes)
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin Panel API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes (before static file serving)
app.use('/api/admin/auth', require('./routes/auth'));
app.use('/api/admin/pins', require('./routes/pins'));
app.use('/api/admin/users', require('./routes/users'));
app.use('/api/admin/campuses', require('./routes/campuses'));
app.use('/api/admin/notifications', require('./routes/notifications'));
app.use('/api/admin/feedbacks', require('./routes/feedbacks'));
app.use('/api/admin/developers', require('./routes/developers'));

// Root route
app.get('/', (req, res) => {
  const buildPath = path.join(__dirname, 'client/build');
  const isProduction = process.env.NODE_ENV === 'production';
  const buildExists = fs.existsSync(buildPath);
  
  if (isProduction && buildExists) {
    res.sendFile(path.join(buildPath, 'index.html'));
  } else {
    res.json({ 
      success: true, 
      message: 'Admin Panel API is running',
      mode: process.env.NODE_ENV || 'development',
      note: isProduction && !buildExists
        ? 'React build not found. Please run: cd client && npm run build'
        : 'In development mode. Please use React dev server (cd client && npm start)',
      endpoints: {
        health: '/health',
        auth: '/api/admin/auth',
        pins: '/api/admin/pins',
        users: '/api/admin/users',
        campuses: '/api/admin/campuses',
        notifications: '/api/admin/notifications',
        feedbacks: '/api/admin/feedbacks',
        developers: '/api/admin/developers'
      }
    });
  }
});

// Serve static files from React app in production
const buildPath = path.join(__dirname, 'client/build');
if (process.env.NODE_ENV === 'production' && fs.existsSync(buildPath)) {
  // Serve static assets (CSS, JS, images, etc.)
  app.use(express.static(buildPath));
  
  // Catch-all for React Router (must be LAST - after all API routes)
  // This only executes if no route above matched
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Admin Panel Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
