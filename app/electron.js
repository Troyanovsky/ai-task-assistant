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
import axios from 'axios';
import Store from 'electron-store';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize persistent store
const store = new Store({
  name: 'ai-settings',
  defaults: {
    aiSettings: {
      apiKey: '',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini'
    }
  }
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// AI state
const aiState = {
  chatHistory: [],
  isConfigured: false,
  apiKey: store.get('aiSettings.apiKey', ''),
  apiUrl: store.get('aiSettings.apiUrl', 'https://api.openai.com/v1/chat/completions'),
  model: store.get('aiSettings.model', 'gpt-4o-mini')
};

// Set initial configuration state
aiState.isConfigured = Boolean(aiState.apiKey);

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

  // AI operations
  ipcMain.handle('ai:configure', async (_, config) => {
    try {
      aiState.apiKey = config.apiKey || aiState.apiKey;
      aiState.apiUrl = config.apiUrl || aiState.apiUrl;
      aiState.model = config.model || aiState.model;
      aiState.isConfigured = Boolean(aiState.apiKey);
      
      // Persist settings
      store.set('aiSettings.apiKey', aiState.apiKey);
      store.set('aiSettings.apiUrl', aiState.apiUrl);
      store.set('aiSettings.model', aiState.model);
      
      return { 
        success: true, 
        isConfigured: aiState.isConfigured,
        apiKey: aiState.apiKey,
        apiUrl: aiState.apiUrl,
        model: aiState.model
      };
    } catch (error) {
      console.error('IPC Error - configureAI:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai:getChatHistory', () => {
    return aiState.chatHistory;
  });

  ipcMain.handle('ai:clearHistory', () => {
    aiState.chatHistory = [];
    return true;
  });

  ipcMain.handle('ai:sendMessage', async (_, message) => {
    try {
      // Add user message to history
      const userMessage = {
        text: message,
        sender: 'user',
        timestamp: new Date()
      };
      aiState.chatHistory.push(userMessage);

      // Check if AI is configured
      if (!aiState.isConfigured) {
        const errorMessage = {
          text: 'AI service not configured. Please set API key in Settings.',
          sender: 'ai',
          timestamp: new Date()
        };
        aiState.chatHistory.push(errorMessage);
        return { success: false, error: 'AI service not configured', chatHistory: aiState.chatHistory };
      }

      // Process with LLM API
      const response = await processWithLLM(message);
      
      // Add AI response to history
      const aiMessage = {
        text: response.text,
        sender: 'ai',
        timestamp: new Date(),
        functionCall: response.functionCall
      };
      aiState.chatHistory.push(aiMessage);

      // Handle function calls if present
      if (response.functionCall) {
        const result = await executeFunctionCall(response.functionCall);
        
        if (result && result.message) {
          const resultMessage = {
            text: result.message,
            sender: 'ai',
            timestamp: new Date()
          };
          aiState.chatHistory.push(resultMessage);
        }
      }

      return { success: true, chatHistory: aiState.chatHistory };
    } catch (error) {
      console.error('IPC Error - sendMessage:', error);
      
      // Add error message to chat history
      const errorMessage = {
        text: `Sorry, I encountered an error: ${error.message}`,
        sender: 'ai',
        timestamp: new Date()
      };
      aiState.chatHistory.push(errorMessage);
      
      return { 
        success: false, 
        error: error.message,
        chatHistory: aiState.chatHistory
      };
    }
  });
}

/**
 * Process user input with LLM API
 * @param {string} userInput - User's message
 * @returns {Object} - AI response
 */
async function processWithLLM(userInput) {
  try {
    // Import function schemas
    const functionSchemasModule = await import('./src/services/functionSchemas.js');
    const functionSchemas = functionSchemasModule.default;
    
    // Format chat history for the API
    const messages = [
      ...aiState.chatHistory
        .filter((msg, index) => index < aiState.chatHistory.length - 1) // Exclude the just added user message
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
      { role: 'user', content: userInput }
    ];

    // Make API request
    const response = await axios.post(
      aiState.apiUrl,
      {
        model: aiState.model,
        messages,
        functions: functionSchemas,
        function_call: 'auto'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiState.apiKey}`
        }
      }
    );

    // Process the response
    const aiResponse = response.data.choices[0].message;
    
    // Check if the response contains function calls
    if (aiResponse.function_call) {
      return {
        text: aiResponse.content || "I'll help you with that.",
        functionCall: {
          name: aiResponse.function_call.name,
          arguments: JSON.parse(aiResponse.function_call.arguments)
        }
      };
    }

    // Regular text response
    return {
      text: aiResponse.content
    };
  } catch (error) {
    console.error('Error calling LLM API:', error);
    throw new Error(`Failed to process input: ${error.message}`);
  }
}

/**
 * Execute a function call based on AI response
 * @param {Object} functionCall - Function call object from AI
 * @returns {Promise<Object>} - Result of the function execution
 */
async function executeFunctionCall(functionCall) {
  const { name, arguments: args } = functionCall;
  
  try {
    switch (name) {
      case 'addTask':
        const task = await taskManager.addTask(args);
        return { 
          success: true, 
          task,
          message: `Task "${args.name}" has been created.`
        };
        
      case 'updateTask':
        await taskManager.updateTask(args);
        return { 
          success: true,
          message: `Task "${args.id}" has been updated.`
        };
        
      case 'deleteTask':
        await taskManager.deleteTask(args.id);
        return { 
          success: true,
          message: `Task has been deleted.`
        };
        
      case 'getTasks':
        let tasks = await taskManager.getTasks();
        
        if (args.projectId) {
          tasks = tasks.filter(task => task.projectId === args.projectId);
        }
        
        if (args.status) {
          tasks = tasks.filter(task => task.status === args.status);
        }
        
        if (args.priority) {
          tasks = tasks.filter(task => task.priority === args.priority);
        }
        
        return { 
          success: true, 
          tasks,
          message: tasks.length > 0 
            ? `Found ${tasks.length} tasks.` 
            : 'No tasks found matching your criteria.'
        };
        
      case 'getProjects':
        const projects = await projectManager.getProjects();
        return { 
          success: true, 
          projects,
          message: projects.length > 0 
            ? `Found ${projects.length} projects.` 
            : 'No projects found.'
        };
        
      case 'addProject':
        const project = new Project(args);
        const newProject = await projectManager.addProject(project);
        return { 
          success: true, 
          project: newProject,
          message: `Project "${args.name}" has been created.`
        };
        
      default:
        throw new Error(`Function "${name}" is not available`);
    }
  } catch (error) {
    console.error(`Error executing function "${name}":`, error);
    return { 
      success: false, 
      error: error.message,
      message: `Sorry, I couldn't complete that action: ${error.message}`
    };
  }
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
    minWidth: 1100,
    minHeight: 700,
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