# FokusZeit - AI Task Assistant

FokusZeit is an intelligent application to manage to-do items and calendars by offloading task creation, editing, and planning to an LLM. Supports OpenAI compatible APIs.

## Project Setup

```bash
# Install dependencies
cd app
npm install

# Run Electron in development mode
npm run electron:dev

# Build Electron application
npm run electron:build
```

## How to use AI features
- In settings, set up base URL, API key, and model. Both hosted LLM API and local LLM API like LMStudio are supported.
- Chat with AI to view/edit/update/delete projects/tasks/notifications in natural language.

### Example LMStudio AI config
API key: lm-studio
API URL: http://localhost:1234/v1/chat/completions
Model name: qwen/qwen3-4b

## Features

### MVP
- Task Management with basic CRUD operations for tasks/projects
- Project-based task grouping
- AI-accessible task & project management API
- Notifications

### V1 Features (Planned)
- Calendar-based UI for tasks/days
- Voice input for AI interaction
- Enhanced AI features like task breakdown
- Other notifications: email
- Keyboard shortcut 
- Default list: Input/Backlog
- Daily progress bar
- Dragging tasks

### Future Features
- Advanced Settings
  - Time zone
  - Time format
  - Start of week
  - Daily workload
  - Daily working time
  - Hide/show completed tasks
  - Light/Dark mode switches
  - Scheduling gap configuration
  - i18n support
  - Alert settings
- Productivity Rituals
  - Daily planning time
  - Daily review time
  - Weekly planning time
  - Weekly review time
- Focus mode with time tracking
- Third-party integrations
