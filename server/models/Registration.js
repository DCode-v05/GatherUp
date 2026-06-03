import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled'],
    default: 'confirmed'
  },
  registrationCode: {
    type: String,
    unique: true,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'free'],
    default: 'free'
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate registrations
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// Generate registration code before saving
registrationSchema.pre('save', function(next) {
  if (!this.registrationCode) {
    this.registrationCode = 'GU' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

export default mongoose.model('Registration', registrationSchema);