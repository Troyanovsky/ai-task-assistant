// Initial state
const state = {
  projects: [],
  selectedProject: null,
};

// Getters
const getters = {
  allProjects: (state) => state.projects,
  selectedProject: (state) => state.selectedProject,
};

// Actions
const actions = {
  fetchProjects({ commit }) {
    // This will be implemented in Phase 1 when we have the database
    commit('setProjects', []);
  },
  selectProject({ commit }, project) {
    commit('setSelectedProject', project);
  },
};

// Mutations
const mutations = {
  setProjects(state, projects) {
    state.projects = projects;
  },
  setSelectedProject(state, project) {
    state.selectedProject = project;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}; 