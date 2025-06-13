Issues:
- P1: Current notification halding is done with direct IPC communication and event-based udpates. It supports simple notification functionality but could benefit from a Vuex store for more complex notification state management.
- contextBridge.exposeInMainWorld('api', ...) exposes a generic send/receive with whitelisted channels, which is good practice.
However, contextBridge.exposeInMainWorld('electron', ...) exposes a large number of direct invokers and specific event listeners. This is the predominant way the application communicates. The api object seems underutilized or from an older pattern. Consider consolidating or clarifying the purpose of API.
- notifications:delete IPC handler: Fetching all notifications to find one by ID before deleting is inefficient. notificationService.getNotifications() fetches all notifications. It should ideally fetch just the one: SELECT task_id FROM notifications WHERE id = ?. If notificationService had a getNotificationById method, that would be better.
- Can we detect if users have turned on system notification? Especially on Mac, I have to go to system settings and turn on notifications for Electron to see my app's notifciations when i npm run electron:dev.
- P1: When creating or editing a task, user should be able to pick dependency (dropdown of other tasks with checkbox), which means this task should be organized after the dependencies are done (dependencies are pre-reqs)
- P1: Recurrence is not implemented. (Need to design recurrence logic & UI)

**app/src/services/notification.js:**
- **Electron Notification**: The `ipcMain.emit` calls within `sendNotification` should be reviewed. It's generally recommended to use `webContents.send` for sending messages to the renderer process.
- **Notification Scheduling**: Ensure that the notification scheduling mechanism is robust and handles edge cases like system clock changes or app restarts gracefully.

**app/src/services/project.js:**
- **Error Handling**: Add more specific error handling for database operations.

**app/src/services/task.js:**
- **Data Validation**: Improve data validation for task properties, especially around date and time formats.
- **Circular Dependencies**: Be mindful of potential circular dependencies between `task.js` and `notification.js` when deleting tasks and associated notifications.
