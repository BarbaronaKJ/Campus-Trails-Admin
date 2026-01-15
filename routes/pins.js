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

// Helper function to generate QR code deep link string
const generateQRCode = (pinId) => {
  // Format: campustrails://pin/{pinId}
  // This deep link will open the app and navigate to the specific pin
  return `campustrails://pin/${pinId}`;
};

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
    
    // Auto-generate QR code if not provided and pin is visible
    // Do this after creating the pin object so we can use the pin.id
    if (!pin.qrCode && pin.isVisible !== false) {
      // Use pin.id for the QR code deep link
      const pinId = pin.id || pin._id;
      pin.qrCode = generateQRCode(pinId);
      console.log(`✅ Auto-generated QR code for pin: ${pin.qrCode}`);
    }
    
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

// Update neighbors - MUST come before /:id route (more specific route first)
router.put('/:id/neighbors', authenticateToken, async (req, res) => {
  try {
    const { neighbors } = req.body;
    
    console.log('Update neighbors request:', {
      pinId: req.params.id,
      neighbors: neighbors,
      neighborsType: Array.isArray(neighbors) ? 'array' : typeof neighbors,
      neighborsLength: Array.isArray(neighbors) ? neighbors.length : 'N/A'
    });
    
    if (!Array.isArray(neighbors)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Neighbors must be an array',
        received: typeof neighbors
      });
    }

    // Validate pin ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid pin ID' });
    }

    const pin = await Pin.findById(req.params.id);
    if (!pin) {
      return res.status(404).json({ success: false, message: 'Pin not found' });
    }

    // Normalize neighbors array - ensure all values are properly formatted
    // Neighbors can be ObjectIds, strings, or numbers
    const normalizedNeighbors = neighbors.map(n => {
      // If it's already a valid format, keep it
      if (mongoose.Types.ObjectId.isValid(n)) {
        return n;
      }
      // If it's a number, keep it as number
      if (typeof n === 'number') {
        return n;
      }
      // If it's a string that looks like a number, convert to number
      if (typeof n === 'string' && !isNaN(n) && !isNaN(parseFloat(n))) {
        const num = parseFloat(n);
        // If it's a whole number, return as number, otherwise keep as string
        return num % 1 === 0 ? num : n;
      }
      // Otherwise keep as string
      return String(n);
    });

    // Get the pin's ID (for pathfinding, use pin.id, not _id)
    const currentPinId = pin.id || pin._id;
    const oldNeighbors = [...(pin.neighbors || [])];

    // Update the pin's neighbors
    pin.neighbors = normalizedNeighbors;
    pin.updatedAt = Date.now();
    await pin.save();

    // Update bidirectional connections for each neighbor
    for (const neighborId of normalizedNeighbors) {
      try {
        const neighborIdStr = String(neighborId);
        
        // Find neighbor pin by id or _id
        const neighborPin = await Pin.findOne({
          $or: [
            { id: neighborId },
            { _id: mongoose.Types.ObjectId.isValid(neighborId) ? neighborId : null }
          ]
        });

        if (neighborPin) {
          const neighborNeighbors = neighborPin.neighbors || [];
          const wasConnected = oldNeighbors.some(n => String(n) === neighborIdStr);
          const isNowConnected = normalizedNeighbors.some(n => String(n) === neighborIdStr);
          
          // Check if current pin is in neighbor's neighbors array
          const currentPinInNeighbor = neighborNeighbors.some(n => {
            // Compare using id field (for pathfinding)
            if (neighborPin.id !== undefined && currentPinId !== undefined) {
              return String(n) === String(currentPinId) || n === currentPinId;
            }
            // Fallback to _id comparison
            return String(n) === String(pin._id) || n === pin._id;
          });

          if (isNowConnected && !currentPinInNeighbor) {
            // Add reverse connection (new connection)
            neighborPin.neighbors = [...neighborNeighbors, currentPinId || pin._id];
            neighborPin.updatedAt = Date.now();
            await neighborPin.save();
            console.log(`Added reverse connection: ${neighborPin.title || neighborPin._id} now connects to ${pin.title || pin._id}`);
          } else if (!isNowConnected && wasConnected && currentPinInNeighbor) {
            // Remove reverse connection (connection was removed)
            neighborPin.neighbors = neighborNeighbors.filter(n => {
              // Compare using id field (for pathfinding)
              if (neighborPin.id !== undefined && currentPinId !== undefined) {
                return String(n) !== String(currentPinId) && n !== currentPinId;
              }
              // Fallback to _id comparison
              return String(n) !== String(pin._id) && n !== pin._id;
            });
            neighborPin.updatedAt = Date.now();
            await neighborPin.save();
            console.log(`Removed reverse connection: ${neighborPin.title || neighborPin._id} no longer connects to ${pin.title || pin._id}`);
          }
        }
      } catch (neighborError) {
        // Log error but don't fail the entire operation
        console.error(`Error updating reverse connection for neighbor ${neighborIdStr}:`, neighborError);
      }
    }

    // Populate campusId for response
    await pin.populate('campusId', 'name');

    console.log('Neighbors updated successfully:', {
      pinId: pin._id,
      pinTitle: pin.title,
      pinIdForPathfinding: currentPinId,
      neighborsCount: pin.neighbors.length
    });

    res.json({ success: true, pin });
  } catch (error) {
    console.error('Update neighbors error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update pin - MUST come after /:id/neighbors route (less specific route last)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    
    // Auto-generate QR code if not provided, pin is being made visible, and doesn't have one
    const existingPin = await Pin.findById(req.params.id);
    if (existingPin) {
      // If making pin visible and it doesn't have a QR code, generate one
      if (!updateData.qrCode && (updateData.isVisible !== false || existingPin.isVisible !== false) && !existingPin.qrCode) {
        const pinId = updateData.id || existingPin.id;
        updateData.qrCode = generateQRCode(pinId);
        console.log(`✅ Auto-generated QR code for updated pin: ${updateData.qrCode}`);
      }
    }

    const pin = await Pin.findByIdAndUpdate(
      req.params.id,
      updateData,
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
