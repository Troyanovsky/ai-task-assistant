<template>
  <aside class="w-full h-full bg-gray-100 p-4 border-r border-gray-300 overflow-y-auto">
    <div class="sidebar-header mb-4">
      <h2 class="text-xl font-bold">{{ title }}</h2>
      <slot name="header-actions"></slot>
    </div>
    <div class="sidebar-content">
      <slot></slot>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'AppSidebar',
  props: {
    title: {
      type: String,
      required: true
    }
  }
};
</script> 