const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  mapImageUrl: {
    type: String,
    required: false,
    default: null,
    trim: true
  },
  categories: {
    type: [String],
    default: [],
    trim: true
  },
  coordinates: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'campuses'
});

module.exports = mongoose.model('Campus', campusSchema);
