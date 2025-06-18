<template>
  <div class="app h-screen flex flex-col">
    <main class="flex-1 overflow-hidden">
      <router-view />
    </main>
    <NotificationListener />
  </div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useStore } from 'vuex';
import NotificationListener from './components/system/NotificationListener.vue';
import logger from './services/logger.js';

export default {
  name: 'App',
  components: {
    NotificationListener,
  },
  setup() {
    const store = useStore();

    // Store reference to the wrapped listener function for proper cleanup
    const wrappedRecurrenceListener = ref(null);

    onMounted(() => {
      logger.info('App mounted, initializing data');

      // Initialize data
      store
        .dispatch('projects/fetchProjects')
        .catch((error) => logger.logError(error, 'Failed to fetch projects'));

      // Fetch only recent tasks by default (not done or done within past 2 days)
      store
        .dispatch('tasks/fetchTasks')
        .catch((error) => logger.logError(error, 'Failed to fetch tasks'));

      // Set up global recurrence change listener
      try {
        if (window.electron && window.electron.receive) {
          wrappedRecurrenceListener.value = window.electron.receive(
            'recurrence:changed',
            (taskId) => {
              logger.info(`Received recurrence:changed event for task ${taskId}`);
              // Dispatch to the recurrence store to handle the change
              store.dispatch('recurrence/handleRecurrenceChange', taskId);
            }
          );
          logger.info('Global recurrence listener registered');
        } else {
          logger.warn('Electron API not available - recurrence events will not work');
        }
      } catch (error) {
        logger.logError(error, 'Error setting up global recurrence listener');
      }
    });

    onBeforeUnmount(() => {
      // Clean up global recurrence listener
      try {
        if (window.electron && wrappedRecurrenceListener.value) {
          window.electron.removeListener('recurrence:changed', wrappedRecurrenceListener.value);
          wrappedRecurrenceListener.value = null;
          logger.info('Global recurrence listener removed');
        }
      } catch (error) {
        logger.logError(error, 'Error removing global recurrence listener');
      }
    });

    return {};
  },
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
