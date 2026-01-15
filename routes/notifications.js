const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk');

const router = express.Router();
const expo = new Expo();

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
      users = await User.find({ pushToken: { $ne: null } }).select('pushToken _id');
    } else if (targetAudience === 'students') {
      users = await User.find({ role: 'student', pushToken: { $ne: null } }).select('pushToken _id');
    } else if (targetAudience === 'admins') {
      users = await User.find({ role: 'admin', pushToken: { $ne: null } }).select('pushToken _id');
    } else if (targetUserIds && targetUserIds.length > 0) {
      users = await User.find({ _id: { $in: targetUserIds }, pushToken: { $ne: null } }).select('pushToken _id');
    }

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'No users with push tokens found' });
    }

    const messages = users
      .filter(user => user.pushToken && Expo.isExpoPushToken(user.pushToken))
      .map(user => ({
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        badge: 1
      }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    // Save notification history
    for (let i = 0; i < users.length; i++) {
      if (tickets[i] && tickets[i].status === 'ok') {
        await Notification.create({
          userId: users[i]._id,
          expoPushToken: users[i].pushToken,
          title,
          body,
          data: data || {}
        });
      }
    }

    const successCount = tickets.filter(t => t.status === 'ok').length;
    const failureCount = tickets.length - successCount;

    res.json({
      success: true,
      message: 'Notifications sent',
      stats: {
        total: tickets.length,
        success: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
