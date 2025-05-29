/**
 * Notification Service
 * Handles notification-related operations
 */

import databaseService from './database.js';
import { Notification, TYPE } from '../models/Notification.js';
import { ipcMain, Notification as ElectronNotification } from 'electron';

class NotificationManager {
  constructor() {
    this.scheduledNotifications = new Map();
  }

  /**
   * Initialize the notification service
   */
  init() {
    // Load scheduled notifications from database
    this.loadScheduledNotifications();
  }

  /**
   * Load scheduled notifications from database
   */
  async loadScheduledNotifications() {
    try {
      const notifications = await this.getUpcomingNotifications();
      
      // Schedule all notifications
      notifications.forEach(notification => {
        this.scheduleNotification(notification);
      });
      
      console.log(`Loaded ${notifications.length} scheduled notifications`);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
    }
  }

  /**
   * Get all notifications
   * @returns {Array} - Array of Notification instances
   */
  async getNotifications() {
    try {
      const notifications = databaseService.query('SELECT * FROM notifications ORDER BY time ASC');
      return notifications.map(notification => Notification.fromDatabase(notification));
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Get notifications for a task
   * @param {string} taskId - Task ID
   * @returns {Array} - Array of Notification instances
   */
  async getNotificationsByTask(taskId) {
    try {
      console.log(`Fetching notifications for task ${taskId}`);
      const notifications = databaseService.query(
        'SELECT * FROM notifications WHERE task_id = ? ORDER BY time ASC',
        [taskId]
      );
      console.log(`Found ${notifications.length} notifications for task ${taskId}`);
      return notifications.map(notification => Notification.fromDatabase(notification));
    } catch (error) {
      console.error(`Error getting notifications for task ${taskId}:`, error);
      return [];
    }
  }

  /**
   * Get upcoming notifications (scheduled for the future)
   * @returns {Array} - Array of Notification instances
   */
  async getUpcomingNotifications() {
    try {
      const now = new Date();
      
      const notifications = databaseService.query(
        'SELECT * FROM notifications WHERE time > ? ORDER BY time ASC',
        [now.toISOString()]
      );
      return notifications.map(notification => Notification.fromDatabase(notification));
    } catch (error) {
      console.error('Error getting upcoming notifications:', error);
      return [];
    }
  }

  /**
   * Add a new notification
   * @param {Notification} notification - Notification instance
   * @returns {boolean} - Success status
   */
  async addNotification(notification) {
    try {
      // Create a Notification instance if the input is just data
      const notificationInstance = notification instanceof Notification 
        ? notification 
        : new Notification(notification);
      
      if (!notificationInstance.validate()) {
        console.error('Invalid notification data');
        return false;
      }

      const data = notificationInstance.toDatabase();
      
      console.log('Adding notification:', {
        id: data.id,
        taskId: data.task_id,
        time: data.time,
        type: data.type,
        message: data.message
      });
      
      const result = databaseService.insert(
        'INSERT INTO notifications (id, task_id, time, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [data.id, data.task_id, data.time, data.type, data.message, data.created_at]
      );

      if (result && result.changes > 0) {
        // Schedule the notification
        this.scheduleNotification(notificationInstance);
        console.log(`✅ Notification created successfully: ${data.id} for task ${data.task_id} at ${new Date(data.time).toLocaleString()}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error adding notification:', error);
      return false;
    }
  }

  /**
   * Update an existing notification
   * @param {Object} notificationData - Notification data
   * @returns {boolean} - Success status
   */
  async updateNotification(notificationData) {
    try {
      console.log('Updating notification:', notificationData);
      
      // Cancel the existing scheduled notification
      this.cancelNotification(notificationData.id);
      
      // Create a Notification instance
      const notification = new Notification(notificationData);
      
      if (!notification.validate()) {
        console.error('Invalid notification data for update');
        return false;
      }
      
      const data = notification.toDatabase();
      console.log('Notification data for update:', {
        id: data.id,
        taskId: data.task_id,
        time: data.time,
        type: data.type,
        message: data.message
      });
      
      const result = databaseService.update(
        'UPDATE notifications SET task_id = ?, time = ?, type = ?, message = ? WHERE id = ?',
        [data.task_id, data.time, data.type, data.message, data.id]
      );
      
      if (result && result.changes > 0) {
        // Re-schedule the notification
        this.scheduleNotification(notification);
        console.log(`✅ Notification updated successfully: ${data.id} for task ${data.task_id} at ${new Date(data.time).toLocaleString()}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error updating notification ${notificationData.id}:`, error);
      return false;
    }
  }

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   * @returns {boolean} - Success status
   */
  async deleteNotification(id) {
    try {
      // Cancel the scheduled notification
      this.cancelNotification(id);
      
      const result = databaseService.delete('DELETE FROM notifications WHERE id = ?', [id]);
      if (result && result.changes > 0) {
        console.log(`✅ Notification deleted successfully: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error);
      return false;
    }
  }

  /**
   * Schedule a notification
   * @param {Notification} notification - Notification instance
   */
  scheduleNotification(notification) {
    try {
      // Cancel existing notification with the same ID
      this.cancelNotification(notification.id);
      
      const now = new Date();
      const notificationTime = notification.time;
      
      console.log(`Scheduling notification ${notification.id} for ${notificationTime.toLocaleString()}`);
      console.log(`Current time: ${now.toLocaleString()}`);
      
      // If the notification time is in the past, don't schedule it
      if (notificationTime <= now) {
        console.log(`⚠️ Notification ${notification.id} time is in the past, not scheduling`);
        return;
      }
      
      // Calculate delay in milliseconds
      const delay = notificationTime.getTime() - now.getTime();
      console.log(`Notification will trigger in ${Math.round(delay / 1000)} seconds`);
      
      // Schedule the notification
      const timeoutId = setTimeout(() => {
        this.sendNotification(notification);
        this.scheduledNotifications.delete(notification.id);
      }, delay);
      
      // Store the timeout ID for later cancellation
      this.scheduledNotifications.set(notification.id, timeoutId);
      
      console.log(`✅ Scheduled notification ${notification.id} for ${notificationTime.toLocaleString()}`);
    } catch (error) {
      console.error(`Error scheduling notification ${notification.id}:`, error);
    }
  }

  /**
   * Cancel a scheduled notification
   * @param {string} id - Notification ID
   */
  cancelNotification(id) {
    try {
      const timeoutId = this.scheduledNotifications.get(id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.scheduledNotifications.delete(id);
        console.log(`Cancelled notification ${id}`);
      }
    } catch (error) {
      console.error(`Error cancelling notification ${id}:`, error);
    }
  }

  /**
   * Send a notification
   * @param {Notification} notification - Notification instance
   */
  sendNotification(notification) {
    try {
      // Get the task details to include in the notification
      const task = databaseService.queryOne(
        'SELECT name FROM tasks WHERE id = ?',
        [notification.taskId]
      );
      
      if (!task) {
        console.error(`Task ${notification.taskId} not found for notification`);
        return;
      }
      
      console.log(`Sending notification for task: ${task.name}`);
      
      // Create a system notification
      if (ElectronNotification.isSupported()) {
        const systemNotification = new ElectronNotification({
          title: `Task: ${task.name}`,
          body: notification.message || this.getDefaultMessage(notification.type, task.name),
          silent: false,
          timeoutType: 'default'
        });
        
        // Show the notification
        systemNotification.show();
        console.log(`✅ System notification displayed for task: ${task.name}`);
        
        // Handle notification click
        systemNotification.on('click', () => {
          // Emit an event to the renderer process to focus on the task
          if (ipcMain) {
            ipcMain.emit('notification', null, {
              type: 'focus-task',
              taskId: notification.taskId
            });
          }
        });
      } else {
        console.log('⚠️ System notifications are not supported on this platform');
      }
      
      // Emit event to renderer process
      if (ipcMain) {
        ipcMain.emit('notification', null, notification);
        console.log('Notification event emitted to renderer process');
      }
      
      console.log(`✅ Notification ${notification.id} sent: ${notification.message}`);
    } catch (error) {
      console.error(`Error sending notification ${notification.id}:`, error);
    }
  }
  
  /**
   * Get a default message based on notification type
   * @param {string} type - Notification type
   * @param {string} taskName - Task name
   * @returns {string} - Default message
   */
  getDefaultMessage(type, taskName) {
    switch (type) {
      case TYPE.REMINDER:
        return `Reminder for task: ${taskName}`;
      case TYPE.DUE_DATE:
        return `Task due soon: ${taskName}`;
      case TYPE.STATUS_CHANGE:
        return `Status changed for task: ${taskName}`;
      default:
        return `Notification for task: ${taskName}`;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationManager();

export default notificationService;