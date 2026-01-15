const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log(`❌ Auth middleware: User not found - ${decoded.userId}`);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Explicit role check with string comparison
    const userRole = String(user.role).trim();
    const isAdmin = userRole === 'admin';
    const isSuperAdmin = userRole === 'super_admin';
    
    console.log(`🔍 Auth middleware: ${user.email} - role: ${userRole}, isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}`);

    if (!isAdmin && !isSuperAdmin) {
      console.log(`❌ Auth middleware: Non-admin user - ${user.email} (role: ${userRole})`);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    console.log(`✅ Auth middleware passed for ${user.email} (${userRole})`);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

module.exports = { authenticateToken };
