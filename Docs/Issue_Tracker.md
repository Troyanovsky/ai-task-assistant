Functionality Issues:
- Modify query projects/tasks/notifications (and schemas exposed to AI) for flexible filtering and handling optional paramters with default values.
    - Pay attention to AI created tasks & their notifications.
- Check can we detect if users have turned on system notification? Especially on Mac, I have to go to system settings and turn on notifications for Electron to see my app's notifciations when i npm run electron:dev.
- P1: When creating or editing a task, user should be able to pick dependency (dropdown of other tasks with checkbox), which means this task should be organized after the dependencies are done (dependencies are pre-reqs)
- P1: Recurrence is not implemented. (Need to design recurrence logic & UI)

UI issues:

