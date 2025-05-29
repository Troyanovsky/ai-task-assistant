<template>
  <div class="chat-box flex flex-col h-full">
    <div class="p-4 border-b border-gray-300 flex justify-between items-center h-[60px]">
      <h2 class="font-bold text-lg">AI Assistant</h2>
      <button 
        @click="clearChat" 
        class="text-gray-600 hover:text-red-500"
        title="Clear chat history"
      >
        Clear
      </button>
    </div>
    
    <div class="chat-messages flex-grow overflow-y-auto p-4" ref="messagesContainer">
      <div v-if="chatHistory.length === 0" class="text-center text-gray-500 my-8">
        <p>Ask me to help with your tasks!</p>
        <p class="text-sm mt-2">For example:</p>
        <ul class="text-sm mt-1">
          <li>"Create a new task to finish the report by Friday"</li>
          <li>"Show me all my high priority tasks"</li>
          <li>"Add a new project called Personal"</li>
        </ul>
      </div>
      
      <chat-message 
        v-for="(message, index) in chatHistory" 
        :key="index" 
        :message="message" 
      />
    </div>
    
    <div v-if="!isConfigured" class="api-key-warning p-3 bg-yellow-50 text-yellow-800 border-t border-yellow-200 text-sm">
      <p>AI service not configured. Please add your API key in Settings.</p>
    </div>
    
    <div class="chat-input border-t border-gray-300 p-3">
      <chat-input 
        :is-processing="isProcessing" 
        @send-message="sendMessage" 
      />
    </div>
  </div>
</template>

<script>
import { computed, watch, nextTick, ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';

export default {
  name: 'ChatBox',
  components: {
    ChatMessage,
    ChatInput
  },
  setup() {
    const store = useStore();
    const messagesContainer = ref(null);
    
    // Get chat data from store
    const chatHistory = computed(() => store.getters['ai/chatHistory']);
    const isProcessing = computed(() => store.getters['ai/isProcessing']);
    const error = computed(() => store.getters['ai/error']);
    const isConfigured = computed(() => store.getters['ai/isConfigured']);
    
    // Send message to AI
    const sendMessage = (message) => {
      store.dispatch('ai/sendMessage', message);
    };
    
    // Clear chat history
    const clearChat = () => {
      store.dispatch('ai/clearHistory');
    };
    
    // Auto-scroll to bottom when new messages arrive
    watch(() => chatHistory.value.length, async () => {
      await nextTick();
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    });
    
    // Handle real-time chat history updates
    const handleChatHistoryUpdate = (updatedHistory) => {
      if (updatedHistory && Array.isArray(updatedHistory)) {
        store.commit('ai/setChatHistory', updatedHistory);
      }
    };
    
    // Load chat history when component is mounted
    onMounted(() => {
      store.dispatch('ai/loadChatHistory');
      store.dispatch('ai/loadSettings');
      
      // Listen for real-time chat history updates
      window.electron.receive('ai:chatHistoryUpdate', handleChatHistoryUpdate);
    });
    
    onBeforeUnmount(() => {
      // Remove event listener when component is unmounted
      window.electron.removeAllListeners('ai:chatHistoryUpdate');
    });
    
    return {
      chatHistory,
      isProcessing,
      error,
      isConfigured,
      sendMessage,
      clearChat,
      messagesContainer
    };
  }
};
</script>

<style scoped>
.chat-box {
  height: 100%;
}

.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}
</style> 