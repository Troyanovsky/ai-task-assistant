<template>
  <div class="app h-screen flex flex-col">
    <main class="flex-1 overflow-hidden">
      <router-view />
    </main>
    <NotificationListener />
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useStore } from 'vuex';
import NotificationListener from './components/layout/NotificationListener.vue';

export default {
  name: 'App',
  components: {
    NotificationListener
  },
  setup() {
    const store = useStore();
    
    onMounted(() => {
      // Initialize data
      store.dispatch('projects/fetchProjects');
      store.dispatch('tasks/fetchTasks');
    });
    
    return {};
  }
};
</script>

<style>
/* Global styles */
body {
  font-family: 'Inter', sans-serif;
  color: #333;
  line-height: 1.6;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
</style>
