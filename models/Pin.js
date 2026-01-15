const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  id: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: null },
  category: { type: String, trim: true, default: 'Other', index: true },
  isVisible: { type: Boolean, required: true, default: true, index: true },
  pinType: {
    type: String,
    enum: ['facility', 'waypoint'],
    required: true,
    default: 'facility',
    index: true
  },
  qrCode: { type: String, trim: true, default: null, index: true },
  image: { type: String, trim: true, default: null },
  neighbors: { type: [mongoose.Schema.Types.Mixed], default: [], index: true },
  buildingNumber: { type: Number, default: null, index: true },
  floors: [{
    level: { type: Number, required: true },
    floorPlan: { type: String, trim: true, default: null },
    rooms: [{
      name: { type: String, required: true, trim: true },
      image: { type: String, trim: true, default: null },
      description: { type: String, trim: true, default: null }
    }]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'pins'
});

pinSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Pin', pinSchema);
