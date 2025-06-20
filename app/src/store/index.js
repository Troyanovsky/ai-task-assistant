import { createStore } from 'vuex';

// Import modules
import projects from './modules/projects';
import tasks from './modules/tasks';
import ai from './modules/ai';
import preferences from './modules/preferences';
import recurrence from './modules/recurrence';

export default createStore({
  modules: {
    projects,
    tasks,
    ai,
    preferences,
    recurrence,
  },
});
