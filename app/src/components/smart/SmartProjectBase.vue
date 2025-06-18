<template>
  <div class="smart-project-base">
    <slot />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { Task } from '../../models/Task.js';
import logger from '../../services/logger';

export default {
  name: 'SmartProjectBase',
  props: {
    projectType: {
      type: String,
      required: true,
      validator: (value) => ['today', 'overdue'].includes(value),
    },
  },
  emits: ['tasks-updated'],
  setup(props, { emit }) {
    const store = useStore();
    const showingAllTasks = ref(false);
    const missedPlannedTimeCheckInterval = ref(null);

    // Store references to wrapped listener functions for proper cleanup
    const wrappedTasksRefreshListener = ref(null);
    const wrappedNotificationsRefreshListener = ref(null);

    // Get all tasks for smart projects
    const allTasks = computed(() => store.getters['tasks/allTasks']);
    const isLoading = computed(() => store.getters['tasks/isLoading']);
    const error = computed(() => store.getters['tasks/error']);

    // Get working hours from preferences
    const workingHours = computed(
      () =>
        store.getters['preferences/workingHours'] || {
          startTime: '10:00',
          endTime: '19:00',
        }
    );

    // Smart project tasks based on type
    const todayTasks = computed(() => {
      if (!allTasks.value.length) return [];

      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      return allTasks.value.filter((task) => {
        // Check if due date is today
        if (task.dueDate === todayDateStr) {
          return true;
        }

        // Check if planned time is today
        if (task.plannedTime) {
          const plannedDate = new Date(task.plannedTime);
          return (
            plannedDate.getFullYear() === today.getFullYear() &&
            plannedDate.getMonth() === today.getMonth() &&
            plannedDate.getDate() === today.getDate()
          );
        }

        return false;
      });
    });

    const overdueTasks = computed(() => {
      if (!allTasks.value.length) return [];

      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      return allTasks.value.filter((task) => {
        // Check if due date is before today and task is not done
        if (task.dueDate && task.dueDate < todayDateStr && task.status !== 'done') {
          return true;
        }

        return false;
      });
    });

    // Get tasks based on project type
    const tasks = computed(() => {
      if (props.projectType === 'today') {
        return todayTasks.value;
      } else if (props.projectType === 'overdue') {
        return overdueTasks.value;
      }
      return [];
    });

    // Function to check if planned time is in the past but task is not started or completed
    const isMissedPlannedTime = (task) => {
      if (!task.plannedTime || task.status === 'doing' || task.status === 'done') {
        return false;
      }

      const plannedDateTime = new Date(task.plannedTime);
      const now = new Date();

      return now > plannedDateTime;
    };

    // Function to fetch tasks
    const fetchTasks = async () => {
      await store.dispatch('tasks/fetchTasks');

      // Batch fetch recurrence rules for all tasks
      const taskIds = tasks.value.map(task => task.id);
      if (taskIds.length > 0) {
        await store.dispatch('recurrence/fetchRecurrenceRulesForTasks', taskIds);
      }

      emit('tasks-updated', tasks.value);
    };

    // Function to load all tasks including those completed a long time ago
    const loadAllTasks = async () => {
      showingAllTasks.value = true;
      await store.dispatch('tasks/fetchAllTasks');
      emit('tasks-updated', tasks.value);
    };

    const startMissedPlannedTimeCheck = () => {
      missedPlannedTimeCheckInterval.value = setInterval(() => {
        if (!tasks.value) return;

        for (const task of tasks.value) {
          if (isMissedPlannedTime(task)) {
            logger.info(`Missed planned time detected for task ${task.id}. Refreshing tasks.`);
            fetchTasks();
            break; // Refresh only once per interval
          }
        }
      }, 300000); // 5 minutes
    };

    const stopMissedPlannedTimeCheck = () => {
      clearInterval(missedPlannedTimeCheckInterval.value);
      missedPlannedTimeCheckInterval.value = null;
    };

    onMounted(() => {
      // Load preferences
      store.dispatch('preferences/loadPreferences');

      // Start checking for missed planned times
      startMissedPlannedTimeCheck();

      // Listen for task refresh events from main process
      try {
        if (window.electron && window.electron.receive) {
          // Set up tasks refresh listener
          wrappedTasksRefreshListener.value = window.electron.receive('tasks:refresh', async () => {
            logger.info('Received tasks:refresh event');
            await fetchTasks();
          });

          // Set up notifications refresh listener
          wrappedNotificationsRefreshListener.value = window.electron.receive(
            'notifications:refresh',
            async () => {
              logger.info('Received notifications:refresh event');
              await fetchTasks();
            }
          );
        } else {
          logger.warn('Electron API not available - task refresh events will not work');
        }
      } catch (error) {
        logger.logError(error, 'Error setting up task refresh listeners');
      }

      // Initial fetch
      fetchTasks();
    });

    onBeforeUnmount(() => {
      // Stop checking for missed planned times
      stopMissedPlannedTimeCheck();

      // Remove event listeners when component is unmounted
      try {
        if (window.electron && window.electron.removeListener) {
          // Remove specific listeners using their wrapped function references
          if (wrappedTasksRefreshListener.value) {
            window.electron.removeListener('tasks:refresh', wrappedTasksRefreshListener.value);
            wrappedTasksRefreshListener.value = null;
          }
          if (wrappedNotificationsRefreshListener.value) {
            window.electron.removeListener(
              'notifications:refresh',
              wrappedNotificationsRefreshListener.value
            );
            wrappedNotificationsRefreshListener.value = null;
          }
        }
      } catch (error) {
        logger.logError(error, 'Error removing task refresh listeners');
      }
    });

    const updateTaskStatus = async (taskId, newStatus) => {
      await store.dispatch('tasks/updateTaskStatus', {
        taskId,
        status: newStatus,
        projectId: null, // Smart projects don't have a specific project ID
      });

      // Refresh all tasks for smart projects
      await store.dispatch('tasks/fetchTasks');
      emit('tasks-updated', tasks.value);
    };

    const updateTask = async (taskData) => {
      logger.info('updateTask called with data:', taskData);
      // Create a Task instance from the plain object
      const taskInstance = new Task(taskData);
      logger.info('Task instance:', taskInstance);
      await store.dispatch('tasks/updateTask', taskInstance);

      // Refresh all tasks for smart projects
      logger.info('Refreshing tasks for smart project');
      await store.dispatch('tasks/fetchTasks');
      emit('tasks-updated', tasks.value);
    };

    const deleteTask = async (taskId) => {
      if (confirm('Are you sure you want to delete this task?')) {
        await store.dispatch('tasks/deleteTask', {
          taskId,
          projectId: null, // Smart projects don't have a specific project ID
        });

        // Refresh all tasks for smart projects
        await store.dispatch('tasks/fetchTasks');
        emit('tasks-updated', tasks.value);
      }
    };

    const moveTask = async (task) => {
      try {
        // The task object already has the new projectId set by the TaskItem component
        await store.dispatch('tasks/updateTask', task);

        // Refresh all tasks for smart projects
        await store.dispatch('tasks/fetchTasks');
        emit('tasks-updated', tasks.value);

        logger.info(`Task ${task.id} moved to project ${task.projectId}`);
      } catch (error) {
        logger.error('Error moving task:', error);
      }
    };

    return {
      tasks,
      allTasks,
      isLoading,
      error,
      showingAllTasks,
      workingHours,
      isMissedPlannedTime,
      fetchTasks,
      loadAllTasks,
      updateTaskStatus,
      updateTask,
      deleteTask,
      moveTask,
      todayTasks,
      overdueTasks,
    };
  },
};
</script>
