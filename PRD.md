# AI Task Assistant

An intelligent application to manage to-do items and calendars by offloading task creation, editing, and planning to AI.

## MVP

### Task Management
- **Basic CRUD operations**
  - Task attributes: name, description, duration, due date, project, dependencies, status (planning/doing/done), labels (if any), priority (low/mid/high), notifications, recurrence
  - Project-based task grouping: A task must belong to a project.
- **AI-accessible task management API**

### AI Capabilities
- **Agentic AI via LLM function-calling**
  - Add, view, edit, remove tasks
  - Daily/ad-hoc prioritization (urgency-based queue)
- **Notifications**

### UI Components
- Left panel: Projects
- Middle: Text-based task list
- Right panel: AI chatbox

### Usage Flow
- User inputs natural langauge task description in chatbox
- User input is formatted into prompt and sent to LLM
- LLM returns actions for modifying the task list (data) and UI updates based on task list (data).

## V1 Features

- Calendar-based UI
- Voice input
- Enhanced AI features
  - Task breakdown
  - Time estimation
- Other notifications: email