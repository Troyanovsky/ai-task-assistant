<template>
  <div class="project-list">
    <div class="mb-4 flex justify-between items-center">
      <!-- <h3 class="text-lg font-semibold">Projects</h3> -->
    </div>

    <!-- Project Form Dialog for Add -->
    <div v-if="showAddProjectForm && !editingProject" class="mb-4 p-3 bg-white rounded shadow-md">
      <project-form
        @save="addProject"
        @cancel="showAddProjectForm = false"
      />
    </div>

    <!-- Project Form Dialog for Edit -->
    <div v-if="editingProject" class="mb-4 p-3 bg-white rounded shadow-md">
      <project-form
        :project="editingProject"
        @save="updateProject"
        @cancel="editingProject = null"
      />
    </div>

    <!-- Projects List -->
    <div v-if="projects.length > 0" class="space-y-2 mb-2">
      <project-item
        v-for="project in projects"
        :key="project.id"
        :project="project"
        :is-selected="selectedProject && selectedProject.id === project.id"
        v-show="!editingProject || editingProject.id !== project.id"
        @click="selectProject(project)"
        @edit="editProject(project)"
        @delete="deleteProject(project.id)"
      />
    </div>
    <div v-else class="text-gray-500 text-sm mt-2 mb-2">
      No projects found. Create your first project.
    </div>
    
    <!-- Add Project Button at bottom -->
    <div 
      @click="showAddForm"
      class="p-3 rounded cursor-pointer bg-white border-gray-200 border hover:bg-gray-50 text-center text-blue-500"
    >
      + Add Project
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
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import ProjectItem from './ProjectItem.vue';
import ProjectForm from './ProjectForm.vue';
import Project from '../../models/Project.js';
import logger from '../../services/logger.js';

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

    // Function to fetch projects
    const fetchProjects = async () => {
      await store.dispatch('projects/fetchProjects');
      
      // Select first project by default if available and none is selected
      if (projects.value.length > 0 && !selectedProject.value) {
        selectProject(projects.value[0]);
      }
    };

    onMounted(async () => {
      // Fetch projects on component mount
      await fetchProjects();
      
      // Listen for project refresh events from main process
      try {
        if (window.electron && window.electron.receive) {
          window.electron.receive('projects:refresh', async () => {
            logger.info('Received projects:refresh event');
            await fetchProjects();
          });
        } else {
          logger.warn('Electron API not available - project refresh events will not work');
        }
      } catch (error) {
        logger.logError(error, 'Error setting up project refresh listener');
      }
    });
    
    onBeforeUnmount(() => {
      // Remove event listener when component is unmounted
      try {
        if (window.electron && window.electron.removeAllListeners) {
          window.electron.removeAllListeners('projects:refresh');
        }
      } catch (error) {
        logger.logError(error, 'Error removing project refresh listener');
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

    const updateProject = async (projectData) => {
      await store.dispatch('projects/updateProject', new Project(projectData));
      editingProject.value = null;
    };

    const editProject = (project) => {
      // Close add form if it's open
      showAddProjectForm.value = false;
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

    const showAddForm = () => {
      // Close edit form if it's open
      editingProject.value = null;
      showAddProjectForm.value = true;
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
      updateProject,
      editProject,
      deleteProject,
      showAddForm
    };
  }
};
</script> 