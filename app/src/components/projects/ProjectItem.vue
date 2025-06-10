<template>
  <div
    class="project-item p-3 rounded cursor-pointer flex justify-between items-center"
    :class="
      isSelected
        ? 'bg-blue-100 border-blue-300 border'
        : 'bg-white border-gray-200 border hover:bg-gray-50'
    "
    @click="$emit('click')"
  >
    <div class="flex-1 min-w-0 mr-2">
      <h4 class="font-medium truncate">{{ project.name }}</h4>
      <p v-if="project.description" class="text-sm text-gray-600 truncate max-w-xs">
        {{ project.description }}
      </p>
    </div>
    <div class="relative flex-shrink-0">
      <button
        class="text-gray-500 hover:text-gray-700 p-1"
        title="Project options"
        @click.stop="showDropdown = !showDropdown"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div
        v-if="showDropdown"
        class="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border border-gray-200"
        @click.stop
      >
        <div class="py-1">
          <a
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            @click.stop="
              $emit('edit');
              showDropdown = false;
            "
          >
            Edit
          </a>
          <a
            class="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
            @click.stop="
              $emit('delete');
              showDropdown = false;
            "
          >
            Delete
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectItem',
  props: {
    project: {
      type: Object,
      required: true,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click', 'edit', 'delete'],
  data() {
    return {
      showDropdown: false,
    };
  },
  mounted() {
    // Close dropdown when clicking outside
    document.addEventListener('click', this.closeDropdown);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeDropdown);
  },
  methods: {
    closeDropdown() {
      this.showDropdown = false;
    },
  },
};
</script>
