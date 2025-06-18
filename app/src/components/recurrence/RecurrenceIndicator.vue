<template>
  <span
    v-if="recurrenceRule"
    class="inline-flex items-center text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700"
    :title="recurrenceTooltip"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-3 w-3 mr-1"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    {{ recurrenceText }}
  </span>
</template>

<script>
import { computed, onMounted, ref, onBeforeUnmount } from 'vue';
import { FREQUENCY } from '../../models/RecurrenceRule.js';
import logger from '../../services/logger.js';

export default {
  name: 'RecurrenceIndicator',
  props: {
    taskId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const recurrenceRule = ref(null);

    // Computed text for recurrence display
    const recurrenceText = computed(() => {
      if (!recurrenceRule.value) return '';

      const rule = recurrenceRule.value;
      const frequencyLabels = {
        [FREQUENCY.DAILY]: rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`,
        [FREQUENCY.WEEKLY]: rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`,
        [FREQUENCY.MONTHLY]: rule.interval === 1 ? 'Monthly' : `Every ${rule.interval} months`,
        [FREQUENCY.YEARLY]: rule.interval === 1 ? 'Yearly' : `Every ${rule.interval} years`,
      };

      return frequencyLabels[rule.frequency] || 'Recurring';
    });

    // Computed tooltip with full recurrence details
    const recurrenceTooltip = computed(() => {
      if (!recurrenceRule.value) return '';

      const rule = recurrenceRule.value;
      let tooltip = `Repeats ${recurrenceText.value.toLowerCase()}`;

      if (rule.endDate) {
        const endDate = new Date(rule.endDate);
        tooltip += ` until ${endDate.toLocaleDateString()}`;
      } else if (rule.count) {
        tooltip += ` for ${rule.count} more occurrences`;
      }

      return tooltip;
    });

    // Fetch recurrence rule for the task
    const fetchRecurrenceRule = async () => {
      try {
        const rule = await window.electron.getRecurrenceRuleByTask(props.taskId);
        recurrenceRule.value = rule;
      } catch (error) {
        logger.error('Error fetching recurrence rule:', error);
        recurrenceRule.value = null;
      }
    };

    // Handle recurrence changes
    const handleRecurrenceChange = async (taskId) => {
      if (taskId === props.taskId) {
        await fetchRecurrenceRule();
      }
    };

    // Store reference to the wrapped listener function for proper cleanup
    const wrappedRecurrenceListener = ref(null);

    onMounted(async () => {
      await fetchRecurrenceRule();

      // Listen for recurrence changes
      wrappedRecurrenceListener.value = window.electron.receive(
        'recurrence:changed',
        handleRecurrenceChange
      );
    });

    onBeforeUnmount(() => {
      // Remove the specific recurrence listener
      if (wrappedRecurrenceListener.value) {
        window.electron.removeListener('recurrence:changed', wrappedRecurrenceListener.value);
        wrappedRecurrenceListener.value = null;
      }
    });

    return {
      recurrenceRule,
      recurrenceText,
      recurrenceTooltip,
    };
  },
};
</script>
