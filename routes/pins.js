const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Pin = require('../models/Pin');
const Campus = require('../models/Campus');
const mongoose = require('mongoose');

const router = express.Router();

// Get all pins with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { campusId, pinType, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (campusId) {
      query.campusId = new mongoose.Types.ObjectId(campusId);
    }

    if (pinType) {
      query.pinType = pinType;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { qrCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pins = await Pin.find(query)
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Pin.countDocuments(query);

    res.json({
      success: true,
      pins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get pins error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single pin
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.id).populate('campusId', 'name');
    if (!pin) {
      return res.status(404).json({ success: false, message: 'Pin not found' });
    }
    res.json({ success: true, pin });
  } catch (error) {
    console.error('Get pin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create pin
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pinData = req.body;

    // Validate campus
    if (!mongoose.Types.ObjectId.isValid(pinData.campusId)) {
      return res.status(400).json({ success: false, message: 'Invalid campus ID' });
    }

    const campus = await Campus.findById(pinData.campusId);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }

    const pin = new Pin(pinData);
    await pin.save();

    res.status(201).json({ success: true, pin });
  } catch (error) {
    console.error('Create pin error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Pin with this ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update pin
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pin = await Pin.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('campusId', 'name');

    if (!pin) {
      return res.status(404).json({ success: false, message: 'Pin not found' });
    }

    res.json({ success: true, pin });
  } catch (error) {
    console.error('Update pin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete pin
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pin = await Pin.findByIdAndDelete(req.params.id);
    if (!pin) {
      return res.status(404).json({ success: false, message: 'Pin not found' });
    }
    res.json({ success: true, message: 'Pin deleted successfully' });
  } catch (error) {
    console.error('Delete pin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
