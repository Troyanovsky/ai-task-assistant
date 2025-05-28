<template>
  <div class="app h-screen flex flex-col">
    <main class="flex-1 overflow-hidden">
      <router-view />
    </main>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'App',
  setup() {
    const store = useStore();
    
    onMounted(() => {
      // Start watchers for real-time updates
      store.dispatch('projects/watchProjects');
      store.dispatch('tasks/watchTasks');
    });
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
