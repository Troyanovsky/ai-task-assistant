import { ipcMain } from 'electron';
import Project from '../src/models/Project.js';
import projectManager from '../src/services/project.js';
import taskManager from '../src/services/task.js';
import notificationService from '../src/services/notification.js';

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
      console.error('IPC Error - getProjects:', error);
      return [];
    }
  });

  ipcMain.handle('projects:add', async (_, projectData) => {
    try {
      const project = new Project(projectData);
      return await projectManager.addProject(project);
    } catch (error) {
      console.error('IPC Error - addProject:', error);
      return false;
    }
  });

  ipcMain.handle('projects:update', async (_, projectData) => {
    try {
      console.log('Received project update request:', projectData);
      const project = new Project(projectData);
      console.log('Created project instance:', project);
      const result = await projectManager.updateProject(project);
      console.log('Update result:', result);
      return result;
    } catch (error) {
      console.error('IPC Error - updateProject:', error);
      return false;
    }
  });

  ipcMain.handle('projects:delete', async (_, projectId) => {
    try {
      return await projectManager.deleteProject(projectId);
    } catch (error) {
      console.error('IPC Error - deleteProject:', error);
      return false;
    }
  });

  // Task operations
  ipcMain.handle('tasks:getAll', async () => {
    try {
      return await taskManager.getTasks();
    } catch (error) {
      console.error('IPC Error - getTasks:', error);
      return [];
    }
  });

  ipcMain.handle('tasks:getByProject', async (_, projectId) => {
    try {
      return await taskManager.getTasksByProject(projectId);
    } catch (error) {
      console.error(`IPC Error - getTasksByProject for ${projectId}:`, error);
      return [];
    }
  });

  ipcMain.handle('tasks:add', async (_, taskData) => {
    try {
      const result = await taskManager.addTask(taskData);
      return result;
    } catch (error) {
      console.error('IPC Error - addTask:', error);
      return false;
    }
  });

  ipcMain.handle('tasks:update', async (_, taskData) => {
    try {
      return await taskManager.updateTask(taskData);
    } catch (error) {
      console.error('IPC Error - updateTask:', error);
      return false;
    }
  });

  ipcMain.handle('tasks:delete', async (_, taskId) => {
    try {
      return await taskManager.deleteTask(taskId);
    } catch (error) {
      console.error(`IPC Error - deleteTask for ${taskId}:`, error);
      return false;
    }
  });

  ipcMain.handle('tasks:updateStatus', async (_, taskId, status) => {
    try {
      return await taskManager.updateTaskStatus(taskId, status);
    } catch (error) {
      console.error(`IPC Error - updateTaskStatus for ${taskId}:`, error);
      return false;
    }
  });

  // Notification operations
  ipcMain.handle('notifications:getByTask', async (_, taskId) => {
    try {
      return await notificationService.getNotificationsByTask(taskId);
    } catch (error) {
      console.error(`IPC Error - getNotificationsByTask for ${taskId}:`, error);
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
      console.error('IPC Error - addNotification:', error);
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
      console.error(`IPC Error - updateNotification for ${notificationData.id}:`, error);
      return false;
    }
  });

  ipcMain.handle('notifications:delete', async (_, notificationId) => {
    try {
      // First get the notification to know which task it belongs to
      const notifications = await notificationService.getNotifications();
      const notification = notifications.find(n => n.id === notificationId);
      const taskId = notification ? notification.taskId || notification.task_id : null;
      
      const result = await notificationService.deleteNotification(notificationId);
      if (result && taskId) {
        // Emit notification changed event with the task ID
        mainWindow.webContents.send('notifications:changed', taskId);
        mainWindow.webContents.send('notifications:refresh');
      }
      return result;
    } catch (error) {
      console.error(`IPC Error - deleteNotification for ${notificationId}:`, error);
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