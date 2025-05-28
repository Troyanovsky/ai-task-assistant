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
      // Format chat history for the API
      const messages = [
        ...chatHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: 'user', content: userInput }
      ];

      // Make API request
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages,
          functions: functionSchemas,
          function_call: 'auto'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
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