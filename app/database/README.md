# AI Task Assistant Database

This directory contains the database schema and migrations for the AI Task Assistant application.

## Schema

The database schema consists of the following tables:

### Projects

Stores information about projects that tasks belong to.

| Column      | Type    | Description                      |
|-------------|---------|----------------------------------|
| id          | TEXT    | Primary key                      |
| name        | TEXT    | Project name                     |
| description | TEXT    | Project description              |
| created_at  | TEXT    | Creation timestamp (ISO string)  |
| updated_at  | TEXT    | Last update timestamp (ISO string) |

### Tasks

Stores information about tasks.

| Column       | Type    | Description                      |
|--------------|---------|----------------------------------|
| id           | TEXT    | Primary key                      |
| name         | TEXT    | Task name                        |
| description  | TEXT    | Task description                 |
| duration     | INTEGER | Task duration in minutes         |
| due_date     | TEXT    | Due date (ISO string)            |
| planned_time | TEXT    | Planned time (ISO string)        |
| project_id   | TEXT    | Foreign key to projects.id       |
| dependencies | TEXT    | JSON array of task IDs           |
| status       | TEXT    | Task status (planning/doing/done)|
| labels       | TEXT    | JSON array of label strings      |
| priority     | TEXT    | Task priority (low/medium/high)  |
| created_at   | TEXT    | Creation timestamp (ISO string)  |
| updated_at   | TEXT    | Last update timestamp (ISO string) |

### Notifications

Stores information about task notifications.

| Column     | Type    | Description                      |
|------------|---------|----------------------------------|
| id         | TEXT    | Primary key                      |
| task_id    | TEXT    | Foreign key to tasks.id          |
| time       | TEXT    | Notification time (ISO string)   |
| type       | TEXT    | Notification type                |
| message    | TEXT    | Notification message             |
| created_at | TEXT    | Creation timestamp (ISO string)  |

#### Notification Types

The application uses these notification types:

- `REMINDER`: Standard notification reminder for a task
- `PLANNED_TIME`: Notification automatically created when a task's planned time is set

### Recurrence Rules

Stores information about recurring tasks.

| Column     | Type    | Description                      |
|------------|---------|----------------------------------|
| id         | TEXT    | Primary key                      |
| task_id    | TEXT    | Foreign key to tasks.id          |
| frequency  | TEXT    | Recurrence frequency             |
| interval   | INTEGER | Recurrence interval              |
| end_date   | TEXT    | End date (ISO string)            |
| count      | INTEGER | Number of occurrences            |
| created_at | TEXT    | Creation timestamp (ISO string)  |

## Migrations

The `migrations` directory contains database migration scripts that set up and modify the database schema as needed.

- `initial.js`: Creates the initial database tables 