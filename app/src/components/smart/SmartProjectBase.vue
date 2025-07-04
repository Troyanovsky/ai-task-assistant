<template>
  <div class="smart-project-base">
    <slot
      :tasks="displayedTasks"
      :all-tasks="allTasks"
      :is-loading="isLoading"
      :error="error"
      :showing-all-tasks="showingAllTasks"
      :working-hours="workingHours"
      :editing-task="editingTask"
      :is-missed-planned-time="isMissedPlannedTime"
      :is-task-being-edited="isTaskBeingEdited"
      :get-notification-count="getNotificationCount"
      :update-task-status="updateTaskStatus"
      :update-task="updateTask"
      :edit-task="editTask"
      :delete-task="deleteTask"
      :move-task="moveTask"
      :load-all-tasks="loadAllTasks"
      :set-editing-task="setEditingTask"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
    const editingTask = ref(null);

    // Store references to wrapped listener functions for proper cleanup
    const wrappedTasksRefreshListener = ref(null);
    const wrappedNotificationsRefreshListener = ref(null);
    const wrappedNotificationsChangedListener = ref(null);

    // Get all tasks for smart projects
    const allTasks = computed(() => store.getters['tasks/allTasks']);
    const isLoading = computed(() => store.getters['tasks/isLoading']);
    const error = computed(() => store.getters['tasks/error']);

    // Track notification counts for each task
    const taskNotificationCounts = ref({});

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

    // Tasks to display with sorting
    const displayedTasks = computed(() => {
      let tasksToDisplay = [...tasks.value];

      if (props.projectType === 'today') {
        // Sort tasks: Planning/Doing first, then Done
        return tasksToDisplay.sort((a, b) => {
          // Group tasks: non-done (planning/doing) vs done
          const aIsDone = a.status === 'done';
          const bIsDone = b.status === 'done';

          // Non-done tasks come before done tasks
          if (!aIsDone && bIsDone) return -1;
          if (aIsDone && !bIsDone) return 1;

          // For non-done tasks (both planning/doing)
          if (!aIsDone && !bIsDone) {
            // Tasks with due date/planned time come first
            const aHasDate = a.dueDate || a.plannedTime;
            const bHasDate = b.dueDate || b.plannedTime;

            if (aHasDate && !bHasDate) return -1;
            if (!aHasDate && bHasDate) return 1;

            // Compare by due date (if available)
            if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
              return a.dueDate.localeCompare(b.dueDate);
            }

            // Compare by planned time (if available)
            if (a.plannedTime && b.plannedTime && a.plannedTime !== b.plannedTime) {
              return new Date(a.plannedTime) - new Date(b.plannedTime);
            }

            // For tasks without dates, sort by priority DESC
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }

          // For done tasks
          if (aIsDone && bIsDone) {
            // Compare by due date (if available)
            if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
              return a.dueDate.localeCompare(b.dueDate);
            }

            // Compare by planned time (if available)
            if (a.plannedTime && b.plannedTime && a.plannedTime !== b.plannedTime) {
              return new Date(a.plannedTime) - new Date(b.plannedTime);
            }

            // Finally, sort by priority DESC
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }

          return 0;
        });
      } else if (props.projectType === 'overdue') {
        // Sort overdue tasks by due date (oldest first) and priority
        return tasksToDisplay.sort((a, b) => {
          // Compare by due date first (oldest overdue tasks first)
          if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate);
          }

          // If same due date or no due date, sort by priority DESC
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
      }

      return tasksToDisplay;
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

    // Function to fetch notification counts for all tasks
    const fetchNotificationCounts = async () => {
      if (!tasks.value || tasks.value.length === 0) return;

      const counts = {};
      for (const task of tasks.value) {
        try {
          const notifications = await window.electron.getNotificationsByTask(task.id);
          // Exclude planned time notifications from the count shown in UI
          const regularNotifications = notifications.filter((n) => n.type !== 'PLANNED_TIME');
          counts[task.id] = regularNotifications ? regularNotifications.length : 0;
        } catch (error) {
          logger.error(`Error fetching notifications for task ${task.id}:`, error);
          counts[task.id] = 0;
        }
      }
      taskNotificationCounts.value = counts;
    };

    // Function to fetch tasks
    const fetchTasks = async () => {
      await store.dispatch('tasks/fetchTasks');

      // Batch fetch recurrence rules for all tasks
      const taskIds = tasks.value.map((task) => task.id);
      if (taskIds.length > 0) {
        await store.dispatch('recurrence/fetchRecurrenceRulesForTasks', taskIds);
      }

      // Fetch notification counts for all tasks
      await fetchNotificationCounts();

      emit('tasks-updated', tasks.value);
    };

    // Function to load all tasks including those completed a long time ago
    const loadAllTasks = async () => {
      try {
        showingAllTasks.value = true;
        await store.dispatch('tasks/fetchAllTasks');
        // Fetch notification counts for all tasks
        await fetchNotificationCounts();
        emit('tasks-updated', tasks.value);
      } catch (error) {
        logger.error('Error loading all tasks:', error);
      }
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

          // Set up notifications changed listener
          wrappedNotificationsChangedListener.value = window.electron.receive(
            'notifications:changed',
            async (taskId) => {
              logger.info(`Received notifications:changed event for task ${taskId}`);
              // Refresh notification counts for all tasks to keep UI in sync
              await fetchNotificationCounts();
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
          if (wrappedNotificationsChangedListener.value) {
            window.electron.removeListener(
              'notifications:changed',
              wrappedNotificationsChangedListener.value
            );
            wrappedNotificationsChangedListener.value = null;
          }
        }
      } catch (error) {
        logger.logError(error, 'Error removing task refresh listeners');
      }
    });

    const updateTaskStatus = async (taskId, newStatus) => {
      try {
        await store.dispatch('tasks/updateTaskStatus', {
          taskId,
          status: newStatus,
          projectId: null, // Smart projects don't have a specific project ID
        });

        // Refresh all tasks for smart projects
        await store.dispatch('tasks/fetchTasks');
        // Fetch notification counts for all tasks
        await fetchNotificationCounts();
        emit('tasks-updated', tasks.value);
      } catch (error) {
        logger.error('Error updating task status:', error);
      }
    };

    const updateTask = async (taskData) => {
      try {
        logger.info('updateTask called with data:', taskData);
        // Create a Task instance from the plain object if needed
        const taskInstance = taskData instanceof Task ? taskData : new Task(taskData);
        logger.info('Task instance:', taskInstance);
        await store.dispatch('tasks/updateTask', taskInstance);

        // Clear editing state
        editingTask.value = null;

        // Refresh all tasks for smart projects
        logger.info('Refreshing tasks for smart project');
        await store.dispatch('tasks/fetchTasks');
        // Fetch notification counts for all tasks
        await fetchNotificationCounts();
        emit('tasks-updated', tasks.value);
      } catch (error) {
        logger.error('Error updating task:', error);
      }
    };

    const deleteTask = async (taskId) => {
      try {
        if (confirm('Are you sure you want to delete this task?')) {
          await store.dispatch('tasks/deleteTask', {
            taskId,
            projectId: null, // Smart projects don't have a specific project ID
          });

          // Refresh all tasks for smart projects
          await store.dispatch('tasks/fetchTasks');
          // Fetch notification counts for all tasks
          await fetchNotificationCounts();
          emit('tasks-updated', tasks.value);
        }
      } catch (error) {
        logger.error('Error deleting task:', error);
      }
    };

    const moveTask = async (task) => {
      try {
        // The task object already has the new projectId set by the TaskItem component
        await store.dispatch('tasks/updateTask', task);

        // Refresh all tasks for smart projects
        await store.dispatch('tasks/fetchTasks');
        // Fetch notification counts for all tasks
        await fetchNotificationCounts();
        emit('tasks-updated', tasks.value);

        logger.info(`Task ${task.id} moved to project ${task.projectId}`);
      } catch (error) {
        logger.error('Error moving task:', error);
      }
    };

    // Helper function to get notification count for a specific task
    const getNotificationCount = (taskId) => {
      return taskNotificationCounts.value[taskId] || 0;
    };

    // Function to check if a task is currently being edited
    const isTaskBeingEdited = (task) => {
      return editingTask.value && task && editingTask.value.id === task.id;
    };

    // Function to set editing task
    const editTask = (task) => {
      editingTask.value = task;
    };

    // Function to set editing task (for external control)
    const setEditingTask = (task) => {
      editingTask.value = task;
    };

    return {
      tasks,
      displayedTasks,
      allTasks,
      isLoading,
      error,
      showingAllTasks,
      workingHours,
      editingTask,
      isMissedPlannedTime,
      isTaskBeingEdited,
      fetchTasks,
      loadAllTasks,
      updateTaskStatus,
      updateTask,
      editTask,
      deleteTask,
      moveTask,
      todayTasks,
      overdueTasks,
      getNotificationCount,
      setEditingTask,
    };
  },
};
</script>
