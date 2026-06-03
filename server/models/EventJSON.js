import jsonDB from '../services/jsonDatabase.js';

class Event {
  static collection = 'events';

  // Validation helper
  static validate(eventData) {
    const errors = [];
    
    if (!eventData.title || eventData.title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (eventData.title && eventData.title.length > 100) {
      errors.push('Title cannot exceed 100 characters');
    }
    
    if (!eventData.description || eventData.description.trim().length === 0) {
      errors.push('Description is required');
    }
    if (eventData.description && eventData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }
    
    const validCategories = ['Technology', 'Business', 'Arts', 'Sports', 'Music', 'Education', 'Health', 'Other'];
    if (!eventData.category || !validCategories.includes(eventData.category)) {
      errors.push('Category is required and must be one of: ' + validCategories.join(', '));
    }
    
    if (!eventData.location || eventData.location.trim().length === 0) {
      errors.push('Location is required');
    }
    
    if (!eventData.date) {
      errors.push('Date is required');
    } else {
      const eventDate = new Date(eventData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        errors.push('Event date must be today or in the future');
      }
    }
    
    if (!eventData.time) {
      errors.push('Time is required');
    } else {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(eventData.time)) {
        errors.push('Please enter a valid time format (HH:MM)');
      }
    }
    
    if (!eventData.capacity || eventData.capacity < 1) {
      errors.push('Capacity must be at least 1');
    }
    
    if (eventData.ticketPrice === undefined || eventData.ticketPrice < 0) {
      errors.push('Ticket price is required and cannot be negative');
    }
    
    return errors;
  }

  // Create event
  static async create(eventData) {
    const errors = this.validate(eventData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const newEvent = await jsonDB.create(this.collection, {
      title: eventData.title.trim(),
      description: eventData.description.trim(),
      category: eventData.category,
      location: eventData.location.trim(),
      date: eventData.date,
      time: eventData.time,
      capacity: Number(eventData.capacity),
      ticketPrice: Number(eventData.ticketPrice),
      registeredCount: eventData.registeredCount || 0,
      createdBy: eventData.createdBy,
      status: eventData.status || 'active',
      imageUrl: eventData.imageUrl || '',
      isLiveTelecast: eventData.isLiveTelecast || false,
      streamLink: eventData.streamLink || '',
      liveViewerCount: eventData.liveViewerCount || 0,
      isStreamActive: eventData.isStreamActive || false
    });

    return newEvent;
  }

  // Find methods
  static async find(filter = {}, options = {}) {
    return await jsonDB.findAll(this.collection, filter, options);
  }

  static async findOne(filter) {
    return await jsonDB.findOne(this.collection, filter);
  }

  static async findById(id) {
    return await jsonDB.findById(this.collection, id);
  }

  // Update event
  static async findByIdAndUpdate(id, updateData, options = {}) {
    if (updateData) {
      // Validate if we're updating critical fields
      const existingEvent = await this.findById(id);
      if (!existingEvent) {
        return null;
      }

      const mergedData = { ...existingEvent, ...updateData };
      const errors = this.validate(mergedData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
    }

    const updatedEvent = await jsonDB.updateById(this.collection, id, updateData);
    
    if (options.new && updatedEvent) {
      return updatedEvent;
    }
    
    return updatedEvent;
  }

  // Delete event
  static async findByIdAndDelete(id) {
    return await jsonDB.deleteById(this.collection, id);
  }

  // Count documents
  static async countDocuments(filter = {}) {
    return await jsonDB.countDocuments(this.collection, filter);
  }

  // Populate createdBy field
  static async populate(event, populateConfig) {
    if (!event) return null;
    
    if (Array.isArray(event)) {
      const populatedEvents = [];
      for (const e of event) {
        const populated = await jsonDB.populate(e, populateConfig);
        populatedEvents.push(populated);
      }
      return populatedEvents;
    }
    
    return await jsonDB.populate(event, populateConfig);
  }

  // Static method to handle populate in find operations
  static async findWithPopulate(filter = {}, populateConfig = null, options = {}) {
    const events = await this.find(filter, options);
    
    if (populateConfig && events.length > 0) {
      return await this.populate(events, populateConfig);
    }
    
    return events;
  }

  static async findByIdWithPopulate(id, populateConfig = null) {
    const event = await this.findById(id);
    
    if (populateConfig && event) {
      return await this.populate(event, populateConfig);
    }
    
    return event;
  }
}

export default Event;
