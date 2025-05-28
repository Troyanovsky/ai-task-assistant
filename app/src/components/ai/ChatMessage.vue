<template>
  <div 
    class="chat-message mb-4" 
    :class="{ 'user-message': message.sender === 'user', 'ai-message': message.sender === 'ai' }"
  >
    <div class="flex items-start">
      <div 
        class="message-avatar flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2"
        :class="{
          'bg-blue-500 text-white': message.sender === 'user',
          'bg-green-500 text-white': message.sender === 'ai'
        }"
      >
        <span v-if="message.sender === 'user'">U</span>
        <span v-else>AI</span>
      </div>
      
      <div class="message-content">
        <div class="message-bubble p-3 rounded-lg" 
          :class="{
            'bg-blue-100': message.sender === 'user',
            'bg-white border border-gray-200': message.sender === 'ai'
          }"
        >
          <div class="whitespace-pre-wrap">{{ message.text }}</div>
          
          <div v-if="message.functionCall" class="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
            <div>Function: {{ message.functionCall.name }}</div>
          </div>
        </div>
        
        <div class="message-time text-xs text-gray-500 mt-1">
          {{ formatTime(message.timestamp) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatMessage',
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  setup() {
    // Format timestamp to readable time
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    return {
      formatTime
    };
  }
};
</script>

<style scoped>
.message-bubble {
  max-width: 80%;
  word-break: break-word;
}

.user-message .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ai-message .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style> 