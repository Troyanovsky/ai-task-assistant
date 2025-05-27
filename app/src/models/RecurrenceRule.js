/**
 * RecurrenceRule Model
 */

const { v4: uuidv4 } = require('uuid');

// Frequency constants
const FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

class RecurrenceRule {
  /**
   * Create a new RecurrenceRule instance
   * @param {Object} data - RecurrenceRule data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.taskId = data.task_id || '';
    this.frequency = data.frequency || FREQUENCY.DAILY;
    this.interval = data.interval || 1;
    this.endDate = data.end_date ? new Date(data.end_date) : null;
    this.count = data.count || null;
    this.createdAt = data.created_at ? new Date(data.created_at) : new Date();
  }

  /**
   * Validate the recurrence rule data
   * @returns {boolean} - Validation result
   */
  validate() {
    if (!this.taskId) {
      return false;
    }
    if (!Object.values(FREQUENCY).includes(this.frequency)) {
      return false;
    }
    if (this.interval <= 0) {
      return false;
    }
    if (this.count !== null && this.count <= 0) {
      return false;
    }
    return true;
  }

  /**
   * Convert the recurrence rule instance to a database-ready object
   * @returns {Object} - Database object
   */
  toDatabase() {
    return {
      id: this.id,
      task_id: this.taskId,
      frequency: this.frequency,
      interval: this.interval,
      end_date: this.endDate ? this.endDate.toISOString() : null,
      count: this.count,
      created_at: this.createdAt.toISOString()
    };
  }

  /**
   * Create a RecurrenceRule instance from a database object
   * @param {Object} data - Database object
   * @returns {RecurrenceRule} - RecurrenceRule instance
   */
  static fromDatabase(data) {
    return new RecurrenceRule(data);
  }

  /**
   * Update recurrence rule properties
   * @param {Object} data - Updated data
   */
  update(data) {
    if (data.taskId !== undefined) this.taskId = data.taskId;
    if (data.frequency !== undefined) this.frequency = data.frequency;
    if (data.interval !== undefined) this.interval = data.interval;
    if (data.endDate !== undefined) this.endDate = data.endDate;
    if (data.count !== undefined) this.count = data.count;
  }

  /**
   * Calculate the next occurrence date
   * @param {Date} fromDate - Starting date
   * @returns {Date|null} - Next occurrence date or null if no more occurrences
   */
  getNextOccurrence(fromDate) {
    if (this.endDate && fromDate > this.endDate) {
      return null;
    }
    
    const nextDate = new Date(fromDate);
    
    switch (this.frequency) {
      case FREQUENCY.DAILY:
        nextDate.setDate(nextDate.getDate() + this.interval);
        break;
      case FREQUENCY.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (this.interval * 7));
        break;
      case FREQUENCY.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + this.interval);
        break;
      case FREQUENCY.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + this.interval);
        break;
      default:
        return null;
    }
    
    if (this.endDate && nextDate > this.endDate) {
      return null;
    }
    
    return nextDate;
  }
}

// Export constants and class
module.exports = {
  RecurrenceRule,
  FREQUENCY
}; 