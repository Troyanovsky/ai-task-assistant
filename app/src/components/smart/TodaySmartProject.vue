<template>
  <smart-project-base project-type="today">
    <template
      #default="{
        tasks,
        allTasks,
        isLoading,
        error,
        showingAllTasks,
        workingHours,
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
      <!-- Progress Bar for Today's Tasks -->
      <today-progress
        v-if="tasks.length > 0"
        :total-tasks="tasks.length"
        :completed-tasks="tasks.filter(task => task.status === 'done').length"
        class="mb-4"
      />

      <!-- Plan My Day Button -->
      <div
        class="p-3 rounded cursor-pointer bg-white border-gray-200 border hover:bg-gray-50 text-center text-blue-500 mb-4"
        @click="planMyDay"
      >
        🗓️ Plan My Day
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
        No tasks due or planned for today.
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

      <!-- Plan Day Result Dialog -->
      <div
        v-if="planningResult"
        class="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
          <plan-day-result
            :result="planningResult"
            :working-hours="workingHours"
            @close="planningResult = null"
          />
        </div>
      </div>
    </template>
  </smart-project-base>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import SmartProjectBase from './SmartProjectBase.vue';
import TodayProgress from './TodayProgress.vue';
import PlanDayResult from './PlanDayResult.vue';
import TaskItem from '../tasks/TaskItem.vue';
import TaskForm from '../tasks/TaskForm.vue';
import logger from '../../services/logger';

export default {
  name: 'TodaySmartProject',
  components: {
    SmartProjectBase,
    TodayProgress,
    PlanDayResult,
    TaskItem,
    TaskForm,
  },
  setup() {
    const store = useStore();
    const planningResult = ref(null);
    const planningInProgress = ref(false);





    const planMyDay = async () => {
      try {
        // Set loading state
        planningInProgress.value = true;

        // Make sure preferences are loaded
        await store.dispatch('preferences/loadPreferences');

        // Call the planMyDay method
        const result = await window.electron.planMyDay();

        // Store the result
        planningResult.value = result;

        // Log the result
        logger.info('Day planning result:', result);
      } catch (error) {
        logger.error('Error planning day:', error);
        planningResult.value = {
          scheduled: [],
          unscheduled: [],
          message: `Error planning day: ${error.message}`,
        };
      } finally {
        planningInProgress.value = false;
      }
    };

    return {
      planningResult,
      planningInProgress,
      planMyDay,
    };
  },
};
</script>
