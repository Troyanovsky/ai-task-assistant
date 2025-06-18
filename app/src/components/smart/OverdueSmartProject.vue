<template>
  <smart-project-base project-type="overdue">
    <template
      #default="{
        tasks,
        allTasks,
        isLoading,
        error,
        showingAllTasks,
        editingTask,
        isMissedPlannedTime,
        isTaskBeingEdited,
        getNotificationCount,
        updateTaskStatus,
        updateTask,
        editTask,
        deleteTask,
        moveTask,
        loadAllTasks,
        setEditingTask
      }"
    >
      <!-- Urgency Indicator -->
      <div
        v-if="tasks.length > 0"
        class="p-3 rounded bg-red-50 border-red-200 border text-red-700 text-center mb-4"
      >
        ⚠️ Urgent: {{ tasks.length }} overdue task{{ tasks.length > 1 ? 's' : '' }}
      </div>

      <!-- Reschedule Overdue Tasks Button -->
      <div
        v-if="tasks.length > 0"
        class="p-3 rounded cursor-pointer bg-white border-gray-200 border hover:bg-gray-50 text-center text-blue-500 mb-4"
        @click="rescheduleOverdueTasks"
      >
        📅 Reschedule All To Today
      </div>

      <!-- Tasks List -->
      <div v-if="tasks.length > 0" class="space-y-3">
        <template v-for="task in tasks" :key="task.id">
          <task-item
            v-if="!isTaskBeingEdited(task)"
            :task="task"
            :is-missed-planned-time="isMissedPlannedTime(task)"
            :notification-count="getNotificationCount(task.id)"
            @status-change="updateTaskStatus"
            @edit="editTask"
            @delete="deleteTask"
            @move="moveTask"
          />
        </template>
      </div>
      <div v-else-if="allTasks.length > 0" class="text-gray-500 text-sm mt-2 text-center">
        No overdue tasks. Great job staying on track! 🎉
      </div>
      <div v-else class="text-gray-500 text-sm mt-2 text-center">
        No tasks available. Create some tasks in your projects.
      </div>

      <!-- View All Tasks Button -->
      <div
        v-if="!showingAllTasks"
        class="mt-4 text-center text-gray-600 text-sm cursor-pointer hover:text-gray-800 hover:underline"
        @click="loadAllTasks"
      >
        View All Tasks
      </div>

      <!-- Loading Indicator -->
      <div v-if="isLoading" class="mt-4 text-center">
        <span class="text-gray-500">Loading tasks...</span>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 text-center">
        <span class="text-red-500">{{ error }}</span>
      </div>

      <!-- Task Form Modal -->
      <div
        v-if="editingTask"
        class="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
          <task-form
            :task="editingTask"
            :project-id="editingTask.projectId"
            @save="updateTask"
            @cancel="setEditingTask(null)"
          />
        </div>
      </div>
    </template>
  </smart-project-base>
</template>

<script>
import SmartProjectBase from './SmartProjectBase.vue';
import TaskItem from '../tasks/TaskItem.vue';
import TaskForm from '../tasks/TaskForm.vue';
import logger from '../../services/logger';

export default {
  name: 'OverdueSmartProject',
  components: {
    SmartProjectBase,
    TaskItem,
    TaskForm,
  },
  setup() {



    const rescheduleOverdueTasks = async () => {
      if (confirm('Are you sure you want to reschedule all overdue tasks to today?')) {
        try {
          await window.electron.rescheduleOverdueTasksToToday();
          alert('All overdue tasks have been rescheduled to today!');
        } catch (error) {
          logger.error('Error rescheduling overdue tasks:', error);
          alert('Failed to reschedule overdue tasks. Please try again.');
        }
      }
    };

    return {
      rescheduleOverdueTasks,
    };
  },
};
</script>
