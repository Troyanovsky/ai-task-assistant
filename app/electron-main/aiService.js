import axios from 'axios';
import Store from 'electron-store';
import Project from '../src/models/Project.js';
import projectManager from '../src/services/project.js';
import taskManager from '../src/services/task.js';
import notificationService from '../src/services/notification.js';
import { Notification, TYPE } from '../src/models/Notification.js';
import logger from './logger.js';

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
    
    logger.info('AI service configured successfully');
    
    return { 
      success: true, 
      isConfigured: aiState.isConfigured,
      apiKey: aiState.apiKey,
      apiUrl: aiState.apiUrl,
      model: aiState.model
    };
  } catch (error) {
    logger.logError(error, 'Error configuring AI');
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

    // Process with LLM API using the user message directly
    const response = await processWithLLM(message);
    
    // Add AI response to history
    const aiMessage = {
      text: response.text || "I'll help you with that.",
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
        // Execute the function
        const result = await executeFunctionCall(functionCall);
        
        // Store the result for later processing
        functionResults.push({
          functionName: functionCall.name,
          functionCallId: functionCall.id, // Store the original function call ID
          data: result
        });
        
        // Add tool message to chat history
        const toolMessage = {
          role: 'tool',
          tool_call_id: functionCall.id,
          content: JSON.stringify(result),
          sender: 'tool', // Add a sender property for consistency with other messages
          timestamp: new Date(),
          functionName: functionCall.name // Add function name for frontend display
        };
        aiState.chatHistory.push(toolMessage);
        
        // Trigger UI updates if needed based on function type
        if (result) {
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
      
      // Send updated chat history to frontend after adding tool messages
      mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
      
      // Send all function results back to the LLM for a final response
      const followUpResponse = await processWithLLM(null, functionResults);
      
      // Add the follow-up response to chat history
      const followUpMessage = {
        text: followUpResponse.text || "I'll help you with that.",
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
          // Execute the nested function
          const nestedResult = await executeFunctionCall(nestedFunctionCall);
          
          // Store the result for later processing
          nestedFunctionResults.push({
            functionName: nestedFunctionCall.name,
            functionCallId: nestedFunctionCall.id, // Store the original function call ID
            data: nestedResult
          });
          
          // Add nested tool message to chat history
          const nestedToolMessage = {
            role: 'tool',
            tool_call_id: nestedFunctionCall.id,
            content: JSON.stringify(nestedResult),
            sender: 'tool', // Add a sender property for consistency with other messages
            timestamp: new Date(),
            functionName: nestedFunctionCall.name // Add function name for frontend display
          };
          aiState.chatHistory.push(nestedToolMessage);
          
          // Trigger UI updates if needed based on function type
          if (nestedResult) {
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
        
        // Send updated chat history to frontend after adding nested tool messages
        mainWindow.webContents.send('ai:chatHistoryUpdate', aiState.chatHistory);
        
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
    logger.logError(error, 'Error sending message');
    
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
    
    const systemMessage = `<role>
You're FokusZeit, an AI task assistant.
</role>

<goal>
Use the tools provided to you to help the user with their task & project management.
</goal>

<available_projects>
{{PROJECTS_INFO}}
</available_projects>

<current_datetime>{{CURRENT_DATETIME}}</current_datetime>

<tips>
- For some queries, you may need to execute multiple tools in a row to find info that the user didn't provide, like task id or notification id.
- Most of the time, the user won't refer to tasks/projects/notifications with id but names or vague descriptions. In this case, use queryTasks or queryNotifications to find out the id.
</tips>`;

    // Fetch projects to provide context
    let formattedSystemMessage = systemMessage;
    try {
      const projects = await projectManager.getProjects();
      if (projects && projects.length > 0) {
        let projectsList = "";
        projects.forEach(project => {
          projectsList += `- ${project.name} (ID: ${project.id})\n`;
        });
        formattedSystemMessage = formattedSystemMessage.replace('{{PROJECTS_INFO}}', projectsList);
      } else {
        formattedSystemMessage = formattedSystemMessage.replace('{{PROJECTS_INFO}}', 'No projects available.');
      }
    } catch (error) {
      logger.logError(error, 'Error fetching projects for AI context');
      formattedSystemMessage = formattedSystemMessage.replace('{{PROJECTS_INFO}}', 'Error fetching projects.');
    }
    
    // Add current date and time
    const now = new Date();
    const localTimeString = now.toLocaleString();
    formattedSystemMessage = formattedSystemMessage.replace('{{CURRENT_DATETIME}}', localTimeString);

    // Format chat history for the API
    const messages = [
      // Add system message
      { role: 'system', content: formattedSystemMessage },
    ];
    
    // Track function call IDs that will be added via functionResults
    // to avoid duplicating them from chat history
    const functionCallIdsToSkip = new Set();
    
    // If we have direct function results, get their IDs to avoid duplication
    if (functionResults) {
      // Handle single function result (backward compatibility)
      if (!Array.isArray(functionResults)) {
        functionResults = [functionResults];
      }
      
      // Collect IDs to skip
      functionResults.forEach(result => {
        if (result.functionCallId) {
          functionCallIdsToSkip.add(result.functionCallId);
        }
      });
    }
    
    // Process chat history and add to messages
    for (let i = 0; i < aiState.chatHistory.length; i++) {
      const msg = aiState.chatHistory[i];
      
      // Skip the last user message if we're processing a new user input
      // (since we'll add it separately below)
      if (functionResults === null && i === aiState.chatHistory.length - 1 && msg.sender === 'user') {
        continue;
      }
      
      // Skip tool messages that will be added via functionResults
      if (msg.sender === 'tool' && msg.tool_call_id && functionCallIdsToSkip.has(msg.tool_call_id)) {
        continue;
      }
      
      // Handle different message types
      if (msg.sender === 'user') {
        messages.push({
          role: 'user',
          content: msg.text
        });
      } else if (msg.sender === 'ai') {
        const assistantMessage = {
          role: 'assistant',
          content: msg.text
        };
        
        // Include function call information if present
        if (msg.functionCalls && msg.functionCalls.length > 0) {
          assistantMessage.tool_calls = msg.functionCalls.map((fc, idx) => ({
            type: 'function',
            id: fc.id || `call_${Date.now()}_${idx}`,
            function: {
              name: fc.name,
              arguments: JSON.stringify(fc.arguments)
            }
          }));
        }
        
        messages.push(assistantMessage);
      } else if (msg.sender === 'tool' || msg.role === 'tool') {
        // Handle tool messages that were added to chat history
        messages.push({
          role: 'tool',
          tool_call_id: msg.tool_call_id,
          content: msg.content
        });
      }
    }
    
    // Add the function results if provided
    if (functionResults) {
      // Add each function result as a tool message
      functionResults.forEach((result, idx) => {
        // Get the corresponding function call ID if available
        const toolCallId = result.functionCallId || `call_${Date.now()}_${idx}`;
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: JSON.stringify(result.data)
        });
      });
    } else if (userInput) {
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

    // Log raw API request with tools omitted for brevity
    const loggablePayload = {
      model: requestPayload.model,
      messages: requestPayload.messages
    };
    logger.info('🔄 Electron Main Process - AI API Request:', JSON.stringify(loggablePayload, null, 2));

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
    logger.info('✅ Electron Main Process - AI API Response:', JSON.stringify(response.data, null, 2));

    // Process the response
    const aiResponse = response.data.choices[0].message;
    
    // Check if the response contains tool calls
    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      // Convert all tool calls to function calls
      const functionCalls = aiResponse.tool_calls
        .filter(toolCall => toolCall.type === 'function')
        .map(toolCall => ({
          id: toolCall.id, // Preserve the original tool call ID
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
      text: aiResponse.content || "I'll help you with that."
    };
  } catch (error) {
    logger.logError(error, 'Error calling LLM API');
    throw new Error(`Failed to process input: ${error.message}`);
  }
}

/**
 * Execute a function call based on AI response
 * @param {Object} functionCall - Function call object from AI
 * @returns {Promise<Object>} - Result of the function execution
 */
async function executeFunctionCall(functionCall) {
  logger.info('🔄 Electron Main Process - Executing function call:', functionCall);
  const { id, name, arguments: args } = functionCall;
  
  try {
    // Common result properties to include the original function call ID
    const baseResult = {
      functionCallId: id // Store the original function call ID
    };

    switch (name) {
      case 'addTask':
        // Check if the project ID is actually a project name
        if (args.projectId && typeof args.projectId === 'string') {
          // Check if this is a project name rather than ID
          if (!args.projectId.includes('-')) {
            logger.info(`Looking up project ID for project name: ${args.projectId}`);
            // It's likely a project name, look up the project by name
            const projects = await projectManager.getProjects();
            const project = projects.find(p => p.name.toLowerCase() === args.projectId.toLowerCase());
            
            if (project) {
              logger.info(`Found project with name "${args.projectId}": ${project.id}`);
              args.projectId = project.id;
            } else {
              logger.info(`No project found with name "${args.projectId}"`);
              return {
                ...baseResult,
                success: false,
                error: `Project "${args.projectId}" not found`,
                message: `I couldn't find a project named "${args.projectId}". Please specify a valid project name or ID.`
              };
            }
          }
        }
        
        // Handle dueDate as YYYY-MM-DD string format
        if (args.dueDate && typeof args.dueDate === 'string') {
          try {
            logger.info(`Original dueDate input: ${args.dueDate}`);
            
            // If it already has time component, extract just the date part
            if (args.dueDate.includes('T')) {
              args.dueDate = args.dueDate.split('T')[0];
              logger.info(`Extracted date part from ISO string: ${args.dueDate}`);
            }
            
            // Validate the date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(args.dueDate)) {
              // If not in YYYY-MM-DD format, try to convert it
              logger.info(`Date ${args.dueDate} doesn't match YYYY-MM-DD format, parsing as Date`);
              
              // Fix: Create date with UTC to prevent timezone issues
              const [year, month, day] = args.dueDate.split('-');
              if (year && month && day) {
                // Ensure month and day are zero-padded
                const paddedMonth = month.padStart(2, '0');
                const paddedDay = day.padStart(2, '0');
                args.dueDate = `${year}-${paddedMonth}-${paddedDay}`;
                logger.info(`Formatted date with padding: ${args.dueDate}`);
              } else {
                // If we can't split it, use the Date object but force UTC
                const parsedDate = new Date(args.dueDate);
                if (!isNaN(parsedDate)) {
                  // Use UTC methods to avoid timezone issues
                  const utcYear = parsedDate.getUTCFullYear();
                  const utcMonth = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
                  const utcDay = String(parsedDate.getUTCDate()).padStart(2, '0');
                  args.dueDate = `${utcYear}-${utcMonth}-${utcDay}`;
                  logger.info(`Parsed and formatted date using UTC: ${args.dueDate}`);
                } else {
                  logger.info(`Invalid date format: ${args.dueDate}`);
                  args.dueDate = null;
                }
              }
            } else {
              logger.info(`Date already in correct YYYY-MM-DD format: ${args.dueDate}`);
            }
          } catch (error) {
            logger.logError(error, 'Error parsing due date');
            args.dueDate = null;
          }
        }
        
        // Convert local time string to ISO format if provided for plannedTime
        if (args.plannedTime && typeof args.plannedTime === 'string') {
          try {
            // Try parsing as ISO first to see if it's already in ISO format
            let plannedTime = new Date(args.plannedTime);
            
            // If invalid or looks like a local date format, try parsing it as a local date
            if (isNaN(plannedTime) || !args.plannedTime.includes('T')) {
              // This is likely a local date format (e.g., "May 31, 2023 15:30" or "5/31/2023 15:30")
              logger.info(`Converting local date format for planned time: ${args.plannedTime}`);
              
              // Try to parse date using more flexible approach
              plannedTime = new Date(args.plannedTime);
              
              // If still invalid, try some common formats
              if (isNaN(plannedTime)) {
                logger.info(`Failed to parse date directly, attempting structured parsing`);
                // Try to extract date and time components from common formats
                const dateTimeParts = args.plannedTime.split(/,\s*| /);
                if (dateTimeParts.length >= 2) {
                  // Last part is likely the time
                  const timePart = dateTimeParts[dateTimeParts.length - 1];
                  // Join the rest as the date part
                  const datePart = dateTimeParts.slice(0, dateTimeParts.length - 1).join(' ');
                  plannedTime = new Date(`${datePart} ${timePart}`);
                }
              }
            }
            
            if (!isNaN(plannedTime)) {
              logger.info(`Successfully parsed plannedTime from "${args.plannedTime}" to: ${plannedTime.toISOString()}`);
              args.plannedTime = plannedTime.toISOString();
            } else {
              logger.info(`Invalid date format for planned time: ${args.plannedTime}`);
              throw new Error(`Could not parse date/time from: ${args.plannedTime}`);
            }
          } catch (error) {
            logger.logError(error, 'Error parsing planned time');
            throw new Error(`Failed to parse planned time: ${error.message}`);
          }
        }
        
        const task = await taskManager.addTask(args);
        return { 
          ...baseResult,
          success: true, 
          task,
          taskId: task.id,
          message: `Task "${args.name}" has been created with ID: ${task.id}.`
        };
        
      case 'updateTask':
        // Handle dueDate as YYYY-MM-DD string format
        if (args.dueDate && typeof args.dueDate === 'string') {
          try {
            logger.info(`Original dueDate input: ${args.dueDate}`);
            
            // If it already has time component, extract just the date part
            if (args.dueDate.includes('T')) {
              args.dueDate = args.dueDate.split('T')[0];
              logger.info(`Extracted date part from ISO string: ${args.dueDate}`);
            }
            
            // Validate the date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(args.dueDate)) {
              // If not in YYYY-MM-DD format, try to convert it
              logger.info(`Date ${args.dueDate} doesn't match YYYY-MM-DD format, parsing as Date`);
              
              // Fix: Create date with UTC to prevent timezone issues
              const [year, month, day] = args.dueDate.split('-');
              if (year && month && day) {
                // Ensure month and day are zero-padded
                const paddedMonth = month.padStart(2, '0');
                const paddedDay = day.padStart(2, '0');
                args.dueDate = `${year}-${paddedMonth}-${paddedDay}`;
                logger.info(`Formatted date with padding: ${args.dueDate}`);
              } else {
                // If we can't split it, use the Date object but force UTC
                const parsedDate = new Date(args.dueDate);
                if (!isNaN(parsedDate)) {
                  // Use UTC methods to avoid timezone issues
                  const utcYear = parsedDate.getUTCFullYear();
                  const utcMonth = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
                  const utcDay = String(parsedDate.getUTCDate()).padStart(2, '0');
                  args.dueDate = `${utcYear}-${utcMonth}-${utcDay}`;
                  logger.info(`Parsed and formatted date using UTC: ${args.dueDate}`);
                } else {
                  logger.info(`Invalid date format: ${args.dueDate}`);
                  args.dueDate = null;
                }
              }
            } else {
              logger.info(`Date already in correct YYYY-MM-DD format: ${args.dueDate}`);
            }
          } catch (error) {
            logger.logError(error, 'Error parsing due date');
            args.dueDate = null;
          }
        }
        
        // Convert local time string to ISO format if provided for plannedTime
        if (args.plannedTime && typeof args.plannedTime === 'string') {
          try {
            // Try parsing as ISO first to see if it's already in ISO format
            let plannedTime = new Date(args.plannedTime);
            
            // If invalid or looks like a local date format, try parsing it as a local date
            if (isNaN(plannedTime) || !args.plannedTime.includes('T')) {
              // This is likely a local date format (e.g., "May 31, 2023 15:30" or "5/31/2023 15:30")
              logger.info(`Converting local date format for planned time: ${args.plannedTime}`);
              
              // Try to parse date using more flexible approach
              plannedTime = new Date(args.plannedTime);
              
              // If still invalid, try some common formats
              if (isNaN(plannedTime)) {
                logger.info(`Failed to parse date directly, attempting structured parsing`);
                // Try to extract date and time components from common formats
                const dateTimeParts = args.plannedTime.split(/,\s*| /);
                if (dateTimeParts.length >= 2) {
                  // Last part is likely the time
                  const timePart = dateTimeParts[dateTimeParts.length - 1];
                  // Join the rest as the date part
                  const datePart = dateTimeParts.slice(0, dateTimeParts.length - 1).join(' ');
                  plannedTime = new Date(`${datePart} ${timePart}`);
                }
              }
            }
            
            if (!isNaN(plannedTime)) {
              logger.info(`Successfully parsed plannedTime from "${args.plannedTime}" to: ${plannedTime.toISOString()}`);
              args.plannedTime = plannedTime.toISOString();
            } else {
              logger.info(`Invalid date format for planned time: ${args.plannedTime}`);
              throw new Error(`Could not parse date/time from: ${args.plannedTime}`);
            }
          } catch (error) {
            logger.logError(error, 'Error parsing planned time');
            throw new Error(`Failed to parse planned time: ${error.message}`);
          }
        }
        
        await taskManager.updateTask(args);
        return { 
          ...baseResult,
          success: true,
          taskId: args.id,
          message: `Task "${args.id}" has been updated.`
        };
        
      case 'deleteTask':
        const deleteResult = await taskManager.deleteTask(args.id);
        if (!deleteResult) {
          return {
            success: false,
            taskId: args.id,
            message: `Task with ID ${args.id} not found or couldn't be deleted.`
          };
        }
        return { 
          ...baseResult,
          success: true,
          taskId: args.id,
          message: `Task with ID ${args.id} has been deleted.`
        };
        
      case 'getTasks':
        // Legacy function for backward compatibility
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
                ...baseResult,
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
          ...baseResult,
          success: true, 
          tasks,
          taskIds: tasks.map(task => task.id),
          message: tasks.length > 0 
            ? `Found ${tasks.length} tasks.` 
            : 'No tasks found matching your criteria.'
        };

      case 'queryTasks':
        // Start with all tasks
        let allTasks = await taskManager.getTasks();
        logger.info(`QueryTasks - Found ${allTasks.length} total tasks`);
        allTasks.forEach(task => {
          if (task.dueDate) {
            logger.info(`Task ${task.id} - ${task.name} - Due date: ${task.dueDate} (${new Date(task.dueDate).toLocaleString()})`);
          }
        });
        
        let filteredTasks = [...allTasks];
        let filteringApplied = false;
        
        // Filter by specific IDs if provided
        if (args.ids && Array.isArray(args.ids) && args.ids.length > 0) {
          filteredTasks = filteredTasks.filter(task => args.ids.includes(task.id));
          filteringApplied = true;
        }
        
        // Filter by name substring
        if (args.nameContains) {
          filteredTasks = filteredTasks.filter(task => 
            task.name.toLowerCase().includes(args.nameContains.toLowerCase())
          );
          filteringApplied = true;
        }
        
        // Filter by description substring
        if (args.descriptionContains) {
          filteredTasks = filteredTasks.filter(task => 
            task.description && task.description.toLowerCase().includes(args.descriptionContains.toLowerCase())
          );
          filteringApplied = true;
        }
        
        // Filter by project IDs
        if (args.projectIds && Array.isArray(args.projectIds) && args.projectIds.length > 0) {
          // Convert project names to IDs if needed
          const projectIds = [];
          for (const projectId of args.projectIds) {
            if (typeof projectId === 'string' && !projectId.includes('-')) {
              // This might be a project name, look it up
              const projects = await projectManager.getProjects();
              const project = projects.find(p => p.name.toLowerCase() === projectId.toLowerCase());
              if (project) {
                projectIds.push(project.id);
              }
            } else {
              projectIds.push(projectId);
            }
          }
          
          filteredTasks = filteredTasks.filter(task => projectIds.includes(task.projectId));
          filteringApplied = true;
        }
        
        // Filter by statuses
        if (args.statuses && Array.isArray(args.statuses) && args.statuses.length > 0) {
          filteredTasks = filteredTasks.filter(task => args.statuses.includes(task.status));
          filteringApplied = true;
        }
        
        // Filter by priorities
        if (args.priorities && Array.isArray(args.priorities) && args.priorities.length > 0) {
          filteredTasks = filteredTasks.filter(task => args.priorities.includes(task.priority));
          filteringApplied = true;
        }
        
        // Filter by due date range
        if (args.dueDateStart) {
          try {
            const startDate = new Date(args.dueDateStart);
            logger.info(`Filtering by due date start: ${args.dueDateStart} -> ${startDate.toLocaleString()}`);
            
            if (!isNaN(startDate)) {
              // Set the start date to the beginning of the day (00:00:00)
              startDate.setHours(0, 0, 0, 0);
              logger.info(`Adjusted start date: ${startDate.toLocaleString()}`);
              
              filteredTasks = filteredTasks.filter(task => {
                if (!task.dueDate) return false;
                
                // Parse task due date
                const taskDueDate = new Date(task.dueDate);
                
                // Compare dates ignoring time part
                const result = taskDueDate >= startDate;
                logger.info(`  Task ${task.id} - ${task.name} - Due date: ${taskDueDate.toLocaleString()} >= ${startDate.toLocaleString()} = ${result}`);
                return result;
              });
              
              filteringApplied = true;
            }
          } catch (error) {
            logger.logError(error, 'Error parsing dueDateStart');
          }
        }
        
        if (args.dueDateEnd) {
          try {
            const endDate = new Date(args.dueDateEnd);
            logger.info(`Filtering by due date end: ${args.dueDateEnd} -> ${endDate.toLocaleString()}`);
            
            if (!isNaN(endDate)) {
              // Set the end date to the end of the day (23:59:59.999)
              endDate.setHours(23, 59, 59, 999);
              logger.info(`Adjusted end date: ${endDate.toLocaleString()}`);
              
              filteredTasks = filteredTasks.filter(task => {
                if (!task.dueDate) return false;
                
                // Parse task due date
                const taskDueDate = new Date(task.dueDate);
                
                // Compare dates ignoring time part
                const result = taskDueDate <= endDate;
                logger.info(`  Task ${task.id} - ${task.name} - Due date: ${taskDueDate.toLocaleString()} <= ${endDate.toLocaleString()} = ${result}`);
                return result;
              });
              
              filteringApplied = true;
            }
          } catch (error) {
            logger.logError(error, 'Error parsing dueDateEnd');
          }
        }
        
        // Filter by planned time range
        if (args.plannedTimeStart) {
          try {
            const startTime = new Date(args.plannedTimeStart);
            if (!isNaN(startTime)) {
              filteredTasks = filteredTasks.filter(task => 
                task.plannedTime && new Date(task.plannedTime) >= startTime
              );
              filteringApplied = true;
            }
          } catch (error) {
            logger.logError(error, 'Error parsing plannedTimeStart');
          }
        }
        
        if (args.plannedTimeEnd) {
          try {
            const endTime = new Date(args.plannedTimeEnd);
            if (!isNaN(endTime)) {
              filteredTasks = filteredTasks.filter(task => 
                task.plannedTime && new Date(task.plannedTime) <= endTime
              );
              filteringApplied = true;
            }
          } catch (error) {
            logger.logError(error, 'Error parsing plannedTimeEnd');
          }
        }
        
        // Apply limit if provided
        const limit = args.limit || 20;
        if (filteredTasks.length > limit) {
          filteredTasks = filteredTasks.slice(0, limit);
        }
        
        // Format tasks consistently for AI readability
        const formattedTasks = filteredTasks.map(task => {
          const formattedTask = { ...task };
          
          // Ensure dueDate is consistently in YYYY-MM-DD format
          if (formattedTask.dueDate) {
            // If it has time component, extract just the date part
            if (typeof formattedTask.dueDate === 'string' && formattedTask.dueDate.includes('T')) {
              formattedTask.dueDate = formattedTask.dueDate.split('T')[0];
            } else if (formattedTask.dueDate instanceof Date) {
              // Convert Date object to YYYY-MM-DD string
              formattedTask.dueDate = formattedTask.dueDate.toISOString().split('T')[0];
            }
          }
          
          // Convert plannedTime to user-friendly local time string if it exists
          if (formattedTask.plannedTime) {
            const plannedTime = new Date(formattedTask.plannedTime);
            // Format with date and time components for better readability
            const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
            const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
            formattedTask.plannedTime = `${plannedTime.toLocaleDateString(undefined, dateOptions)} at ${plannedTime.toLocaleTimeString(undefined, timeOptions)}`;
          }
          
          return formattedTask;
        });
        
        return {
          ...baseResult,
          success: true,
          tasks: formattedTasks,
          taskIds: formattedTasks.map(task => task.id),
          message: formattedTasks.length > 0
            ? `Found ${formattedTasks.length} tasks${filteringApplied ? ' matching your criteria' : ''}.${formattedTasks.length === limit ? ' (Result limit reached)' : ''}`
            : 'No tasks found matching your criteria.'
        };
        
      case 'getProjects':
        const projects = await projectManager.getProjects();
        return { 
          ...baseResult,
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
          ...baseResult,
          success: true, 
          project: project,
          projectId: project.id,
          message: `Project "${args.name}" has been created with ID: ${project.id}.`
        };
        
      case 'updateProject':
        const updatedProject = new Project(args);
        const updateProjectResult = await projectManager.updateProject(updatedProject);
        return {
          ...baseResult,
          success: updateProjectResult,
          projectId: updatedProject.id,
          message: updateProjectResult 
            ? `Project "${args.name}" (ID: ${updatedProject.id}) has been updated.`
            : `Failed to update project "${args.name}" (ID: ${updatedProject.id}).`
        };
        
      case 'deleteProject':
        const deleteProjectResult = await projectManager.deleteProject(args.id);
        return {
          ...baseResult,
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
              logger.info(`Converting local date format for notification: ${args.time}`);
              notificationTime = new Date(args.time);
            }
            
            if (!isNaN(notificationTime)) {
              args.time = notificationTime.toISOString();
            } else {
              logger.info(`Invalid date format for notification: ${args.time}`);
              return {
                ...baseResult,
                success: false,
                error: `Invalid date format for notification time: ${args.time}`,
                message: `I couldn't create the notification because the time format is invalid.`
              };
            }
          } catch (error) {
            logger.logError(error, 'Error parsing notification time');
            return {
              ...baseResult,
              success: false,
              error: `Invalid date format for notification time: ${args.time}`,
              message: `I couldn't create the notification because the time format is invalid.`
            };
          }
        }
        
        // Validate notification type
        if (!Object.values(TYPE).includes(args.type)) {
          return {
            ...baseResult,
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
          ...baseResult,
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
              logger.info(`Converting local date format for notification: ${args.time}`);
              notificationTime = new Date(args.time);
            }
            
            if (!isNaN(notificationTime)) {
              args.time = notificationTime.toISOString();
            } else {
              logger.info(`Invalid date format for notification: ${args.time}`);
            }
          } catch (error) {
            logger.logError(error, 'Error parsing notification time');
          }
        }
        
        // Validate notification type if provided
        if (args.type && !Object.values(TYPE).includes(args.type)) {
          return {
            ...baseResult,
            success: false,
            error: `Invalid notification type: ${args.type}`,
            message: `I couldn't update the notification because "${args.type}" is not a valid notification type. Valid types are: ${Object.values(TYPE).join(', ')}`
          };
        }
        
        const updateNotificationResult = await notificationService.updateNotification(args);
        return {
          ...baseResult,
          success: updateNotificationResult,
          notificationId: args.id,
          message: updateNotificationResult
            ? `Notification ${args.id} has been updated.`
            : `Failed to update notification ${args.id}.`
        };
        
      case 'deleteNotification':
        const deleteNotificationResult = await notificationService.deleteNotification(args.id);
        return {
          ...baseResult,
          success: deleteNotificationResult,
          notificationId: args.id,
          message: deleteNotificationResult
            ? `Notification with ID ${args.id} has been deleted.`
            : `Failed to delete notification with ID ${args.id}.`
        };
        
      case 'getNotificationsByTask':
        const notifications = await notificationService.getNotificationsByTask(args.taskId);
        return { 
          ...baseResult,
          success: true, 
          notifications,
          notificationIds: notifications.map(notification => notification.id),
          message: notifications.length > 0 
            ? `Found ${notifications.length} notifications for task ${args.taskId}.` 
            : `No notifications found for task ${args.taskId}.`
        };
        
      case 'queryNotifications':
        // Start with all notifications
        let allNotifications = await notificationService.getNotifications();
        logger.info(`QueryNotifications - Found ${allNotifications.length} total notifications`);
        allNotifications.forEach(notification => {
          if (notification.time) {
            logger.info(`Notification ${notification.id} - Task ID: ${notification.taskId} - Time: ${notification.time} (${new Date(notification.time).toLocaleString()})`);
          }
        });
        
        let filteredNotifications = [...allNotifications];
        let notifFilteringApplied = false;
        
        // Filter by specific IDs if provided
        if (args.ids && Array.isArray(args.ids) && args.ids.length > 0) {
          filteredNotifications = filteredNotifications.filter(notification => 
            args.ids.includes(notification.id)
          );
          notifFilteringApplied = true;
        }
        
        // Filter by task IDs
        if (args.taskIds && Array.isArray(args.taskIds) && args.taskIds.length > 0) {
          filteredNotifications = filteredNotifications.filter(notification => 
            args.taskIds.includes(notification.taskId)
          );
          notifFilteringApplied = true;
        }
        
        // Filter by time range
        if (args.timeStart) {
          try {
            const startTime = new Date(args.timeStart);
            logger.info(`Filtering notifications by time start: ${args.timeStart} -> ${startTime.toLocaleString()}`);
            
            if (!isNaN(startTime)) {
              // For date-only inputs, set to beginning of day
              if (!args.timeStart.includes('T') && !args.timeStart.includes(':')) {
                startTime.setHours(0, 0, 0, 0);
                logger.info(`Adjusted notification start time: ${startTime.toLocaleString()}`);
              }
              
              filteredNotifications = filteredNotifications.filter(notification => {
                if (!notification.time) return false;
                
                // Parse notification time
                const notificationTime = new Date(notification.time);
                
                // Compare times
                const result = notificationTime >= startTime;
                logger.info(`  Notification ${notification.id} - Time: ${notificationTime.toLocaleString()} >= ${startTime.toLocaleString()} = ${result}`);
                return result;
              });
              
              notifFilteringApplied = true;
            }
          } catch (error) {
            logger.logError(error, 'Error parsing timeStart');
          }
        }
        
        if (args.timeEnd) {
          try {
            const endTime = new Date(args.timeEnd);
            logger.info(`Filtering notifications by time end: ${args.timeEnd} -> ${endTime.toLocaleString()}`);
            
            if (!isNaN(endTime)) {
              // For date-only inputs, set to end of day
              if (!args.timeEnd.includes('T') && !args.timeEnd.includes(':')) {
                endTime.setHours(23, 59, 59, 999);
                logger.info(`Adjusted notification end time: ${endTime.toLocaleString()}`);
              }
              
              filteredNotifications = filteredNotifications.filter(notification => {
                if (!notification.time) return false;
                
                // Parse notification time
                const notificationTime = new Date(notification.time);
                
                // Compare times
                const result = notificationTime <= endTime;
                logger.info(`  Notification ${notification.id} - Time: ${notificationTime.toLocaleString()} <= ${endTime.toLocaleString()} = ${result}`);
                return result;
              });
              
              notifFilteringApplied = true;
            }
          } catch (error) {
            logger.logError(error, 'Error parsing timeEnd');
          }
        }
        
        // Apply limit if provided
        const notificationLimit = args.limit || 20;
        if (filteredNotifications.length > notificationLimit) {
          filteredNotifications = filteredNotifications.slice(0, notificationLimit);
        }
        
        // Convert times to local time format for AI readability
        const formattedNotifications = filteredNotifications.map(notification => {
          const formattedNotification = { ...notification };
          
          // Convert notification time to local time string if it exists
          if (formattedNotification.time) {
            const time = new Date(formattedNotification.time);
            formattedNotification.time = time.toLocaleString();
          }
          
          return formattedNotification;
        });
        
        return {
          ...baseResult,
          success: true,
          notifications: formattedNotifications,
          notificationIds: formattedNotifications.map(notification => notification.id),
          message: formattedNotifications.length > 0
            ? `Found ${formattedNotifications.length} notifications${notifFilteringApplied ? ' matching your criteria' : ''}.${formattedNotifications.length === notificationLimit ? ' (Result limit reached)' : ''}`
            : 'No notifications found matching your criteria.'
        };
        
      default:
        throw new Error(`Function "${name}" is not available`);
    }
  } catch (error) {
    logger.logError(error, `Error executing function "${name}"`);
    return { 
      ...baseResult,
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