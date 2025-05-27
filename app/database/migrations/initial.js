/**
 * Initial database migration
 */

const schema = require('../schema');

async function up(db) {
  try {
    // Create tables in the correct order to respect foreign key constraints
    await db.exec(schema.projects);
    await db.exec(schema.tasks);
    await db.exec(schema.notifications);
    await db.exec(schema.recurrence_rules);
    
    console.log('Database migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during database migration:', error);
    return false;
  }
}

module.exports = { up }; 