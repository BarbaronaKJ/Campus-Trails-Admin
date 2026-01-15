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
    enum: ['admin', 'student', 'super_admin'],
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
  // Secret question for password recovery
  secretQuestion: {
    type: String,
    enum: [
      'What is the name of your first pet?',
      'What city were you born in?',
      'What is your mother\'s maiden name?',
      'What was the name of your elementary school?',
      'What is your favorite food?',
      'What is the name of your best friend?',
      'What is your favorite movie?',
      'What is your favorite book?',
      'What is your favorite color?',
      'What is your favorite sport?'
    ],
    default: null
  },
  secretAnswer: {
    type: String,
    trim: true,
    default: null
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

// Static method to find user by email
userSchema.statics.findByEmail = async function(email) {
  return await this.findOne({ email: email.toLowerCase() });
};

// Method to verify secret answer (case-insensitive)
userSchema.methods.verifySecretAnswer = async function(answer) {
  if (!this.secretAnswer || !answer) {
    return false;
  }
  // Compare case-insensitively
  return this.secretAnswer.toLowerCase().trim() === answer.toLowerCase().trim();
};

module.exports = mongoose.model('User', userSchema);
