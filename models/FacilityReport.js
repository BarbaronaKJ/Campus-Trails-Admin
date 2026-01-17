const mongoose = require('mongoose');

const facilityReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  pinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pin',
    required: true,
    index: true
  },
  // Floor level within the building
  floorLevel: {
    type: Number,
    required: true,
    default: 1
  },
  // Specific room/area on the floor
  room: {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null }
  },
  // Report category for classification
  category: {
    type: String,
    enum: [
      'Maintenance',      // Broken equipment, repairs needed
      'Safety',           // Safety hazards, fire safety issues
      'Cleanliness',      // Cleaning required, sanitation issues
      'Equipment',        // Equipment malfunction, missing items
      'Electrical',       // Electrical issues, lighting problems
      'Plumbing',         // Water leaks, drainage issues
      'HVAC',             // Heating, ventilation, air conditioning
      'Accessibility',    // Accessibility concerns, ADA compliance
      'Security',         // Security concerns, unauthorized access
      'Other'             // Other issues
    ],
    required: true,
    default: 'Other',
    index: true
  },
  // Report details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  // Images for the report (optional)
  images: [{
    url: { type: String, trim: true },
    caption: { type: String, trim: true, default: null }
  }],
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  // Report status
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'in-progress', 'resolved', 'closed', 'archived'],
    default: 'new',
    index: true
  },
  // Admin notes/response
  adminNotes: {
    type: String,
    trim: true,
    default: null,
    maxlength: 1000
  },
  // Who handled the report
  assignedTo: {
    type: String,
    trim: true,
    default: null
  },
  // Resolution details
  resolution: {
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, trim: true, default: null },
    resolutionNotes: { type: String, trim: true, default: null }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'facility_reports'
});

// Index for efficient queries
facilityReportSchema.index({ campusId: 1, category: 1, status: 1 });
facilityReportSchema.index({ pinId: 1, floorLevel: 1 });
facilityReportSchema.index({ createdAt: -1 });

facilityReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FacilityReport', facilityReportSchema);
