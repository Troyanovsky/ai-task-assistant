// Initial state
const state = {
  chatHistory: [],
  isProcessing: false,
};

// Getters
const getters = {
  chatHistory: (state) => state.chatHistory,
  isProcessing: (state) => state.isProcessing,
};

// Actions
const actions = {
  async sendMessage({ commit, dispatch }, message) {
    commit('addMessage', { text: message, sender: 'user', timestamp: new Date() });
    commit('setProcessing', true);
    
    // This will be implemented in Phase 4 when we have the AI service
    // For now, just echo the message back
    setTimeout(() => {
      commit('addMessage', { 
        text: `Echo: ${message}`, 
        sender: 'ai', 
        timestamp: new Date() 
      });
      commit('setProcessing', false);
    }, 1000);
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
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}; 