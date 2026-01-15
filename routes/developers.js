const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Developer = require('../models/Developer');

const router = express.Router();

// Get all developers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const developers = await Developer.find({}).sort({ order: 1, name: 1 });
    res.json({ success: true, developers });
  } catch (error) {
    console.error('Get developers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single developer
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const developer = await Developer.findById(req.params.id);
    if (!developer) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }
    res.json({ success: true, developer });
  } catch (error) {
    console.error('Get developer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create developer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const developer = new Developer(req.body);
    await developer.save();
    res.status(201).json({ success: true, developer });
  } catch (error) {
    console.error('Create developer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update developer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const developer = await Developer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!developer) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    res.json({ success: true, developer });
  } catch (error) {
    console.error('Update developer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete developer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const developer = await Developer.findByIdAndDelete(req.params.id);
    if (!developer) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }
    res.json({ success: true, message: 'Developer deleted successfully' });
  } catch (error) {
    console.error('Delete developer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
