/**
 * Notification Service
 * Handles notification-related operations
 */

import databaseService from './database.js';
import { Notification, TYPE } from '../models/Notification.js';
import { ipcMain } from 'electron';

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
      const notifications = databaseService.query(
        'SELECT * FROM notifications WHERE task_id = ? ORDER BY time ASC',
        [taskId]
      );
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
      if (!notification.validate()) {
        console.error('Invalid notification data');
        return false;
      }

      const data = notification.toDatabase();
      const result = databaseService.insert(
        'INSERT INTO notifications (id, task_id, time, type, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [data.id, data.task_id, data.time, data.type, data.message, data.created_at]
      );

      if (result && result.changes > 0) {
        // Schedule the notification
        this.scheduleNotification(notification);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error adding notification:', error);
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
      return result && result.changes > 0;
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
      
      // If the notification time is in the past, don't schedule it
      if (notificationTime <= now) {
        return;
      }
      
      // Calculate delay in milliseconds
      const delay = notificationTime.getTime() - now.getTime();
      
      // Schedule the notification
      const timeoutId = setTimeout(() => {
        this.sendNotification(notification);
        this.scheduledNotifications.delete(notification.id);
      }, delay);
      
      // Store the timeout ID for later cancellation
      this.scheduledNotifications.set(notification.id, timeoutId);
      
      console.log(`Scheduled notification ${notification.id} for ${notificationTime.toISOString()}`);
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
      // Emit event to renderer process
      if (ipcMain) {
      ipcMain.emit('notification', notification);
    }
      
      console.log(`Sent notification ${notification.id}: ${notification.message}`);
    } catch (error) {
      console.error(`Error sending notification ${notification.id}:`, error);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationManager();

export default notificationService;