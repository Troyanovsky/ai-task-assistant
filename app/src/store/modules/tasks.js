import { Task, STATUS } from '../../models/Task';

// Initial state
const state = {
  tasks: [],
  filteredTasks: [],
  currentFilter: 'all',
  loading: false,
  error: null
};

// Getters
const getters = {
  allTasks: (state) => state.tasks,
  filteredTasks: (state) => state.filteredTasks,
  tasksByProject: (state) => (projectId) => {
    return state.tasks.filter((task) => task.projectId === projectId);
  },
  isLoading: (state) => state.loading,
  error: (state) => state.error
};

// Actions
const actions = {
  async fetchTasks({ commit }) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const tasksData = window.electron ? await window.electron.getTasks() : [];
      const tasks = tasksData.map(data => Task.fromDatabase(data));
      
      commit('setTasks', tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      commit('setError', 'Failed to load tasks');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async fetchTasksByProject({ commit }, projectId) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const tasksData = window.electron ? await window.electron.getTasksByProject(projectId) : [];
      const tasks = tasksData.map(data => Task.fromDatabase(data));
      
      commit('setTasks', tasks);
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      commit('setError', 'Failed to load tasks');
    } finally {
      commit('setLoading', false);
    }
  },
  
  filterTasks({ commit, state }, filter) {
    commit('setCurrentFilter', filter);
    
    let filtered = [...state.tasks];
    
    if (filter === 'active') {
      filtered = filtered.filter((task) => task.status !== STATUS.DONE);
    } else if (filter === 'completed') {
      filtered = filtered.filter((task) => task.status === STATUS.DONE);
    }
    
    commit('setFilteredTasks', filtered);
  },
  
  async addTask({ commit, dispatch }, taskData) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      const task = new Task(taskData);
      
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.addTask(task.toDatabase()) : false;
      
      if (success) {
        // Refresh the tasks list
        if (task.projectId) {
          dispatch('fetchTasksByProject', task.projectId);
        } else {
          dispatch('fetchTasks');
        }
      } else {
        commit('setError', 'Failed to add task');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      commit('setError', 'Failed to add task');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async updateTask({ commit, dispatch }, task) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.updateTask(task.toDatabase()) : false;
      
      if (success) {
        // Refresh the tasks list
        if (task.projectId) {
          dispatch('fetchTasksByProject', task.projectId);
        } else {
          dispatch('fetchTasks');
        }
      } else {
        commit('setError', 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      commit('setError', 'Failed to update task');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async deleteTask({ commit, dispatch }, { taskId, projectId }) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.deleteTask(taskId) : false;
      
      if (success) {
        // Refresh the tasks list
        if (projectId) {
          dispatch('fetchTasksByProject', projectId);
        } else {
          dispatch('fetchTasks');
        }
      } else {
        commit('setError', 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      commit('setError', 'Failed to delete task');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async updateTaskStatus({ commit, dispatch }, { taskId, status, projectId }) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.updateTaskStatus(taskId, status) : false;
      
      if (success) {
        // Refresh the tasks list
        if (projectId) {
          dispatch('fetchTasksByProject', projectId);
        } else {
          dispatch('fetchTasks');
        }
      } else {
        commit('setError', 'Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      commit('setError', 'Failed to update task status');
    } finally {
      commit('setLoading', false);
    }
  }
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