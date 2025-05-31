import axios from 'axios';
import Store from 'electron-store';
import Project from '../src/models/Project.js';
import projectManager from '../src/services/project.js';
import taskManager from '../src/services/task.js';
import notificationService from '../src/services/notification.js';
import { Notification, TYPE } from '../src/models/Notification.js';

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
 * Configure AI service with provided settings
 * @param {Object} config - Configuration object
 * @returns {Object} - Configuration status
 */
function configureAI(config) {
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
    console.error('Error configuring AI:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the current chat history
 * @returns {Array} - Chat history
 */
function getChatHistory() {
  return aiState.chatHistory;
}

/**
 * Clear the chat history
 * @returns {boolean} - Success status
 */
function clearHistory() {
  aiState.chatHistory = [];
  return true;
}

/**
 * Send a message to the AI service
 * @param {string} message - User message
 * @param {BrowserWindow} mainWindow - Main window instance for sending updates
 * @returns {Object} - Response with chat history
 */
async function sendMessage(message, mainWindow) {
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

    // Fetch projects to provide context to the AI
    let projectsInfo = "";
    try {
      const projects = await projectManager.getProjects();
      if (projects && projects.length > 0) {
        projectsInfo = "<available_projects>\n";
        projects.forEach(project => {
          projectsInfo += `- ${project.name} (ID: ${project.id})\n`;
        });
        projectsInfo += "</available_projects>\n";
      }
    } catch (error) {
      console.error('Error fetching projects for AI context:', error);
    }

    // Add current date and time to the context
    const now = new Date();
    const localTimeString = now.toLocaleString();
    const dateTimeInfo = `<current_datetime>${localTimeString}</current_datetime>\n`;

    // Prepend projects info and date/time to the user message
    const enhancedMessage = projectsInfo + dateTimeInfo + message;

    // Process with LLM API using the enhanced message
    const response = await processWithLLM(enhancedMessage);
    
    // Add AI response to history
    const aiMessage = {
      text: response.text,
      sender: 'ai',
      timestamp: new Date(),
      functionCalls: response.functionCalls
    };
    aiState.chatHistory.push(aiMessage);
    
    // Send updated chat history to frontend immediately after AI response
    mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);

    // Handle function calls if present
    if (response.functionCalls && response.functionCalls.length > 0) {
      // Create an array to store all function results
      const functionResults = [];
      
      // Execute each function call and collect results
      for (const functionCall of response.functionCalls) {
        // Add a message indicating function execution is in progress
        const executingMessage = {
          text: `Executing: ${functionCall.name}`,
          sender: 'system',
          timestamp: new Date(),
          isExecutionProgress: true
        };
        aiState.chatHistory.push(executingMessage);
        mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
        
        // Execute the function
        const result = await executeFunctionCall(functionCall);
        
        // Store the result for later processing
        functionResults.push({
          functionName: functionCall.name,
          data: result
        });
        
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
          if (functionCall.name === 'addProject' || functionCall.name === 'updateProject' || functionCall.name === 'deleteProject') {
            mainWindow.webContents.send('projects:refresh');
          }
          
          if (functionCall.name === 'addTask' || functionCall.name === 'updateTask' || functionCall.name === 'deleteTask') {
            mainWindow.webContents.send('tasks:refresh');
          }
          
          if (functionCall.name === 'addNotification' || functionCall.name === 'updateNotification' || functionCall.name === 'deleteNotification') {
            mainWindow.webContents.send('notifications:refresh');
            
            // If we have a taskId, also send the notifications:changed event
            if (result.notification && result.notification.taskId) {
              mainWindow.webContents.send('notifications:changed', result.notification.taskId);
            } else if (result.taskId) {
              mainWindow.webContents.send('notifications:changed', result.taskId);
            }
          }
        }
      }
      
      // Send all function results back to the LLM for a final response
      const followUpResponse = await processWithLLM(null, functionResults);
      
      // Add the follow-up response to chat history
      const followUpMessage = {
        text: followUpResponse.text,
        sender: 'ai',
        timestamp: new Date(),
        functionCalls: followUpResponse.functionCalls
      };
      aiState.chatHistory.push(followUpMessage);
      
      // Send updated chat history to frontend immediately after follow-up response
      mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
      
      // Handle nested function calls if present in follow-up response
      if (followUpResponse.functionCalls && followUpResponse.functionCalls.length > 0) {
        // Create an array to store all nested function results
        const nestedFunctionResults = [];
        
        // Execute each nested function call and collect results
        for (const nestedFunctionCall of followUpResponse.functionCalls) {
          // Add a message indicating nested function execution is in progress
          const nestedExecutingMessage = {
            text: `Executing: ${nestedFunctionCall.name}`,
            sender: 'system',
            timestamp: new Date(),
            isExecutionProgress: true
          };
          aiState.chatHistory.push(nestedExecutingMessage);
          mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
          
          // Execute the nested function
          const nestedResult = await executeFunctionCall(nestedFunctionCall);
          
          // Store the result for later processing
          nestedFunctionResults.push({
            functionName: nestedFunctionCall.name,
            data: nestedResult
          });
          
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
            if (nestedFunctionCall.name === 'addProject' || nestedFunctionCall.name === 'updateProject' || nestedFunctionCall.name === 'deleteProject') {
              mainWindow.webContents.send('projects:refresh');
            }
            
            if (nestedFunctionCall.name === 'addTask' || nestedFunctionCall.name === 'updateTask' || nestedFunctionCall.name === 'deleteTask') {
              mainWindow.webContents.send('tasks:refresh');
            }
            
            if (nestedFunctionCall.name === 'addNotification' || nestedFunctionCall.name === 'updateNotification' || nestedFunctionCall.name === 'deleteNotification') {
              mainWindow.webContents.send('notifications:refresh');
              
              // If we have a taskId, also send the notifications:changed event
              if (nestedResult.notification && nestedResult.notification.taskId) {
                mainWindow.webContents.send('notifications:changed', nestedResult.notification.taskId);
              } else if (nestedResult.taskId) {
                mainWindow.webContents.send('notifications:changed', nestedResult.taskId);
              }
            }
          }
        }
        
        // Send all nested function results back to the LLM for a final response
        const finalResponse = await processWithLLM(null, nestedFunctionResults);
        
        // Add the final response to chat history
        const finalMessage = {
          text: finalResponse.text,
          sender: 'ai',
          timestamp: new Date(),
          functionCalls: finalResponse.functionCalls
        };
        aiState.chatHistory.push(finalMessage);
        // Send final updated chat history to frontend
        mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
      }
    }

    return { success: true, chatHistory: aiState.chatHistory };
  } catch (error) {
    console.error('Error sending message:', error);
    
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
}

/**
 * Process user input with LLM API
 * @param {string} userInput - User's message
 * @param {Array|Object} functionResults - Results from previous function calls, if any
 * @returns {Object} - AI response
 */
async function processWithLLM(userInput, functionResults = null) {
  try {
    // Import function schemas
    const functionSchemasModule = await import('../src/services/functionSchemas.js');
    const functionSchemas = functionSchemasModule.default;
    
    const systemMessage = "You're FokusZeit, an AI task assistant. \
    Use the tools provided to you to help the user with their task & project management. \
    For some queries, you may need to execute multiple tools in a row to find info that the user didn't provide. \
    For example, if the user didn't provide task id, you can look for tasks in projects first. \
    ";

    // Format chat history for the API
    const messages = [
      // Add system message
      { role: 'system', content: systemMessage },
      ...aiState.chatHistory
        .filter((msg, index) => index < aiState.chatHistory.length - 1) // Exclude the just added user message
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          // Include function call information for assistant messages if present
          ...(msg.sender === 'ai' && msg.functionCalls && msg.functionCalls.length > 0 ? {
            tool_calls: msg.functionCalls.map((fc, idx) => ({
              type: 'function',
              id: `call_${Date.now()}_${idx}`,
              function: {
                name: fc.name,
                arguments: JSON.stringify(fc.arguments)
              }
            }))
          } : {})
        }))
    ];
    
    // Add the function results if provided
    if (functionResults) {
      // Handle single function result (backward compatibility)
      if (!Array.isArray(functionResults)) {
        functionResults = [functionResults];
      }
      
      // Add each function result as a tool message
      functionResults.forEach((result, idx) => {
        messages.push({
          role: 'tool',
          tool_call_id: `call_${Date.now() - 1}_${idx}`, // Use a predictable ID that matches the previous call
          name: result.functionName,
          content: JSON.stringify(result.data)
        });
      });
      
      // Fetch projects to provide context for function result processing
      try {
        const projects = await projectManager.getProjects();
        if (projects && projects.length > 0) {
          let projectsInfo = "<available_projects>\n";
          projects.forEach(project => {
            projectsInfo += `- ${project.name} (ID: ${project.id})\n`;
          });
          projectsInfo += "</available_projects>\n";
          
          // Add current date and time
          const now = new Date();
          const localTimeString = now.toLocaleString();
          const dateTimeInfo = `<current_datetime>${localTimeString}</current_datetime>\n`;
          
          // Add a system message with project information and date/time for context
          messages.push({
            role: 'system',
            content: projectsInfo + dateTimeInfo
          });
        }
      } catch (error) {
        console.error('Error fetching projects for AI context in function result processing:', error);
      }
    } else {
      // If no function result, add the user message
      messages.push({ role: 'user', content: userInput });
    }

    // Create request payload
    const requestPayload = {
      model: aiState.model,
      messages,
      tools: functionSchemas,
      tool_choice: 'auto'
    };

    // Log raw API request
    console.log('🔄 Electron Main Process - AI API Request:', JSON.stringify(requestPayload, null, 2));

    // Make API request
    const response = await axios.post(
      aiState.apiUrl,
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiState.apiKey}`
        }
      }
    );

    // Log raw API response
    console.log('✅ Electron Main Process - AI API Response:', JSON.stringify(response.data, null, 2));

    // Process the response
    const aiResponse = response.data.choices[0].message;
    
    // Check if the response contains tool calls
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      // Convert all tool calls to function calls
      const functionCalls = aiResponse.tool_calls
        .filter(toolCall => toolCall.type === 'function')
        .map(toolCall => ({
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments)
        }));
      
      if (functionCalls.length > 0) {
        return {
          text: aiResponse.content || "I'll help you with that.",
          functionCalls: functionCalls
        };
      }
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
  const { id, name, arguments: args } = functionCall;
  
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
        
        // Convert local date string to ISO format if provided
        if (args.dueDate && typeof args.dueDate === 'string') {
          try {
            // Try parsing as ISO first
            let dueDate = new Date(args.dueDate);
            
            // If invalid or looks like a local date format, try parsing it as a local date
            if (isNaN(dueDate) || !args.dueDate.includes('T')) {
              // This is likely a local date format
              console.log(`Converting local date format: ${args.dueDate}`);
              dueDate = new Date(args.dueDate);
            }
            
            if (!isNaN(dueDate)) {
              // Store only the date part with noon time to avoid timezone issues
              const year = dueDate.getFullYear();
              const month = dueDate.getMonth();
              const day = dueDate.getDate();
              const dateOnly = new Date(year, month, day, 12, 0, 0);
              args.dueDate = dateOnly.toISOString().split('T')[0] + 'T12:00:00.000Z';
            } else {
              console.log(`Invalid date format: ${args.dueDate}`);
            }
          } catch (error) {
            console.log(`Error parsing due date: ${args.dueDate}`, error);
          }
        }
        
        const task = await taskManager.addTask(args);
        return { 
          success: true, 
          task,
          taskId: task.id,
          message: `Task "${args.name}" has been created with ID: ${task.id}.`
        };
        
      case 'updateTask':
        // Convert local date string to ISO format if provided
        if (args.dueDate && typeof args.dueDate === 'string') {
          try {
            // Try parsing as ISO first
            let dueDate = new Date(args.dueDate);
            
            // If invalid or looks like a local date format, try parsing it as a local date
            if (isNaN(dueDate) || !args.dueDate.includes('T')) {
              // This is likely a local date format
              console.log(`Converting local date format: ${args.dueDate}`);
              dueDate = new Date(args.dueDate);
            }
            
            if (!isNaN(dueDate)) {
              // Store only the date part with noon time to avoid timezone issues
              const year = dueDate.getFullYear();
              const month = dueDate.getMonth();
              const day = dueDate.getDate();
              const dateOnly = new Date(year, month, day, 12, 0, 0);
              args.dueDate = dateOnly.toISOString().split('T')[0] + 'T12:00:00.000Z';
            } else {
              console.log(`Invalid date format: ${args.dueDate}`);
            }
          } catch (error) {
            console.log(`Error parsing due date: ${args.dueDate}`, error);
          }
        }
        
        await taskManager.updateTask(args);
        return { 
          success: true,
          taskId: args.id,
          message: `Task "${args.id}" has been updated.`
        };
        
      case 'deleteTask':
        await taskManager.deleteTask(args.id);
        return { 
          success: true,
          taskId: args.id,
          message: `Task with ID ${args.id} has been deleted.`
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
          taskIds: tasks.map(task => task.id),
          message: tasks.length > 0 
            ? `Found ${tasks.length} tasks.` 
            : 'No tasks found matching your criteria.'
        };
        
      case 'getProjects':
        const projects = await projectManager.getProjects();
        return { 
          success: true, 
          projects,
          projectIds: projects.map(project => project.id),
          message: projects.length > 0 
            ? `Found ${projects.length} projects.` 
            : 'No projects found.'
        };
        
      case 'addProject':
        const project = new Project(args);
        const newProject = await projectManager.addProject(project);
        return { 
          success: true, 
          project: project,
          projectId: project.id,
          message: `Project "${args.name}" has been created with ID: ${project.id}.`
        };
        
      case 'updateProject':
        const updatedProject = new Project(args);
        const updateProjectResult = await projectManager.updateProject(updatedProject);
        return {
          success: updateProjectResult,
          projectId: updatedProject.id,
          message: updateProjectResult 
            ? `Project "${args.name}" (ID: ${updatedProject.id}) has been updated.`
            : `Failed to update project "${args.name}" (ID: ${updatedProject.id}).`
        };
        
      case 'deleteProject':
        const deleteProjectResult = await projectManager.deleteProject(args.id);
        return {
          success: deleteProjectResult,
          projectId: args.id,
          message: deleteProjectResult
            ? `Project with ID ${args.id} has been deleted.`
            : `Failed to delete project with ID ${args.id}.`
        };
        
      case 'addNotification':
        // Convert local time string to ISO format if provided
        if (args.time && typeof args.time === 'string') {
          try {
            // Try parsing as ISO first
            let notificationTime = new Date(args.time);
            
            // If invalid or looks like a local date format, try parsing it as a local date
            if (isNaN(notificationTime) || !args.time.includes('T')) {
              // This is likely a local date format
              console.log(`Converting local date format for notification: ${args.time}`);
              notificationTime = new Date(args.time);
            }
            
            if (!isNaN(notificationTime)) {
              args.time = notificationTime.toISOString();
            } else {
              console.log(`Invalid date format for notification: ${args.time}`);
              return {
                success: false,
                error: `Invalid date format for notification time: ${args.time}`,
                message: `I couldn't create the notification because the time format is invalid.`
              };
            }
          } catch (error) {
            console.log(`Error parsing notification time: ${args.time}`, error);
            return {
              success: false,
              error: `Invalid date format for notification time: ${args.time}`,
              message: `I couldn't create the notification because the time format is invalid.`
            };
          }
        }
        
        // Validate notification type
        if (!Object.values(TYPE).includes(args.type)) {
          return {
            success: false,
            error: `Invalid notification type: ${args.type}`,
            message: `I couldn't create the notification because "${args.type}" is not a valid notification type. Valid types are: ${Object.values(TYPE).join(', ')}`
          };
        }
        
        // Create notification
        const notification = new Notification({
          taskId: args.taskId,
          time: args.time,
          type: args.type,
          message: args.message || ''
        });
        
        const addResult = await notificationService.addNotification(notification);
        return { 
          success: addResult,
          notification,
          notificationId: notification.id,
          message: addResult 
            ? `Notification has been created for task ${args.taskId}.`
            : `Failed to create notification for task ${args.taskId}.`
        };
        
      case 'updateNotification':
        // Convert local time string to ISO format if provided
        if (args.time && typeof args.time === 'string') {
          try {
            // Try parsing as ISO first
            let notificationTime = new Date(args.time);
            
            // If invalid or looks like a local date format, try parsing it as a local date
            if (isNaN(notificationTime) || !args.time.includes('T')) {
              // This is likely a local date format
              console.log(`Converting local date format for notification: ${args.time}`);
              notificationTime = new Date(args.time);
            }
            
            if (!isNaN(notificationTime)) {
              args.time = notificationTime.toISOString();
            } else {
              console.log(`Invalid date format for notification: ${args.time}`);
            }
          } catch (error) {
            console.log(`Error parsing notification time: ${args.time}`, error);
          }
        }
        
        // Validate notification type if provided
        if (args.type && !Object.values(TYPE).includes(args.type)) {
          return {
            success: false,
            error: `Invalid notification type: ${args.type}`,
            message: `I couldn't update the notification because "${args.type}" is not a valid notification type. Valid types are: ${Object.values(TYPE).join(', ')}`
          };
        }
        
        const updateNotificationResult = await notificationService.updateNotification(args);
        return {
          success: updateNotificationResult,
          notificationId: args.id,
          message: updateNotificationResult
            ? `Notification ${args.id} has been updated.`
            : `Failed to update notification ${args.id}.`
        };
        
      case 'deleteNotification':
        const deleteNotificationResult = await notificationService.deleteNotification(args.id);
        return {
          success: deleteNotificationResult,
          notificationId: args.id,
          message: deleteNotificationResult
            ? `Notification with ID ${args.id} has been deleted.`
            : `Failed to delete notification with ID ${args.id}.`
        };
        
      case 'getNotificationsByTask':
        const notifications = await notificationService.getNotificationsByTask(args.taskId);
        return { 
          success: true, 
          notifications,
          notificationIds: notifications.map(notification => notification.id),
          message: notifications.length > 0 
            ? `Found ${notifications.length} notifications for task ${args.taskId}.` 
            : `No notifications found for task ${args.taskId}.`
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

export default {
  configureAI,
  getChatHistory,
  clearHistory,
  sendMessage,
  processWithLLM,
  executeFunctionCall
}; 