<template>
  <div class="chat-input-container w-full">
    <form class="flex" @submit.prevent="handleSubmit">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="flex-grow border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        :disabled="isProcessing"
        placeholder="Type your message..."
        rows="1"
        @keydown.enter.prevent="handleEnterKey"
      ></textarea>

      <button
        type="submit"
        class="bg-blue-500 text-white px-4 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-700 flex-shrink-0"
        :disabled="isProcessing || !inputText.trim()"
      >
        <span v-if="isProcessing">
          <svg
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
        <span v-else>Send</span>
      </button>
    </form>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';

export default {
  name: 'ChatInput',
  props: {
    isProcessing: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['send-message'],
  setup(props, { emit }) {
    const inputText = ref('');
    const textareaRef = ref(null);

    // Auto-resize textarea based on content
    const resizeTextarea = () => {
      const textarea = textareaRef.value;
      if (!textarea) return;

      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    };

    // Handle form submission
    const handleSubmit = () => {
      if (inputText.value.trim() && !props.isProcessing) {
        emit('send-message', inputText.value);
        inputText.value = '';

        // Reset textarea height
        if (textareaRef.value) {
          textareaRef.value.style.height = 'auto';
        }
      }
    };

    // Handle Enter key (send message on Enter, new line on Shift+Enter)
    const handleEnterKey = (event) => {
      if (!event.shiftKey && !props.isProcessing) {
        handleSubmit();
      }
    };

    // Watch for input changes to resize textarea
    watch(inputText, resizeTextarea);

    // Initialize textarea
    onMounted(() => {
      resizeTextarea();
    });

    return {
      inputText,
      textareaRef,
      handleSubmit,
      handleEnterKey,
    };
  },
};
</script>

<style scoped>
textarea {
  min-height: 42px;
  max-height: 150px;
  overflow-y: auto;
}
</style>
