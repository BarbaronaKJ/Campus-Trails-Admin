const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const SuggestionsAndFeedback = require('../models/SuggestionsAndFeedback');

const router = express.Router();

// Get all suggestions and feedbacks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, status, campusId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (campusId) {
      query.campusId = campusId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const suggestions = await SuggestionsAndFeedback.find(query)
      .populate('userId', 'email username displayName')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SuggestionsAndFeedback.countDocuments(query);

    res.json({
      success: true,
      suggestions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get suggestions and feedbacks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single suggestion/feedback
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const suggestion = await SuggestionsAndFeedback.findById(req.params.id)
      .populate('userId', 'email username displayName')
      .populate('campusId', 'name');

    if (!suggestion) {
      return res.status(404).json({ success: false, message: 'Suggestion/feedback not found' });
    }
    res.json({ success: true, suggestion });
  } catch (error) {
    console.error('Get suggestion/feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update suggestion/feedback status
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status && !['new', 'reviewed', 'resolved', 'archived'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be: new, reviewed, resolved, or archived' 
      });
    }

    const suggestion = await SuggestionsAndFeedback.findByIdAndUpdate(
      req.params.id,
      { status: status || 'reviewed', ...req.body },
      { new: true, runValidators: true }
    )
      .populate('userId', 'email username displayName')
      .populate('campusId', 'name');

    if (!suggestion) {
      return res.status(404).json({ success: false, message: 'Suggestion/feedback not found' });
    }

    res.json({ success: true, suggestion });
  } catch (error) {
    console.error('Update suggestion/feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete suggestion/feedback
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const suggestion = await SuggestionsAndFeedback.findByIdAndDelete(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ success: false, message: 'Suggestion/feedback not found' });
    }
    res.json({ success: true, message: 'Suggestion/feedback deleted successfully' });
  } catch (error) {
    console.error('Delete suggestion/feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
