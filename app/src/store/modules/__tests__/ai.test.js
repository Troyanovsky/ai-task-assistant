import { describe, it, expect, vi, beforeEach } from 'vitest';
import aiModule from '../ai.js';
import aiService from '../../../services/ai.js';

// Mock dependencies
vi.mock('../../../services/ai.js', () => ({
  default: {
    configure: vi.fn(),
    processUserInput: vi.fn(),
    executeFunctionCall: vi.fn()
  }
}));

describe('AI Store Module', () => {
  // Helper to create a mock commit function
  const createCommit = () => vi.fn();
  
  // Helper to create a mock dispatch function
  const createDispatch = () => vi.fn();
  
  // Helper to create mock state
  const createState = () => ({
    chatHistory: [],
    isProcessing: false,
    error: null,
    isConfigured: false,
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  });
  
  // Helper to create mock rootState
  const createRootState = () => ({
    tasks: { tasks: [] },
    projects: { projects: [] }
  });

  describe('configureAI', () => {
    it('should configure the AI service and update state', async () => {
      const commit = createCommit();
      const state = createState();
      const config = {
        apiKey: 'test-api-key',
        apiUrl: 'test-api-url',
        model: 'test-model'
      };
      
      await aiModule.actions.configureAI({ commit, state }, config);
      
      expect(aiService.configure).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        apiUrl: 'test-api-url',
        model: 'test-model'
      });
      
      expect(commit).toHaveBeenCalledWith('setApiKey', 'test-api-key');
      expect(commit).toHaveBeenCalledWith('setApiUrl', 'test-api-url');
      expect(commit).toHaveBeenCalledWith('setModel', 'test-model');
      expect(commit).toHaveBeenCalledWith('setConfigured', true);
    });
    
    it('should handle configuration errors', async () => {
      const commit = createCommit();
      const state = createState();
      const config = { apiKey: 'test-api-key' };
      
      aiService.configure.mockImplementation(() => {
        throw new Error('Configuration error');
      });
      
      const result = await aiModule.actions.configureAI({ commit, state }, config);
      
      expect(result).toBe(false);
      expect(commit).toHaveBeenCalledWith('setError', 'Failed to configure AI service');
      expect(commit).toHaveBeenCalledWith('setConfigured', false);
    });
  });

  describe('sendMessage', () => {
    it('should add user message and set processing state', async () => {
      const commit = createCommit();
      const dispatch = createDispatch();
      const state = { ...createState(), isConfigured: true };
      const rootState = createRootState();
      const message = 'Test message';
      
      // Mock Date.now for consistent timestamps
      const mockDate = new Date('2023-01-01T12:00:00Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      // Mock successful response with text only
      aiService.processUserInput.mockResolvedValue({
        text: 'AI response'
      });
      
      await aiModule.actions.sendMessage({ commit, dispatch, state, rootState }, message);
      
      // Check that user message was added
      expect(commit).toHaveBeenCalledWith('addMessage', {
        text: 'Test message',
        sender: 'user',
        timestamp: mockDate
      });
      
      // Check processing state was set
      expect(commit).toHaveBeenCalledWith('setProcessing', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      
      // Check AI service was called
      expect(aiService.processUserInput).toHaveBeenCalledWith(
        'Test message',
        expect.any(Array),
        state.chatHistory
      );
      
      // Check AI response was added
      expect(commit).toHaveBeenCalledWith('addMessage', {
        text: 'AI response',
        sender: 'ai',
        timestamp: mockDate
      });
      
      // Check processing state was reset
      expect(commit).toHaveBeenCalledWith('setProcessing', false);
    });
    
    it('should handle function calls in AI response', async () => {
      const commit = createCommit();
      const dispatch = createDispatch();
      const state = { ...createState(), isConfigured: true };
      const rootState = createRootState();
      const message = 'Create a task';
      
      // Mock function call response
      aiService.processUserInput.mockResolvedValue({
        text: 'I will create a task',
        functionCall: {
          name: 'addTask',
          arguments: { name: 'New task', projectId: '123' }
        }
      });
      
      // Mock function execution result
      dispatch.mockResolvedValue({
        success: true,
        message: 'Task created successfully'
      });
      
      await aiModule.actions.sendMessage({ commit, dispatch, state, rootState }, message);
      
      // Check that function call was executed
      expect(dispatch).toHaveBeenCalledWith('executeFunctionCall', {
        name: 'addTask',
        arguments: { name: 'New task', projectId: '123' }
      });
      
      // Check that AI response with function call was added
      expect(commit).toHaveBeenCalledWith('addMessage', expect.objectContaining({
        text: 'I will create a task',
        sender: 'ai',
        functionCall: {
          name: 'addTask',
          arguments: { name: 'New task', projectId: '123' }
        }
      }));
      
      // Check that function result message was added
      expect(commit).toHaveBeenCalledWith('addMessage', expect.objectContaining({
        text: 'Task created successfully',
        sender: 'ai'
      }));
    });
    
    it('should handle errors when AI service is not configured', async () => {
      const commit = createCommit();
      const dispatch = createDispatch();
      const state = { ...createState(), isConfigured: false };
      const rootState = createRootState();
      const message = 'Test message';
      
      await aiModule.actions.sendMessage({ commit, dispatch, state, rootState }, message);
      
      expect(commit).toHaveBeenCalledWith('setError', 'AI service not configured. Please set API key.');
      expect(commit).toHaveBeenCalledWith('addMessage', expect.objectContaining({
        text: expect.stringContaining('Sorry, I encountered an error'),
        sender: 'ai'
      }));
    });
  });

  describe('executeFunctionCall', () => {
    it('should execute addTask function correctly', async () => {
      const commit = createCommit();
      const dispatch = createDispatch();
      const rootState = createRootState();
      const functionCall = {
        name: 'addTask',
        arguments: { name: 'Test task', projectId: '123' }
      };
      
      // Mock task creation
      dispatch.mockResolvedValue({ id: 'task-123', name: 'Test task' });
      
      // Mock aiService.executeFunctionCall to simulate the function execution
      aiService.executeFunctionCall.mockImplementation(async (call, funcs) => {
        return await funcs[call.name](call.arguments);
      });
      
      const result = await aiModule.actions.executeFunctionCall(
        { commit, dispatch, rootState },
        functionCall
      );
      
      expect(dispatch).toHaveBeenCalledWith(
        'tasks/addTask',
        { name: 'Test task', projectId: '123' },
        { root: true }
      );
      
      expect(result).toEqual({
        success: true,
        task: { id: 'task-123', name: 'Test task' },
        message: 'Task "Test task" has been created.'
      });
    });
    
    it('should handle function execution errors', async () => {
      const commit = createCommit();
      const dispatch = createDispatch();
      const rootState = createRootState();
      const functionCall = {
        name: 'addTask',
        arguments: { name: 'Test task' } // Missing required projectId
      };
      
      // Mock error during task creation
      dispatch.mockRejectedValue(new Error('Missing projectId'));
      
      // Mock aiService.executeFunctionCall to simulate the function execution error
      aiService.executeFunctionCall.mockImplementation(async (call, funcs) => {
        try {
          return await funcs[call.name](call.arguments);
        } catch (error) {
          throw error;
        }
      });
      
      const result = await aiModule.actions.executeFunctionCall(
        { commit, dispatch, rootState },
        functionCall
      );
      
      expect(commit).toHaveBeenCalledWith('setError', 'Failed to execute addTask: Missing projectId');
      expect(result).toEqual({
        success: false,
        error: 'Missing projectId',
        message: 'Sorry, I couldn\'t complete that action: Missing projectId'
      });
    });
  });

  describe('mutations', () => {
    it('should add a message to chat history', () => {
      const state = createState();
      const message = {
        text: 'Test message',
        sender: 'user',
        timestamp: new Date()
      };
      
      aiModule.mutations.addMessage(state, message);
      
      expect(state.chatHistory).toEqual([message]);
    });
    
    it('should set processing state', () => {
      const state = createState();
      
      aiModule.mutations.setProcessing(state, true);
      expect(state.isProcessing).toBe(true);
      
      aiModule.mutations.setProcessing(state, false);
      expect(state.isProcessing).toBe(false);
    });
    
    it('should clear chat history', () => {
      const state = {
        ...createState(),
        chatHistory: [
          { text: 'Message 1', sender: 'user' },
          { text: 'Message 2', sender: 'ai' }
        ]
      };
      
      aiModule.mutations.clearChatHistory(state);
      
      expect(state.chatHistory).toEqual([]);
    });
    
    it('should set error message', () => {
      const state = createState();
      
      aiModule.mutations.setError(state, 'Test error');
      
      expect(state.error).toBe('Test error');
    });
    
    it('should set configuration state', () => {
      const state = createState();
      
      aiModule.mutations.setConfigured(state, true);
      expect(state.isConfigured).toBe(true);
      
      aiModule.mutations.setApiKey(state, 'test-key');
      expect(state.apiKey).toBe('test-key');
      
      aiModule.mutations.setApiUrl(state, 'test-url');
      expect(state.apiUrl).toBe('test-url');
      
      aiModule.mutations.setModel(state, 'test-model');
      expect(state.model).toBe('test-model');
    });
  });
}); 