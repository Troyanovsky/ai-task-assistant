<template>
  <div class="home-view">
    <div class="flex h-screen overflow-hidden">
      <!-- Left Panel: Projects -->
      <div class="w-1/4 border-r border-gray-300 h-full">
        <app-sidebar title="Projects">
          <project-list @project-selected="selectProject" />
        </app-sidebar>
      </div>
      
      <!-- Middle Panel: Tasks -->
      <div class="w-2/4 bg-white p-4 overflow-y-auto">
        <task-list :selected-project="selectedProject" />
      </div>
      
      <!-- Right Panel: AI Chat -->
      <div class="w-1/4 bg-gray-100 border-l border-gray-300 h-full">
        <app-sidebar title="AI Assistant">
          <p class="text-gray-500">AI chat will be implemented in Phase 4</p>
        </app-sidebar>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import AppSidebar from '../components/layout/AppSidebar.vue';
import ProjectList from '../components/projects/ProjectList.vue';
import TaskList from '../components/tasks/TaskList.vue';

export default {
  name: 'HomeView',
  components: {
    AppSidebar,
    ProjectList,
    TaskList
  },
  setup() {
    const store = useStore();
    
    // Get selected project from store
    const selectedProject = computed(() => store.getters['projects/selectedProject']);

    // Dispatch action to select project
    const selectProject = (project) => {
      store.dispatch('projects/selectProject', project);
    };

    return {
      selectedProject,
      selectProject
    };
  }
};
</script> 