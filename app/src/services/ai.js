import axios from 'axios';

/**
 * AI Service for interacting with LLM API
 */
class AIService {
  constructor() {
    this.apiKey = null;
    this.apiUrl = null;
    this.model = null;
  }

  /**
   * Configure the AI service
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - API key for the LLM service
   * @param {string} config.apiUrl - API URL for the LLM service
   * @param {string} config.model - Model name to use
   */
  configure(config) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.model = config.model;
  }

  /**
   * Process user input and generate AI response with function calls
   * @param {string} userInput - User's natural language input
   * @param {Array} functionSchemas - Array of function schemas
   * @param {Array} chatHistory - Previous chat messages for context
   * @returns {Promise<Object>} - AI response with potential function calls
   */
  async processUserInput(userInput, functionSchemas, chatHistory = []) {
    if (!this.apiKey || !this.apiUrl || !this.model) {
      throw new Error('AI service not configured. Please set API key, URL and model.');
    }

    try {
      // Add current date and time to the context
      const now = new Date();
      const localTimeString = now.toLocaleString();
      const dateTimeInfo = `<current_datetime>${now.toISOString()}</current_datetime>\n<local_datetime>${localTimeString}</local_datetime>\n`;
      const enhancedUserInput = dateTimeInfo + userInput;

      const systemMessage = "You're FokusZeit, an AI task assistant. \
      Use the tools provided to you to help the user with their tasks. \
      For some tasks, you may need to execute multiple tools in a row to find info that the user didn't provide. \
      For example, if the user didn't provide task id, you can look for tasks in projects first. \
      ";

      // Format chat history for the API
      const messages = [
        // Add system message
        { role: 'system', content: systemMessage },
        ...chatHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: 'user', content: enhancedUserInput }
      ];

      // Create request payload
      const requestPayload = {
        model: this.model,
        messages,
        tools: functionSchemas,
        tool_choice: 'auto'
      };

      // Log raw API request
      console.log('🔄 AI API Request:', JSON.stringify(requestPayload, null, 2));

      // Make API request
      const response = await axios.post(
        this.apiUrl,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      // Log raw API response
      console.log('✅ AI API Response:', JSON.stringify(response.data, null, 2));

      // Process the response
      const aiResponse = response.data.choices[0].message;
      
      // Check if the response contains tool calls
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        const toolCall = aiResponse.tool_calls[0];
        
        // Check if it's a function call
        if (toolCall.type === 'function') {
          return {
            text: aiResponse.content || "I'll help you with that.",
            functionCall: {
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments)
            }
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
   * @param {Object} availableFunctions - Map of available functions
   * @returns {Promise<any>} - Result of the function execution
   */
  async executeFunctionCall(functionCall, availableFunctions) {
    const { name, arguments: args } = functionCall;
    
    if (!availableFunctions[name]) {
      throw new Error(`Function "${name}" is not available`);
    }

    try {
      return await availableFunctions[name](args);
    } catch (error) {
      console.error(`Error executing function "${name}":`, error);
      throw new Error(`Failed to execute function "${name}": ${error.message}`);
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService; 