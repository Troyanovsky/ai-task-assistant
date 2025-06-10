/**
 * Task Service
 * Handles task-related operations
 */

import databaseService from './database.js';
import { Task, STATUS, PRIORITY } from '../models/Task.js';
import notificationService from './notification.js';

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

class TaskManager {
  /**
   * Get all tasks
   * @returns {Array} - Array of Task instances
   */
  async getTasks() {
    try {
      const tasks = databaseService.query('SELECT * FROM tasks ORDER BY created_at DESC');
      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error('Error getting tasks:', error);
      return [];
    }
  }

  /**
   * Get recent tasks (not done or done within past 2 days)
   * @returns {Array} - Array of Task instances
   */
  async getRecentTasks() {
    try {
      // Get current date
      const today = new Date();

      // Get date 2 days ago
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      // Format date as YYYY-MM-DD for SQLite comparison
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      // Get tasks that are either not done OR are done but due within past 2 days
      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE status != ? OR (status = ? AND due_date >= ?) ORDER BY created_at DESC',
        [STATUS.DONE, STATUS.DONE, twoDaysAgoStr]
      );

      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error('Error getting recent tasks:', error);
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
      logger.error(`Error getting task ${id}:`, error);
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
      logger.info(`Querying tasks for project_id: ${projectId}`);
      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      logger.info(`Found ${tasks.length} tasks for project ${projectId}`);
      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error(`Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Get recent tasks by project ID (not done or done within past 2 days)
   * @param {string} projectId - Project ID
   * @returns {Array} - Array of Task instances
   */
  async getRecentTasksByProject(projectId) {
    try {
      // Get current date
      const today = new Date();

      // Get date 2 days ago
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      // Format date as YYYY-MM-DD for SQLite comparison
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      logger.info(`Querying recent tasks for project_id: ${projectId}`);
      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE project_id = ? AND (status != ? OR (status = ? AND due_date >= ?)) ORDER BY created_at DESC',
        [projectId, STATUS.DONE, STATUS.DONE, twoDaysAgoStr]
      );
      logger.info(`Found ${tasks.length} recent tasks for project ${projectId}`);
      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error(`Error getting recent tasks for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Add a new task
   * @param {Object} taskData - Task data
   * @returns {Object|boolean} - Task object with ID if successful, false otherwise
   */
  async addTask(taskData) {
    try {
      logger.info('Adding task with original data:', taskData);

      // Make sure project_id is correctly set
      if (!taskData.project_id && taskData.projectId) {
        taskData.project_id = taskData.projectId;
      }

      logger.info('Task data after project_id check:', taskData);

      // Create a Task instance from the data
      const task = new Task(taskData);

      logger.info('Task instance created:', task);
      logger.info('Task project ID:', task.projectId);

      // Validate the task
      const isValid = task.validate();
      if (!isValid) {
        logger.error('Invalid task data - validation failed');
        logger.error('Task validation details:');
        logger.error('- Name:', task.name, task.name && task.name.trim() !== '');
        logger.error('- Project ID:', task.projectId, !!task.projectId);
        logger.error('- Status:', task.status, Object.values(STATUS).includes(task.status));
        logger.error('- Priority:', task.priority, Object.values(PRIORITY).includes(task.priority));
        return false;
      }

      const data = task.toDatabase();
      logger.info('Adding task with database data:', data);
      logger.info('Database project_id:', data.project_id);

      const result = databaseService.insert(
        `INSERT INTO tasks (
          id, name, description, duration, due_date, planned_time, project_id, 
          dependencies, status, labels, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.name,
          data.description,
          data.duration,
          data.due_date,
          data.planned_time,
          data.project_id,
          data.dependencies,
          data.status,
          data.labels,
          data.priority,
          data.created_at,
          data.updated_at,
        ]
      );

      logger.info('Task insert result:', result);
      if (result && result.changes > 0) {
        // Return the task data with ID so it can be used for notifications
        return data;
      }
      return false;
    } catch (error) {
      logger.error('Error adding task:', error);
      return false;
    }
  }

  /**
   * Update an existing task
   * @param {Object} taskData - Task data
   * @returns {boolean} - Success status
   */
  async updateTask(taskData) {
    try {
      logger.info('Updating task with original data:', taskData);

      // Get existing task to preserve any fields not included in the update
      const existingTask = await this.getTaskById(taskData.id);
      if (!existingTask) {
        logger.error(`Task ${taskData.id} not found for update`);
        return false;
      }

      // Preserve project ID from existing task if not provided in update
      if (!taskData.projectId && !taskData.project_id) {
        taskData.projectId = existingTask.projectId;
      }

      // Create a Task instance from the data, merging with existing task
      const task = new Task({
        ...existingTask.toDatabase(),
        ...taskData,
      });

      // Make sure project_id is correctly set for database
      if (!task.project_id && task.projectId) {
        task.project_id = task.projectId;
      }

      // Validate the task
      const isValid = task.validate();
      if (!isValid) {
        logger.error('Invalid task data - validation failed');
        return false;
      }

      const data = task.toDatabase();
      logger.info('Updating task with database data:', data);
      logger.info('Database due_date:', data.due_date);
      logger.info('Database planned_time:', data.planned_time);

      const result = databaseService.update(
        `UPDATE tasks SET 
          name = ?, description = ?, duration = ?, due_date = ?, planned_time = ?,
          project_id = ?, dependencies = ?, status = ?, labels = ?, 
          priority = ?, updated_at = ? 
        WHERE id = ?`,
        [
          data.name,
          data.description,
          data.duration,
          data.due_date,
          data.planned_time,
          data.project_id,
          data.dependencies,
          data.status,
          data.labels,
          data.priority,
          data.updated_at,
          data.id,
        ]
      );

      return result && result.changes > 0;
    } catch (error) {
      logger.error(`Error updating task ${taskData.id}:`, error);
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
      // First check if the task exists
      const task = await this.getTaskById(id);
      if (!task) {
        logger.error(`Task ${id} not found for deletion`);
        return false;
      }

      // Delete associated notifications
      try {
        const notifications = await notificationService.getNotificationsByTask(id);
        for (const notification of notifications) {
          await notificationService.deleteNotification(notification.id);
        }
      } catch (notificationError) {
        logger.error(`Error deleting notifications for task ${id}:`, notificationError);
        // Continue with task deletion even if notification deletion fails
      }

      // Delete the task
      const result = databaseService.delete('DELETE FROM tasks WHERE id = ?', [id]);
      return result && result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting task ${id}:`, error);
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
      // Validate status
      if (!Object.values(STATUS).includes(status)) {
        logger.error('Invalid task status');
        return false;
      }

      // Check if task exists
      const task = await this.getTaskById(id);
      if (!task) {
        logger.error(`Task ${id} not found`);
        return false;
      }

      // Update status
      const result = databaseService.update(
        'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
        [status, new Date().toISOString(), id]
      );

      return result && result.changes > 0;
    } catch (error) {
      logger.error(`Error updating task status for ${id}:`, error);
      return false;
    }
  }

  /**
   * Get tasks by status
   * @param {...string} statuses - Task statuses
   * @returns {Array} - Array of Task instances
   */
  async getTasksByStatus(...statuses) {
    try {
      // Validate statuses
      if (
        statuses.length === 0 ||
        !statuses.every((status) => Object.values(STATUS).includes(status))
      ) {
        logger.error('Invalid task status');
        return [];
      }

      if (statuses.length === 1) {
        const tasks = databaseService.query(
          'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC',
          [statuses[0]]
        );

        return tasks.map((task) => Task.fromDatabase(task));
      } else {
        // Create placeholders for SQL query
        const placeholders = statuses.map(() => '?').join(', ');

        const tasks = databaseService.query(
          `SELECT * FROM tasks WHERE status IN (${placeholders}) ORDER BY created_at DESC`,
          statuses
        );

        return tasks.map((task) => Task.fromDatabase(task));
      }
    } catch (error) {
      logger.error(`Error getting tasks with status ${statuses.join(', ')}:`, error);
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
      // Validate priority
      if (!Object.values(PRIORITY).includes(priority)) {
        logger.error('Invalid task priority');
        return [];
      }

      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE priority = ? ORDER BY created_at DESC',
        [priority]
      );

      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error(`Error getting tasks with priority ${priority}:`, error);
      return [];
    }
  }

  /**
   * Get tasks due soon (within the next 3 days)
   * @returns {Array} - Array of Task instances
   */
  async getTasksDueSoon() {
    try {
      // Get current date and date 3 days from now
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);

      // Format dates as YYYY-MM-DD for SQLite comparison
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = threeDaysLater.toISOString().split('T')[0];

      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE due_date BETWEEN ? AND ? AND status != ? ORDER BY due_date ASC',
        [todayStr, futureDateStr, STATUS.DONE]
      );

      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error('Error getting tasks due soon:', error);
      return [];
    }
  }

  /**
   * Get overdue tasks (due date in the past)
   * @returns {Array} - Array of Task instances
   */
  async getOverdueTasks() {
    try {
      // Get yesterday's date (to exclude today)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999); // End of yesterday

      // Format date as YYYY-MM-DD for SQLite comparison
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const tasks = databaseService.query(
        'SELECT * FROM tasks WHERE due_date < ? AND status != ? ORDER BY due_date ASC',
        [yesterdayStr, STATUS.DONE]
      );

      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error('Error getting overdue tasks:', error);
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

      return tasks.map((task) => Task.fromDatabase(task));
    } catch (error) {
      logger.error('Error searching tasks:', error);
      return [];
    }
  }

  /**
   * Prioritize tasks based on due date, status, and user-set priority
   * @returns {Array} - Array of prioritized Task instances
   */
  async prioritizeTasks() {
    try {
      // Get current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Get all tasks that are not done
      logger.info('Getting tasks for prioritization with statuses:', STATUS.PLANNING, STATUS.DOING);
      const tasks = await this.getTasksByStatus(STATUS.PLANNING, STATUS.DOING);
      logger.info(`Retrieved ${tasks.length} tasks for prioritization`);

      // Sort tasks by:
      // 1. Overdue tasks first (highest priority)
      // 2. Tasks due today
      // 3. Tasks with high priority
      // 4. Tasks due soon (within 3 days)
      // 5. Tasks with medium priority
      // 6. All other tasks

      return tasks.sort((a, b) => {
        // Convert dueDate to string for comparison if it's a Date object
        const aDueDate =
          a.dueDate instanceof Date ? a.dueDate.toISOString().split('T')[0] : a.dueDate;
        const bDueDate =
          b.dueDate instanceof Date ? b.dueDate.toISOString().split('T')[0] : b.dueDate;

        // Overdue tasks first
        if (aDueDate < todayStr && bDueDate >= todayStr) return -1;
        if (bDueDate < todayStr && aDueDate >= todayStr) return 1;

        // Tasks due today
        if (aDueDate === todayStr && bDueDate !== todayStr) return -1;
        if (bDueDate === todayStr && aDueDate !== todayStr) return 1;

        // Tasks with high priority
        if (a.priority === PRIORITY.HIGH && b.priority !== PRIORITY.HIGH) return -1;
        if (b.priority === PRIORITY.HIGH && a.priority !== PRIORITY.HIGH) return 1;

        // Sort by due date (ascending)
        if (aDueDate && bDueDate) {
          return aDueDate.localeCompare(bDueDate);
        }

        // Tasks with due dates come before tasks without due dates
        if (aDueDate && !bDueDate) return -1;
        if (!aDueDate && bDueDate) return 1;

        // Sort by priority as a final tiebreaker
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } catch (error) {
      logger.error('Error prioritizing tasks:', error);
      return [];
    }
  }

  /**
   * Plan tasks for today based on working hours and existing scheduled tasks
   * @param {Object} workingHours - User's working hours preferences
   * @returns {Object} - Planning result with scheduled and unscheduled tasks
   */
  async planMyDay(workingHours) {
    try {
      logger.info('Planning day with working hours:', workingHours);

      // Get current date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      // Get all tasks
      const allTasks = await this.getTasks();

      // Filter tasks due today
      console.log(
        'task.dueDate:',
        allTasks.map((task) => task.dueDate)
      );
      console.log('todayStr:', todayStr);
      const tasksDueToday = allTasks.filter((task) => task.dueDate === todayStr);

      // Filter tasks that need planning
      const unplannedTasks = tasksDueToday.filter((task) => {
        // Task doesn't have a planned time
        const hasNoPlannedTime = !task.plannedTime;

        // Task already has a planned time, but it has passed and the task doesn't have status doing/done
        const plannedTimePassed =
          task.plannedTime &&
          new Date(task.plannedTime) < today &&
          task.status !== STATUS.DOING &&
          task.status !== STATUS.DONE;

        return (
          (hasNoPlannedTime || plannedTimePassed) &&
          task.status !== STATUS.DOING &&
          task.status !== STATUS.DONE
        );
      });

      logger.info(`Found ${unplannedTasks.length} unplanned tasks for today`);

      // If no tasks to plan, return early
      if (unplannedTasks.length === 0) {
        return {
          scheduled: [],
          unscheduled: [],
          message: 'No tasks to plan for today.',
        };
      }

      // Get tasks that already have planned time for today
      const plannedTasks = allTasks.filter((task) => {
        if (!task.plannedTime) return false;

        const plannedDate = new Date(task.plannedTime);
        return (
          plannedDate.getFullYear() === today.getFullYear() &&
          plannedDate.getMonth() === today.getMonth() &&
          plannedDate.getDate() === today.getDate() &&
          !(
            new Date(task.plannedTime) < today &&
            task.status !== STATUS.DOING &&
            task.status !== STATUS.DONE
          )
        );
      });

      logger.info(`Found ${plannedTasks.length} already planned tasks for today`);

      // Parse working hours
      const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
      const [endHour, endMinute] = workingHours.endTime.split(':').map(Number);

      // Create Date objects for start and end of working hours today
      const workStart = new Date(today);
      workStart.setHours(startHour, startMinute, 0, 0);

      const workEnd = new Date(today);
      workEnd.setHours(endHour, endMinute, 0, 0);

      // If current time is after work start, use current time as start
      const planningStart = today > workStart ? new Date(today) : new Date(workStart);

      logger.info(`Planning start time: ${planningStart.toLocaleTimeString()}`);
      logger.info(`Work end time: ${workEnd.toLocaleTimeString()}`);

      // Create timeline of busy slots from existing planned tasks
      const busySlots = plannedTasks.map((task) => {
        const start = new Date(task.plannedTime);
        const end = new Date(start);
        // Use task duration if available, otherwise default to 30 min
        const durationMinutes = task.duration !== null ? task.duration : 30;
        end.setMinutes(end.getMinutes() + durationMinutes);

        return { start, end };
      });

      // Sort busy slots by start time
      busySlots.sort((a, b) => a.start - b.start);

      // Sort unplanned tasks by priority first, then by duration (shorter first)
      const tasksToSchedule = [...unplannedTasks].sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // If same priority, sort by duration (shorter first)
        const aDuration = a.duration !== null ? a.duration : 30;
        const bDuration = b.duration !== null ? b.duration : 30;
        return aDuration - bDuration;
      });

      // Schedule tasks
      const scheduledTasks = [];
      const unscheduledTasks = [];

      // Start with planning start time
      let currentTime = new Date(planningStart);

      for (const task of tasksToSchedule) {
        // Get task duration (default to 30 min if not specified)
        const durationMinutes = task.duration !== null ? task.duration : 30;

        // Try to find a slot for this task
        let slotFound = false;

        // Keep trying until we find a slot or reach the end of the day
        while (!slotFound && currentTime < workEnd) {
          // Calculate potential end time for this task
          const potentialEndTime = new Date(currentTime);
          potentialEndTime.setMinutes(potentialEndTime.getMinutes() + durationMinutes);

          // Check if this slot overlaps with any busy slot
          const overlaps = busySlots.some((slot) => {
            return (
              (currentTime >= slot.start && currentTime < slot.end) || // Start time is within a busy slot
              (potentialEndTime > slot.start && potentialEndTime <= slot.end) || // End time is within a busy slot
              (currentTime <= slot.start && potentialEndTime >= slot.end) // Slot is completely within our time
            );
          });

          if (!overlaps && potentialEndTime <= workEnd) {
            // Slot found! Schedule the task
            slotFound = true;

            // Create a copy of the task with planned time
            const scheduledTask = new Task(task);
            scheduledTask.plannedTime = new Date(currentTime);

            // Add to scheduled tasks
            scheduledTasks.push(scheduledTask);

            // Add this to busy slots for future tasks
            busySlots.push({
              start: new Date(currentTime),
              end: new Date(potentialEndTime),
            });

            // Sort busy slots again
            busySlots.sort((a, b) => a.start - b.start);

            // Move current time to the end of this task
            currentTime = new Date(potentialEndTime);
          } else {
            // Slot not available, try the next available time

            // Find the next available time after the current busy slot
            const nextSlot = busySlots.find(
              (slot) => slot.start <= currentTime && slot.end > currentTime
            );
            if (nextSlot) {
              // Move to the end of this busy slot
              currentTime = new Date(nextSlot.end);
            } else {
              // Find the next busy slot that starts after current time
              const futureSlots = busySlots.filter((slot) => slot.start > currentTime);
              if (futureSlots.length > 0) {
                // Sort by start time
                futureSlots.sort((a, b) => a.start - b.start);

                // Check if there's enough time before the next slot
                const nextBusySlot = futureSlots[0];
                const timeUntilNextSlot = nextBusySlot.start - currentTime;
                const timeNeeded = durationMinutes * 60 * 1000; // convert to milliseconds

                if (timeUntilNextSlot >= timeNeeded) {
                  // There's enough time before the next busy slot
                  slotFound = true;

                  // Create a copy of the task with planned time
                  const scheduledTask = new Task(task);
                  scheduledTask.plannedTime = new Date(currentTime);

                  // Add to scheduled tasks
                  scheduledTasks.push(scheduledTask);

                  // Add this to busy slots for future tasks
                  const endTime = new Date(currentTime);
                  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

                  busySlots.push({
                    start: new Date(currentTime),
                    end: new Date(endTime),
                  });

                  // Sort busy slots again
                  busySlots.sort((a, b) => a.start - b.start);

                  // Move current time to the end of this task
                  currentTime = new Date(endTime);
                } else {
                  // Not enough time, move to after the next busy slot
                  currentTime = new Date(nextBusySlot.end);
                }
              } else {
                // No more busy slots, we can schedule the task if it fits before end of day
                const potentialEndTime = new Date(currentTime);
                potentialEndTime.setMinutes(potentialEndTime.getMinutes() + durationMinutes);

                if (potentialEndTime <= workEnd) {
                  slotFound = true;

                  // Create a copy of the task with planned time
                  const scheduledTask = new Task(task);
                  scheduledTask.plannedTime = new Date(currentTime);

                  // Add to scheduled tasks
                  scheduledTasks.push(scheduledTask);

                  // Add this to busy slots for future tasks
                  busySlots.push({
                    start: new Date(currentTime),
                    end: new Date(potentialEndTime),
                  });

                  // Move current time to the end of this task
                  currentTime = new Date(potentialEndTime);
                } else {
                  // Task doesn't fit before end of day
                  break;
                }
              }
            }
          }
        }

        // If no slot found for this task, add to unscheduled
        if (!slotFound) {
          unscheduledTasks.push(task);
        }
      }

      // Save the scheduled tasks
      for (const task of scheduledTasks) {
        await this.updateTask(task);
      }

      // Create summary message
      let message = '';
      if (scheduledTasks.length > 0) {
        message = `${scheduledTasks.length} of ${tasksToSchedule.length} tasks scheduled.`;
        if (unscheduledTasks.length > 0) {
          message += ` ${unscheduledTasks.length} tasks could not fit in your schedule.`;
        }
      } else {
        message = 'No tasks could be scheduled. Your day is already full.';
      }

      return {
        scheduled: scheduledTasks,
        unscheduled: unscheduledTasks,
        message,
      };
    } catch (error) {
      logger.error('Error planning day:', error);
      return {
        scheduled: [],
        unscheduled: [],
        message: `Error planning day: ${error.message}`,
      };
    }
  }
}

// Create singleton instance
const taskManager = new TaskManager();

export default taskManager;
