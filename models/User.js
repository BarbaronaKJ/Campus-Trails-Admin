const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student'
  },
  profilePicture: {
    type: String,
    trim: true,
    default: null
  },
  displayName: {
    type: String,
    trim: true,
    default: null
  },
  pushToken: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  notificationPreferences: {
    enabled: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
    updates: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true }
  },
  activity: {
    savedPins: { type: [mongoose.Schema.Types.Mixed], default: [] },
    feedbackHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    lastActiveDate: { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'users'
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
