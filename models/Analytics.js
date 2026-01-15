/**
 * Analytics Schema - Anonymous usage tracking
 * Tracks searches and pathfinding routes without user identification
 * Complies with privacy guidelines for capstone projects
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Search tracking
  searches: [{
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    resultCount: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Pathfinding route tracking (Point A to B connections)
  pathfindingRoutes: [{
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true
    },
    startPoint: {
      pinId: {
        type: mongoose.Schema.Types.Mixed, // Can be number, string, or ObjectId
        required: true
      },
      title: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      }
    },
    endPoint: {
      pinId: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      title: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      }
    },
    pathLength: {
      type: Number, // Number of nodes in the path
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'analytics'
});

// Indexes for efficient querying
analyticsSchema.index({ 'searches.timestamp': -1 });
analyticsSchema.index({ 'pathfindingRoutes.timestamp': -1 });
analyticsSchema.index({ 'searches.campusId': 1 });
analyticsSchema.index({ 'pathfindingRoutes.campusId': 1 });

// Static method to get or create analytics document
analyticsSchema.statics.getOrCreate = async function() {
  let analytics = await this.findOne();
  if (!analytics) {
    analytics = new this({
      searches: [],
      pathfindingRoutes: []
    });
    await analytics.save();
  }
  return analytics;
};

// Method to add a search
analyticsSchema.methods.addSearch = function(campusId, query, resultCount = 0) {
  this.searches.push({
    campusId,
    query: query.trim(),
    resultCount,
    timestamp: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to add a pathfinding route
analyticsSchema.methods.addPathfindingRoute = function(campusId, startPoint, endPoint, pathLength = 0) {
  this.pathfindingRoutes.push({
    campusId,
    startPoint: {
      pinId: startPoint.pinId,
      title: startPoint.title || '',
      description: startPoint.description || ''
    },
    endPoint: {
      pinId: endPoint.pinId,
      title: endPoint.title || '',
      description: endPoint.description || ''
    },
    pathLength,
    timestamp: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to get popular routes (most used point A to B connections)
analyticsSchema.methods.getPopularRoutes = function(campusId = null, limit = 10) {
  let routes = this.pathfindingRoutes;
  
  if (campusId) {
    routes = routes.filter(r => r.campusId.toString() === campusId.toString());
  }

  // Count occurrences of each route
  const routeCounts = {};
  routes.forEach(route => {
    const key = `${route.startPoint.pinId}-${route.endPoint.pinId}`;
    if (!routeCounts[key]) {
      routeCounts[key] = {
        startPoint: route.startPoint,
        endPoint: route.endPoint,
        count: 0,
        campusId: route.campusId
      };
    }
    routeCounts[key].count++;
  });

  // Sort by count and return top routes
  return Object.values(routeCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

// Method to get popular searches
analyticsSchema.methods.getPopularSearches = function(campusId = null, limit = 10) {
  let searches = this.searches;
  
  if (campusId) {
    searches = searches.filter(s => s.campusId.toString() === campusId.toString());
  }

  // Count occurrences of each search query
  const searchCounts = {};
  searches.forEach(search => {
    const query = search.query.toLowerCase().trim();
    if (!searchCounts[query]) {
      searchCounts[query] = {
        query: search.query,
        count: 0,
        campusId: search.campusId
      };
    }
    searchCounts[query].count++;
  });

  // Sort by count and return top searches
  return Object.values(searchCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
