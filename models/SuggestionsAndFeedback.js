const mongoose = require('mongoose');

/**
 * SuggestionsAndFeedback Schema - Stores general suggestions and feedback from About Us
 * Separate from Feedback model which is for pin-specific reports (feedbackHistory)
 */
const suggestionsAndFeedbackSchema = new mongoose.Schema({
  // Foreign Key → User._id
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Foreign Key → Campus._id (for filtering by campus)
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  
  // Suggestion/feedback text (max 1000 characters)
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Type: 'suggestion' or 'feedback'
  type: {
    type: String,
    enum: ['suggestion', 'feedback'],
    default: 'suggestion',
    index: true
  },
  
  // Status: 'new', 'reviewed', 'resolved', 'archived'
  status: {
    type: String,
    enum: ['new', 'reviewed', 'resolved', 'archived'],
    default: 'new',
    index: true
  },
  
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
  collection: 'suggestions_and_feedbacks'
});

// Update the updatedAt field before saving
suggestionsAndFeedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for common queries
suggestionsAndFeedbackSchema.index({ userId: 1, campusId: 1 });
suggestionsAndFeedbackSchema.index({ type: 1, createdAt: -1 });
suggestionsAndFeedbackSchema.index({ status: 1, createdAt: -1 });
suggestionsAndFeedbackSchema.index({ campusId: 1, createdAt: -1 });

const SuggestionsAndFeedback = mongoose.model('SuggestionsAndFeedback', suggestionsAndFeedbackSchema);

module.exports = SuggestionsAndFeedback;
