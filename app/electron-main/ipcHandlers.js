import { ipcMain } from 'electron';
import Project from '../src/models/Project.js';
import projectManager from '../src/services/project.js';
import taskManager from '../src/services/task.js';
import notificationService from '../src/services/notification.js';
import preferencesService from '../src/services/preferences.js';
import logger from './logger.js';

/**
 * Set up IPC handlers for project and task operations
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} aiService - The AI service module
 */
export function setupIpcHandlers(mainWindow, aiService) {
  // Project operations
  ipcMain.handle('projects:getAll', async () => {
    try {
      return await projectManager.getProjects();
    } catch (error) {
      logger.logError(error, 'IPC Error - getProjects');
      return [];
    }
  });

  ipcMain.handle('projects:add', async (_, projectData) => {
    try {
      const project = new Project(projectData);
      return await projectManager.addProject(project);
    } catch (error) {
      logger.logError(error, 'IPC Error - addProject');
      return false;
    }
  });

  ipcMain.handle('projects:update', async (_, projectData) => {
    try {
      logger.debug('Received project update request:', projectData);
      const project = new Project(projectData);
      logger.debug('Created project instance:', project);
      const result = await projectManager.updateProject(project);
      logger.debug('Update result:', result);
      return result;
    } catch (error) {
      logger.logError(error, 'IPC Error - updateProject');
      return false;
    }
  });

  ipcMain.handle('projects:delete', async (_, projectId) => {
    try {
      return await projectManager.deleteProject(projectId);
    } catch (error) {
      logger.logError(error, 'IPC Error - deleteProject');
      return false;
    }
  });

  // Task operations
  ipcMain.handle('tasks:getAll', async () => {
    try {
      return await taskManager.getTasks();
    } catch (error) {
      logger.logError(error, 'IPC Error - getTasks');
      return [];
    }
  });

  ipcMain.handle('tasks:getRecent', async () => {
    try {
      return await taskManager.getRecentTasks();
    } catch (error) {
      logger.logError(error, 'IPC Error - getRecentTasks');
      return [];
    }
  });

  ipcMain.handle('tasks:getByProject', async (_, projectId) => {
    try {
      return await taskManager.getTasksByProject(projectId);
    } catch (error) {
      logger.logError(error, `IPC Error - getTasksByProject for ${projectId}`);
      return [];
    }
  });

  ipcMain.handle('tasks:getRecentByProject', async (_, projectId) => {
    try {
      return await taskManager.getRecentTasksByProject(projectId);
    } catch (error) {
      logger.logError(error, `IPC Error - getRecentTasksByProject for ${projectId}`);
      return [];
    }
  });

  ipcMain.handle('tasks:add', async (_, taskData) => {
    try {
      const result = await taskManager.addTask(taskData);
      return result;
    } catch (error) {
      logger.logError(error, 'IPC Error - addTask');
      return false;
    }
  });

  ipcMain.handle('tasks:update', async (_, taskData) => {
    try {
      return await taskManager.updateTask(taskData);
    } catch (error) {
      logger.logError(error, 'IPC Error - updateTask');
      return false;
    }
  });

  ipcMain.handle('tasks:delete', async (_, taskId) => {
    try {
      return await taskManager.deleteTask(taskId);
    } catch (error) {
      logger.logError(error, `IPC Error - deleteTask for ${taskId}`);
      return false;
    }
  });

  ipcMain.handle('tasks:updateStatus', async (_, taskId, status) => {
    try {
      return await taskManager.updateTaskStatus(taskId, status);
    } catch (error) {
      logger.logError(error, `IPC Error - updateTaskStatus for ${taskId}`);
      return false;
    }
  });

  ipcMain.handle('tasks:rescheduleOverdue', async () => {
    try {
      const result = await taskManager.rescheduleOverdueTasksToToday();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tasks:refresh');
      }
      return result;
    } catch (error) {
      logger.logError(error, 'IPC Error - rescheduleOverdueTasks');
      return false;
    }
  });

  ipcMain.handle('tasks:planMyDay', async () => {
    try {
      // Get user preferences for working hours and buffer time
      const preferences = await preferencesService.getPreferences();

      // Plan the day using the task manager with complete preferences
      const result = await taskManager.planMyDay(preferences);

      // Notify the renderer to refresh tasks
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tasks:refresh');
      }

      return result;
    } catch (error) {
      logger.logError(error, 'IPC Error - planMyDay');
      return {
        scheduled: [],
        unscheduled: [],
        message: `Error planning day: ${error.message}`
      };
    }
  });

  // Notification operations
  ipcMain.handle('notifications:getByTask', async (_, taskId) => {
    try {
      return await notificationService.getNotificationsByTask(taskId);
    } catch (error) {
      logger.logError(error, `IPC Error - getNotificationsByTask for ${taskId}`);
      return [];
    }
  });

  ipcMain.handle('notifications:add', async (_, notificationData) => {
    try {
      const result = await notificationService.addNotification(notificationData);
      if (result) {
        // Emit notification changed event with the task ID
        mainWindow.webContents.send('notifications:changed', notificationData.taskId || notificationData.task_id);
        mainWindow.webContents.send('notifications:refresh');
      }
      return result;
    } catch (error) {
      logger.logError(error, 'IPC Error - addNotification');
      return false;
    }
  });

  ipcMain.handle('notifications:update', async (_, notificationData) => {
    try {
      const result = await notificationService.updateNotification(notificationData);
      if (result) {
        // Emit notification changed event with the task ID
        mainWindow.webContents.send('notifications:changed', notificationData.taskId || notificationData.task_id);
        mainWindow.webContents.send('notifications:refresh');
      }
      return result;
    } catch (error) {
      logger.logError(error, `IPC Error - updateNotification for ${notificationData.id}`);
      return false;
    }
  });

  ipcMain.handle('notifications:delete', async (_, notificationId) => {
    try {
      // Get the specific notification to know which task it belongs to
      const notification = await notificationService.getNotificationById(notificationId);
      const taskId = notification ? notification.taskId || notification.task_id : null;
      
      const result = await notificationService.deleteNotification(notificationId);
      if (result && taskId) {
        // Emit notification changed event with the task ID
        mainWindow.webContents.send('notifications:changed', taskId);
        mainWindow.webContents.send('notifications:refresh');
      }
      return result;
    } catch (error) {
      logger.logError(error, `IPC Error - deleteNotification for ${notificationId}`);
      return false;
    }
  });

  // Set up notification event listener
  ipcMain.on('notification', (event, notification) => {
    // Forward notification to renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('notification:received', notification);
    }
  });

  // Preferences operations
  ipcMain.handle('preferences:get', async () => {
    try {
      return preferencesService.getPreferences();
    } catch (error) {
      logger.logError(error, 'IPC Error - getPreferences');
      return {
        workingHours: {
          startTime: '10:00',
          endTime: '19:00'
        }
      };
    }
  });

  ipcMain.handle('preferences:updateWorkingHours', async (_, workingHours) => {
    try {
      return preferencesService.updateWorkingHours(workingHours);
    } catch (error) {
      logger.logError(error, 'IPC Error - updateWorkingHours');
      return false;
    }
  });

  ipcMain.handle('preferences:updateBufferTime', async (_, bufferTime) => {
    try {
      return preferencesService.updateBufferTime(bufferTime);
    } catch (error) {
      logger.logError(error, 'IPC Error - updateBufferTime');
      return false;
    }
  });

  // AI operations
  ipcMain.handle('ai:configure', async (_, config) => {
    return aiService.configureAI(config);
  });

  ipcMain.handle('ai:getChatHistory', () => {
    return aiService.getChatHistory();
  });

  ipcMain.handle('ai:clearHistory', () => {
    return aiService.clearHistory();
  });

  ipcMain.handle('ai:sendMessage', async (_, message) => {
    return aiService.sendMessage(message, mainWindow);
  });
} 