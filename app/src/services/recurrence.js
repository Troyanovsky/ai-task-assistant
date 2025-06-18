/**
 * Recurrence Service
 * Handles all recurrence-related operations including CRUD operations for recurrence rules,
 * next occurrence calculations, and task cloning logic
 */

import { RecurrenceRule, FREQUENCY } from '../models/RecurrenceRule.js';
import { Task, STATUS } from '../models/Task.js';
import databaseService from './database.js';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';

class RecurrenceService {
  /**
   * Add a new recurrence rule
   * @param {Object} ruleData - Recurrence rule data
   * @returns {boolean} - Success status
   */
  async addRecurrenceRule(ruleData) {
    try {
      const rule = new RecurrenceRule(ruleData);
      
      if (!rule.validate()) {
        logger.error('Invalid recurrence rule data');
        return false;
      }

      const data = rule.toDatabase();
      const result = databaseService.insert(
        `INSERT INTO recurrence_rules (
          id, task_id, frequency, interval, end_date, count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.task_id,
          data.frequency,
          data.interval,
          data.end_date,
          data.count,
          data.created_at,
        ]
      );

      if (result && result.changes > 0) {
        logger.info(`Recurrence rule ${data.id} added successfully for task ${data.task_id}`);
        return data;
      }
      return false;
    } catch (error) {
      logger.error('Error adding recurrence rule:', error);
      return false;
    }
  }

  /**
   * Get recurrence rule by task ID
   * @param {string} taskId - Task ID
   * @returns {RecurrenceRule|null} - Recurrence rule or null
   */
  async getRecurrenceRuleByTaskId(taskId) {
    try {
      const data = databaseService.queryOne(
        'SELECT * FROM recurrence_rules WHERE task_id = ?',
        [taskId]
      );

      if (data) {
        return RecurrenceRule.fromDatabase(data);
      }
      return null;
    } catch (error) {
      logger.error(`Error getting recurrence rule for task ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Get recurrence rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {RecurrenceRule|null} - Recurrence rule or null
   */
  async getRecurrenceRuleById(ruleId) {
    try {
      const data = databaseService.queryOne(
        'SELECT * FROM recurrence_rules WHERE id = ?',
        [ruleId]
      );

      if (data) {
        return RecurrenceRule.fromDatabase(data);
      }
      return null;
    } catch (error) {
      logger.error(`Error getting recurrence rule ${ruleId}:`, error);
      return null;
    }
  }

  /**
   * Update a recurrence rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updateData - Updated rule data
   * @returns {boolean} - Success status
   */
  async updateRecurrenceRule(ruleId, updateData) {
    try {
      const existingRule = await this.getRecurrenceRuleById(ruleId);
      if (!existingRule) {
        logger.error(`Recurrence rule ${ruleId} not found`);
        return false;
      }

      existingRule.update(updateData);
      
      if (!existingRule.validate()) {
        logger.error('Invalid recurrence rule data after update');
        return false;
      }

      const data = existingRule.toDatabase();
      const result = databaseService.update(
        `UPDATE recurrence_rules SET
          task_id = ?, frequency = ?, interval = ?, end_date = ?, count = ?
        WHERE id = ?`,
        [
          data.task_id,
          data.frequency,
          data.interval,
          data.end_date,
          data.count,
          data.id,
        ]
      );

      if (result && result.changes > 0) {
        logger.info(`Recurrence rule ${ruleId} updated successfully`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error updating recurrence rule ${ruleId}:`, error);
      return false;
    }
  }

  /**
   * Delete a recurrence rule
   * @param {string} ruleId - Rule ID
   * @returns {boolean} - Success status
   */
  async deleteRecurrenceRule(ruleId) {
    try {
      const result = databaseService.delete(
        'DELETE FROM recurrence_rules WHERE id = ?',
        [ruleId]
      );

      if (result && result.changes > 0) {
        logger.info(`Recurrence rule ${ruleId} deleted successfully`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting recurrence rule ${ruleId}:`, error);
      return false;
    }
  }

  /**
   * Delete recurrence rule by task ID
   * @param {string} taskId - Task ID
   * @returns {boolean} - Success status
   */
  async deleteRecurrenceRuleByTaskId(taskId) {
    try {
      const result = databaseService.delete(
        'DELETE FROM recurrence_rules WHERE task_id = ?',
        [taskId]
      );

      if (result && result.changes > 0) {
        logger.info(`Recurrence rule for task ${taskId} deleted successfully`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting recurrence rule for task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Clone a task for recurrence
   * @param {Task} originalTask - Original task to clone
   * @param {Date} newDueDate - New due date for the cloned task
   * @returns {Object} - Cloned task data ready for database insertion
   */
  cloneTaskForRecurrence(originalTask, newDueDate) {
    try {
      // Create new task data based on original task
      const clonedTaskData = {
        id: uuidv4(), // Generate new ID
        name: originalTask.name,
        description: originalTask.description || '',
        duration: originalTask.duration !== null ? originalTask.duration : null,
        dueDate: newDueDate ? newDueDate.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD
        plannedTime: null, // Reset planned time - user needs to reschedule
        projectId: originalTask.projectId,
        dependencies: this._cloneArray(originalTask.dependencies), // Deep copy array
        status: STATUS.PLANNING, // Reset to planning status
        labels: this._cloneArray(originalTask.labels), // Deep copy array
        priority: originalTask.priority || 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info(`Cloned task ${originalTask.id} to new task ${clonedTaskData.id} with due date ${newDueDate}`);
      return clonedTaskData;
    } catch (error) {
      logger.error(`Error cloning task ${originalTask.id}:`, error);
      return null;
    }
  }

  /**
   * Helper method to safely clone arrays
   * @param {Array} array - Array to clone
   * @returns {Array} - Cloned array
   * @private
   */
  _cloneArray(array) {
    if (!array) return [];
    if (Array.isArray(array)) return [...array];

    // Handle case where array might be stored as JSON string
    if (typeof array === 'string') {
      try {
        const parsed = JSON.parse(array);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Check if recurrence should continue based on rule constraints
   * @param {RecurrenceRule} rule - Recurrence rule
   * @param {Date} nextOccurrenceDate - Next calculated occurrence date
   * @returns {boolean} - Whether recurrence should continue
   */
  shouldContinueRecurrence(rule, nextOccurrenceDate) {
    try {
      // Check end date constraint
      if (rule.endDate && nextOccurrenceDate > rule.endDate) {
        logger.info(`Recurrence ended due to end date constraint: ${rule.endDate}`);
        return false;
      }

      // Check count constraint
      if (rule.count !== null && rule.count <= 0) {
        logger.info('Recurrence ended due to count constraint');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking recurrence continuation:', error);
      return false;
    }
  }

  /**
   * Process task completion and handle recurrence
   * @param {string} taskId - ID of the completed task
   * @returns {Object|null} - New task data if recurrence created, null otherwise
   */
  async processTaskCompletion(taskId) {
    try {
      logger.info(`Processing task completion for recurrence: ${taskId}`);

      // Get the completed task
      const taskData = databaseService.queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!taskData) {
        logger.error(`Task ${taskId} not found`);
        return null;
      }

      const completedTask = Task.fromDatabase(taskData);

      // Get recurrence rule for this task
      const recurrenceRule = await this.getRecurrenceRuleByTaskId(taskId);
      if (!recurrenceRule) {
        logger.info(`No recurrence rule found for task ${taskId}`);
        return null;
      }

      // Calculate next occurrence based on the completed task's due date
      const baseDate = completedTask.dueDate ? new Date(completedTask.dueDate) : new Date();
      const nextOccurrenceDate = recurrenceRule.getNextOccurrence(baseDate);

      if (!nextOccurrenceDate) {
        logger.info(`No next occurrence calculated for task ${taskId}`);
        await this.deleteRecurrenceRule(recurrenceRule.id);
        return null;
      }

      // Check if recurrence should continue
      if (!this.shouldContinueRecurrence(recurrenceRule, nextOccurrenceDate)) {
        await this.deleteRecurrenceRule(recurrenceRule.id);
        return null;
      }

      // Clone the task with new due date
      const clonedTaskData = this.cloneTaskForRecurrence(completedTask, nextOccurrenceDate);
      if (!clonedTaskData) {
        logger.error(`Failed to clone task ${taskId}`);
        return null;
      }

      // Create the new task in database
      const newTask = new Task(clonedTaskData);
      const newTaskDbData = newTask.toDatabase();

      const insertResult = databaseService.insert(
        `INSERT INTO tasks (
          id, name, description, duration, due_date, planned_time, project_id,
          dependencies, status, labels, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newTaskDbData.id,
          newTaskDbData.name,
          newTaskDbData.description,
          newTaskDbData.duration,
          newTaskDbData.due_date,
          newTaskDbData.planned_time,
          newTaskDbData.project_id,
          newTaskDbData.dependencies,
          newTaskDbData.status,
          newTaskDbData.labels,
          newTaskDbData.priority,
          newTaskDbData.created_at,
          newTaskDbData.updated_at,
        ]
      );

      if (!insertResult || insertResult.changes === 0) {
        logger.error(`Failed to insert new recurring task for ${taskId}`);
        return null;
      }

      // Update recurrence rule to point to new task and decrement count if applicable
      const updateData = { taskId: newTaskDbData.id };
      if (recurrenceRule.count !== null && recurrenceRule.count > 0) {
        updateData.count = recurrenceRule.count - 1;
      }

      const updateSuccess = await this.updateRecurrenceRule(recurrenceRule.id, updateData);
      if (!updateSuccess) {
        logger.error(`Failed to update recurrence rule ${recurrenceRule.id}`);
        // Don't fail the whole operation, just log the error
      }

      logger.info(`Successfully created recurring task ${newTaskDbData.id} from completed task ${taskId}`);
      return newTaskDbData;
    } catch (error) {
      logger.error(`Error processing task completion for recurrence ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Get all recurrence rules
   * @returns {Array} - Array of RecurrenceRule instances
   */
  async getAllRecurrenceRules() {
    try {
      const rules = databaseService.query('SELECT * FROM recurrence_rules ORDER BY created_at DESC');
      return rules.map(rule => RecurrenceRule.fromDatabase(rule));
    } catch (error) {
      logger.error('Error getting all recurrence rules:', error);
      return [];
    }
  }

  /**
   * Get recurrence rules that have expired (past end date or count reached 0)
   * @returns {Array} - Array of expired RecurrenceRule instances
   */
  async getExpiredRecurrenceRules() {
    try {
      const rules = await this.getAllRecurrenceRules();
      const now = new Date();

      return rules.filter(rule => {
        // Check if rule has expired due to end date
        if (rule.endDate && now > rule.endDate) {
          return true;
        }

        // Check if rule has expired due to count reaching 0
        if (rule.count !== null && rule.count <= 0) {
          return true;
        }

        return false;
      });
    } catch (error) {
      logger.error('Error getting expired recurrence rules:', error);
      return [];
    }
  }

  /**
   * Clean up expired recurrence rules
   * @returns {number} - Number of rules cleaned up
   */
  async cleanupExpiredRules() {
    try {
      const expiredRules = await this.getExpiredRecurrenceRules();
      let cleanedCount = 0;

      for (const rule of expiredRules) {
        const success = await this.deleteRecurrenceRule(rule.id);
        if (success) {
          cleanedCount++;
          logger.info(`Cleaned up expired recurrence rule ${rule.id}`);
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired recurrence rules`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired recurrence rules:', error);
      return 0;
    }
  }

  /**
   * Get statistics about recurrence rules
   * @returns {Object} - Statistics object
   */
  async getRecurrenceStatistics() {
    try {
      const allRules = await this.getAllRecurrenceRules();
      const expiredRules = await this.getExpiredRecurrenceRules();

      const stats = {
        total: allRules.length,
        active: allRules.length - expiredRules.length,
        expired: expiredRules.length,
        byFrequency: {
          daily: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0,
        },
      };

      // Count by frequency
      allRules.forEach(rule => {
        if (stats.byFrequency.hasOwnProperty(rule.frequency)) {
          stats.byFrequency[rule.frequency]++;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting recurrence statistics:', error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        byFrequency: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
      };
    }
  }
}

// Create singleton instance
const recurrenceService = new RecurrenceService();

export default recurrenceService;
