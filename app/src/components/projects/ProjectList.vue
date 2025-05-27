<template>
  <div class="project-list">
    <div class="mb-4 flex justify-between items-center">
      <!-- <h3 class="text-lg font-semibold">Projects</h3> -->
      <button
        @click="showAddProjectForm = true"
        class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
      >
        Add Project
      </button>
    </div>

    <!-- Project Form Dialog -->
    <div v-if="showAddProjectForm" class="mb-4 p-3 bg-white rounded shadow-md">
      <project-form
        @save="addProject"
        @cancel="showAddProjectForm = false"
      />
    </div>

    <!-- Projects List -->
    <div v-if="projects.length > 0" class="space-y-2">
      <project-item
        v-for="project in projects"
        :key="project.id"
        :project="project"
        :is-selected="selectedProject && selectedProject.id === project.id"
        @click="selectProject(project)"
        @edit="editProject(project)"
        @delete="deleteProject(project.id)"
      />
    </div>
    <div v-else class="text-gray-500 text-sm mt-2">
      No projects found. Create your first project.
    </div>
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="mt-4 text-center">
      <span class="text-gray-500">Loading projects...</span>
    </div>
    
    <!-- Error Message -->
    <div v-if="error" class="mt-4 text-center">
      <span class="text-red-500">{{ error }}</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import ProjectItem from './ProjectItem.vue';
import ProjectForm from './ProjectForm.vue';

export default {
  name: 'ProjectList',
  components: {
    ProjectItem,
    ProjectForm
  },
  emits: ['project-selected'],
  setup(props, { emit }) {
    const store = useStore();
    const showAddProjectForm = ref(false);
    const editingProject = ref(null);

    // Get data from store using getters
    const projects = computed(() => store.getters['projects/allProjects']);
    const selectedProject = computed(() => store.getters['projects/selectedProject']);
    const isLoading = computed(() => store.getters['projects/isLoading']);
    const error = computed(() => store.getters['projects/error']);

    onMounted(async () => {
      // Fetch projects on component mount
      await store.dispatch('projects/fetchProjects');
      
      // Select first project by default if available and none is selected
      if (projects.value.length > 0 && !selectedProject.value) {
        selectProject(projects.value[0]);
      }
    });

    const selectProject = (project) => {
      store.dispatch('projects/selectProject', project);
      emit('project-selected', project);
    };

    const addProject = async (projectData) => {
      await store.dispatch('projects/addProject', projectData);
      showAddProjectForm.value = false;
    };

    const editProject = (project) => {
      editingProject.value = project;
    };

    const deleteProject = async (projectId) => {
      if (confirm('Are you sure you want to delete this project?')) {
        await store.dispatch('projects/deleteProject', projectId);
        
        // If deleted project was selected, select another project
        if (selectedProject.value && selectedProject.value.id === projectId) {
          if (projects.value.length > 0) {
            selectProject(projects.value[0]);
          }
        }
      }
    };

    return {
      projects,
      selectedProject,
      showAddProjectForm,
      editingProject,
      isLoading,
      error,
      selectProject,
      addProject,
      editProject,
      deleteProject
    };
  }
};
</script> 