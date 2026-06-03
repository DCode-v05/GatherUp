import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(DB_PATH);
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Initialize database file if it doesn't exist
const initializeDB = async () => {
  try {
    await fs.access(DB_PATH);
  } catch (error) {
    const initialData = {
      users: [],
      events: [],
      registrations: [],
      counters: {
        users: 0,
        events: 0,
        registrations: 0
      }
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2));
  }
};

// Read database
const readDB = async () => {
  await ensureDataDirectory();
  await initializeDB();
  
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    throw new Error('Database read error');
  }
};

// Write database
const writeDB = async (data) => {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
    throw new Error('Database write error');
  }
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Database operations
class JSONDatabase {
  // Expose readDB method for models
  async readDB() {
    return await readDB();
  }
  // Generic CRUD operations
  async create(collection, data) {
    const db = await readDB();
    
    // Generate ID and add timestamps
    const newItem = {
      ...data,
      _id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db[collection].push(newItem);
    db.counters[collection] = (db.counters[collection] || 0) + 1;
    
    await writeDB(db);
    return newItem;
  }

  async findAll(collection, filter = {}, options = {}) {
    const db = await readDB();
    let items = [...db[collection]];

    // Apply filters
    if (Object.keys(filter).length > 0) {
      items = items.filter(item => {
        return Object.entries(filter).every(([key, value]) => {
          if (key === '$text') {
            // Simple text search
            const searchText = value.$search.toLowerCase();
            const searchFields = ['title', 'description', 'name', 'email'];
            return searchFields.some(field => 
              item[field] && item[field].toLowerCase().includes(searchText)
            );
          }
          if (key === 'date' && typeof value === 'object') {
            const itemDate = new Date(item.date);
            if (value.$gte && itemDate < new Date(value.$gte)) return false;
            if (value.$lte && itemDate > new Date(value.$lte)) return false;
            return true;
          }
          if (typeof value === 'object' && value.constructor === RegExp) {
            return value.test(item[key]);
          }
          return item[key] === value;
        });
      });
    }

    // Apply sorting
    if (options.sort) {
      const sortField = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortField];
      items.sort((a, b) => {
        if (sortOrder === 1) {
          return a[sortField] > b[sortField] ? 1 : -1;
        } else {
          return a[sortField] < b[sortField] ? 1 : -1;
        }
      });
    }

    // Apply pagination
    if (options.skip) {
      items = items.slice(options.skip);
    }
    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  async findOne(collection, filter) {
    const items = await this.findAll(collection, filter);
    return items[0] || null;
  }

  async findById(collection, id) {
    return await this.findOne(collection, { _id: id });
  }

  async updateById(collection, id, updateData) {
    const db = await readDB();
    const index = db[collection].findIndex(item => item._id === id);
    
    if (index === -1) {
      return null;
    }

    db[collection][index] = {
      ...db[collection][index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await writeDB(db);
    return db[collection][index];
  }

  async deleteById(collection, id) {
    const db = await readDB();
    const index = db[collection].findIndex(item => item._id === id);
    
    if (index === -1) {
      return null;
    }

    const deletedItem = db[collection][index];
    db[collection].splice(index, 1);
    
    await writeDB(db);
    return deletedItem;
  }

  async countDocuments(collection, filter = {}) {
    const items = await this.findAll(collection, filter);
    return items.length;
  }

  // Populate functionality (simplified)
  async populate(item, populateConfig) {
    if (!item) return item;

    const db = await readDB();
    const populated = { ...item };

    if (typeof populateConfig === 'string') {
      // Simple population: 'createdBy'
      const field = populateConfig;
      if (populated[field]) {
        const referencedItem = db.users.find(user => user._id === populated[field]);
        if (referencedItem) {
          populated[field] = referencedItem;
        }
      }
    } else if (typeof populateConfig === 'object') {
      // Advanced population with field selection
      const field = populateConfig.path;
      const select = populateConfig.select;
      
      if (populated[field]) {
        let referencedItem = db.users.find(user => user._id === populated[field]);
        if (referencedItem && select) {
          const selectedFields = select.split(' ');
          referencedItem = selectedFields.reduce((obj, fieldName) => {
            if (referencedItem[fieldName] !== undefined) {
              obj[fieldName] = referencedItem[fieldName];
            }
            return obj;
          }, { _id: referencedItem._id });
        }
        if (referencedItem) {
          populated[field] = referencedItem;
        }
      }
    }

    return populated;
  }
}

export default new JSONDatabase();
