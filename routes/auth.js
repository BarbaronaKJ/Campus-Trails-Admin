const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ Login attempt: User not found - ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log(`🔍 Login attempt: ${email}`);
    console.log(`🔍 User found: ${user._id}`);
    console.log(`🔍 Current role: ${user.role} (type: ${typeof user.role})`);
    console.log(`🔍 Role value (JSON): ${JSON.stringify(user.role)}`);
    console.log(`🔍 Role check: admin=${user.role === 'admin'}, super_admin=${user.role === 'super_admin'}`);
    console.log(`🔍 Role enum values: ${User.schema.path('role').enumValues}`);
    console.log(`🔍 super_admin in enum: ${User.schema.path('role').enumValues.includes('super_admin')}`);

    // Explicit role check with string comparison
    const userRole = String(user.role).trim();
    const isAdmin = userRole === 'admin';
    const isSuperAdmin = userRole === 'super_admin';
    
    console.log(`🔍 Normalized role check: isAdmin=${isAdmin}, isSuperAdmin=${isSuperAdmin}`);

    if (!isAdmin && !isSuperAdmin) {
      console.log(`❌ Login attempt: Non-admin user - ${email} (role: ${userRole})`);
      return res.status(403).json({ success: false, message: 'Admin access required. Please contact an administrator.' });
    }
    
    console.log(`✅ Role check passed for ${email} (${userRole})`);

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`❌ Login attempt: Invalid password - ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log(`✅ Admin login successful: ${email}`);

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify Token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log(`❌ Verify token: User not found - ${decoded.userId}`);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Explicit role check with string comparison
    const userRole = String(user.role).trim();
    const isAdmin = userRole === 'admin';
    const isSuperAdmin = userRole === 'super_admin';
    
    console.log(`🔍 Verify token: ${user.email} - role: ${userRole}, isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}`);

    if (!isAdmin && !isSuperAdmin) {
      console.log(`❌ Verify token: Non-admin user - ${user.email} (role: ${userRole})`);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    console.log(`✅ Token verified for ${user.email} (${userRole})`);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
