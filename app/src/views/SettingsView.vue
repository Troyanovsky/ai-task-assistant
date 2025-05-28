<template>
  <div class="settings-view h-full overflow-y-auto p-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Settings</h1>
      <router-link to="/" class="text-gray-600 hover:text-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </router-link>
    </div>
    
    <!-- AI Service Settings -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-xl font-semibold mb-4">AI Assistant Settings</h2>
      
      <form @submit.prevent="saveAISettings" class="space-y-4">
        <div class="form-group">
          <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input 
            type="password" 
            id="apiKey" 
            v-model="apiKey"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your API key"
          />
        </div>
        
        <div class="form-group">
          <label for="apiUrl" class="block text-sm font-medium text-gray-700 mb-1">API URL</label>
          <input 
            type="text" 
            id="apiUrl" 
            v-model="apiUrl"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="API endpoint URL"
          />
        </div>
        
        <div class="form-group">
          <label for="model" class="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input 
            type="text" 
            id="model" 
            v-model="model"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Model name"
          />
        </div>
        
        <div class="flex items-center justify-between">
          <button 
            type="submit"
            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-700"
          >
            Save Settings
          </button>
          
          <div v-if="saveStatus" class="text-sm" :class="{'text-green-500': saveStatus === 'success', 'text-red-500': saveStatus === 'error'}">
            {{ statusMessage }}
          </div>
        </div>
      </form>
    </div>
    
    <!-- Other Application Settings -->
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-xl font-semibold mb-4">Application Settings</h2>
      <p class="text-gray-500">Additional settings will be implemented in future phases</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'SettingsView',
  setup() {
    const store = useStore();
    
    // AI settings
    const apiKey = ref('');
    const apiUrl = ref('');
    const model = ref('');
    const saveStatus = ref('');
    const statusMessage = ref('');
    
    // Load current settings
    onMounted(() => {
      store.dispatch('ai/loadSettings').then(() => {
        apiKey.value = store.getters['ai/apiKey'] || '';
        apiUrl.value = store.getters['ai/apiUrl'] || 'https://api.openai.com/v1/chat/completions';
        model.value = store.getters['ai/model'] || 'gpt-4o-mini';
      });
    });
    
    // Save AI settings
    const saveAISettings = async () => {
      try {
        const success = await store.dispatch('ai/configureAI', {
          apiKey: apiKey.value,
          apiUrl: apiUrl.value,
          model: model.value
        });
        
        if (success) {
          saveStatus.value = 'success';
          statusMessage.value = 'Settings saved successfully!';
        } else {
          saveStatus.value = 'error';
          statusMessage.value = 'Failed to save settings.';
        }
      } catch (error) {
        saveStatus.value = 'error';
        statusMessage.value = `Error: ${error.message}`;
      }
      
      // Clear status after 3 seconds
      setTimeout(() => {
        saveStatus.value = '';
        statusMessage.value = '';
      }, 3000);
    };
    
    return {
      apiKey,
      apiUrl,
      model,
      saveAISettings,
      saveStatus,
      statusMessage
    };
  }
};
</script> 