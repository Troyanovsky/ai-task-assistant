import { describe, it, expect, vi, beforeEach } from 'vitest';
import preferencesModule from '../preferences.js';

// Mock window object
vi.stubGlobal('window', {
  electron: {
    getPreferences: vi.fn(),
    updateWorkingHours: vi.fn(),
    updateBufferTime: vi.fn(),
  },
});

// Mock logger
vi.mock('../../../services/logger', () => ({
  default: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Preferences Store Module', () => {
  // Mock preferences data
  const mockPreferences = {
    workingHours: {
      startTime: '09:00',
      endTime: '17:00',
    },
    bufferTime: 15,
  };

  // Helper to create a mock commit function
  const createCommit = () => vi.fn();

  // Helper to create mock state
  const createState = () => ({
    workingHours: {
      startTime: '10:00',
      endTime: '19:00',
    },
    bufferTime: 10,
    loading: false,
    error: null,
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Getters', () => {
    it('workingHours should return working hours', () => {
      const state = createState();
      const result = preferencesModule.getters.workingHours(state);
      expect(result).toEqual(state.workingHours);
    });

    it('startTime should return start time', () => {
      const state = createState();
      const result = preferencesModule.getters.startTime(state);
      expect(result).toBe('10:00');
    });

    it('endTime should return end time', () => {
      const state = createState();
      const result = preferencesModule.getters.endTime(state);
      expect(result).toBe('19:00');
    });

    it('isLoading should return the loading state', () => {
      const state = { ...createState(), loading: true };
      const result = preferencesModule.getters.isLoading(state);
      expect(result).toBe(true);
    });

    it('error should return the error state', () => {
      const state = { ...createState(), error: 'Test error' };
      const result = preferencesModule.getters.error(state);
      expect(result).toBe('Test error');
    });
  });

  describe('Actions', () => {
    it('loadPreferences should load preferences and update state', async () => {
      const commit = createCommit();
      window.electron.getPreferences.mockResolvedValue(mockPreferences);

      const result = await preferencesModule.actions.loadPreferences({ commit });

      expect(window.electron.getPreferences).toHaveBeenCalled();
      expect(commit).toHaveBeenCalledWith('setLoading', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      expect(commit).toHaveBeenCalledWith('setWorkingHours', mockPreferences.workingHours);
      expect(commit).toHaveBeenCalledWith('setBufferTime', mockPreferences.bufferTime);
      expect(commit).toHaveBeenCalledWith('setLoading', false);
      expect(result).toBe(true);
    });

    it('loadPreferences should handle errors', async () => {
      const commit = createCommit();
      window.electron.getPreferences.mockRejectedValue(new Error('Test error'));

      const result = await preferencesModule.actions.loadPreferences({ commit });

      expect(window.electron.getPreferences).toHaveBeenCalled();
      expect(commit).toHaveBeenCalledWith('setLoading', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      expect(commit).toHaveBeenCalledWith('setError', 'Failed to load preferences');
      expect(commit).toHaveBeenCalledWith('setLoading', false);
      expect(result).toBe(false);
    });

    it('updateWorkingHours should update working hours and state', async () => {
      const commit = createCommit();
      const workingHours = { startTime: '08:00', endTime: '16:00' };
      window.electron.updateWorkingHours.mockResolvedValue(true);

      const result = await preferencesModule.actions.updateWorkingHours({ commit }, workingHours);

      expect(window.electron.updateWorkingHours).toHaveBeenCalledWith(workingHours);
      expect(commit).toHaveBeenCalledWith('setLoading', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      expect(commit).toHaveBeenCalledWith('setWorkingHours', workingHours);
      expect(commit).toHaveBeenCalledWith('setLoading', false);
      expect(result).toBe(true);
    });

    it('updateWorkingHours should handle errors', async () => {
      const commit = createCommit();
      const workingHours = { startTime: '08:00', endTime: '16:00' };
      window.electron.updateWorkingHours.mockResolvedValue(false);

      const result = await preferencesModule.actions.updateWorkingHours({ commit }, workingHours);

      expect(window.electron.updateWorkingHours).toHaveBeenCalledWith(workingHours);
      expect(commit).toHaveBeenCalledWith('setLoading', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      expect(commit).toHaveBeenCalledWith('setError', 'Failed to update working hours');
      expect(commit).toHaveBeenCalledWith('setLoading', false);
      expect(result).toBe(false);
    });

    it('updateBufferTime should update buffer time and state', async () => {
      const commit = createCommit();
      const bufferTime = 20;
      window.electron.updateBufferTime.mockResolvedValue(true);

      const result = await preferencesModule.actions.updateBufferTime({ commit }, bufferTime);

      expect(window.electron.updateBufferTime).toHaveBeenCalledWith(bufferTime);
      expect(commit).toHaveBeenCalledWith('setLoading', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      expect(commit).toHaveBeenCalledWith('setBufferTime', bufferTime);
      expect(commit).toHaveBeenCalledWith('setLoading', false);
      expect(result).toBe(true);
    });

    it('updateBufferTime should handle errors', async () => {
      const commit = createCommit();
      const bufferTime = 20;
      window.electron.updateBufferTime.mockResolvedValue(false);

      const result = await preferencesModule.actions.updateBufferTime({ commit }, bufferTime);

      expect(window.electron.updateBufferTime).toHaveBeenCalledWith(bufferTime);
      expect(commit).toHaveBeenCalledWith('setLoading', true);
      expect(commit).toHaveBeenCalledWith('setError', null);
      expect(commit).toHaveBeenCalledWith('setError', 'Failed to update buffer time');
      expect(commit).toHaveBeenCalledWith('setLoading', false);
      expect(result).toBe(false);
    });
  });

  describe('Mutations', () => {
    it('setWorkingHours should update working hours', () => {
      const state = createState();
      const workingHours = { startTime: '08:00', endTime: '16:00' };

      preferencesModule.mutations.setWorkingHours(state, workingHours);

      expect(state.workingHours).toEqual(workingHours);
    });

    it('setLoading should update loading state', () => {
      const state = createState();

      preferencesModule.mutations.setLoading(state, true);

      expect(state.loading).toBe(true);
    });

    it('setError should update error state', () => {
      const state = createState();

      preferencesModule.mutations.setError(state, 'Test error');

      expect(state.error).toBe('Test error');
    });

    it('setBufferTime should update buffer time', () => {
      const state = createState();

      preferencesModule.mutations.setBufferTime(state, 25);

      expect(state.bufferTime).toBe(25);
    });
  });
});
