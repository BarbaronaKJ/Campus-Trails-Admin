const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const FacilityReport = require('../models/FacilityReport');
const Pin = require('../models/Pin');

const router = express.Router();

// Get all facility reports with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      category, 
      status, 
      priority, 
      campusId, 
      pinId, 
      floorLevel,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (campusId) {
      query.campusId = campusId;
    }

    if (pinId) {
      query.pinId = pinId;
    }

    if (floorLevel) {
      query.floorLevel = parseInt(floorLevel);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await FacilityReport.find(query)
      .populate('userId', 'email username displayName')
      .populate('pinId', 'title description buildingNumber floors category')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FacilityReport.countDocuments(query);

    // Get category counts for dashboard
    const categoryCounts = await FacilityReport.aggregate([
      { $match: query.campusId ? { campusId: query.campusId } : {} },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get status counts
    const statusCounts = await FacilityReport.aggregate([
      { $match: query.campusId ? { campusId: query.campusId } : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get priority counts
    const priorityCounts = await FacilityReport.aggregate([
      { $match: query.campusId ? { campusId: query.campusId } : {} },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      reports,
      stats: {
        categoryCounts: categoryCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        priorityCounts: priorityCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get facility reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get facility report by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await FacilityReport.findById(req.params.id)
      .populate('userId', 'email username displayName')
      .populate('pinId', 'title description buildingNumber floors category')
      .populate('campusId', 'name');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Facility report not found' });
    }
    res.json({ success: true, report });
  } catch (error) {
    console.error('Get facility report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new facility report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      campusId,
      pinId,
      floorLevel,
      room,
      category,
      title,
      description,
      images,
      priority
    } = req.body;

    // Validate that the pin exists and has the specified floor
    const pin = await Pin.findById(pinId);
    if (!pin) {
      return res.status(404).json({ success: false, message: 'Building/facility not found' });
    }

    // Check if floor exists in the building
    const floorExists = pin.floors && pin.floors.some(f => f.level === parseInt(floorLevel));
    if (pin.floors && pin.floors.length > 0 && !floorExists) {
      return res.status(400).json({ 
        success: false, 
        message: `Floor ${floorLevel} does not exist in this building` 
      });
    }

    const report = new FacilityReport({
      userId,
      campusId: campusId || pin.campusId,
      pinId,
      floorLevel: parseInt(floorLevel) || 1,
      room: {
        name: room?.name || 'General Area',
        description: room?.description || null
      },
      category: category || 'Other',
      title,
      description,
      images: images || [],
      priority: priority || 'medium',
      status: 'new'
    });

    await report.save();

    const populatedReport = await FacilityReport.findById(report._id)
      .populate('userId', 'email username displayName')
      .populate('pinId', 'title description buildingNumber floors category')
      .populate('campusId', 'name');

    res.status(201).json({ 
      success: true, 
      message: 'Facility report created successfully',
      report: populatedReport 
    });
  } catch (error) {
    console.error('Create facility report error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update facility report (status, priority, admin notes, etc.)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      priority,
      adminNotes,
      assignedTo,
      resolution
    } = req.body;

    const updateData = { updatedAt: Date.now() };

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    
    // Handle resolution
    if (resolution) {
      updateData.resolution = resolution;
    }

    // If status is being set to resolved, update resolution timestamp
    if (status === 'resolved' && !resolution?.resolvedAt) {
      updateData['resolution.resolvedAt'] = Date.now();
    }

    const report = await FacilityReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('userId', 'email username displayName')
      .populate('pinId', 'title description buildingNumber floors category')
      .populate('campusId', 'name');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Facility report not found' });
    }

    res.json({ 
      success: true, 
      message: 'Facility report updated successfully',
      report 
    });
  } catch (error) {
    console.error('Update facility report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete facility report
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await FacilityReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Facility report not found' });
    }
    res.json({ success: true, message: 'Facility report deleted successfully' });
  } catch (error) {
    console.error('Delete facility report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get rooms/areas for a specific building and floor
router.get('/building/:pinId/floors', authenticateToken, async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.pinId);
    if (!pin) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    const floors = pin.floors || [];
    
    res.json({
      success: true,
      building: {
        id: pin._id,
        title: pin.title,
        buildingNumber: pin.buildingNumber,
        description: pin.description
      },
      floors: floors.map(floor => ({
        level: floor.level,
        floorPlan: floor.floorPlan,
        rooms: floor.rooms || []
      }))
    });
  } catch (error) {
    console.error('Get building floors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get report statistics by category
router.get('/stats/by-category', authenticateToken, async (req, res) => {
  try {
    const { campusId } = req.query;
    const matchQuery = campusId ? { campusId: campusId } : {};

    const stats = await FacilityReport.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            category: '$category',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          total: { $sum: '$count' },
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get reports by building
router.get('/stats/by-building', authenticateToken, async (req, res) => {
  try {
    const { campusId } = req.query;
    const matchQuery = campusId ? { campusId: campusId } : {};

    const stats = await FacilityReport.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$pinId',
          totalReports: { $sum: 1 },
          openReports: {
            $sum: {
              $cond: [
                { $in: ['$status', ['new', 'acknowledged', 'in-progress']] },
                1,
                0
              ]
            }
          },
          resolvedReports: {
            $sum: {
              $cond: [
                { $in: ['$status', ['resolved', 'closed']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'pins',
          localField: '_id',
          foreignField: '_id',
          as: 'building'
        }
      },
      { $unwind: '$building' },
      {
        $project: {
          buildingId: '$_id',
          buildingTitle: '$building.title',
          buildingNumber: '$building.buildingNumber',
          totalReports: 1,
          openReports: 1,
          resolvedReports: 1
        }
      },
      { $sort: { totalReports: -1 } }
    ]);

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get building stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
