<template>
  <div class="task-list">
    <!-- Task Filter -->
    <task-filter
      v-if="selectedProject"
      :filters="filters"
      @update:filters="updateFilters"
      class="mb-4"
    />

    <!-- Add Task Button -->
    <div 
      v-if="selectedProject"
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
    <div v-if="filteredTasks.length > 0" class="space-y-3">
      <task-item
        v-for="task in filteredTasks"
        :key="task.id"
        :task="task"
        @status-change="updateTaskStatus"
        @edit="editTask"
        @delete="deleteTask"
      />
    </div>
    <div v-else-if="tasks.length > 0" class="text-gray-500 text-sm mt-2 text-center">
      No tasks match your filters.
    </div>
    <div v-else-if="selectedProject" class="text-gray-500 text-sm mt-2 text-center">
      No tasks in this project. Create your first task.
    </div>
    <div v-else class="text-gray-500 text-sm mt-2 text-center">
      Select a project to view and manage tasks.
    </div>
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="mt-4 text-center">
      <span class="text-gray-500">Loading tasks...</span>
    </div>
    
    <!-- Error Message -->
    <div v-if="error" class="mt-4 text-center">
      <span class="text-red-500">{{ error }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import TaskItem from './TaskItem.vue';
import TaskForm from './TaskForm.vue';
import TaskFilter from './TaskFilter.vue';

// Add this import at the top of your file
import { Task } from '../../models/Task.js';

export default {
  name: 'TaskList',
  components: {
    TaskItem,
    TaskForm,
    TaskFilter
  },
  props: {
    selectedProject: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const store = useStore();
    const showAddTaskForm = ref(false);
    const editingTask = ref(null);
    const filters = ref({
      status: 'all',
      priority: 'all',
      search: ''
    });

    // Get data from store using getters
    const tasks = computed(() => {
      if (!props.selectedProject) return [];
      return store.getters['tasks/tasksByProject'](props.selectedProject.id);
    });
    
    const isLoading = computed(() => store.getters['tasks/isLoading']);
    const error = computed(() => store.getters['tasks/error']);

    // Function to fetch tasks for the current project
    const fetchTasks = async () => {
      if (props.selectedProject) {
        await store.dispatch('tasks/fetchTasksByProject', props.selectedProject.id);
      }
    };

    onMounted(() => {
      // Listen for task refresh events from main process
      window.electron.receive('tasks:refresh', async () => {
        console.log('Received tasks:refresh event');
        await fetchTasks();
      });
    });

    onBeforeUnmount(() => {
      // Remove event listener when component is unmounted
      window.electron.removeAllListeners('tasks:refresh');
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

    // Fetch tasks when selected project changes
    watch(
      () => props.selectedProject, 
      async (newProject) => {
        if (newProject) {
          await store.dispatch('tasks/fetchTasksByProject', newProject.id);
        }
      },
      { immediate: true }
    );

    const addTask = async (taskData) => {
      await store.dispatch('tasks/addTask', taskData);
      showAddTaskForm.value = false;
    };

    const updateTask = async (taskData) => {
      // Create a Task instance from the plain object
      const taskInstance = new Task(taskData);
      await store.dispatch('tasks/updateTask', taskInstance);
      editingTask.value = null;
    };

    const updateTaskStatus = async (taskId, newStatus) => {
      await store.dispatch('tasks/updateTaskStatus', {
        taskId,
        status: newStatus,
        projectId: props.selectedProject ? props.selectedProject.id : null
      });
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
      }
    };

    const updateFilters = (newFilters) => {
      filters.value = { ...newFilters };
      store.dispatch('tasks/filterTasks', newFilters);
    };

    return {
      tasks,
      filteredTasks,
      isLoading,
      error,
      showAddTaskForm,
      editingTask,
      filters,
      addTask,
      updateTask,
      updateTaskStatus,
      editTask,
      deleteTask,
      updateFilters
    };
  }
};
</script>