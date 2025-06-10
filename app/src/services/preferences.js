/**
 * Preferences Service
 * Handles user preferences like working hours
 */

import Store from 'electron-store';
import logger from '../../electron-main/logger.js';

class PreferencesService {
  constructor() {
    this.store = new Store({
      name: 'user-preferences',
      defaults: {
        workingHours: {
          startTime: '10:00', // Default: 10 AM
          endTime: '19:00', // Default: 7 PM
        },
      },
    });
  }

  /**
   * Get all user preferences
   * @returns {Object} User preferences
   */
  getPreferences() {
    try {
      return {
        workingHours: {
          startTime: this.store.get('workingHours.startTime'),
          endTime: this.store.get('workingHours.endTime'),
        },
      };
    } catch (error) {
      logger.logError(error, 'Error getting preferences');
      return {
        workingHours: {
          startTime: '10:00',
          endTime: '19:00',
        },
      };
    }
  }

  /**
   * Update working hours preferences
   * @param {Object} workingHours - Working hours object with startTime and endTime
   * @returns {boolean} Success status
   */
  updateWorkingHours(workingHours) {
    try {
      if (!workingHours || typeof workingHours !== 'object') {
        logger.warn('Invalid working hours format');
        return false;
      }

      const { startTime, endTime } = workingHours;

      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        logger.warn('Invalid time format for working hours');
        return false;
      }

      // Store working hours
      this.store.set('workingHours.startTime', startTime);
      this.store.set('workingHours.endTime', endTime);

      logger.info(`Updated working hours: ${startTime} - ${endTime}`);
      return true;
    } catch (error) {
      logger.logError(error, 'Error updating working hours');
      return false;
    }
  }
}

// Create and export a singleton instance
const preferencesService = new PreferencesService();
export default preferencesService;
