<template>
  <div>
    <!-- This is a non-visible component that just listens for notifications -->
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import logger from '../../services/logger.js';

export default {
  name: 'NotificationListener',
  setup() {
    const router = useRouter();
    const store = useStore();

    // Store reference to the wrapped listener function for proper cleanup
    const wrappedNotificationListener = ref(null);

    // Handle notification events
    const handleNotification = (notification) => {
      logger.info('Received notification:', notification);

      // Handle focus-task type notifications
      if (notification.type === 'focus-task' && notification.taskId) {
        // Get the task details
        store
          .dispatch('tasks/getTaskById', notification.taskId)
          .then((task) => {
            if (task) {
              // Navigate to the project containing the task
              router.push({
                name: 'project',
                params: { id: task.projectId },
                query: { focusTaskId: task.id },
              });
            }
          })
          .catch((error) => {
            logger.logError(error, 'Error focusing task');
          });
      }
    };

    onMounted(() => {
      try {
        // Register notification listener if electron is available
        if (window.electron) {
          wrappedNotificationListener.value = window.electron.receive(
            'notification:received',
            handleNotification
          );
          logger.info('Notification listener registered');
        } else {
          logger.warn('Electron API not available - notifications will not work');
        }
      } catch (error) {
        logger.logError(error, 'Error setting up notification listener');
      }
    });

    onUnmounted(() => {
      try {
        // Remove specific notification listener if electron is available
        if (window.electron && wrappedNotificationListener.value) {
          window.electron.removeListener(
            'notification:received',
            wrappedNotificationListener.value
          );
          wrappedNotificationListener.value = null;
          logger.info('Notification listener removed');
        }
      } catch (error) {
        logger.logError(error, 'Error removing notification listener');
      }
    });

    return {};
  },
};
</script>
