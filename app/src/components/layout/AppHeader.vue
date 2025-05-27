<template>
  <header class="bg-gray-800 text-white p-4 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
      <div class="flex items-center">
        <h1 class="text-xl font-bold">{{ title }}</h1>
      </div>
      <nav>
        <slot name="navigation"></slot>
      </nav>
    </div>
  </header>
</template>

<script>
export default {
  name: 'AppHeader',
  props: {
    title: {
      type: String,
      default: 'AI Task Assistant'
    }
  }
};
</script> 