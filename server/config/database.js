import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initializeJSONDB = async () => {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const dbPath = path.join(dataDir, 'db.json');

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch (error) {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    // Initialize database file if it doesn't exist
    try {
      await fs.access(dbPath);
      console.log('✅ JSON Database Connected: ' + dbPath);
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
      
      await fs.writeFile(dbPath, JSON.stringify(initialData, null, 2));
      console.log('🆕 Initialized new JSON database');
    }

    // Handle app termination
    process.on('SIGINT', () => {
      console.log('JSON database connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    process.exit(1);
  }
};

export default initializeJSONDB;