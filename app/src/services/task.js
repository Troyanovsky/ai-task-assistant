/**
 * Task Service
 * Handles task-related operations
 */

const databaseService = require('./database');
const { Task, STATUS, PRIORITY } = require('../models/Task');

class TaskManager {
  /**
   * Get all tasks
   * @returns {Array} - Array of Task instances
   */
  async getTasks() {
    try {
      const tasks = databaseService.query('SELECT * FROM tasks ORDER BY created_at DESC');
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  /**
   * Get a task by ID
   * @param {string} id - Task ID
   * @returns {Task|null} - Task instance or null
   */
  async getTaskById(id) {
    try {
      const task = databaseService.queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
      return task ? Task.fromDatabase(task) : null;
    } catch (error) {
      console.error(`Error getting task ${id}:`, error);
      return null;
    }
  }

  /**
   * Get tasks by project ID
   * @param {string} projectId - Project ID
   * @returns {Array} - Array of Task instances
   */
  async getTasksByProject(projectId) {
    try {
      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error(`Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Add a new task
   * @param {Task} task - Task instance
   * @returns {boolean} - Success status
   */
  async addTask(task) {
    try {
      if (!task.validate()) {
        console.error('Invalid task data');
        return false;
      }

      const data = task.toDatabase();
      const result = databaseService.insert(
        `INSERT INTO tasks (
          id, name, description, duration, due_date, project_id, 
          dependencies, status, labels, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id, data.name, data.description, data.duration, data.due_date, 
          data.project_id, data.dependencies, data.status, data.labels, 
          data.priority, data.created_at, data.updated_at
        ]
      );

      return result && result.changes > 0;
    } catch (error) {
      console.error('Error adding task:', error);
      return false;
    }
  }

  /**
   * Update an existing task
   * @param {Task} task - Task instance
   * @returns {boolean} - Success status
   */
  async updateTask(task) {
    try {
      if (!task.validate()) {
        console.error('Invalid task data');
        return false;
      }

      const data = task.toDatabase();
      const result = databaseService.update(
        `UPDATE tasks SET 
          name = ?, description = ?, duration = ?, due_date = ?, 
          project_id = ?, dependencies = ?, status = ?, labels = ?, 
          priority = ?, updated_at = ? 
        WHERE id = ?`,
        [
          data.name, data.description, data.duration, data.due_date, 
          data.project_id, data.dependencies, data.status, data.labels, 
          data.priority, data.updated_at, data.id
        ]
      );

      return result && result.changes > 0;
    } catch (error) {
      console.error(`Error updating task ${task.id}:`, error);
      return false;
    }
  }

  /**
   * Delete a task
   * @param {string} id - Task ID
   * @returns {boolean} - Success status
   */
  async deleteTask(id) {
    try {
      const result = databaseService.delete('DELETE FROM tasks WHERE id = ?', [id]);
      return result && result.changes > 0;
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      return false;
    }
  }

  /**
   * Update task status
   * @param {string} id - Task ID
   * @param {string} status - New status
   * @returns {boolean} - Success status
   */
  async updateTaskStatus(id, status) {
    try {
      if (!Object.values(STATUS).includes(status)) {
        console.error('Invalid task status');
        return false;
      }

      const task = await this.getTaskById(id);
      if (!task) {
        console.error(`Task ${id} not found`);
        return false;
      }

      task.status = status;
      task.updatedAt = new Date();
      return await this.updateTask(task);
    } catch (error) {
      console.error(`Error updating task status for ${id}:`, error);
      return false;
    }
  }

  /**
   * Get tasks by status
   * @param {string} status - Task status
   * @returns {Array} - Array of Task instances
   */
  async getTasksByStatus(status) {
    try {
      if (!Object.values(STATUS).includes(status)) {
        console.error('Invalid task status');
        return [];
      }

      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC',
        [status]
      );
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error(`Error getting tasks with status ${status}:`, error);
      return [];
    }
  }

  /**
   * Get tasks by priority
   * @param {string} priority - Task priority
   * @returns {Array} - Array of Task instances
   */
  async getTasksByPriority(priority) {
    try {
      if (!Object.values(PRIORITY).includes(priority)) {
        console.error('Invalid task priority');
        return [];
      }

      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE priority = ? ORDER BY created_at DESC',
        [priority]
      );
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error(`Error getting tasks with priority ${priority}:`, error);
      return [];
    }
  }

  /**
   * Get tasks due soon (within the next 24 hours)
   * @returns {Array} - Array of Task instances
   */
  async getTasksDueSoon() {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE due_date BETWEEN ? AND ? ORDER BY due_date ASC',
        [now.toISOString(), tomorrow.toISOString()]
      );
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error('Error getting tasks due soon:', error);
      return [];
    }
  }

  /**
   * Get overdue tasks
   * @returns {Array} - Array of Task instances
   */
  async getOverdueTasks() {
    try {
      const now = new Date();
      
      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE due_date < ? AND status != ? ORDER BY due_date ASC',
        [now.toISOString(), STATUS.DONE]
      );
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      return [];
    }
  }

  /**
   * Search tasks by name or description
   * @param {string} query - Search query
   * @returns {Array} - Array of Task instances
   */
  async searchTasks(query) {
    try {
      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC',
        [`%${query}%`, `%${query}%`]
      );
      return tasks.map(task => Task.fromDatabase(task));
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }

  /**
   * Prioritize tasks based on due date and priority
   * @returns {Array} - Array of prioritized Task instances
   */
  async prioritizeTasks() {
    try {
      // Get all non-completed tasks
      const tasks = await this.getTasksByStatus(STATUS.DOING);
      const planningTasks = await this.getTasksByStatus(STATUS.PLANNING);
      tasks.push(...planningTasks);

      // Sort by priority (high to low)
      const priorityOrder = {
        [PRIORITY.HIGH]: 1,
        [PRIORITY.MEDIUM]: 2,
        [PRIORITY.LOW]: 3
      };
      
      // Sort by due date (sooner first) and then by priority
      return tasks.sort((a, b) => {
        // If both have due dates, compare them
        if (a.dueDate && b.dueDate) {
          return a.dueDate - b.dueDate;
        }
        
        // Tasks with due dates come before tasks without due dates
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        
        // If no due dates or they're equal, sort by priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } catch (error) {
      console.error('Error prioritizing tasks:', error);
      return [];
    }
  }
}

// Create singleton instance
const taskManager = new TaskManager();

module.exports = taskManager; 