<template>
  <smart-project-base project-type="today" @tasks-updated="handleTasksUpdated">
    <!-- Progress Bar for Today's Tasks -->
    <today-progress
      v-if="totalTodayTasks > 0"
      :total-tasks="totalTodayTasks"
      :completed-tasks="completedTodayTasks"
      class="mb-4"
    />

    <!-- Plan My Day Button -->
    <div
      class="p-3 rounded cursor-pointer bg-white border-gray-200 border hover:bg-gray-50 text-center text-blue-500 mb-4"
      @click="planMyDay"
    >
      🗓️ Plan My Day
    </div>

    <!-- Tasks List -->
    <div v-if="displayedTasks.length > 0" class="space-y-3">
      <template v-for="task in displayedTasks" :key="task.id">
        <task-item
          v-if="!isTaskBeingEdited(task)"
          :task="task"
          :is-missed-planned-time="isMissedPlannedTime(task)"
          @status-change="updateTaskStatus"
          @edit="editTask"
          @delete="deleteTask"
          @move="moveTask"
        />
      </template>
    </div>
    <div v-else-if="allTasks.length > 0" class="text-gray-500 text-sm mt-2 text-center">
      No tasks due or planned for today.
    </div>
    <div v-else class="text-gray-500 text-sm mt-2 text-center">
      No tasks available. Create some tasks in your projects.
    </div>

    <!-- View All Tasks Button -->
    <div
      v-if="!showingAllTasks"
      class="mt-4 text-center text-gray-600 text-sm cursor-pointer hover:text-gray-800 hover:underline"
      @click="loadAllTasks"
    >
      View All Tasks
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="mt-4 text-center">
      <span class="text-gray-500">Loading tasks...</span>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mt-4 text-center">
      <span class="text-red-500">{{ error }}</span>
    </div>

    <!-- Task Form Modal -->
    <div
      v-if="editingTask"
      class="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <task-form
          :task="editingTask"
          :project-id="editingTask.projectId"
          @save="updateTask"
          @cancel="editingTask = null"
        />
      </div>
    </div>

    <!-- Plan Day Result Dialog -->
    <div
      v-if="planningResult"
      class="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <plan-day-result
          :result="planningResult"
          :working-hours="workingHours"
          @close="planningResult = null"
        />
      </div>
    </div>
  </smart-project-base>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import SmartProjectBase from './SmartProjectBase.vue';
import TodayProgress from './TodayProgress.vue';
import PlanDayResult from './PlanDayResult.vue';
import TaskItem from '../tasks/TaskItem.vue';
import TaskForm from '../tasks/TaskForm.vue';
import logger from '../../services/logger';

export default {
  name: 'TodaySmartProject',
  components: {
    SmartProjectBase,
    TodayProgress,
    PlanDayResult,
    TaskItem,
    TaskForm,
  },
  setup() {
    const store = useStore();
    const editingTask = ref(null);
    const planningResult = ref(null);
    const planningInProgress = ref(false);
    const currentTasks = ref([]);

    // Base component references
    const baseComponent = ref(null);

    // Helper function to filter today's tasks
    const filterTodayTasks = (tasks) => {
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0];
      
      return tasks.filter(task => {
        if (task.dueDate === todayDateStr) return true;
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
    };

    // Helper function to refresh tasks
    const refreshTasks = async () => {
      try {
        await store.dispatch('tasks/fetchTasks', { fetchAll: false });
        currentTasks.value = filterTodayTasks(store.getters['tasks/allTasks']);
      } catch (error) {
        logger.error('Error refreshing tasks:', error);
      }
    };

    const totalTodayTasks = computed(() => currentTasks.value.length);
    const completedTodayTasks = computed(
      () => currentTasks.value.filter((task) => task.status === 'done').length
    );

    // Get data from base component
    const allTasks = computed(() => store.getters['tasks/allTasks']);
    const isLoading = computed(() => store.getters['tasks/isLoading']);
    const error = computed(() => store.getters['tasks/error']);
    const showingAllTasks = ref(false);

    // Get working hours from preferences
    const workingHours = computed(
      () =>
        store.getters['preferences/workingHours'] || {
          startTime: '10:00',
          endTime: '19:00',
        }
    );

    // Tasks to display with sorting
    const displayedTasks = computed(() => {
      let tasksToDisplay = [...currentTasks.value];

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

    // Function to check if a task is currently being edited
    const isTaskBeingEdited = (task) => {
      return editingTask.value && task && editingTask.value.id === task.id;
    };

    const handleTasksUpdated = (tasks) => {
      currentTasks.value = filterTodayTasks(tasks);
    };

    const updateTaskStatus = async (taskId, newStatus) => {
      try {
        await store.dispatch('tasks/updateTaskStatus', {
          taskId,
          status: newStatus,
          projectId: null,
        });
        await refreshTasks();
      } catch (error) {
        logger.error('Error updating task status:', error);
      }
    };

    const updateTask = async (taskData) => {
      try {
        logger.info('updateTask called with data:', taskData);
        await store.dispatch('tasks/updateTask', taskData);
        editingTask.value = null;
        await refreshTasks();
      } catch (error) {
        logger.error('Error updating task:', error);
      }
    };

    const editTask = (task) => {
      editingTask.value = task;
    };

    const deleteTask = async (taskId) => {
      try {
        if (confirm('Are you sure you want to delete this task?')) {
          await store.dispatch('tasks/deleteTask', {
            taskId,
            projectId: null,
          });
          await refreshTasks();
        }
      } catch (error) {
        logger.error('Error deleting task:', error);
      }
    };

    const moveTask = async (task) => {
      try {
        await store.dispatch('tasks/updateTask', task);
        await refreshTasks();
        logger.info(`Task ${task.id} moved to project ${task.projectId}`);
      } catch (error) {
        logger.error('Error moving task:', error);
      }
    };

    const loadAllTasks = async () => {
      try {
        showingAllTasks.value = true;
        await store.dispatch('tasks/fetchTasks', { fetchAll: true });
        currentTasks.value = filterTodayTasks(store.getters['tasks/allTasks']);
      } catch (error) {
        logger.error('Error loading all tasks:', error);
      }
    };

    const planMyDay = async () => {
      try {
        // Set loading state
        planningInProgress.value = true;

        // Make sure preferences are loaded
        await store.dispatch('preferences/loadPreferences');

        // Call the planMyDay method
        const result = await window.electron.planMyDay();

        // Store the result
        planningResult.value = result;

        // Log the result
        logger.info('Day planning result:', result);

        // Refresh tasks to show updated planned times
        await refreshTasks();
      } catch (error) {
        logger.error('Error planning day:', error);
        planningResult.value = {
          scheduled: [],
          unscheduled: [],
          message: `Error planning day: ${error.message}`,
        };
      } finally {
        planningInProgress.value = false;
      }
    };

    return {
      editingTask,
      planningResult,
      planningInProgress,
      totalTodayTasks,
      completedTodayTasks,
      allTasks,
      isLoading,
      error,
      showingAllTasks,
      workingHours,
      displayedTasks,
      isMissedPlannedTime,
      isTaskBeingEdited,
      handleTasksUpdated,
      updateTaskStatus,
      updateTask,
      editTask,
      deleteTask,
      moveTask,
      loadAllTasks,
      planMyDay,
    };
  },
};
</script>
