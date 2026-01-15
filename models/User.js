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
  // Password reset fields
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
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

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token and store it in the database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiration time (1 hour from now)
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  // Return the unhashed token (to send via email)
  return resetToken;
};

// Method to generate 6-digit OTP code
userSchema.methods.generatePasswordResetOTP = function() {
  const crypto = require('crypto');
  // Generate a 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash the OTP and store it in the database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(otpCode)
    .digest('hex');
  
  // Set expiration time (1 hour from now)
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  // Return the unhashed OTP (to send via email)
  return otpCode;
};

// Static method to find user by reset token
userSchema.statics.findByResetToken = async function(token) {
  const crypto = require('crypto');
  // Hash the provided token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with matching token that hasn't expired
  return await this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() } // Token must not be expired
  });
};

module.exports = mongoose.model('User', userSchema);
