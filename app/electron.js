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
      
      // Send updated chat history to frontend immediately after user message
      mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);

      // Check if AI is configured
      if (!aiState.isConfigured) {
        const errorMessage = {
          text: 'AI service not configured. Please set API key in Settings.',
          sender: 'ai',
          timestamp: new Date()
        };
        aiState.chatHistory.push(errorMessage);
        mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
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
      
      // Send updated chat history to frontend immediately after AI response
      mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);

      // Handle function calls if present
      if (response.functionCall) {
        // Add a message indicating function execution is in progress
        const executingMessage = {
          text: `Executing: ${response.functionCall.name}`,
          sender: 'system',
          timestamp: new Date(),
          isExecutionProgress: true
        };
        aiState.chatHistory.push(executingMessage);
        mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
        
        // Execute the function
        const result = await executeFunctionCall(response.functionCall);
        
        // Add function result to chat history
        if (result && result.message) {
          const resultMessage = {
            text: result.message,
            sender: 'system',
            timestamp: new Date(),
            isExecutionResult: true
          };
          aiState.chatHistory.push(resultMessage);
          // Send updated chat history to frontend immediately after function execution
          mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
          
          // Trigger UI updates if needed based on function type
          if (response.functionCall.name === 'addProject' || response.functionCall.name === 'updateProject' || response.functionCall.name === 'deleteProject') {
            mainWindow.webContents.send('projects:refresh');
          }
          
          if (response.functionCall.name === 'addTask' || response.functionCall.name === 'updateTask' || response.functionCall.name === 'deleteTask') {
            mainWindow.webContents.send('tasks:refresh');
          }
        }
        
        // Process the function result with LLM to get a new response
        const functionResult = {
          functionName: response.functionCall.name,
          data: result
        };
        
        // Get AI's response to the function result
        const followUpResponse = await processWithLLM(null, functionResult);
        
        // Add the follow-up response to chat history
        const followUpMessage = {
          text: followUpResponse.text,
          sender: 'ai',
          timestamp: new Date(),
          functionCall: followUpResponse.functionCall
        };
        aiState.chatHistory.push(followUpMessage);
        // Send updated chat history to frontend immediately after follow-up response
        mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
        
        // Handle nested function calls if present (one level deep)
        if (followUpResponse.functionCall) {
          // Add a message indicating nested function execution is in progress
          const nestedExecutingMessage = {
            text: `Executing: ${followUpResponse.functionCall.name}`,
            sender: 'system',
            timestamp: new Date(),
            isExecutionProgress: true
          };
          aiState.chatHistory.push(nestedExecutingMessage);
          mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
          
          const nestedResult = await executeFunctionCall(followUpResponse.functionCall);
          
          // Add nested function result to chat history
          if (nestedResult && nestedResult.message) {
            const nestedResultMessage = {
              text: nestedResult.message,
              sender: 'system',
              timestamp: new Date(),
              isExecutionResult: true
            };
            aiState.chatHistory.push(nestedResultMessage);
            // Send updated chat history to frontend after nested function execution
            mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
            
            // Trigger UI updates if needed based on function type
            if (followUpResponse.functionCall.name === 'addProject' || followUpResponse.functionCall.name === 'updateProject' || followUpResponse.functionCall.name === 'deleteProject') {
              mainWindow.webContents.send('projects:refresh');
            }
            
            if (followUpResponse.functionCall.name === 'addTask' || followUpResponse.functionCall.name === 'updateTask' || followUpResponse.functionCall.name === 'deleteTask') {
              mainWindow.webContents.send('tasks:refresh');
            }
          }
          
          // Process the nested function result with LLM
          const nestedFunctionResult = {
            functionName: followUpResponse.functionCall.name,
            data: nestedResult
          };
          
          // Get AI's final response to the nested function result
          const finalResponse = await processWithLLM(null, nestedFunctionResult);
          
          // Add the final response to chat history
          const finalMessage = {
            text: finalResponse.text,
            sender: 'ai',
            timestamp: new Date(),
            functionCall: finalResponse.functionCall
          };
          aiState.chatHistory.push(finalMessage);
          // Send final updated chat history to frontend
          mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
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
      // Send error update to frontend
      mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
      
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
 * @param {Object} functionResult - Result from a previous function call, if any
 * @returns {Object} - AI response
 */
async function processWithLLM(userInput, functionResult = null) {
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
          content: msg.text,
          // Include function call information for assistant messages if present
          ...(msg.sender === 'ai' && msg.functionCall ? {
            function_call: {
              name: msg.functionCall.name,
              arguments: JSON.stringify(msg.functionCall.arguments)
            }
          } : {})
        }))
    ];
    
    // Add the function result if provided
    if (functionResult) {
      messages.push({
        role: 'function',
        name: functionResult.functionName,
        content: JSON.stringify(functionResult.data)
      });
    } else {
      // If no function result, add the user message
      messages.push({ role: 'user', content: userInput });
    }

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
        // Check if the project ID is actually a project name
        if (args.projectId && typeof args.projectId === 'string') {
          // Check if this is a project name rather than ID
          if (!args.projectId.includes('-')) {
            console.log(`Looking up project ID for project name: ${args.projectId}`);
            // It's likely a project name, look up the project by name
            const projects = await projectManager.getProjects();
            const project = projects.find(p => p.name.toLowerCase() === args.projectId.toLowerCase());
            
            if (project) {
              console.log(`Found project with name "${args.projectId}": ${project.id}`);
              args.projectId = project.id;
            } else {
              console.log(`No project found with name "${args.projectId}"`);
              return {
                success: false,
                error: `Project "${args.projectId}" not found`,
                message: `I couldn't find a project named "${args.projectId}". Please specify a valid project name or ID.`
              };
            }
          }
        }
        
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
          // Check if this is a project name rather than ID
          if (typeof args.projectId === 'string' && !args.projectId.includes('-')) {
            // It's likely a project name, look up the project by name
            const projects = await projectManager.getProjects();
            const project = projects.find(p => p.name.toLowerCase() === args.projectId.toLowerCase());
            
            if (project) {
              args.projectId = project.id;
            } else {
              return {
                success: false,
                error: `Project "${args.projectId}" not found`,
                message: `I couldn't find a project named "${args.projectId}". Please specify a valid project name or ID.`
              };
            }
          }
          
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