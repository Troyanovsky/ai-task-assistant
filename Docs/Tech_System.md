# AI Task Assistant - Technical System Design

## 1. Overview

AI Task Assistant is a cross-platform desktop application that helps users manage tasks and calendars with AI assistance. The system is built using Electron for cross-platform compatibility, Vue.js for the frontend framework, and Tailwind CSS for styling.

## 2. High-Level Architecture

```mermaid
flowchart TD
    User[User] <--> UI[UI Layer]
    UI <--> Core[Core Application Layer]
    Core <--> Data[Data Layer]
    Core <--> AI[AI Service Layer]
    Data <--> Storage[(Local Storage)]
    AI <--> LLM[LLM API]
```

### Key Components

1. **UI Layer**: Vue.js components for user interaction
2. **Core Application Layer**: Business logic and application state management
3. **Data Layer**: Data persistence and retrieval
4. **AI Service Layer**: Interface with LLM for task analysis and management
5. **Storage**: Local database for task storage
6. **LLM API**: External AI service integration

## 3. System Architecture

### 3.1 Application Structure

```mermaid
flowchart LR
    Electron[Electron Main Process] <--> Renderer[Electron Renderer Process]
    Renderer --> Vue[Vue Application]
    Vue --> Components[UI Components]
    Vue --> Store[Vuex Store]
    Store <--> Services[Application Services]
    Services <--> DB[Database]
    Services <--> AI[AI Service]
    AI <--> External[External LLM API]
```

### 3.2 Component Architecture

```mermaid
classDiagram
    class Application {
        +initialize()
        +loadProjects()
        +loadTasks()
    }

    class ProjectManager {
        +getProjects()
        +addProject()
        +updateProject()
        +deleteProject()
    }

    class TaskManager {
        +getTasks()
        +addTask()
        +updateTask()
        +deleteTask()
        +getTasksByProject()
        +prioritizeTasks()
    }

    class AIService {
        +processUserInput()
        +generateTaskActions()
        +analyzeTasks()
        +estimateTime()
        +breakdownTasks()
    }

    class NotificationService {
        +scheduleNotification()
        +sendNotification()
        +cancelNotification()
    }

    class DatabaseService {
        +connect()
        +query()
        +insert()
        +update()
        +delete()
    }

    Application --> ProjectManager
    Application --> TaskManager
    TaskManager --> AIService
    TaskManager --> NotificationService
    ProjectManager --> DatabaseService
    TaskManager --> DatabaseService
    AIService --> DatabaseService
```

## 4. Detailed Component Design

### 4.1 Data Models

```mermaid
classDiagram
    class Project {
        +id: string
        +name: string
        +description: string
        +createdAt: Date
        +updatedAt: Date
    }

    class Task {
        +id: string
        +name: string
        +description: string
        +duration: number
        +dueDate: Date
        +projectId: string
        +dependencies: string[]
        +status: enum
        +labels: string[]
        +priority: enum
        +notifications: Notification[]
        +recurrence: RecurrenceRule
        +createdAt: Date
        +updatedAt: Date
    }

    class Notification {
        +id: string
        +taskId: string
        +time: Date
        +type: string
        +message: string
    }

    class RecurrenceRule {
        +frequency: string
        +interval: number
        +endDate: Date
        +count: number
    }

    Project "1" -- "many" Task
    Task "1" -- "many" Notification
    Task "1" -- "0..1" RecurrenceRule
```

### 4.2 UI Components

```mermaid
classDiagram
    class App {
        +render()
    }

    class ProjectsPanel {
        +projects: Project[]
        +selectedProject: Project
        +render()
        +selectProject()
        +createProject()
    }

    class TaskListPanel {
        +tasks: Task[]
        +filteredTasks: Task[]
        +render()
        +filterTasks()
        +sortTasks()
    }

    class AIChatPanel {
        +chatHistory: Message[]
        +render()
        +sendMessage()
        +processResponse()
    }

    class TaskItem {
        +task: Task
        +render()
        +updateStatus()
        +editTask()
        +deleteTask()
    }

    App --> ProjectsPanel
    App --> TaskListPanel
    App --> AIChatPanel
    TaskListPanel --> TaskItem
```

### 4.3 AI Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component
    participant AIService
    participant LLM as LLM API
    participant TaskManager
    participant DB as Database

    User->>UI: Enter natural language input
    UI->>AIService: processUserInput(text)
    AIService->>LLM: callLLMWithFunctions(text, schema)
    LLM-->>AIService: Return function calls
    AIService->>TaskManager: Execute task actions
    TaskManager->>DB: Update task data
    DB-->>TaskManager: Confirm updates
    TaskManager-->>AIService: Return results
    AIService-->>UI: Return processed response
    UI-->>User: Display updated UI and response
```

## 5. Database Design

The application will use a local SQLite database for data persistence.

### 5.1 Schema

```mermaid
erDiagram
    PROJECTS {
        string id PK
        string name
        string description
        datetime created_at
        datetime updated_at
    }

    TASKS {
        string id PK
        string name
        string description
        number duration
        datetime due_date
        string project_id FK
        json dependencies
        string status
        json labels
        string priority
        datetime created_at
        datetime updated_at
    }

    NOTIFICATIONS {
        string id PK
        string task_id FK
        datetime time
        string type
        string message
    }

    RECURRENCE_RULES {
        string id PK
        string task_id FK
        string frequency
        number interval
        datetime end_date
        number count
    }

    PROJECTS ||--o{ TASKS : contains
    TASKS ||--o{ NOTIFICATIONS : has
    TASKS ||--o{ RECURRENCE_RULES : has
```

## 6. Project Structure

```
└── 📁app
    └── 📁.vscode
        └── extensions.json
    └── 📁database
        └── 📁migrations
            └── initial.js
        └── README.md
        └── schema.js
    └── 📁public
        └── vite.svg
    └── 📁src
        └── App.vue
        └── 📁assets
            └── vue.svg
        └── 📁components
            └── 📁ai
                └── ChatBox.vue
                └── ChatInput.vue
                └── ChatMessage.vue
            └── 📁layout
                └── AppSidebar.vue
            └── 📁projects
                └── ProjectForm.vue
                └── ProjectItem.vue
                └── ProjectList.vue
            └── 📁tasks
                └── TaskFilter.vue
                └── TaskForm.vue
                └── TaskItem.vue
                └── TaskList.vue
        └── main.js
        └── 📁models
            └── Notification.js
            └── Project.js
            └── RecurrenceRule.js
            └── Task.js
        └── 📁router
            └── index.js
        └── 📁services
            └── 📁__tests__
                └── ai.test.js
            └── ai.js
            └── database.js
            └── functionSchemas.js
            └── notification.js
            └── project.js
            └── task.js
        └── 📁store
            └── index.js
            └── 📁modules
                └── 📁__tests__
                    └── ai.test.js
                └── ai.js
                └── projects.js
                └── tasks.js
        └── style.css
        └── 📁views
            └── HomeView.vue
            └── SettingsView.vue
    └── 📁electron-main
        └── ipcHandlers.js
        └── aiService.js
    └── .eslintrc.cjs
    └── .eslintrc.js
    └── .prettierrc
    └── electron.js
    └── index.html
    └── package-lock.json
    └── package.json
    └── postcss.config.js
    └── preload.cjs
    └── README.md
    └── tailwind.config.js
    └── vite.config.js
```

## 7. Implementation Details

### 7.1 Technologies

- **Electron**: Cross-platform desktop application framework
- **Vue.js**: Frontend framework
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vuex**: State management
- **SQLite**: Local database for data persistence
- **Electron-Store**: Simple data persistence for application settings
- **Axios**: HTTP client for API requests
- **Day.js**: Date manipulation library
- **Vue Router**: Routing for different views

### 7.2 AI Integration

The application will integrate with an LLM API (such as OpenAI's GPT) using function-calling capabilities:

```mermaid
flowchart TD
    Input[User Input] --> Preprocessing[Input Preprocessing]
    Preprocessing --> LLMRequest[LLM API Request]
    LLMRequest --> FunctionCalling[Function Calling Schema]
    FunctionCalling --> Response[AI Response]
    Response --> ActionExecution[Task Action Execution]
    ActionExecution --> UIUpdate[UI Update]
```

The AI service will define function schemas that match the application's task management API:

```javascript
const functionSchemas = [
  {
    name: "addTask",
    description: "Add a new task",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        duration: { type: "number" },
        dueDate: { type: "string", format: "date-time" },
        projectId: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        // Additional parameters...
      },
      required: ["name", "projectId"]
    }
  },
  // Additional function schemas...
]
```

### 7.3 Task Prioritization

The AI will prioritize tasks based on:

1. Due date proximity
2. User-set priority
3. Dependencies
4. Project importance

The prioritization algorithm will be implemented in the TaskManager service and will be accessible to the AI service.

### 7.4 Notifications

The notification system will use Electron's native notification capabilities:

```mermaid
sequenceDiagram
    participant TaskManager
    participant NotificationService
    participant ElectronNotification
    participant OS as Operating System

    TaskManager->>NotificationService: scheduleNotification(task)
    NotificationService->>NotificationService: calculateNotificationTime(task)
    NotificationService->>ElectronNotification: new Notification(options)
    ElectronNotification->>OS: Show notification
    OS-->>ElectronNotification: User interaction
    ElectronNotification-->>NotificationService: Handle notification action
```

## 8. Future Enhancements (V1)

### 8.1 Calendar Integration

```mermaid
flowchart LR
    Tasks[Task Data] --> Calendar[Calendar View]
    Calendar --> DayView[Day View]
    Calendar --> WeekView[Week View]
    Calendar --> MonthView[Month View]
    Calendar --> TaskScheduling[Task Scheduling]
```

### 8.2 Voice Input

```mermaid
flowchart TD
    VoiceInput[Voice Input] --> SpeechRecognition[Speech Recognition]
    SpeechRecognition --> TextProcessing[Text Processing]
    TextProcessing --> AIService[AI Service]
```

### 8.3 Enhanced AI Features

```mermaid
flowchart TD
    AIService[AI Service] --> TaskBreakdown[Task Breakdown]
    AIService --> TimeEstimation[Time Estimation]
    TaskBreakdown --> SubtaskGeneration[Subtask Generation]
    TimeEstimation --> DurationPrediction[Duration Prediction]
```

## 9. Security Considerations

1. **Data Protection**: All user data will be stored locally and encrypted
2. **API Key Security**: LLM API keys will be securely stored in the system keychain
3. **Input Validation**: All user inputs will be validated before processing
4. **Dependency Management**: Regular updates of dependencies to patch security vulnerabilities

## 10. Performance Considerations

1. **Efficient Rendering**: Optimize Vue components to minimize unnecessary re-renders
2. **Database Indexing**: Properly index the SQLite database for faster queries
3. **Lazy Loading**: Implement lazy loading for components and routes
4. **Caching**: Cache AI responses for similar queries to reduce API calls

## 11. Proposed Modularization of Electron.js

To improve the readability and maintainability of `electron.js`, we propose the following modularization:

### 11.1. New Module Structure

```mermaid
graph LR
    A[electron.js] --> B(ipcHandlers.js);
    A --> C(aiService.js);
    A --> D(preload.cjs);
    subgraph Main Process
        A
        B
        C
    end
    D --> E[Renderer Process];
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style C fill:#ccf,stroke:#333,stroke-width:2px
    style D fill:#ccf,stroke:#333,stroke-width:2px
    style E fill:#ffc,stroke:#333,stroke-width:2px
```

### 11.2. Module Responsibilities

1.  **`electron.js` (Main Process):**
    *   Responsible for creating and managing the main application window.
    *   Handles the application lifecycle events (e.g., `app.on('ready')`, `app.on('window-all-closed')`).
    *   Initializes services (database, notifications).
    *   Orchestrates the application.

2.  **`ipcHandlers.js` (Main Process):**
    *   Contains all `ipcMain.handle` calls for communication between the main process and the renderer process.
    *   Separates handlers by functionality (projects, tasks, AI) to improve organization.

3.  **`aiService.js` (Main Process):**
    *   Contains AI-related functions, including `processWithLLM` and `executeFunctionCall`.
    *   Handles communication with the LLM API.
    *   Manages AI configuration and chat history.

4.  **`preload.cjs` (Preload Script):**
    *   Exposes a safe API to the renderer process using `contextBridge`.
    *   Provides access to project, task, and AI-related methods.

### 11.3. Rationale

This modularization improves readability and maintainability by:

*   Separating concerns into distinct modules.
*   Reducing the size and complexity of `electron.js`.
*   Making it easier to test and update individual modules.
*   Improving the overall structure and organization of the codebase.
