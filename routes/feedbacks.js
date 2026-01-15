const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Feedback = require('../models/Feedback');

const router = express.Router();

// Get all feedbacks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { feedbackType, campusId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (feedbackType) {
      query.feedbackType = feedbackType;
    }

    if (campusId) {
      query.campusId = campusId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const feedbacks = await Feedback.find(query)
      .populate('userId', 'email username displayName')
      .populate('pinId', 'title description')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single feedback
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('userId', 'email username displayName')
      .populate('pinId', 'title description')
      .populate('campusId', 'name');

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete feedback
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
