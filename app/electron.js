import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';
import databaseService from './src/services/database.js';
import notificationService from './src/services/notification.js';
import projectManager from './src/services/project.js';
import taskManager from './src/services/task.js';
import Project from './src/models/Project.js';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

/**
 * Initialize the application services
 */
async function initServices() {
  try {
    // Initialize database
    await databaseService.init();
    console.log('Database initialized');
    
    // Initialize notification service
    notificationService.init();
    console.log('Notification service initialized');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

/**
 * Set up IPC handlers for project operations
 */
function setupIpcHandlers() {
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
      return await taskManager.addTask(taskData);
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
}

/**
 * Wait for a specified URL to be available
 */
function waitForUrl(urlString, timeout = 30000, interval = 100) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(urlString);
    
    const checkUrl = () => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'HEAD'
      };
      
      const request = http.request(options, (response) => {
        if (response.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      
      request.on('error', () => {
        retry();
      });
      
      request.end();
    };
    
    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for ${urlString}`));
        return;
      }
      setTimeout(checkUrl, interval);
    };
    
    checkUrl();
  });
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1050,
    minHeight: 750,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // and load the index.html of the app.
  if (process.env.NODE_ENV === 'development') {
    // In development mode, wait for dev server to be ready before loading URL
    const devServerUrl = 'http://localhost:5173';
    console.log(`Waiting for dev server at ${devServerUrl}...`);
    
    waitForUrl(devServerUrl)
      .then(() => {
        console.log('Dev server is ready, loading application...');
        mainWindow.loadURL(devServerUrl);
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
      })
      .catch((err) => {
        console.error('Failed to connect to dev server:', err);
        // Fallback to loading directly
        console.log('Attempting to load URL directly...');
        mainWindow.loadURL(devServerUrl);
      });
  } else {
    // Load from production build
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await initServices();
  setupIpcHandlers();
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    // Close database connection
    databaseService.close();
    app.quit();
  }
});

app.on('activate', function() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

// Close database connection when app is about to quit
app.on('before-quit', () => {
  databaseService.close();
});