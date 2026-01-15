/**
 * Analytics Routes - Anonymous usage tracking
 * No authentication required - tracks anonymous usage data
 */

const express = require('express');
const Analytics = require('../models/Analytics');
const router = express.Router();

// Track a search (anonymous)
router.post('/search', async (req, res) => {
  try {
    const { campusId, query, resultCount } = req.body;

    if (!campusId || !query) {
      return res.status(400).json({
        success: false,
        message: 'campusId and query are required'
      });
    }

    const analytics = await Analytics.getOrCreate();
    await analytics.addSearch(campusId, query, resultCount || 0);

    console.log(`📊 Anonymous search tracked: "${query}" on campus ${campusId}`);

    res.json({
      success: true,
      message: 'Search tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search'
    });
  }
});

// Track a pathfinding route (anonymous) - Point A to B connection
router.post('/pathfinding', async (req, res) => {
  try {
    const { campusId, startPoint, endPoint, pathLength } = req.body;

    if (!campusId || !startPoint || !endPoint) {
      return res.status(400).json({
        success: false,
        message: 'campusId, startPoint, and endPoint are required'
      });
    }

    if (!startPoint.pinId || !endPoint.pinId) {
      return res.status(400).json({
        success: false,
        message: 'startPoint.pinId and endPoint.pinId are required'
      });
    }

    const analytics = await Analytics.getOrCreate();
    await analytics.addPathfindingRoute(
      campusId,
      {
        pinId: startPoint.pinId,
        title: startPoint.title || '',
        description: startPoint.description || ''
      },
      {
        pinId: endPoint.pinId,
        title: endPoint.title || '',
        description: endPoint.description || ''
      },
      pathLength || 0
    );

    console.log(`🗺️  Anonymous pathfinding tracked: ${startPoint.pinId} -> ${endPoint.pinId} on campus ${campusId}`);

    res.json({
      success: true,
      message: 'Pathfinding route tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking pathfinding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track pathfinding route'
    });
  }
});

// Get analytics data (for admin panel)
router.get('/stats', async (req, res) => {
  try {
    const { campusId, days = 30 } = req.query;

    const analytics = await Analytics.getOrCreate();

    const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Filter searches by date
    let recentSearches = analytics.searches.filter(s => 
      new Date(s.timestamp) >= daysAgo
    );

    // Filter pathfinding routes by date
    let recentRoutes = analytics.pathfindingRoutes.filter(r => 
      new Date(r.timestamp) >= daysAgo
    );

    // Filter by campus if provided
    if (campusId) {
      recentSearches = recentSearches.filter(s => 
        s.campusId.toString() === campusId.toString()
      );
      recentRoutes = recentRoutes.filter(r => 
        r.campusId.toString() === campusId.toString()
      );
    }

    // Get popular routes
    const popularRoutes = analytics.getPopularRoutes(campusId, 20);

    // Get popular searches
    const popularSearches = analytics.getPopularSearches(campusId, 20);

    res.json({
      success: true,
      data: {
        totalSearches: analytics.searches.length,
        totalPathfindingRoutes: analytics.pathfindingRoutes.length,
        recentSearches: recentSearches, // Return full array for trend calculation
        recentRoutes: recentRoutes, // Return full array for trend calculation
        recentSearchesCount: recentSearches.length,
        recentRoutesCount: recentRoutes.length,
        popularRoutes,
        popularSearches,
        timeRange: {
          days: parseInt(days),
          startDate: daysAgo,
          endDate: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
});

// Get popular routes (for heatmap/visualization)
router.get('/popular-routes', async (req, res) => {
  try {
    const { campusId, limit = 10 } = req.query;

    const analytics = await Analytics.getOrCreate();
    const popularRoutes = analytics.getPopularRoutes(campusId, parseInt(limit));

    res.json({
      success: true,
      data: popularRoutes
    });
  } catch (error) {
    console.error('Error getting popular routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular routes'
    });
  }
});

// Get popular searches
router.get('/popular-searches', async (req, res) => {
  try {
    const { campusId, limit = 10 } = req.query;

    const analytics = await Analytics.getOrCreate();
    const popularSearches = analytics.getPopularSearches(campusId, parseInt(limit));

    res.json({
      success: true,
      data: popularSearches
    });
  } catch (error) {
    console.error('Error getting popular searches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches'
    });
  }
});

module.exports = router;
