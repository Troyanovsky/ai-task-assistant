import { Task, STATUS } from '../../models/Task';

// Initial state
const state = {
  tasks: [],
  filteredTasks: [],
  currentFilter: {
    status: 'all',
    priority: 'all',
    search: ''
  },
  loading: false,
  error: null,
  currentProjectTasks: []
};

// Getters
const getters = {
  allTasks: (state) => state.tasks,
  filteredTasks: (state) => state.filteredTasks,
  tasksByProject: (state) => (projectId) => {
    return state.tasks.filter((task) => task.projectId === projectId);
  },
  taskById: (state) => (taskId) => {
    return state.tasks.find((task) => task.id === taskId);
  },
  isLoading: (state) => state.loading,
  error: (state) => state.error,
  currentFilter: (state) => state.currentFilter,
  currentProjectTasks: (state) => state.currentProjectTasks
};

// Actions
const actions = {
  async fetchTasks({ commit, dispatch }) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const tasksData = window.electron ? await window.electron.getTasks() : [];
      const tasks = tasksData.map(data => Task.fromDatabase(data));
      
      commit('setTasks', tasks);
      dispatch('applyFilters');
    } catch (error) {
      console.error('Error fetching tasks:', error);
      commit('setError', 'Failed to load tasks');
    } finally {
      commit('setLoading', false);
    }
  },
  
  async fetchTasksByProject({ commit, dispatch }, projectId) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      // In Electron, we would use IPC to communicate with the main process
      const tasksData = window.electron ? await window.electron.getTasksByProject(projectId) : [];
      console.log(`Fetched ${tasksData.length} tasks for project ${projectId}:`, tasksData);
      const tasks = tasksData.map(data => Task.fromDatabase(data));
      
      commit('setTasks', tasks);
      commit('setCurrentProjectTasks', tasks);
      dispatch('applyFilters');
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      commit('setError', 'Failed to load tasks');
    } finally {
      commit('setLoading', false);
    }
  },
  
  filterTasks({ commit, dispatch }, filter) {
    commit('setCurrentFilter', filter);
    dispatch('applyFilters');
  },
  
  applyFilters({ commit, state }) {
    let filtered = [...state.tasks];
    const filter = state.currentFilter;
    
    // Filter by status
    if (filter.status !== 'all') {
      filtered = filtered.filter((task) => task.status === filter.status);
    }
    
    // Filter by priority
    if (filter.priority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filter.priority);
    }
    
    // Filter by search term
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter(
        task => 
          task.name.toLowerCase().includes(searchTerm) || 
          (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }
    
    commit('setFilteredTasks', filtered);
  },
  
  async addTask({ commit, dispatch }, taskData) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      console.log('Adding task with original data:', taskData);
      
      // Create a Task instance
      const task = new Task(taskData);
      
      // Convert to database format and ensure project_id is set
      const dbData = task.toDatabase();
      
      // Ensure project_id is set correctly
      if (!dbData.project_id && taskData.projectId) {
        dbData.project_id = taskData.projectId;
      }
      
      // Ensure planned_time is set correctly
      if (taskData.plannedTime) {
        dbData.planned_time = typeof taskData.plannedTime === 'string'
          ? taskData.plannedTime
          : taskData.plannedTime.toISOString();
      }
      
      console.log('Task data to be saved:', dbData);
      
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.addTask(dbData) : false;
      
      if (success) {
        console.log('Task added successfully, refreshing tasks for project:', dbData.project_id);
        // Refresh the tasks list
        if (dbData.project_id) {
          dispatch('fetchTasksByProject', dbData.project_id);
        } else {
          dispatch('fetchTasks');
        }
        
        // Return the task data with ID for the callback
        return dbData;
      } else {
        commit('setError', 'Failed to add task');
        return null;
      }
    } catch (error) {
      console.error('Error adding task:', error);
      commit('setError', 'Failed to add task');
      return null;
    } finally {
      commit('setLoading', false);
    }
  },
  
  async updateTask({ commit, dispatch }, task) {
    commit('setLoading', true);
    commit('setError', null);
    
    try {
      console.log('Updating task:', task);
      
      // Ensure we're working with a Task instance
      const taskInstance = task instanceof Task ? task : new Task(task);
      
      // Convert to database format
      const dbData = taskInstance.toDatabase();
      
      // Ensure project_id is set correctly
      if (!dbData.project_id && task.projectId) {
        dbData.project_id = task.projectId;
      }
      
      // Ensure due_date is explicitly set, even if null
      if (task.dueDate !== undefined) {
        // Store date without time component
        if (task.dueDate) {
          const date = new Date(task.dueDate);
          const year = date.getFullYear();
          const month = date.getMonth();
          const day = date.getDate();
          const dateOnly = new Date(year, month, day, 12, 0, 0);
          dbData.due_date = dateOnly.toISOString().split('T')[0] + 'T12:00:00.000Z';
        } else {
          dbData.due_date = null;
        }
      }
      
      // Ensure planned_time is explicitly set, even if null
      if (task.plannedTime !== undefined) {
        dbData.planned_time = task.plannedTime ? new Date(task.plannedTime).toISOString() : null;
      }
      
      console.log('Task data to be updated:', dbData);
      
      // In Electron, we would use IPC to communicate with the main process
      const success = window.electron ? await window.electron.updateTask(dbData) : false;
      
      if (success) {
        console.log('Task updated successfully, refreshing tasks for project:', dbData.project_id);
        // Refresh the tasks list
        if (dbData.project_id) {
          dispatch('fetchTasksByProject', dbData.project_id);
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
      // This will also delete all associated notifications for the task
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
  },
  
  async getTaskById({ commit, getters }, taskId) {
    // First check if the task is already in the state
    let task = getters.taskById(taskId);
    
    if (task) {
      return task;
    }
    
    // If not, fetch all tasks and then find the task
    try {
      commit('setLoading', true);
      const tasks = await window.electron.getTasks();
      commit('setTasks', tasks);
      
      // Find the task in the updated state
      task = tasks.find(t => t.id === taskId);
      return task || null;
    } catch (error) {
      commit('setError', error.message);
      return null;
    } finally {
      commit('setLoading', false);
    }
  },
  
  // Watcher for real-time updates
  watchTasks({ dispatch, state }) {
    // In a real implementation, this would set up a listener
    // for database changes or server-sent events
    
    // For now, just set up a polling mechanism for demo purposes
    const pollInterval = 30000; // 30 seconds
    
    setInterval(() => {
      // Only refresh if there are tasks to avoid unnecessary polling
      if (state.tasks.length > 0) {
        dispatch('fetchTasks');
      }
    }, pollInterval);
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
    state.currentFilter = { ...state.currentFilter, ...filter };
  },
  setLoading(state, loading) {
    state.loading = loading;
  },
  setError(state, error) {
    state.error = error;
  },
  setCurrentProjectTasks(state, tasks) {
    state.currentProjectTasks = tasks;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}; 