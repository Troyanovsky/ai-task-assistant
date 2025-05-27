// Initial state
const state = {
  chatHistory: [],
  isProcessing: false,
  error: null
};

// Getters
const getters = {
  chatHistory: (state) => state.chatHistory,
  isProcessing: (state) => state.isProcessing,
  error: (state) => state.error
};

// Actions
const actions = {
  async sendMessage({ commit, dispatch, rootState }, message) {
    commit('addMessage', { text: message, sender: 'user', timestamp: new Date() });
    commit('setProcessing', true);
    commit('setError', null);
    
    try {
      // This will be implemented in Phase 4 when we have the AI service
      // For now, just simulate a response
      
      // Check if message contains keywords for basic task operations
      if (message.toLowerCase().includes('add task') || message.toLowerCase().includes('create task')) {
        // Simulate adding a task
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        commit('addMessage', { 
          text: 'I would create a task here. In Phase 4, I\'ll be able to actually create tasks for you through natural language!', 
          sender: 'ai', 
          timestamp: new Date() 
        });
      } else if (message.toLowerCase().includes('show tasks') || message.toLowerCase().includes('list tasks')) {
        // Get current project tasks
        const currentProject = rootState.projects.selectedProject;
        const tasks = currentProject 
          ? rootState.tasks.tasks.filter(task => task.projectId === currentProject.id)
          : [];
        
        if (tasks.length > 0) {
          const taskList = tasks.map(task => `- ${task.name} (${task.status})`).join('\n');
          commit('addMessage', { 
            text: `Here are your tasks in the current project:\n\n${taskList}`, 
            sender: 'ai', 
            timestamp: new Date() 
          });
        } else {
          commit('addMessage', { 
            text: 'I don\'t see any tasks in the current project.', 
            sender: 'ai', 
            timestamp: new Date() 
          });
        }
      } else {
        // Generic response
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        commit('addMessage', { 
          text: `I understand you want to "${message}". In Phase 4, I'll be able to help you with that!`, 
          sender: 'ai', 
          timestamp: new Date() 
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      commit('setError', 'Failed to process message');
      commit('addMessage', { 
        text: 'Sorry, I encountered an error processing your request.', 
        sender: 'ai', 
        timestamp: new Date() 
      });
    } finally {
      commit('setProcessing', false);
    }
  },
  
  clearHistory({ commit }) {
    commit('clearChatHistory');
  },
};

// Mutations
const mutations = {
  addMessage(state, message) {
    state.chatHistory.push(message);
  },
  setProcessing(state, isProcessing) {
    state.isProcessing = isProcessing;
  },
  clearChatHistory(state) {
    state.chatHistory = [];
  },
  setError(state, error) {
    state.error = error;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}; 