<template>
  <div class="task-form">
    <h3 class="text-lg font-medium mb-3">{{ task ? 'Edit Task' : 'Add Task' }}</h3>
    <form @submit.prevent="saveTask">
      <div class="mb-3">
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      <div class="mb-3">
        <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id="description"
          v-model="formData.description"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            id="status"
            v-model="formData.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="planning">Planning</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </div>
        
        <div>
          <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            id="priority"
            v-model="formData.priority"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            id="dueDate"
            v-model="formData.dueDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label for="duration" class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
          <input
            id="duration"
            v-model.number="formData.duration"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {{ task ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { reactive, onMounted } from 'vue';

export default {
  name: 'TaskForm',
  props: {
    task: {
      type: Object,
      default: null
    },
    projectId: {
      type: String,
      required: true
    }
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const formData = reactive({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      dueDate: '',
      duration: 0,
      projectId: props.projectId
    });

    onMounted(() => {
      if (props.task) {
        formData.name = props.task.name;
        formData.description = props.task.description || '';
        formData.status = props.task.status;
        formData.priority = props.task.priority;
        formData.duration = props.task.duration || 0;
        
        if (props.task.dueDate) {
          // Format date string to YYYY-MM-DD for input field
          const date = new Date(props.task.dueDate);
          formData.dueDate = date.toISOString().split('T')[0];
        }
      }
    });

    const saveTask = () => {
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        projectId: props.projectId,
        duration: formData.duration || 0
      };
      
      if (formData.dueDate) {
        taskData.dueDate = new Date(formData.dueDate).toISOString();
      }
      
      if (props.task) {
        taskData.id = props.task.id;
      }
      
      emit('save', taskData);
      
      // Reset form if adding a new task
      if (!props.task) {
        formData.name = '';
        formData.description = '';
        formData.dueDate = '';
        formData.duration = 0;
      }
    };

    return {
      formData,
      saveTask
    };
  }
};
</script> 