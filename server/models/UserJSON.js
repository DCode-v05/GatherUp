import bcrypt from 'bcryptjs';
import jsonDB from '../services/jsonDatabase.js';

class User {
  static collection = 'users';

  // Validation helper
  static validate(userData) {
    const errors = [];
    
    if (!userData.name || userData.name.trim().length === 0) {
      errors.push('Name is required');
    }
    if (userData.name && userData.name.length > 50) {
      errors.push('Name cannot exceed 50 characters');
    }
    
    if (!userData.email || userData.email.trim().length === 0) {
      errors.push('Email is required');
    }
    
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (userData.email && !emailRegex.test(userData.email)) {
      errors.push('Please enter a valid email');
    }
    
    if (!userData.password || userData.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    if (userData.role && !['user', 'admin'].includes(userData.role)) {
      errors.push('Role must be either user or admin');
    }
    
    return errors;
  }

  // Hash password before saving
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  // Remove password from JSON output
  static sanitizeForOutput(user) {
    if (!user) return null;
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  // Create user
  static async create(userData) {
    const errors = this.validate(userData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Check if user exists
    const existingUser = await this.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password and create user
    const hashedPassword = await this.hashPassword(userData.password);
    const newUser = await jsonDB.create(this.collection, {
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      role: userData.role || 'user'
    });

    return this.sanitizeForOutput(newUser);
  }

  // Find methods
  static async find(filter = {}) {
    const users = await jsonDB.findAll(this.collection, filter);
    return users.map(user => this.sanitizeForOutput(user));
  }

  static async findOne(filter) {
    const user = await jsonDB.findOne(this.collection, filter);
    return user;  // Don't sanitize here as we might need password for auth
  }

  static async findById(id) {
    const user = await jsonDB.findById(this.collection, id);
    return user;  // Don't sanitize here as we might need password for auth
  }

  // Update user
  static async findByIdAndUpdate(id, updateData) {
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }
    
    const updatedUser = await jsonDB.updateById(this.collection, id, updateData);
    return this.sanitizeForOutput(updatedUser);
  }

  // Delete user
  static async findByIdAndDelete(id) {
    const deletedUser = await jsonDB.deleteById(this.collection, id);
    return this.sanitizeForOutput(deletedUser);
  }

  // Count documents
  static async countDocuments(filter = {}) {
    return await jsonDB.countDocuments(this.collection, filter);
  }
}

export default User;
