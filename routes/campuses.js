const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Campus = require('../models/Campus');

const router = express.Router();

// Get all campuses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const campuses = await Campus.find({}).sort({ name: 1 });
    res.json({ success: true, campuses });
  } catch (error) {
    console.error('Get campuses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single campus
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }
    res.json({ success: true, campus });
  } catch (error) {
    console.error('Get campus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create campus
router.post('/', authenticateToken, async (req, res) => {
  try {
    const campus = new Campus(req.body);
    await campus.save();
    res.status(201).json({ success: true, campus });
  } catch (error) {
    console.error('Create campus error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Campus with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update campus
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const campus = await Campus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }

    res.json({ success: true, campus });
  } catch (error) {
    console.error('Update campus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete campus
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const campus = await Campus.findByIdAndDelete(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }
    res.json({ success: true, message: 'Campus deleted successfully' });
  } catch (error) {
    console.error('Delete campus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
