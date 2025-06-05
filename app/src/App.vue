<template>
  <div class="app h-screen flex flex-col">
    <main class="flex-1 overflow-hidden">
      <router-view />
    </main>
    <NotificationListener />
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useStore } from 'vuex';
import NotificationListener from './components/layout/NotificationListener.vue';
import logger from './services/logger.js';

export default {
  name: 'App',
  components: {
    NotificationListener
  },
  setup() {
    const store = useStore();
    
    onMounted(() => {
      logger.info('App mounted, initializing data');
      
      // Initialize data
      store.dispatch('projects/fetchProjects')
        .catch(error => logger.logError(error, 'Failed to fetch projects'));
        
      store.dispatch('tasks/fetchTasks')
        .catch(error => logger.logError(error, 'Failed to fetch tasks'));
    });
    
    return {};
  }
};
</script>

<style>
/* Global styles */
body {
  font-family: 'Inter', sans-serif;
  color: #333;
  line-height: 1.6;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
</style>
