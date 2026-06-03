import express from 'express';
import Event from '../models/EventJSON.js';
import Registration from '../models/RegistrationJSON.js';
import { protect, adminOnly, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events with filtering (shows admin-only events if admin is logged in)
// @access  Public/Private
router.get('/', optionalProtect, async (req, res) => {
  try {
    const { category, location, search, startDate, endDate, page = 1, limit = 10, adminOnly: adminOnlyParam } = req.query;
    
    let query = { status: 'active' };
    
    // If adminOnly parameter is provided and user is authenticated admin
    if (adminOnlyParam === 'true' && req.user && req.user.role === 'admin') {
      query.createdBy = req.user._id;
    } else {
      // For regular users and public access, show future events
      query.date = { $gte: new Date() };
    }

    // Add filters
    if (category) query.category = category;
    if (location) query.location = new RegExp(location, 'i');
    if (search) {
      query.$text = { $search: search };
    }
    if (startDate || endDate) {
      query.date = query.date || {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const options = {
      sort: { date: 1 },
      limit: limit * 1,
      skip: (page - 1) * limit
    };

    const events = await Event.findWithPopulate(query, { path: 'createdBy', select: 'name email' }, options);
    const total = await Event.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/events/admin/my-events
// @desc    Get events created by the admin
// @access  Private (Admin only)
router.get('/admin/my-events', protect, adminOnly, async (req, res) => {
  try {
    const events = await Event.findWithPopulate(
      { createdBy: req.user._id },
      { path: 'createdBy', select: 'name email' },
      { sort: { date: 1 } }
    );

    res.json(events);
  } catch (error) {
    console.error('Admin events fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdWithPopulate(req.params.id, { path: 'createdBy', select: 'name email' });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };

    const event = await Event.create(eventData);
    const populatedEvent = await Event.populate(event, { path: 'createdBy', select: 'name email' });

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns this event
    if (event.createdBy !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    const populatedEvent = await Event.populate(updatedEvent, { path: 'createdBy', select: 'name email' });

    res.json(populatedEvent);
  } catch (error) {
    console.error('Event update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns this event
    if (event.createdBy !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Event deletion error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/events/:id/live-telecast
// @desc    Update live telecast settings
// @access  Private (Admin only)
router.put('/:id/live-telecast', protect, adminOnly, async (req, res) => {
  try {
    const { isLiveTelecast, streamLink, isStreamActive } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns this event
    if (event.createdBy !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { 
        isLiveTelecast: isLiveTelecast !== undefined ? isLiveTelecast : event.isLiveTelecast,
        streamLink: streamLink !== undefined ? streamLink : event.streamLink,
        isStreamActive: isStreamActive !== undefined ? isStreamActive : event.isStreamActive
      },
      { new: true }
    );

    const populatedEvent = await Event.populate(updatedEvent, { path: 'createdBy', select: 'name email' });

    res.json(populatedEvent);
  } catch (error) {
    console.error('Live telecast update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/events/:id/viewer-join
// @desc    Track viewer joining live stream
// @access  Public (for registered users)
router.post('/:id/viewer-join', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isLiveTelecast || !event.isStreamActive) {
      return res.status(400).json({ message: 'Live stream is not active for this event' });
    }

    // Increment viewer count
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { liveViewerCount: (event.liveViewerCount || 0) + 1 },
      { new: true }
    );

    res.json({ 
      message: 'Viewer joined successfully',
      liveViewerCount: updatedEvent.liveViewerCount,
      streamLink: updatedEvent.streamLink
    });
  } catch (error) {
    console.error('Viewer join error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/events/:id/stream-access
// @desc    Check if user can access live stream (for registered users)
// @access  Private (Authenticated users)
router.get('/:id/stream-access', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isLiveTelecast) {
      return res.status(400).json({ 
        message: 'This event does not have live telecast',
        hasAccess: false 
      });
    }

    if (!event.isStreamActive) {
      return res.status(400).json({ 
        message: 'Live stream is not currently active',
        hasAccess: false,
        canAccessWhenActive: true
      });
    }

    // Check if user is registered for this event
    const Registration = require('../models/RegistrationJSON');
    const userRegistration = await Registration.findOne({ 
      userId: req.user._id, 
      eventId: req.params.id,
      status: 'confirmed'
    });

    if (!userRegistration) {
      return res.status(403).json({ 
        message: 'You must be registered for this event to access the live stream',
        hasAccess: false,
        needsRegistration: true
      });
    }

    // User is registered and stream is active - grant access
    res.json({
      message: 'Stream access granted',
      hasAccess: true,
      streamLink: event.streamLink,
      eventTitle: event.title,
      registrationCode: userRegistration.registrationCode,
      paymentStatus: userRegistration.paymentStatus
    });

  } catch (error) {
    console.error('Stream access check error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/events/:id/registered-viewer-join
// @desc    Track registered user joining live stream
// @access  Private (Authenticated users)
router.post('/:id/registered-viewer-join', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isLiveTelecast || !event.isStreamActive) {
      return res.status(400).json({ message: 'Live stream is not active for this event' });
    }

    // Check if user is registered for this event
    const userRegistration = await Registration.findOne({ 
      userId: req.user._id, 
      eventId: req.params.id,
      status: 'confirmed'
    });

    if (!userRegistration) {
      return res.status(403).json({ 
        message: 'You must be registered for this event to join the live stream' 
      });
    }

    // Increment viewer count
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { liveViewerCount: (event.liveViewerCount || 0) + 1 },
      { new: true }
    );

    res.json({ 
      message: 'Registered viewer joined successfully',
      liveViewerCount: updatedEvent.liveViewerCount,
      streamLink: updatedEvent.streamLink,
      registrationCode: userRegistration.registrationCode,
      userName: req.user.name
    });
  } catch (error) {
    console.error('Registered viewer join error:', error);
    res.status(500).json({ message: error.message });
  }
});
// @desc    Track viewer leaving live stream
// @access  Public
router.post('/:id/viewer-leave', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Decrement viewer count (minimum 0)
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { liveViewerCount: Math.max((event.liveViewerCount || 1) - 1, 0) },
      { new: true }
    );

    res.json({ 
      message: 'Viewer left successfully',
      liveViewerCount: updatedEvent.liveViewerCount
    });
  } catch (error) {
    console.error('Viewer leave error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/events/:id/public-stream-join
// @desc    Join public live stream when event is full
// @access  Public
router.post('/:id/public-stream-join', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isLiveTelecast) {
      return res.status(400).json({ message: 'This event does not have live telecast' });
    }

    if (!event.isStreamActive) {
      return res.status(400).json({ message: 'Live stream is not currently active' });
    }

    // Check if event is full
    const isEventFull = event.registeredCount >= event.capacity;
    if (!isEventFull) {
      return res.status(400).json({ 
        message: 'Event is not full yet. Please register for the event to access the stream.',
        canRegister: true
      });
    }

    // Increment viewer count for public stream
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { liveViewerCount: (event.liveViewerCount || 0) + 1 },
      { new: true }
    );

    res.json({ 
      message: 'Joined public stream successfully',
      liveViewerCount: updatedEvent.liveViewerCount,
      streamLink: updatedEvent.streamLink,
      eventTitle: updatedEvent.title
    });
  } catch (error) {
    console.error('Public stream join error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/events/:id/live-stats
// @desc    Get live stream statistics
// @access  Private (Admin only)
router.get('/:id/live-stats', protect, adminOnly, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user owns this event
    if (event.createdBy !== req.user._id) {
      return res.status(403).json({ message: 'Not authorized to view this event statistics' });
    }

    res.json({
      eventId: event._id,
      title: event.title,
      isLiveTelecast: event.isLiveTelecast,
      isStreamActive: event.isStreamActive,
      liveViewerCount: event.liveViewerCount || 0,
      streamLink: event.streamLink,
      registeredCount: event.registeredCount,
      capacity: event.capacity
    });
  } catch (error) {
    console.error('Live stats fetch error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;