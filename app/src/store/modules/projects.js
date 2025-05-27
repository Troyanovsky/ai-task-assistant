import Project from '../../models/Project';

// Initial state
const state = {
  projects: [],
  selectedProject: null,
  loading: false,
  error: null
};

// Getters
const getters = {
  allProjects: (state) => state.projects,
  selectedProject: (state) => state.selectedProject,
  isLoading: (state) => state.loading,
  error: (state) => state.error
};

// Actions
const actions = {
  async fetchProjects({ commit }) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      // For now, we'll use a placeholder that will be replaced with actual IPC calls
      const projectsData = window.electron ? await window.electron.getProjects() : [];
      const projects = projectsData.map(data => new Project(data));
      
      commit('setProjects', projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      commit('setError', 'Failed to load projects');
    } finally {
      commit('setLoading', false);
    }
  },
  
  selectProject({ commit }, project) {
    commit('setSelectedProject', project);
  },
  
  async addProject({ commit, dispatch }, projectData) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      const project = new Project(projectData);
      
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.addProject(project.toDatabase()) : false;
      
      if (success) {
        // Refresh the projects list
        dispatch('fetchProjects');
      } else {
        commit('setError', 'Failed to add project');
      }
    } catch (error) {
      console.error('Error adding project:', error);
      commit('setError', 'Failed to add project');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async updateProject({ commit, dispatch }, project) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.updateProject(project.toDatabase()) : false;
      
      if (success) {
        // Refresh the projects list
        dispatch('fetchProjects');
      } else {
        commit('setError', 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      commit('setError', 'Failed to update project');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async deleteProject({ commit, dispatch }, projectId) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.deleteProject(projectId) : false;
      
      if (success) {
        // Refresh the projects list
        dispatch('fetchProjects');
      } else {
        commit('setError', 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      commit('setError', 'Failed to delete project');
    } finally {
      commit('setLoading', false);
    }
  }
};

// Mutations
const mutations = {
  setProjects(state, projects) {
    state.projects = projects;
  },
  setSelectedProject(state, project) {
    state.selectedProject = project;
  },
  setLoading(state, loading) {
    state.loading = loading;
  },
  setError(state, error) {
    state.error = error;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}; 