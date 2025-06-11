import logger from '../../services/logger';

// Initial state
const state = {
  workingHours: {
    startTime: '10:00',
    endTime: '19:00',
  },
  bufferTime: 10,
  loading: false,
  error: null,
};

// Getters
const getters = {
  workingHours: (state) => state.workingHours,
  startTime: (state) => state.workingHours.startTime,
  endTime: (state) => state.workingHours.endTime,
  bufferTime: (state) => state.bufferTime,
  isLoading: (state) => state.loading,
  error: (state) => state.error,
};

// Actions
const actions = {
  async loadPreferences({ commit }) {
    commit('setLoading', true);
    commit('setError', null);

    try {
      const preferences = await window.electron.getPreferences();
      commit('setWorkingHours', preferences.workingHours);
      commit('setBufferTime', preferences.bufferTime);
      return true;
    } catch (error) {
      logger.logError(error, 'Error loading preferences');
      commit('setError', 'Failed to load preferences');
      return false;
    } finally {
      commit('setLoading', false);
    }
  },

  async updateWorkingHours({ commit }, workingHours) {
    commit('setLoading', true);
    commit('setError', null);

    try {
      const success = await window.electron.updateWorkingHours(workingHours);

      if (success) {
        commit('setWorkingHours', workingHours);
        return true;
      } else {
        throw new Error('Failed to update working hours');
      }
    } catch (error) {
      logger.logError(error, 'Error updating working hours');
      commit('setError', 'Failed to update working hours');
      return false;
    } finally {
      commit('setLoading', false);
    }
  },

  async updateBufferTime({ commit }, bufferTime) {
    commit('setLoading', true);
    commit('setError', null);

    try {
      const success = await window.electron.updateBufferTime(bufferTime);

      if (success) {
        commit('setBufferTime', bufferTime);
        return true;
      } else {
        throw new Error('Failed to update buffer time');
      }
    } catch (error) {
      logger.logError(error, 'Error updating buffer time');
      commit('setError', 'Failed to update buffer time');
      return false;
    } finally {
      commit('setLoading', false);
    }
  },
};

// Mutations
const mutations = {
  setWorkingHours(state, workingHours) {
    state.workingHours = workingHours;
  },
  setBufferTime(state, bufferTime) {
    state.bufferTime = bufferTime;
  },
  setLoading(state, loading) {
    state.loading = loading;
  },
  setError(state, error) {
    state.error = error;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
