<template>
  <!-- This is a non-visible component that just listens for notifications -->
</template>

<script>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

export default {
  name: 'NotificationListener',
  setup() {
    const router = useRouter();
    const store = useStore();
    
    // Handle notification events
    const handleNotification = (notification) => {
      console.log('Received notification:', notification);
      
      // Handle focus-task type notifications
      if (notification.type === 'focus-task' && notification.taskId) {
        // Get the task details
        store.dispatch('tasks/getTaskById', notification.taskId)
          .then(task => {
            if (task) {
              // Navigate to the project containing the task
              router.push({ 
                name: 'project', 
                params: { id: task.projectId },
                query: { focusTaskId: task.id }
              });
            }
          })
          .catch(error => {
            console.error('Error focusing task:', error);
          });
      }
    };
    
    onMounted(() => {
      // Register notification listener
      window.electron.receive('notification:received', handleNotification);
    });
    
    onUnmounted(() => {
      // Remove notification listener
      window.electron.removeAllListeners('notification:received');
    });
    
    return {};
  }
};
</script> 