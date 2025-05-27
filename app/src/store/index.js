import { createStore } from 'vuex';

// Import modules
import projects from './modules/projects';
import tasks from './modules/tasks';
import ai from './modules/ai';

export default createStore({
  modules: {
    projects,
    tasks,
    ai,
  },
}); 