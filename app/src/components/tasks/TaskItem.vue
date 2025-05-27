<template>
  <div class="task-item p-3 rounded border bg-white hover:bg-gray-50">
    <div class="flex items-start gap-3">
      <!-- Status Checkbox -->
      <div class="mt-0.5">
        <button
          @click="toggleStatus"
          class="w-5 h-5 rounded-full border flex items-center justify-center"
          :class="statusClasses"
        >
          <svg v-if="task.status === 'done'" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <!-- Task Content -->
      <div class="flex-1">
        <div class="flex justify-between">
          <h4 class="font-medium" :class="{ 'line-through text-gray-500': task.status === 'done' }">
            {{ task.name }}
          </h4>
          <div class="flex space-x-2">
            <button 
              @click="$emit('edit', task)" 
              class="text-gray-500 hover:text-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              @click="$emit('delete', task.id)" 
              class="text-gray-500 hover:text-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <p v-if="task.description" class="text-sm text-gray-600 mt-1">
          {{ task.description }}
        </p>
        
        <div class="flex flex-wrap gap-2 mt-2">
          <!-- Due Date -->
          <span v-if="task.dueDate" class="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatDate(task.dueDate) }}
          </span>
          
          <!-- Priority -->
          <span class="inline-flex items-center text-xs px-2 py-0.5 rounded" :class="priorityClasses">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ capitalizeFirst(task.priority) }}
          </span>
          
          <!-- Duration -->
          <span v-if="task.duration" class="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ formatDuration(task.duration) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'TaskItem',
  props: {
    task: {
      type: Object,
      required: true
    }
  },
  emits: ['status-change', 'edit', 'delete'],
  setup(props, { emit }) {
    const statusClasses = computed(() => {
      switch(props.task.status) {
        case 'planning':
          return 'border-blue-500 text-blue-500';
        case 'doing':
          return 'border-yellow-500 text-yellow-500';
        case 'done':
          return 'border-green-500 bg-green-500 text-white';
        default:
          return 'border-gray-500 text-gray-500';
      }
    });

    const priorityClasses = computed(() => {
      switch(props.task.priority) {
        case 'high':
          return 'bg-red-50 text-red-700';
        case 'medium':
          return 'bg-yellow-50 text-yellow-700';
        case 'low':
          return 'bg-green-50 text-green-700';
        default:
          return 'bg-gray-100 text-gray-700';
      }
    });

    const toggleStatus = () => {
      let newStatus;
      switch(props.task.status) {
        case 'planning':
          newStatus = 'doing';
          break;
        case 'doing':
          newStatus = 'done';
          break;
        case 'done':
          newStatus = 'planning';
          break;
        default:
          newStatus = 'planning';
      }
      emit('status-change', props.task.id, newStatus);
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    const formatDuration = (minutes) => {
      if (minutes < 60) {
        return `${minutes}m`;
      }
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    };

    const capitalizeFirst = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    return {
      statusClasses,
      priorityClasses,
      toggleStatus,
      formatDate,
      formatDuration,
      capitalizeFirst
    };
  }
};
</script> 