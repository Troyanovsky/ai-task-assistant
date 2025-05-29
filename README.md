# AI Task Assistant

An intelligent application to manage to-do items and calendars by offloading task creation, editing, and planning to AI.

## Project Setup

```bash
# Install dependencies
npm install
cd app
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run Electron in development mode
npm run electron:dev

# Build Electron application
npm run electron:build
```

## How to use AI features
- In settings, set up base URL, API key, and model
- Chat with AI to view/edit/update/delete projects/tasks in natural language.

## Features

### MVP
- Task Management with basic CRUD operations for tasks/projects
- Project-based task grouping
- AI-accessible task & project management API
- Notifications

### V1 Features (Planned)
- Calendar-based UI for tasks/days
- Voice input for AI interaction
- Enhanced AI features
  - Task breakdown
  - Time estimation
- Other notifications: email
- Keyboard shortcut buttons
- Default list: Input/Backlog
- Planned date for tasks
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

## Development

This project is developed in phases as outlined in the Implementation Plan document.

### Current Status
- Phase 0: Project Setup and Infrastructure - Completed
- Phase 1: Core Data Layer - Completed
- Phase 2: Basic UI Components - Completed
- Phase 3: State Management and Integration - Completed
- Phase 4: MVP AI Integration - Completed
- Phase 5: Notification System - Not Started
