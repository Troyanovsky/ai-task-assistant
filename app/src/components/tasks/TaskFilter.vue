<template>
  <div class="task-filter bg-gray-50 p-3 rounded border border-gray-200">
    <div class="grid grid-cols-3 gap-3">
      <!-- Status Filter -->
      <div>
        <label for="status-filter" class="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select
          id="status-filter"
          v-model="localFilters.status"
          @change="updateFilters"
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
      </div>
      
      <!-- Priority Filter -->
      <div>
        <label for="priority-filter" class="block text-xs font-medium text-gray-500 mb-1">Priority</label>
        <select
          id="priority-filter"
          v-model="localFilters.priority"
          @change="updateFilters"
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      
      <!-- Search Filter -->
      <div>
        <label for="search-filter" class="block text-xs font-medium text-gray-500 mb-1">Search</label>
        <input
          id="search-filter"
          v-model="localFilters.search"
          @input="updateFilters"
          type="text"
          placeholder="Search tasks..."
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
    
    <!-- Clear Filters -->
    <div class="mt-2 flex justify-end" v-if="hasActiveFilters">
      <button
        @click="clearFilters"
        class="text-xs text-blue-600 hover:text-blue-800"
      >
        Clear filters
      </button>
    </div>
  </div>
</template>

<script>
import { reactive, computed, watch } from 'vue';

export default {
  name: 'TaskFilter',
  props: {
    filters: {
      type: Object,
      default: () => ({
        status: 'all',
        priority: 'all',
        search: ''
      })
    }
  },
  emits: ['update:filters'],
  setup(props, { emit }) {
    const localFilters = reactive({
      status: 'all',
      priority: 'all',
      search: ''
    });

    // Initialize local filters from props
    watch(
      () => props.filters,
      (newFilters) => {
        localFilters.status = newFilters.status;
        localFilters.priority = newFilters.priority;
        localFilters.search = newFilters.search;
      },
      { immediate: true }
    );

    const hasActiveFilters = computed(() => {
      return (
        localFilters.status !== 'all' ||
        localFilters.priority !== 'all' ||
        localFilters.search !== ''
      );
    });

    const updateFilters = () => {
      emit('update:filters', { ...localFilters });
    };

    const clearFilters = () => {
      localFilters.status = 'all';
      localFilters.priority = 'all';
      localFilters.search = '';
      updateFilters();
    };

    return {
      localFilters,
      hasActiveFilters,
      updateFilters,
      clearFilters
    };
  }
};
</script> 