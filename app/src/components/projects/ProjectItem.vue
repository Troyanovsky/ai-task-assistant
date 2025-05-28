<template>
  <div 
    @click="$emit('click')"
    class="project-item p-3 rounded cursor-pointer flex justify-between items-center"
    :class="isSelected ? 'bg-blue-100 border-blue-300 border' : 'bg-white border-gray-200 border hover:bg-gray-50'"
  >
    <div class="flex-1 min-w-0 mr-2"><!-- Added flex-1, min-w-0, and mr-2 -->
      <h4 class="font-medium truncate">{{ project.name }}</h4><!-- Added truncate -->
      <p v-if="project.description" class="text-sm text-gray-600 truncate max-w-xs">
        {{ project.description }}
      </p>
    </div>
    <div class="flex space-x-2 flex-shrink-0"><!-- Added flex-shrink-0 -->
      <button 
        @click.stop="$emit('edit')" 
        class="text-gray-500 hover:text-blue-500"
        title="Edit project"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button 
        @click.stop="$emit('delete')" 
        class="text-gray-500 hover:text-red-500"
        title="Delete project"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectItem',
  props: {
    project: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'edit', 'delete']
};
</script>