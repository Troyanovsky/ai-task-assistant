Functionality Issues:
1. Project editing doesn't work. When I click the pencil icon next to the project, nothing happens. 
2. When editing and updating a previously created task, failed to update task:
```
tasks.js:175 Error updating task: TypeError: task.toDatabase is not a function
    at Store2.updateTask (tasks.js:151:27)
    at updateTask (TaskList.vue:157:19)
    at Proxy.saveTask (TaskForm.vue:157:7)
updateTask	@	tasks.js:175
updateTask	@	TaskList.vue:157
saveTask	@	TaskForm.vue:157
(anonymous)	@	TaskForm.vue:4

```
3. Users should be able to move tasks between projects.
4. When creating or editing a task, user should be able to pick dependency (dropdown of other tasks with checkbox), which means this task should be done after the dependencies are done (dependencies are pre-reqs)
5. Recurrence is not implemented.

UI issues:
1. Due Date date picker icon is transparent/white and cannot be seen.
2. The contrast for Cancel button in task creation is off, gray text on dark background doesn't work.
3. The interface has a dark margin within the electron window, which is weird.
4. The button styling is off on Windows, having white background for button and white text.
5. When adding project, the cancel button goes outside of the card.
6. When the project has a long name, edit button and delete button gets pushed out of the card.
7. The task item status check box is all black, can't see if it's checked or not.