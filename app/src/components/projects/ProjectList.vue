<template>
  <div class="project-list">
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-lg font-semibold">Projects</h3>
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
        :is-selected="selectedProjectId === project.id"
        @click="selectProject(project)"
        @edit="editProject(project)"
        @delete="deleteProject(project.id)"
      />
    </div>
    <div v-else class="text-gray-500 text-sm mt-2">
      No projects found. Create your first project.
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
    const projects = computed(() => store.state.projects.items);
    const selectedProjectId = ref(null);
    const showAddProjectForm = ref(false);
    const editingProject = ref(null);

    onMounted(async () => {
      if (store.state.projects.items.length === 0) {
        await store.dispatch('projects/fetchProjects');
      }
      
      // Select first project by default if available
      if (projects.value.length > 0 && !selectedProjectId.value) {
        selectProject(projects.value[0]);
      }
    });

    const selectProject = (project) => {
      selectedProjectId.value = project.id;
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
        if (selectedProjectId.value === projectId) {
          selectedProjectId.value = null;
          if (projects.value.length > 0) {
            selectProject(projects.value[0]);
          }
        }
      }
    };

    return {
      projects,
      selectedProjectId,
      showAddProjectForm,
      editingProject,
      selectProject,
      addProject,
      editProject,
      deleteProject
    };
  }
};
</script> 