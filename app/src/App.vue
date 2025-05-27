<template>
  <div class="app">
    <app-header>
      <template v-slot:navigation>
        <router-link to="/" class="mr-4 hover:text-gray-300">Home</router-link>
        <router-link to="/settings" class="hover:text-gray-300">Settings</router-link>
      </template>
    </app-header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script>
import AppHeader from './components/layout/AppHeader.vue';

export default {
  name: 'App',
  components: {
    AppHeader
  }
};
</script>

<style>
/* Global styles */
body {
  font-family: 'Inter', sans-serif;
  color: #333;
  line-height: 1.6;
}
</style>
