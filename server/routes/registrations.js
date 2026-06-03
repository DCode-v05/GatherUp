import express from 'express';
import Registration from '../models/RegistrationJSON.js';
import Event from '../models/EventJSON.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/registrations/:eventId
// @desc    Register for an event
// @access  Private
router.post('/:eventId', protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event is full
    if (event.registeredCount >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // Check if user already registered
    const existingRegistration = await Registration.findOne({ userId, eventId });
    if (existingRegistration) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Create registration
    const registration = await Registration.create({
      userId,
      eventId,
      paymentStatus: event.ticketPrice > 0 ? 'pending' : 'free'
    });

    // Update event registered count
    const currentEvent = await Event.findById(eventId);
    await Event.findByIdAndUpdate(eventId, {
      registeredCount: (currentEvent.registeredCount || 0) + 1
    });

    const populatedRegistration = await Registration.populate(registration, [
      { path: 'eventId', select: 'title date time location ticketPrice' },
      { path: 'userId', select: 'name email' }
    ]);

    res.status(201).json(populatedRegistration);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message });
  }
});

// @route   GET /api/registrations/my-events
// @desc    Get user's registered events
// @access  Private
router.get('/my-events', protect, async (req, res) => {
  try {
    const registrations = await Registration.findWithPopulate(
      { userId: req.user._id },
      'eventId',
      { sort: { createdAt: -1 } }
    );

    res.json(registrations);
  } catch (error) {
    console.error('My events fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/registrations/:eventId
// @desc    Cancel registration
// @access  Private
router.delete('/:eventId', protect, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const registration = await Registration.findOne({ userId, eventId });
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    await Registration.findByIdAndDelete(registration._id);

    // Update event registered count
    const currentEvent = await Event.findById(eventId);
    await Event.findByIdAndUpdate(eventId, {
      registeredCount: Math.max((currentEvent.registeredCount || 1) - 1, 0)
    });

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Registration cancellation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/registrations/event/:eventId
// @desc    Get registrations for an event
// @access  Private (Admin only)
router.get('/event/:eventId', protect, adminOnly, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists and user owns it
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.createdBy !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to view registrations for this event' });
    }

    const registrations = await Registration.findWithPopulate(
      { eventId },
      { path: 'userId', select: 'name email' },
      { sort: { createdAt: -1 } }
    );

    res.json(registrations);
  } catch (error) {
    console.error('Event registrations fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;