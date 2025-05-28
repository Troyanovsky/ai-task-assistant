import { describe, it, expect, vi, beforeEach } from 'vitest';
import aiService from '../ai.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('AIService', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    apiUrl: 'https://test-api-url.com',
    model: 'test-model'
  };
  
  const mockFunctionSchemas = [
    {
      name: 'testFunction',
      description: 'Test function',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string' }
        }
      }
    }
  ];
  
  const mockChatHistory = [
    { sender: 'user', text: 'Hello' },
    { sender: 'ai', text: 'Hi there' }
  ];

  beforeEach(() => {
    // Reset axios mock
    vi.resetAllMocks();
    
    // Configure the service
    aiService.configure(mockConfig);
  });

  describe('configure', () => {
    it('should set the API key, URL and model', () => {
      expect(aiService.apiKey).toBe(mockConfig.apiKey);
      expect(aiService.apiUrl).toBe(mockConfig.apiUrl);
      expect(aiService.model).toBe(mockConfig.model);
    });
  });

  describe('processUserInput', () => {
    it('should throw an error if not configured', async () => {
      // Reset service configuration
      aiService.apiKey = null;
      
      await expect(aiService.processUserInput(
        'Test input', 
        mockFunctionSchemas, 
        mockChatHistory
      )).rejects.toThrow('AI service not configured');
    });

    it('should process text response correctly', async () => {
      // Mock successful response with text
      axios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'Test response'
              }
            }
          ]
        }
      });
      
      const result = await aiService.processUserInput(
        'Test input', 
        mockFunctionSchemas, 
        mockChatHistory
      );
      
      expect(result).toEqual({
        text: 'Test response'
      });
      
      // Verify axios was called with correct parameters
      expect(axios.post).toHaveBeenCalledWith(
        mockConfig.apiUrl,
        {
          model: mockConfig.model,
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there' },
            { role: 'user', content: 'Test input' }
          ],
          functions: mockFunctionSchemas,
          function_call: 'auto'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockConfig.apiKey}`
          }
        }
      );
    });

    it('should process function call response correctly', async () => {
      // Mock successful response with function call
      axios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'I will help with that',
                function_call: {
                  name: 'testFunction',
                  arguments: JSON.stringify({ param1: 'test value' })
                }
              }
            }
          ]
        }
      });
      
      const result = await aiService.processUserInput(
        'Test input', 
        mockFunctionSchemas, 
        mockChatHistory
      );
      
      expect(result).toEqual({
        text: 'I will help with that',
        functionCall: {
          name: 'testFunction',
          arguments: { param1: 'test value' }
        }
      });
    });

    it('should handle API errors', async () => {
      // Mock API error
      axios.post.mockRejectedValue(new Error('API error'));
      
      await expect(aiService.processUserInput(
        'Test input', 
        mockFunctionSchemas, 
        mockChatHistory
      )).rejects.toThrow('Failed to process input: API error');
    });
  });

  describe('executeFunctionCall', () => {
    it('should execute a function call successfully', async () => {
      const functionCall = {
        name: 'testFunction',
        arguments: { param1: 'test value' }
      };
      
      const availableFunctions = {
        testFunction: vi.fn().mockResolvedValue({ success: true })
      };
      
      const result = await aiService.executeFunctionCall(functionCall, availableFunctions);
      
      expect(result).toEqual({ success: true });
      expect(availableFunctions.testFunction).toHaveBeenCalledWith({ param1: 'test value' });
    });

    it('should throw an error if the function is not available', async () => {
      const functionCall = {
        name: 'nonExistentFunction',
        arguments: {}
      };
      
      const availableFunctions = {
        testFunction: vi.fn()
      };
      
      await expect(aiService.executeFunctionCall(
        functionCall, 
        availableFunctions
      )).rejects.toThrow('Function "nonExistentFunction" is not available');
    });

    it('should handle function execution errors', async () => {
      const functionCall = {
        name: 'testFunction',
        arguments: { param1: 'test value' }
      };
      
      const availableFunctions = {
        testFunction: vi.fn().mockRejectedValue(new Error('Function execution error'))
      };
      
      await expect(aiService.executeFunctionCall(
        functionCall, 
        availableFunctions
      )).rejects.toThrow('Failed to execute function "testFunction": Function execution error');
    });
  });
}); 