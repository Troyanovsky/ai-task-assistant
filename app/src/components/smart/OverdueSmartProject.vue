<template>
  <smart-project-base project-type="overdue" @tasks-updated="handleTasksUpdated">
    <!-- Urgency Indicator -->
    <div
      v-if="displayedTasks.length > 0"
      class="p-3 rounded bg-red-50 border-red-200 border text-red-700 text-center mb-4"
    >
      ⚠️ Urgent: {{ displayedTasks.length }} overdue task{{ displayedTasks.length > 1 ? 's' : '' }}
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
      No overdue tasks. Great job staying on track! 🎉
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
  </smart-project-base>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import SmartProjectBase from './SmartProjectBase.vue';
import TaskItem from '../tasks/TaskItem.vue';
import TaskForm from '../tasks/TaskForm.vue';
import logger from '../../services/logger';

export default {
  name: 'OverdueSmartProject',
  components: {
    SmartProjectBase,
    TaskItem,
    TaskForm,
  },
  setup() {
    const store = useStore();
    const editingTask = ref(null);
    const currentTasks = ref([]);

    // Helper function to filter overdue tasks
    const filterOverdueTasks = (tasks) => {
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0];
      
      return tasks.filter(task => {
        // Check if due date is before today and task is not done
        return task.dueDate && task.dueDate < todayDateStr && task.status !== 'done';
      });
    };

    // Helper function to refresh tasks
    const refreshTasks = async () => {
      try {
        await store.dispatch('tasks/fetchTasks');
        currentTasks.value = filterOverdueTasks(store.getters['tasks/allTasks']);
      } catch (error) {
        logger.error('Error refreshing tasks:', error);
      }
    };

    // Get data from store
    const allTasks = computed(() => store.getters['tasks/allTasks']);
    const isLoading = computed(() => store.getters['tasks/isLoading']);
    const error = computed(() => store.getters['tasks/error']);
    const showingAllTasks = ref(false);

    // Tasks to display with sorting
    const displayedTasks = computed(() => {
      let tasksToDisplay = [...currentTasks.value];

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
      currentTasks.value = filterOverdueTasks(tasks);
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
        await store.dispatch('tasks/fetchAllTasks');
        currentTasks.value = filterOverdueTasks(store.getters['tasks/allTasks']);
      } catch (error) {
        logger.error('Error loading all tasks:', error);
      }
    };

    return {
      editingTask,
      allTasks,
      isLoading,
      error,
      showingAllTasks,
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
    };
  },
};
</script>
