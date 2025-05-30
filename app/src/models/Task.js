/**
 * Task Model
 */

import { v4 as uuidv4 } from 'uuid';

// Task status constants
export const STATUS = {
  PLANNING: 'planning',
  DOING: 'doing',
  DONE: 'done'
};

// Task priority constants
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

class Task {
  /**
   * Create a new Task instance
   * @param {Object} data - Task data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.description = data.description || '';
    
    // Fix: Handle duration properly (0 is a valid value)
    this.duration = data.duration !== undefined ? data.duration : null;
    
    // Fix: Handle dueDate properly, checking both snake_case and camelCase properties
    if (data.dueDate) {
      this.dueDate = new Date(data.dueDate);
    } else if (data.due_date) {
      this.dueDate = new Date(data.due_date);
    } else {
      this.dueDate = null;
    }
    
    // Handle planned time
    if (data.plannedTime) {
      this.plannedTime = new Date(data.plannedTime);
    } else if (data.planned_time) {
      this.plannedTime = new Date(data.planned_time);
    } else {
      this.plannedTime = null;
    }
    
    this.projectId = data.project_id || data.projectId || '';
    this.dependencies = data.dependencies ? this.parseDependencies(data.dependencies) : [];
    this.status = data.status || STATUS.PLANNING;
    this.labels = data.labels ? this.parseLabels(data.labels) : [];
    this.priority = data.priority || PRIORITY.MEDIUM;
    this.createdAt = data.created_at ? new Date(data.created_at) : new Date();
    this.updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
  }

  /**
   * Parse dependencies from JSON string or array
   * @param {string|Array} dependencies - Dependencies data
   * @returns {Array} - Dependencies array
   */
  parseDependencies(dependencies) {
    if (Array.isArray(dependencies)) {
      return dependencies;
    }
    try {
      return JSON.parse(dependencies);
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse labels from JSON string or array
   * @param {string|Array} labels - Labels data
   * @returns {Array} - Labels array
   */
  parseLabels(labels) {
    if (Array.isArray(labels)) {
      return labels;
    }
    try {
      return JSON.parse(labels);
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate the task data
   * @returns {boolean} - Validation result
   */
  validate() {
    if (!this.name || this.name.trim() === '') {
      return false;
    }
    if (!this.projectId) {
      return false;
    }
    if (!Object.values(STATUS).includes(this.status)) {
      return false;
    }
    if (!Object.values(PRIORITY).includes(this.priority)) {
      return false;
    }
    return true;
  }

  /**
   * Convert the task instance to a database-ready object
   * @returns {Object} - Database object
   */
  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      duration: this.duration,
      due_date: this.dueDate ? this.dueDate.toISOString() : null,
      planned_time: this.plannedTime ? this.plannedTime.toISOString() : null,
      project_id: this.projectId,
      dependencies: JSON.stringify(this.dependencies),
      status: this.status,
      labels: JSON.stringify(this.labels),
      priority: this.priority,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString()
    };
  }

  /**
   * Create a Task instance from a database object
   * @param {Object} data - Database object
   * @returns {Task} - Task instance
   */
  static fromDatabase(data) {
    console.log('Creating Task from database data:', data);
    const task = new Task(data);
    console.log('Task created with projectId:', task.projectId);
    return task;
  }

  /**
   * Update task properties
   * @param {Object} data - Updated data
   */
  update(data) {
    if (data.name !== undefined) this.name = data.name;
    if (data.description !== undefined) this.description = data.description;
    if (data.duration !== undefined) this.duration = data.duration;
    if (data.dueDate !== undefined) this.dueDate = data.dueDate;
    if (data.plannedTime !== undefined) this.plannedTime = data.plannedTime;
    if (data.projectId !== undefined) this.projectId = data.projectId;
    if (data.dependencies !== undefined) this.dependencies = data.dependencies;
    if (data.status !== undefined) this.status = data.status;
    if (data.labels !== undefined) this.labels = data.labels;
    if (data.priority !== undefined) this.priority = data.priority;
    this.updatedAt = new Date();
  }
}

export { Task };