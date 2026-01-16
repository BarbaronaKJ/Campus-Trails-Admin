const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

const router = express.Router();

// Get all notifications (history)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find({})
      .populate('userId', 'email username')
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({});

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send notification
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { title, body, data, targetUserIds, targetAudience = 'all' } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    let users = [];
    if (targetAudience === 'all') {
      users = await User.find({});
    } else if (targetAudience === 'students') {
      users = await User.find({ role: 'student' });
    } else if (targetAudience === 'admins') {
      users = await User.find({ role: 'admin' });
    } else if (targetUserIds && targetUserIds.length > 0) {
      users = await User.find({ _id: { $in: targetUserIds } });
    }

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No users found matching the target audience.' 
      });
    }

    // Store notification in each user's profile instead of sending push notifications
    const notificationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notificationEntry = {
      id: notificationId,
      title,
      body,
      type: data?.type || 'custom',
      data: data || {},
      read: false,
      createdAt: new Date()
    };

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // Add notification to each user's notifications array
    for (const user of users) {
      try {
        // Initialize activity and notifications if they don't exist
        if (!user.activity) {
          user.activity = {};
        }
        if (!user.activity.notifications) {
          user.activity.notifications = [];
        }

        // Check if notification already exists (avoid duplicates)
        const exists = user.activity.notifications.find(n => n.id === notificationId);
        if (exists) {
          continue;
        }

        // Add notification to beginning of array (newest first)
        user.activity.notifications.unshift(notificationEntry);
        
        // Keep only last 100 notifications per user
        if (user.activity.notifications.length > 100) {
          user.activity.notifications = user.activity.notifications.slice(0, 100);
        }

        await user.save();
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push(`User ${user._id}: ${error.message || 'Unknown error'}`);
        console.error(`❌ Error storing notification for user ${user._id}:`, error);
      }
    }

    // Save notification history (for admin panel tracking)
    for (let i = 0; i < users.length; i++) {
      try {
        await Notification.create({
          userId: users[i]._id,
          expoPushToken: null, // No longer using push tokens
          title,
          body,
          data: data || {},
          isRead: false
        });
      } catch (error) {
        console.error(`Error creating notification history for user ${users[i]._id}:`, error);
      }
    }

    // Log detailed results
    console.log(`📬 Notification store results: ${successCount} success, ${failureCount} failed out of ${users.length} total`);

    res.json({
      success: true,
      message: 'Notifications stored',
      stats: {
        total: users.length,
        success: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('❌ Send notification error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error sending notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
