<template>
  <div class="task-item p-3 rounded border bg-white hover:bg-gray-50">
    <div class="flex items-start gap-3">
      <!-- Status Checkbox -->
      <div class="mt-0.5">
        <div
          @click="toggleStatus"
          class="w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer"
          :class="statusClasses"
        >
          <svg v-if="task.status === 'done'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else-if="task.status === 'doing'" class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <div v-else-if="task.status === 'planning'" class="w-2.5 h-2.5 rounded-full"></div>
        </div>
      </div>

      <!-- Task Content -->
      <div class="flex-1 min-w-0"><!-- Added min-w-0 to allow truncation -->
        <div class="flex justify-between">
          <h4 class="font-medium truncate max-w-[calc(100%-60px)]" :class="{ 'line-through text-gray-500': task.status === 'done' }">
            {{ task.name }}
          </h4>
          <div class="flex space-x-2 flex-shrink-0"><!-- Added flex-shrink-0 -->
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
        
        <p v-if="task.description" class="text-sm text-gray-600 mt-1 line-clamp-2"><!-- Added line-clamp-2 -->
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
          
          <!-- Notifications -->
          <span v-if="notificationCount > 0" class="inline-flex items-center text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {{ notificationCount }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue';

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
    const notificationCount = ref(0);
    
    onMounted(async () => {
      try {
        // Fetch notifications for this task
        const notifications = await window.electron.getNotificationsByTask(props.task.id);
        notificationCount.value = notifications ? notifications.length : 0;
      } catch (error) {
        console.error('Error fetching task notifications:', error);
      }
    });

    const statusClasses = computed(() => {
      switch(props.task.status) {
        case 'planning':
          return 'border-blue-500 text-blue-500';
        case 'doing':
          return 'border-yellow-500 text-yellow-500';
        case 'done':
          return 'border-green-500 bg-green-500';
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
      notificationCount,
      toggleStatus,
      formatDate,
      formatDuration,
      capitalizeFirst
    };
  }
};
</script>