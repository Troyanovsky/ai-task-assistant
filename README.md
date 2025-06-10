# FokusZeit - AI Task Assistant

![fokuszeit_screenshot](Docs/assets/fokuszeit_screenshot.png)

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
- API key: lm-studio  
- API URL: http://localhost:1234/v1/chat/completions  
- Model name: qwen/qwen3-4b 

### Example OpenAI API config
- API key: your-api-key  
- API URL: 
https://api.openai.com/v1/chat/completions  
- Model name: gpt-4o-mini  

## Features

### MVP
- Task Management with basic CRUD operations for tasks/projects/notifications
- Project-based task grouping with Today and Overdue smart projects
- Notifications
- AI-accessible task, project, and notification  management API
- Chat with AI to manage tasks/projects/notifications
- Automatically plan daily schedule
- Basic settings:
  - AI settings
  - Daily working hours

### V1 Features (Planned)
- UI
  - Calendar-based UI for tasks/days
- UX
  - Voice input for AI interaction
- Functionality
  - Enhanced AI features like task breakdown
- Keyboard shortcut 
- Daily progress bar
- Dragging tasks between projects

### Future Features
- Advanced Settings
  - Time zone
  - Time format
  - Start of week
  - Daily workload
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
- Email notifications
