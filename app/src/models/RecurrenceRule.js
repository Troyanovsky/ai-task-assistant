/**
 * RecurrenceRule Model
 */

import { v4 as uuidv4 } from 'uuid';

// Frequency constants
export const FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

class RecurrenceRule {
  /**
   * Create a new RecurrenceRule instance
   * @param {Object} data - RecurrenceRule data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    // Support both taskId and task_id for flexibility
    this.taskId = data.taskId || data.task_id || '';
    this.frequency = data.frequency || FREQUENCY.DAILY;
    this.interval = data.interval !== undefined ? data.interval : 1;
    // Handle both endDate and end_date - convert string dates to Date objects
    this.endDate = this._parseDate(data.endDate) || this._parseDate(data.end_date) || null;
    this.count = data.count !== undefined ? data.count : null;
    // Handle both createdAt and created_at
    this.createdAt = data.createdAt || (data.created_at ? new Date(data.created_at) : new Date());
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
    // Count should be null or a positive number
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
      created_at: this.createdAt.toISOString(),
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
    if (data.endDate !== undefined) this.endDate = this._parseDate(data.endDate);
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
        nextDate.setDate(nextDate.getDate() + this.interval * 7);
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

  /**
   * Helper method to parse date values
   * @param {string|Date|null} dateValue - Date value to parse
   * @returns {Date|null} - Parsed Date object or null
   * @private
   */
  _parseDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }
}

export { RecurrenceRule };
