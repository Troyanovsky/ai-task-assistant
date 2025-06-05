<template>
  <div class="task-form">
    <h3 class="text-lg font-medium mb-3">{{ task ? 'Edit Task' : 'Add Task' }}</h3>
    <form @submit.prevent="saveTask">
      <div class="mb-3">
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      <div class="mb-3">
        <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id="description"
          v-model="formData.description"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            id="status"
            v-model="formData.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="planning">Planning</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </div>
        
        <div>
          <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            id="priority"
            v-model="formData.priority"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label for="dueDate" class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            id="dueDate"
            v-model="formData.dueDate"
            type="date"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 date-input"
            :class="{ 
              'border-orange-500 focus:ring-orange-500 focus:border-orange-500': isPlannedTimeAfterDueDate,
              'border-red-500 focus:ring-red-500 focus:border-red-500': isDueDateInPast
            }"
            :min="currentDate"
          />
          <p v-if="isDueDateInPast" class="text-xs mt-1 text-red-500">
            Warning: Due date is in the past
          </p>
        </div>
        
        <div>
          <label for="duration" class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
          <input
            id="duration"
            v-model.number="formData.duration"
            type="number"
            min="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <!-- Planned Time Section -->
      <div class="mb-3">
        <label for="plannedTime" class="block text-sm font-medium text-gray-700 mb-1">Planned Time</label>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <input
              id="plannedDate"
              v-model="formData.plannedDate"
              type="date"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 date-input"
              :class="{ 
                'border-orange-500 focus:ring-orange-500 focus:border-orange-500': isPlannedTimeAfterDueDate,
                'border-red-500 focus:ring-red-500 focus:border-red-500': isPlannedTimeInPast 
              }"
              :min="currentDate"
            />
          </div>
          <div>
            <input
              id="plannedTime"
              v-model="formData.plannedTime"
              type="time"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              :class="{ 
                'border-orange-500 focus:ring-orange-500 focus:border-orange-500': isPlannedTimeAfterDueDate,
                'border-red-500 focus:ring-red-500 focus:border-red-500': isPlannedTimeInPast 
              }"
              :min="formData.plannedDate === currentDate ? currentTime : undefined"
            />
          </div>
        </div>
        <p v-if="formData.plannedDate && formData.plannedTime" class="text-xs mt-1" 
           :class="{
             'text-orange-500': isPlannedTimeAfterDueDate && !isPlannedTimeInPast,
             'text-red-500': isPlannedTimeInPast,
             'text-gray-500': !isPlannedTimeAfterDueDate && !isPlannedTimeInPast
           }">
          <span v-if="isPlannedTimeInPast">Warning: Planned time is in the past</span>
          <span v-else-if="isPlannedTimeAfterDueDate">Warning: Planned time is after due date</span>
          <span v-else>A reminder notification will be automatically set for this time.</span>
        </p>
      </div>
      
      <!-- Notifications Section -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Additional Notifications</label>
          <button 
            type="button" 
            @click="addNewNotification"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Notification
          </button>
        </div>
        
        <div v-if="notifications.length === 0" class="text-sm text-gray-500 italic mb-2">
          No additional notifications set for this task.
        </div>
        
        <div v-else class="space-y-2 mb-3">
          <div 
            v-for="(notification, index) in notifications" 
            :key="notification.id"
            class="flex items-center p-2 rounded-md border border-gray-200 bg-gray-50"
          >
            <div class="flex-1 grid grid-cols-2 gap-2">
              <div>
                <input
                  v-model="notification.date"
                  type="date"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 date-input"
                  :min="currentDate"
                />
              </div>
              <div>
                <input
                  v-model="notification.time"
                  type="time"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  :min="notification.date === currentDate ? currentTime : undefined"
                />
              </div>
            </div>
            <button 
              type="button" 
              @click="removeNotification(index)"
              class="ml-2 text-red-500 hover:text-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {{ task ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { reactive, onMounted, ref, computed } from 'vue';
import { TYPE } from '../../models/Notification';
import { Notification } from '../../models/Notification';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../services/logger';

export default {
  name: 'TaskForm',
  props: {
    task: {
      type: Object,
      default: null
    },
    projectId: {
      type: String,
      required: true
    }
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    // Current date in YYYY-MM-DD format for min date attribute
    const currentDate = computed(() => {
      return new Date().toISOString().split('T')[0];
    });
    
    // Current time in HH:MM format
    const currentTime = computed(() => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });
    
    const formData = reactive({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      dueDate: '',
      duration: 0,
      plannedDate: '',
      plannedTime: '',
      projectId: props.projectId
    });
    
    // Store notifications as an array of objects with date and time properties
    const notifications = ref([]);
    
    // Track notifications to be deleted (existing ones)
    const notificationsToDelete = ref([]);
    
    // Track the planned time notification specifically
    const plannedTimeNotification = ref(null);

    // Check if planned time is after due date
    const isPlannedTimeAfterDueDate = computed(() => {
      // Only validate if both due date and planned time are set
      if (!formData.dueDate || !formData.plannedDate || !formData.plannedTime) {
        return false;
      }
      
      // Create date objects for comparison
      const dueDate = new Date(formData.dueDate);
      dueDate.setHours(23, 59, 59); // End of the due date
      
      // Create planned date time by combining planned date and time
      const [year, month, day] = formData.plannedDate.split('-');
      const [hours, minutes] = formData.plannedTime.split(':');
      
      const plannedDateTime = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1, // Month is 0-indexed
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10)
      );
      
      // Compare dates
      return plannedDateTime > dueDate;
    });
    
    // Check if planned time is in the past
    const isPlannedTimeInPast = computed(() => {
      if (!formData.plannedDate || !formData.plannedTime) {
        return false;
      }
      
      // Create planned datetime
      const [year, month, day] = formData.plannedDate.split('-');
      const [hours, minutes] = formData.plannedTime.split(':');
      
      const plannedDateTime = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10)
      );
      
      // Get current time
      const now = new Date();
      
      // Compare with current time
      return plannedDateTime < now;
    });
    
    // Check if due date is in the past
    const isDueDateInPast = computed(() => {
      if (!formData.dueDate) {
        return false;
      }
      
      // Create due date at beginning of day
      const dueDate = new Date(formData.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Get current date at beginning of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Compare dates (allow today)
      return dueDate < today;
    });

    onMounted(async () => {
      if (props.task) {
        formData.name = props.task.name;
        formData.description = props.task.description || '';
        formData.status = props.task.status;
        formData.priority = props.task.priority;
        formData.duration = props.task.duration !== null ? props.task.duration : 0;
        
        if (props.task.dueDate) {
          // Format date string to YYYY-MM-DD for input field
          const date = new Date(props.task.dueDate);
          formData.dueDate = date.toISOString().split('T')[0];
        }
        
        if (props.task.plannedTime) {
          // Format planned time into date and time fields from UTC to local
          const plannedDateTime = new Date(props.task.plannedTime);
          // Use local date string components to account for timezone differences
          const localDate = plannedDateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
          formData.plannedDate = localDate;
          
          // Format time as HH:MM in local time
          const hours = plannedDateTime.getHours().toString().padStart(2, '0');
          const minutes = plannedDateTime.getMinutes().toString().padStart(2, '0');
          formData.plannedTime = `${hours}:${minutes}`;
          
          logger.info(`Converted UTC plannedTime ${props.task.plannedTime} to local: ${localDate} ${hours}:${minutes}`);
        }
        
        // Fetch existing notifications for the task
        try {
          logger.info(`Fetching notifications for task: ${props.task.id}`);
          const existingNotifications = await window.electron.getNotificationsByTask(props.task.id);
          logger.info('Existing notifications:', existingNotifications);
          
          if (existingNotifications && existingNotifications.length > 0) {
            // Format notifications for the UI
            notifications.value = existingNotifications
              .filter(notification => notification.type !== 'PLANNED_TIME')
              .map(notification => {
                const notificationDate = new Date(notification.time);
                
                // Format date as YYYY-MM-DD
                const date = notificationDate.toISOString().split('T')[0];
                
                // Format time as HH:MM
                const hours = notificationDate.getHours().toString().padStart(2, '0');
                const minutes = notificationDate.getMinutes().toString().padStart(2, '0');
                const time = `${hours}:${minutes}`;
                
                logger.info(`Notification ${notification.id} time: ${notificationDate.toLocaleString()}, formatted as ${date} ${time}`);
                
                return {
                  id: notification.id,
                  date,
                  time,
                  type: notification.type,
                  message: notification.message,
                  isExisting: true
                };
              });
              
            // Check if there's a planned time notification
            const plannedNotification = existingNotifications.find(n => n.type === 'PLANNED_TIME');
            if (plannedNotification) {
              plannedTimeNotification.value = plannedNotification;
            }
            
            logger.info('Formatted notifications for UI:', notifications.value);
          }
        } catch (error) {
          logger.error('Error fetching notifications:', error);
        }
      }
    });

    const addNewNotification = () => {
      // Get current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Default time to 9:00 AM
      const defaultTime = '09:00';
      
      // Add a new notification to the list
      notifications.value.push({
        id: uuidv4(), // Generate a temporary ID
        date: today,
        time: defaultTime,
        type: TYPE.REMINDER,
        message: '',
        isExisting: false
      });
    };
    
    const removeNotification = (index) => {
      const notification = notifications.value[index];
      
      // If it's an existing notification, add it to the list to be deleted
      if (notification.isExisting) {
        notificationsToDelete.value.push(notification.id);
      }
      
      // Remove from the UI list
      notifications.value.splice(index, 1);
    };

    const saveTask = async () => {
      // Check for past dates and confirm with user
      if (isDueDateInPast.value || isPlannedTimeInPast.value) {
        const confirmMessage = [];
        
        if (isDueDateInPast.value) {
          confirmMessage.push("• The due date is in the past");
        }
        
        if (isPlannedTimeInPast.value) {
          confirmMessage.push("• The planned time is in the past");
        }
        
        const shouldContinue = await window.electron.showConfirmDialog(
          "Warning: Date issues detected",
          `The following issues were detected:\n${confirmMessage.join('\n')}\n\nDo you want to continue anyway?`
        );
        
        if (!shouldContinue) {
          return; // User canceled the save operation
        }
      }
      
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        projectId: props.projectId,
        duration: formData.duration !== '' ? Number(formData.duration) : 0
      };
      
      // Set due date if provided - store as YYYY-MM-DD string
      if (formData.dueDate) {
        // Use dueDate directly since it's already in YYYY-MM-DD format from the date input
        taskData.dueDate = formData.dueDate;
      } else {
        taskData.dueDate = null;
      }
      
      // Set planned time if both date and time are provided
      if (formData.plannedDate && formData.plannedTime) {
        // Create a Date object in local time zone
        const [year, month, day] = formData.plannedDate.split('-');
        const [hours, minutes] = formData.plannedTime.split(':');
        
        // Create the date in local time
        const plannedDateTime = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1, // Month is 0-indexed
          parseInt(day, 10),
          parseInt(hours, 10),
          parseInt(minutes, 10)
        );
        
        // Convert to ISO string for storage (automatically converts to UTC)
        taskData.plannedTime = plannedDateTime.toISOString();
        logger.info(`Saving plannedTime: Local ${plannedDateTime.toString()} as UTC ${taskData.plannedTime}`);
      } else {
        taskData.plannedTime = null;
      }
      
      if (props.task) {
        taskData.id = props.task.id;
        taskData.createdAt = props.task.createdAt;
      }
      
      logger.info('Saving task with data:', taskData);
      
      // For existing tasks, we can save notifications immediately
      if (props.task) {
        // Save the task
        emit('save', taskData);
        
        // Process notifications for existing task
        await processNotifications(props.task.id, taskData.name, taskData.plannedTime);
      } else {
        // For new tasks, we need to wait for the task ID
        // Save the task data and store notifications for later
        const pendingNotifications = [...notifications.value];
        
        // Reset form data immediately
        const taskName = taskData.name; // Keep a reference to the task name for notifications
        const plannedTimeValue = taskData.plannedTime; // Keep reference to planned time
        formData.name = '';
        formData.description = '';
        formData.dueDate = '';
        formData.duration = 0;
        formData.plannedDate = '';
        formData.plannedTime = '';
        
        // Clear notifications UI
        notifications.value = [];
        notificationsToDelete.value = [];
        
        // Emit save event with a callback to process notifications
        emit('save', taskData, async (savedTaskId) => {
          if (savedTaskId) {
            logger.info(`Task saved with ID: ${savedTaskId}, now saving notifications`);
            
            // First create planned time notification if set
            if (plannedTimeValue) {
              try {
                const plannedNotificationData = {
                  task_id: savedTaskId,
                  taskId: savedTaskId,
                  time: plannedTimeValue,
                  type: 'PLANNED_TIME',
                  message: `It's time to work on: ${taskName}`
                };
                
                logger.info('Saving planned time notification:', plannedNotificationData);
                
                await window.electron.addNotification(plannedNotificationData);
              } catch (error) {
                logger.error('Error saving planned time notification:', error);
              }
            }
            
            // Process the pending notifications with the new task ID
            for (const notification of pendingNotifications) {
              try {
                // Create notification datetime by combining date and time
                const [year, month, day] = notification.date.split('-');
                const [hours, minutes] = notification.time.split(':');
                
                // Create notification datetime (being careful with month index)
                const notificationDateTime = new Date(
                  parseInt(year, 10),
                  parseInt(month, 10) - 1, // Month is 0-indexed
                  parseInt(day, 10),
                  parseInt(hours, 10),
                  parseInt(minutes, 10)
                );
                
                // Create notification data
                const notificationData = {
                  task_id: savedTaskId,
                  taskId: savedTaskId,
                  time: notificationDateTime,
                  type: TYPE.REMINDER,
                  message: `Reminder for task: ${taskName}`
                };
                
                logger.info('Saving notification for new task:', notificationData);
                
                // Add the new notification
                const success = await window.electron.addNotification(notificationData);
                if (success) {
                  logger.info('Successfully created notification for new task');
                } else {
                  logger.error('Failed to create notification for new task');
                }
              } catch (error) {
                logger.error('Error saving notification for new task:', error);
              }
            }
          }
        });
      }
    };
    
    // Helper function to process notifications for existing tasks
    const processNotifications = async (taskId, taskName, plannedTime) => {
      logger.info(`Processing notifications for task ID: ${taskId}`);
      logger.info(`Notifications to delete: ${notificationsToDelete.value.length}`);
      logger.info(`Notifications to save: ${notifications.value.length}`);
      logger.info(`Planned time: ${plannedTime}`);
      
      // Handle planned time notification
      if (plannedTime) {
        try {
          // Check if we already have a planned time notification
          if (plannedTimeNotification.value) {
            // Update existing planned time notification
            const updateData = {
              id: plannedTimeNotification.value.id,
              task_id: taskId,
              taskId: taskId,
              time: plannedTime,
              type: 'PLANNED_TIME',
              message: `It's time to work on: ${taskName}`
            };
            
            logger.info('Updating planned time notification:', updateData);
            await window.electron.updateNotification(updateData);
          } else {
            // Create new planned time notification
            const notificationData = {
              task_id: taskId,
              taskId: taskId,
              time: plannedTime,
              type: 'PLANNED_TIME',
              message: `It's time to work on: ${taskName}`
            };
            
            logger.info('Creating new planned time notification:', notificationData);
            await window.electron.addNotification(notificationData);
          }
        } catch (error) {
          logger.error('Error handling planned time notification:', error);
        }
      } else if (plannedTimeNotification.value) {
        // If planned time was removed but we had a notification, delete it
        try {
          logger.info(`Deleting planned time notification: ${plannedTimeNotification.value.id}`);
          await window.electron.deleteNotification(plannedTimeNotification.value.id);
        } catch (error) {
          logger.error('Error deleting planned time notification:', error);
        }
      }
      
      // Delete notifications that were removed
      for (const notificationId of notificationsToDelete.value) {
        try {
          logger.info(`Deleting notification: ${notificationId}`);
          const success = await window.electron.deleteNotification(notificationId);
          if (success) {
            logger.info(`Successfully deleted notification: ${notificationId}`);
          } else {
            logger.error(`Failed to delete notification: ${notificationId}`);
          }
        } catch (error) {
          logger.error(`Error deleting notification ${notificationId}:`, error);
        }
      }
      
      // Save all notifications
      for (const notification of notifications.value) {
        try {
          // Create notification datetime by combining date and time
          const [year, month, day] = notification.date.split('-');
          const [hours, minutes] = notification.time.split(':');
          
          // Create notification datetime (being careful with month index)
          const notificationDateTime = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1, // Month is 0-indexed
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10)
          );
          
          logger.info(`Notification date/time: ${notification.date} ${notification.time}`);
          logger.info(`Parsed notification datetime: ${notificationDateTime.toLocaleString()}`);
          
          // Create notification data
          const notificationData = {
            id: notification.isExisting ? notification.id : undefined,
            task_id: taskId,
            taskId: taskId,
            time: notificationDateTime,
            type: TYPE.REMINDER,
            message: `Reminder for task: ${taskName}`
          };
          
          logger.info('Saving notification:', notificationData);
          
          let success = false;
          
          // If it's an existing notification, update it
          if (notification.isExisting) {
            logger.info(`Updating existing notification: ${notification.id}`);
            success = await window.electron.updateNotification(notificationData);
            if (success) {
              logger.info(`Successfully updated notification: ${notification.id}`);
            } else {
              logger.error(`Failed to update notification: ${notification.id}`);
            }
          } else {
            // Otherwise add a new one
            logger.info('Creating new notification');
            success = await window.electron.addNotification(notificationData);
            if (success) {
              logger.info('Successfully created new notification');
            } else {
              logger.error('Failed to create new notification');
            }
          }
        } catch (error) {
          logger.error('Error saving notification:', error);
        }
      }
    };

    return {
      formData,
      notifications,
      currentDate,
      currentTime,
      isPlannedTimeAfterDueDate,
      isPlannedTimeInPast,
      isDueDateInPast,
      addNewNotification,
      removeNotification,
      saveTask
    };
  }
};
</script>

<style>
/* Fix for date picker icon visibility */
.date-input::-webkit-calendar-picker-indicator {
  filter: invert(0.5);
  cursor: pointer;
}
</style>