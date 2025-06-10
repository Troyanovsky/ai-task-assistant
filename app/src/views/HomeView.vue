<template>
  <div class="home-view h-full">
    <div class="flex h-full overflow-hidden">
      <!-- Left Panel: Projects -->
      <div class="w-1/4 border-r border-gray-300 flex flex-col h-full bg-gray-100">
        <div class="flex items-center justify-between p-4 border-b border-gray-300 h-[60px]">
          <h2 class="font-bold text-lg">Projects</h2>
          <router-link to="/settings" class="text-gray-600 hover:text-gray-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clip-rule="evenodd"
              />
            </svg>
          </router-link>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <project-list
            @project-selected="selectProject"
            @smart-project-selected="selectSmartProject"
          />
        </div>
      </div>

      <!-- Middle Panel: Tasks -->
      <div class="w-2/4 bg-white flex flex-col h-full">
        <div class="p-4 border-b border-gray-300 h-[60px] flex items-center">
          <h2 class="font-bold text-lg">
            <span v-if="selectedProject">{{ selectedProject.name }}</span>
            <span v-else-if="smartProjectType === 'today'">Today's Tasks</span>
            <span v-else-if="smartProjectType === 'overdue'">Overdue Tasks</span>
            <span v-else>Tasks</span>
          </h2>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <task-list :selected-project="selectedProject" :smart-project-type="smartProjectType" />
        </div>
      </div>

      <!-- Right Panel: AI Chat -->
      <div class="w-1/4 bg-gray-100 border-l border-gray-300 h-full flex flex-col">
        <chat-box />
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import ProjectList from '../components/projects/ProjectList.vue';
import TaskList from '../components/tasks/TaskList.vue';
import ChatBox from '../components/ai/ChatBox.vue';

export default {
  name: 'HomeView',
  components: {
    ProjectList,
    TaskList,
    ChatBox,
  },
  setup() {
    const store = useStore();
    const smartProjectType = ref(null);

    // Get selected project from store
    const selectedProject = computed(() => store.getters['projects/selectedProject']);

    // Dispatch action to select project
    const selectProject = (project) => {
      smartProjectType.value = null;
      store.dispatch('projects/selectProject', project);
    };

    // Handle smart project selection
    const selectSmartProject = (type) => {
      smartProjectType.value = type;
    };

    return {
      selectedProject,
      smartProjectType,
      selectProject,
      selectSmartProject,
    };
  },
};
</script>
