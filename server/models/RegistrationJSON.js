import jsonDB from '../services/jsonDatabase.js';

class Registration {
  static collection = 'registrations';

  // Generate registration code
  static generateRegistrationCode() {
    return 'GU' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  // Generate QR code data
  static generateQRData(registrationCode, userName, eventTitle) {
    const cleanEventTitle = eventTitle.replace(/\s+/g, '').toUpperCase();
    const cleanUserName = userName.replace(/\s+/g, '').toUpperCase();
    return `${registrationCode}-${cleanUserName}-${cleanEventTitle}`;
  }

  // Validation helper
  static validate(registrationData) {
    const errors = [];
    
    if (!registrationData.userId) {
      errors.push('User ID is required');
    }
    
    if (!registrationData.eventId) {
      errors.push('Event ID is required');
    }
    
    const validStatuses = ['confirmed', 'pending', 'cancelled'];
    if (registrationData.status && !validStatuses.includes(registrationData.status)) {
      errors.push('Status must be one of: ' + validStatuses.join(', '));
    }
    
    const validPaymentStatuses = ['paid', 'pending', 'free'];
    if (registrationData.paymentStatus && !validPaymentStatuses.includes(registrationData.paymentStatus)) {
      errors.push('Payment status must be one of: ' + validPaymentStatuses.join(', '));
    }
    
    return errors;
  }

  // Create registration
  static async create(registrationData) {
    const errors = this.validate(registrationData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check for duplicate registration
    const existingRegistration = await this.findOne({
      userId: registrationData.userId,
      eventId: registrationData.eventId
    });

    if (existingRegistration) {
      throw new Error('User is already registered for this event');
    }

    const newRegistration = await jsonDB.create(this.collection, {
      userId: registrationData.userId,
      eventId: registrationData.eventId,
      status: registrationData.status || 'confirmed',
      registrationCode: registrationData.registrationCode || this.generateRegistrationCode(),
      paymentStatus: registrationData.paymentStatus || 'free',
      ticketQR: registrationData.ticketQR || null // Will be generated after getting user and event details
    });

    return newRegistration;
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

  // Update registration
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const updatedRegistration = await jsonDB.updateById(this.collection, id, updateData);
    
    if (options.new && updatedRegistration) {
      return updatedRegistration;
    }
    
    return updatedRegistration;
  }

  // Delete registration
  static async findByIdAndDelete(id) {
    return await jsonDB.deleteById(this.collection, id);
  }

  // Delete one registration based on filter
  static async findOneAndDelete(filter) {
    const registration = await this.findOne(filter);
    if (registration) {
      return await this.findByIdAndDelete(registration._id);
    }
    return null;
  }

  // Count documents
  static async countDocuments(filter = {}) {
    return await jsonDB.countDocuments(this.collection, filter);
  }

  // Populate fields
  static async populate(registration, populateConfig) {
    if (!registration) return null;
    
    if (Array.isArray(registration)) {
      const populatedRegistrations = [];
      for (const reg of registration) {
        let populated = { ...reg };
        
        // Handle multiple populate configs
        if (Array.isArray(populateConfig)) {
          for (const config of populateConfig) {
            populated = await this._populateSingle(populated, config);
          }
        } else {
          populated = await this._populateSingle(populated, populateConfig);
        }
        
        populatedRegistrations.push(populated);
      }
      return populatedRegistrations;
    }
    
    let populated = { ...registration };
    
    // Handle multiple populate configs
    if (Array.isArray(populateConfig)) {
      for (const config of populateConfig) {
        populated = await this._populateSingle(populated, config);
      }
    } else {
      populated = await this._populateSingle(populated, populateConfig);
    }
    
    return populated;
  }

  // Helper method for single population
  static async _populateSingle(item, populateConfig) {
    const db = await jsonDB.readDB();
    
    if (typeof populateConfig === 'string') {
      const field = populateConfig;
      if (item[field]) {
        let referencedItem;
        if (field === 'userId') {
          referencedItem = db.users.find(user => user._id === item[field]);
          if (referencedItem) {
            const { password, ...sanitizedUser } = referencedItem;
            item[field] = sanitizedUser;
          }
        } else if (field === 'eventId') {
          referencedItem = db.events.find(event => event._id === item[field]);
          if (referencedItem) {
            item[field] = referencedItem;
          }
        }
      }
    } else if (typeof populateConfig === 'object') {
      const field = populateConfig.path;
      const select = populateConfig.select;
      
      if (item[field]) {
        let referencedItem;
        if (field === 'userId') {
          referencedItem = db.users.find(user => user._id === item[field]);
        } else if (field === 'eventId') {
          referencedItem = db.events.find(event => event._id === item[field]);
        }
        
        if (referencedItem) {
          if (select) {
            const selectedFields = select.split(' ');
            referencedItem = selectedFields.reduce((obj, fieldName) => {
              if (referencedItem[fieldName] !== undefined) {
                obj[fieldName] = referencedItem[fieldName];
              }
              return obj;
            }, { _id: referencedItem._id });
          } else if (field === 'userId') {
            // Always exclude password for user
            const { password, ...sanitizedUser } = referencedItem;
            referencedItem = sanitizedUser;
          }
          
          item[field] = referencedItem;
        }
      }
    }
    
    return item;
  }

  // Static method to handle populate in find operations
  static async findWithPopulate(filter = {}, populateConfig = null, options = {}) {
    const registrations = await this.find(filter, options);
    
    if (populateConfig && registrations.length > 0) {
      return await this.populate(registrations, populateConfig);
    }
    
    return registrations;
  }

  static async findByIdWithPopulate(id, populateConfig = null) {
    const registration = await this.findById(id);
    
    if (populateConfig && registration) {
      return await this.populate(registration, populateConfig);
    }
    
    return registration;
  }
}

export default Registration;
