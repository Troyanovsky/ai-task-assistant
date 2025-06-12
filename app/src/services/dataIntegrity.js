/**
 * Data Integrity Service
 * Provides utilities for checking and maintaining data consistency
 */

import databaseService from './database.js';

// Determine which logger to use based on the environment
let logger;
try {
  // Check if we're in the main process (Node.js environment)
  if (typeof window === 'undefined') {
    // We're in the main process
    logger = require('../../electron-main/logger.js').default;
  } else {
    // We're in the renderer process
    logger = require('./logger.js').default;
  }
} catch (error) {
  // Fallback console logger
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    verbose: console.debug,
    silly: console.debug,
    logError: (error, context = '') => {
      if (error instanceof Error) {
        console.error(`${context}: ${error.message}`, error.stack);
      } else {
        console.error(`${context}: ${error}`);
      }
    },
  };
}

class DataIntegrityService {
  /**
   * Check for orphaned tasks (tasks without valid project references)
   * @returns {Array} - Array of orphaned task records
   */
  async findOrphanedTasks() {
    try {
      const orphanedTasks = databaseService.query(`
        SELECT t.* 
        FROM tasks t 
        LEFT JOIN projects p ON t.project_id = p.id 
        WHERE p.id IS NULL
      `);
      
      if (orphanedTasks.length > 0) {
        logger.warn(`Found ${orphanedTasks.length} orphaned tasks`);
      }
      
      return orphanedTasks;
    } catch (error) {
      logger.error('Error finding orphaned tasks:', error);
      return [];
    }
  }

  /**
   * Check for orphaned notifications (notifications without valid task references)
   * @returns {Array} - Array of orphaned notification records
   */
  async findOrphanedNotifications() {
    try {
      const orphanedNotifications = databaseService.query(`
        SELECT n.* 
        FROM notifications n 
        LEFT JOIN tasks t ON n.task_id = t.id 
        WHERE t.id IS NULL
      `);
      
      if (orphanedNotifications.length > 0) {
        logger.warn(`Found ${orphanedNotifications.length} orphaned notifications`);
      }
      
      return orphanedNotifications;
    } catch (error) {
      logger.error('Error finding orphaned notifications:', error);
      return [];
    }
  }

  /**
   * Check for orphaned recurrence rules (rules without valid task references)
   * @returns {Array} - Array of orphaned recurrence rule records
   */
  async findOrphanedRecurrenceRules() {
    try {
      const orphanedRules = databaseService.query(`
        SELECT r.* 
        FROM recurrence_rules r 
        LEFT JOIN tasks t ON r.task_id = t.id 
        WHERE t.id IS NULL
      `);
      
      if (orphanedRules.length > 0) {
        logger.warn(`Found ${orphanedRules.length} orphaned recurrence rules`);
      }
      
      return orphanedRules;
    } catch (error) {
      logger.error('Error finding orphaned recurrence rules:', error);
      return [];
    }
  }

  /**
   * Perform a comprehensive data integrity check
   * @returns {Object} - Integrity check results
   */
  async performIntegrityCheck() {
    try {
      logger.info('Starting comprehensive data integrity check...');
      
      const results = {
        orphanedTasks: await this.findOrphanedTasks(),
        orphanedNotifications: await this.findOrphanedNotifications(),
        orphanedRecurrenceRules: await this.findOrphanedRecurrenceRules(),
        timestamp: new Date().toISOString()
      };

      const totalOrphaned = results.orphanedTasks.length + 
                           results.orphanedNotifications.length + 
                           results.orphanedRecurrenceRules.length;

      if (totalOrphaned === 0) {
        logger.info('✅ Data integrity check passed - no orphaned records found');
      } else {
        logger.warn(`⚠️ Data integrity issues found: ${totalOrphaned} orphaned records`);
      }

      return results;
    } catch (error) {
      logger.error('Error during integrity check:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Deletes orphaned notifications.
   * @param {Array} orphanedNotifications - Array of orphaned notification records.
   * @param {Object} results - Object to store cleanup results.
   * @private
   */
  _deleteOrphanedNotifications(orphanedNotifications, results) {
    for (const notification of orphanedNotifications) {
      try {
        const result = databaseService.delete('DELETE FROM notifications WHERE id = ?', [notification.id]);
        if (result && result.changes > 0) {
          results.deletedNotifications++;
        }
      } catch (error) {
        results.errors.push(`Failed to delete notification ${notification.id}: ${error.message}`);
      }
    }
  }

  /**
   * Deletes orphaned recurrence rules.
   * @param {Array} orphanedRecurrenceRules - Array of orphaned recurrence rule records.
   * @param {Object} results - Object to store cleanup results.
   * @private
   */
  _deleteOrphanedRecurrenceRules(orphanedRecurrenceRules, results) {
    for (const rule of orphanedRecurrenceRules) {
      try {
        const result = databaseService.delete('DELETE FROM recurrence_rules WHERE id = ?', [rule.id]);
        if (result && result.changes > 0) {
          results.deletedRecurrenceRules++;
        }
      } catch (error) {
        results.errors.push(`Failed to delete recurrence rule ${rule.id}: ${error.message}`);
      }
    }
  }

  /**
   * Deletes orphaned tasks.
   * @param {Array} orphanedTasks - Array of orphaned task records.
   * @param {Object} results - Object to store cleanup results.
   * @private
   */
  _deleteOrphanedTasks(orphanedTasks, results) {
    for (const task of orphanedTasks) {
      try {
        const result = databaseService.delete('DELETE FROM tasks WHERE id = ?', [task.id]);
        if (result && result.changes > 0) {
          results.deletedTasks++;
        }
      } catch (error) {
        results.errors.push(`Failed to delete task ${task.id}: ${error.message}`);
      }
    }
  }

  /**
   * Clean up orphaned data (use with caution!)
   * @param {Object} options - Cleanup options
   * @returns {Object} - Cleanup results
   */
  async cleanupOrphanedData(options = { dryRun: true }) {
    try {
      logger.info(`Starting orphaned data cleanup (dry run: ${options.dryRun})...`);
      
      const results = {
        deletedTasks: 0,
        deletedNotifications: 0,
        deletedRecurrenceRules: 0,
        errors: []
      };

      // Find orphaned data
      const orphanedTasks = await this.findOrphanedTasks();
      const orphanedNotifications = await this.findOrphanedNotifications();
      const orphanedRecurrenceRules = await this.findOrphanedRecurrenceRules();

      if (!options.dryRun) {
        // Delete orphaned notifications
        this._deleteOrphanedNotifications(orphanedNotifications, results);

        // Delete orphaned recurrence rules
        this._deleteOrphanedRecurrenceRules(orphanedRecurrenceRules, results);

        // Delete orphaned tasks
        this._deleteOrphanedTasks(orphanedTasks, results);

        logger.info(`Cleanup completed: ${results.deletedTasks} tasks, ${results.deletedNotifications} notifications, ${results.deletedRecurrenceRules} recurrence rules deleted`);
      } else {
        logger.info(`Dry run completed: would delete ${orphanedTasks.length} tasks, ${orphanedNotifications.length} notifications, ${orphanedRecurrenceRules.length} recurrence rules`);
      }

      return results;
    } catch (error) {
      logger.error('Error during cleanup:', error);
      return {
        error: error.message,
        deletedTasks: 0,
        deletedNotifications: 0,
        deletedRecurrenceRules: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Get database statistics
   * @returns {Object} - Database statistics
   */
  async getDatabaseStats() {
    try {
      const stats = {
        projects: databaseService.queryOne('SELECT COUNT(*) as count FROM projects')?.count || 0,
        tasks: databaseService.queryOne('SELECT COUNT(*) as count FROM tasks')?.count || 0,
        notifications: databaseService.queryOne('SELECT COUNT(*) as count FROM notifications')?.count || 0,
        recurrenceRules: databaseService.queryOne('SELECT COUNT(*) as count FROM recurrence_rules')?.count || 0,
        timestamp: new Date().toISOString()
      };

      logger.info(`Database stats: ${stats.projects} projects, ${stats.tasks} tasks, ${stats.notifications} notifications, ${stats.recurrenceRules} recurrence rules`);
      
      return stats;
    } catch (error) {
      logger.error('Error getting database stats:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const dataIntegrityService = new DataIntegrityService();

export default dataIntegrityService;
