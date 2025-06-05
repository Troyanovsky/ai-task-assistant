/**
 * Initial database migration
 */

import schema from '../schema.js';
import logger from '../../electron-main/logger.js';

async function up(db) {
  try {
    // Create tables in the correct order to respect foreign key constraints
    await db.exec(schema.projects);
    await db.exec(schema.tasks);
    await db.exec(schema.notifications);
    await db.exec(schema.recurrence_rules);
    
    logger.info('Database migration completed successfully');
    return true;
  } catch (error) {
    logger.error('Error during database migration:', error);
    return false;
  }
}

export { up };