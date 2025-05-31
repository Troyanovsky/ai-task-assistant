Issues:
- Check when we delte tasks, related notifications are deleted; when we delete projects, related tasks are deleted.
- when we pass planned time for tasks, notification time for notifications to the AI, we only pass local time to the AI, not the ISO time saved in our database.
- Modify query projects/tasks/notifications (and schemas exposed to AI) for flexible filtering and handling optional paramters with default values.
    - query functions should be flexible with params for task/proj/notifications.
    - Pay attention to AI created tasks & their notifications.
- Can we detect if users have turned on system notification? Especially on Mac, I have to go to system settings and turn on notifications for Electron to see my app's notifciations when i npm run electron:dev.
- Handle UI display when planned time is later than due date. Handle UI display when current time has passed planned time but task is still not done. Handle past due items that are not done. 
- P1: When creating or editing a task, user should be able to pick dependency (dropdown of other tasks with checkbox), which means this task should be organized after the dependencies are done (dependencies are pre-reqs)
- P1: Recurrence is not implemented. (Need to design recurrence logic & UI)
