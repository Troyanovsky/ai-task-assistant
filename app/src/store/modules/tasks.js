// Initial state
const state = {
  tasks: [],
  filteredTasks: [],
  currentFilter: 'all',
};

// Getters
const getters = {
  allTasks: (state) => state.tasks,
  filteredTasks: (state) => state.filteredTasks,
  tasksByProject: (state) => (projectId) => {
    return state.tasks.filter((task) => task.projectId === projectId);
  },
};

// Actions
const actions = {
  fetchTasks({ commit }) {
    // This will be implemented in Phase 1 when we have the database
    commit('setTasks', []);
  },
  filterTasks({ commit, state }, filter) {
    commit('setCurrentFilter', filter);
    
    let filtered = [...state.tasks];
    
    if (filter === 'active') {
      filtered = filtered.filter((task) => task.status !== 'done');
    } else if (filter === 'completed') {
      filtered = filtered.filter((task) => task.status === 'done');
    }
    
    commit('setFilteredTasks', filtered);
  },
};

// Mutations
const mutations = {
  setTasks(state, tasks) {
    state.tasks = tasks;
    state.filteredTasks = tasks;
  },
  setFilteredTasks(state, tasks) {
    state.filteredTasks = tasks;
  },
  setCurrentFilter(state, filter) {
    state.currentFilter = filter;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}; 