<template>
  <div class="task-list">
    <!-- Task Filter -->
    <task-filter
      v-if="selectedProject && !smartProjectType"
      :filters="filters"
      @update:filters="updateFilters"
      class="mb-4"
    />

    <!-- Plan My Day Button (for Today smart project) -->
    <div 
      v-if="smartProjectType === 'today'"
      @click="planMyDay"
      class="p-3 rounded cursor-pointer bg-white border-gray-200 border hover:bg-gray-50 text-center text-blue-500 mb-4"
    >
      🗓️ Plan My Day
    </div>

    <!-- Add Task Button -->
    <div 
      v-if="selectedProject && !smartProjectType"
      @click="showAddTaskForm = true"
      class="p-3 rounded cursor-pointer bg-white border-gray-200 border hover:bg-gray-50 text-center text-blue-500 mb-4"
    >
      + Add Task
    </div>

    <!-- Task Form Dialog -->
    <div v-if="showAddTaskForm" class="mb-4 p-3 bg-white rounded shadow-md">
      <task-form
        :project-id="selectedProject ? selectedProject.id : null"
        @save="addTask"
        @cancel="showAddTaskForm = false"
      />
    </div>

    <!-- Task Edit Dialog -->
    <div v-if="editingTask" class="mb-4 p-3 bg-white rounded shadow-md">
      <task-form
        :task="editingTask"
        :project-id="selectedProject ? selectedProject.id : null"
        @save="updateTask"
        @cancel="editingTask = null"
      />
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
    <div v-else-if="tasks.length > 0 && !smartProjectType" class="text-gray-500 text-sm mt-2 text-center">
      No tasks match your filters.
    </div>
    <div v-else-if="selectedProject && !smartProjectType" class="text-gray-500 text-sm mt-2 text-center">
      No tasks in this project. Create your first task.
    </div>
    <div v-else-if="smartProjectType === 'today' && allTasks.length > 0" class="text-gray-500 text-sm mt-2 text-center">
      No tasks due or planned for today.
    </div>
    <div v-else-if="smartProjectType === 'overdue' && allTasks.length > 0" class="text-gray-500 text-sm mt-2 text-center">
      No overdue tasks.
    </div>
    <div v-else class="text-gray-500 text-sm mt-2 text-center">
      Select a project to view and manage tasks.
    </div>
    
    <!-- View All Tasks Button -->
    <div 
      v-if="!showingAllTasks && selectedProject"
      @click="loadAllTasks"
      class="mt-4 text-center text-gray-600 text-sm cursor-pointer hover:text-gray-800 hover:underline"
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
    
    <!-- Plan Day Result Dialog -->
    <div v-if="planningResult" class="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <plan-day-result 
          :result="planningResult" 
          :working-hours="workingHours"
          @close="planningResult = null" 
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { Task } from '../../models/Task.js';
import TaskItem from './TaskItem.vue';
import TaskForm from './TaskForm.vue';
import logger from '../../services/logger';
import TaskFilter from './TaskFilter.vue';
import PlanDayResult from './PlanDayResult.vue';

export default {
  components: {
    TaskItem,
    TaskForm,
    TaskFilter,
    PlanDayResult
  },
  name: 'TaskList',
  components: {
    TaskItem,
    TaskForm,
    TaskFilter,
    PlanDayResult
  },
  props: {
    selectedProject: {
      type: Object,
      default: null
    },
    smartProjectType: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const store = useStore();
    const showAddTaskForm = ref(false);
    const editingTask = ref(null);
    const showingAllTasks = ref(false);
    const missedPlannedTimeCheckInterval = ref(null);
    const planningResult = ref(null);
    const planningInProgress = ref(false);
    const filters = ref({
      status: 'all',
      priority: 'all',
      search: ''
    });

    // Get all tasks for smart projects
    const allTasks = computed(() => store.getters['tasks/allTasks']);

    // Get tasks for the selected project
    const tasks = computed(() => {
      if (!props.selectedProject) return [];
      return store.getters['tasks/tasksByProject'](props.selectedProject.id);
    });
    
    const isLoading = computed(() => store.getters['tasks/isLoading']);
    const error = computed(() => store.getters['tasks/error']);
    
    // Get working hours from preferences
    const workingHours = computed(() => store.getters['preferences/workingHours'] || {
      startTime: '10:00',
      endTime: '19:00'
    });

    // Smart project tasks
    const todayTasks = computed(() => {
      if (!allTasks.value.length) return [];
      
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      return allTasks.value.filter(task => {
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
      
      return allTasks.value.filter(task => {
        // Check if due date is before today and task is not done
        if (task.dueDate && task.dueDate < todayDateStr && task.status !== 'done') {
          return true;
        }
        
        return false;
      });
    });
    
    // Tasks to display based on selection
    const displayedTasks = computed(() => {
      if (props.smartProjectType === 'today') {
        return todayTasks.value;
      } else if (props.smartProjectType === 'overdue') {
        return overdueTasks.value;
      } else {
        return filteredTasks.value;
      }
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

    // Function to fetch tasks for the current project
    const fetchTasks = async () => {
      if (props.selectedProject) {
        await store.dispatch('tasks/fetchTasksByProject', props.selectedProject.id);
      } else if (props.smartProjectType) {
        // For smart projects, we need all tasks
        await store.dispatch('tasks/fetchTasks');
      }
    };
    
    // Function to load all tasks including those completed a long time ago
    const loadAllTasks = async () => {
      showingAllTasks.value = true;
      
      if (props.selectedProject) {
        await store.dispatch('tasks/fetchAllTasksByProject', props.selectedProject.id);
      } else if (props.smartProjectType) {
        await store.dispatch('tasks/fetchAllTasks');
      }
    };

    const startMissedPlannedTimeCheck = () => {
      missedPlannedTimeCheckInterval.value = setInterval(() => {
        if (!displayedTasks.value) return;

        for (const task of displayedTasks.value) {
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
          window.electron.receive('tasks:refresh', async () => {
            logger.info('Received tasks:refresh event');
            await fetchTasks();
          });
          
          // Listen for notification changes to refresh tasks
          window.electron.receive('notifications:refresh', async () => {
            logger.info('Received notifications:refresh event');
            await fetchTasks();
          });
        } else {
          logger.warn('Electron API not available - task refresh events will not work');
        }
      } catch (error) {
        logger.logError(error, 'Error setting up task refresh listeners');
      }
    });

    onBeforeUnmount(() => {
      // Stop checking for missed planned times
      stopMissedPlannedTimeCheck();

      // Remove event listeners when component is unmounted
      try {
        if (window.electron && window.electron.removeAllListeners) {
          window.electron.removeAllListeners('tasks:refresh');
          window.electron.removeAllListeners('notifications:refresh');
        }
      } catch (error) {
        logger.logError(error, 'Error removing task refresh listeners');
      }
    });

    // Apply filters to tasks
    const filteredTasks = computed(() => {
      let result = [...tasks.value];
      
      // Filter by status
      if (filters.value.status !== 'all') {
        result = result.filter(task => task.status === filters.value.status);
      }
      
      // Filter by priority
      if (filters.value.priority !== 'all') {
        result = result.filter(task => task.priority === filters.value.priority);
      }
      
      // Filter by search term
      if (filters.value.search) {
        const searchTerm = filters.value.search.toLowerCase();
        result = result.filter(
          task => 
            task.name.toLowerCase().includes(searchTerm) || 
            (task.description && task.description.toLowerCase().includes(searchTerm))
        );
      }
      
      return result;
    });

    // Fetch tasks when selected project or smart project type changes
    watch(
      [() => props.selectedProject, () => props.smartProjectType], 
      async ([newProject, newSmartProjectType]) => {
        showingAllTasks.value = false;
        if (newProject) {
          await store.dispatch('tasks/fetchTasksByProject', newProject.id);
        } else if (newSmartProjectType) {
          await store.dispatch('tasks/fetchTasks');
        }
      },
      { immediate: true }
    );

    const addTask = async (taskData, callback) => {
      try {
        // Dispatch the action to add the task
        const result = await store.dispatch('tasks/addTask', taskData);
        
        // If we have a callback and the task was successfully added
        if (callback && result && result.id) {
          // Call the callback with the new task ID
          callback(result.id);
        }
        
        // Hide the form
        showAddTaskForm.value = false;
      } catch (error) {
        logger.error('Error adding task:', error);
      }
    };

    const updateTask = async (taskData) => {
      logger.info('updateTask called with data:', taskData);
      // Create a Task instance from the plain object
      const taskInstance = new Task(taskData);
      logger.info('Task instance:', taskInstance);
      await store.dispatch('tasks/updateTask', taskInstance);
      editingTask.value = null;
      
      // If we're in a smart project, refresh all tasks
      if (props.smartProjectType) {
        logger.info('Refreshing tasks for smart project');
        await store.dispatch('tasks/fetchTasks');
      }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
      await store.dispatch('tasks/updateTaskStatus', {
        taskId,
        status: newStatus,
        projectId: props.selectedProject ? props.selectedProject.id : null
      });
      
      // If we're in a smart project, refresh all tasks
      if (props.smartProjectType) {
        await store.dispatch('tasks/fetchTasks');
      }
    };

    const editTask = (task) => {
      editingTask.value = task;
    };

    const deleteTask = async (taskId) => {
      if (confirm('Are you sure you want to delete this task?')) {
        await store.dispatch('tasks/deleteTask', {
          taskId,
          projectId: props.selectedProject ? props.selectedProject.id : null
        });
        
        // If we're in a smart project, refresh all tasks
        if (props.smartProjectType) {
          await store.dispatch('tasks/fetchTasks');
        }
      }
    };
    
    const moveTask = async (task) => {
      try {
        // Store the original projectId to reference where the task is moving FROM
        const originalProjectId = props.selectedProject ? props.selectedProject.id : null;
        
        // The task object already has the new projectId set by the TaskItem component
        await store.dispatch('tasks/updateTask', task);
        
        // Refresh tasks for the current project to remove the moved task from view
        if (originalProjectId) {
          await store.dispatch('tasks/fetchTasksByProject', originalProjectId);
        }
        
        // If we're in a smart project, refresh all tasks
        if (props.smartProjectType) {
          await store.dispatch('tasks/fetchTasks');
        }
        
        logger.info(`Task ${task.id} moved from project ${originalProjectId} to project ${task.projectId}`);
      } catch (error) {
        logger.error('Error moving task:', error);
      }
    };

    const updateFilters = (newFilters) => {
      filters.value = { ...newFilters };
      store.dispatch('tasks/filterTasks', newFilters);
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
        await fetchTasks();
      } catch (error) {
        logger.error('Error planning day:', error);
        planningResult.value = {
          scheduled: [],
          unscheduled: [],
          message: `Error planning day: ${error.message}`
        };
      } finally {
        planningInProgress.value = false;
      }
    };

    return {
      tasks,
      allTasks,
      filteredTasks,
      displayedTasks,
      isLoading,
      error,
      showAddTaskForm,
      editingTask,
      showingAllTasks,
      filters,
      isTaskBeingEdited,
      addTask,
      updateTask,
      updateTaskStatus,
      editTask,
      deleteTask,
      moveTask,
      updateFilters,
      loadAllTasks,
      planMyDay,
      planningResult,
      planningInProgress,
      workingHours,
      isMissedPlannedTime
    };
  }
};
</script>