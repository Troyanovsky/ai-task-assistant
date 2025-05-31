/**
 * Function schemas for AI function calling
 */
export const functionSchemas = [
  {
    type: "function",
    function: {
      name: "addTask",
      description: "Add a new task to the system",
      parameters: {
        type: "object",
        properties: {
          name: { 
            type: "string",
            description: "The name/title of the task"
          },
          description: { 
            type: "string",
            description: "A detailed description of the task"
          },
          duration: { 
            type: "number",
            description: "Estimated duration in minutes"
          },
          dueDate: { 
            type: "string", 
            format: "date-time",
            description: "Due date for the task. Provide in a standard format like 'YYYY-MM-DD', '5/31/2023', or 'May 31, 2023'. The system will convert to proper format."
          },
          projectId: { 
            type: "string",
            description: "ID of the project this task belongs to"
          },
          priority: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "Priority level of the task"
          },
          status: { 
            type: "string", 
            enum: ["planning", "doing", "done"],
            description: "Current status of the task"
          },
          labels: { 
            type: "array",
            items: { type: "string" },
            description: "Labels/tags for the task"
          }
        },
        required: ["name", "projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description: "Update an existing task",
      parameters: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "ID of the task to update"
          },
          name: { 
            type: "string",
            description: "The name/title of the task"
          },
          description: { 
            type: "string",
            description: "A detailed description of the task"
          },
          duration: { 
            type: "number",
            description: "Estimated duration in minutes"
          },
          dueDate: { 
            type: "string", 
            format: "date-time",
            description: "Due date for the task. Provide in a standard format like 'YYYY-MM-DD', '5/31/2023', or 'May 31, 2023'. The system will convert to proper format."
          },
          projectId: { 
            type: "string",
            description: "ID of the project this task belongs to"
          },
          priority: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "Priority level of the task"
          },
          status: { 
            type: "string", 
            enum: ["planning", "doing", "done"],
            description: "Current status of the task"
          },
          labels: { 
            type: "array",
            items: { type: "string" },
            description: "Labels/tags for the task"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteTask",
      description: "Delete a task",
      parameters: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "ID of the task to delete"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTasks",
      description: "Get tasks with optional filtering",
      parameters: {
        type: "object",
        properties: {
          projectId: { 
            type: "string",
            description: "Filter tasks by project ID"
          },
          status: { 
            type: "string", 
            enum: ["planning", "doing", "done"],
            description: "Filter tasks by status"
          },
          priority: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "Filter tasks by priority"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getProjects",
      description: "Get all projects",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addProject",
      description: "Add a new project",
      parameters: {
        type: "object",
        properties: {
          name: { 
            type: "string",
            description: "The name of the project"
          },
          description: { 
            type: "string",
            description: "A description of the project"
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateProject",
      description: "Update an existing project",
      parameters: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "ID of the project to update"
          },
          name: { 
            type: "string",
            description: "The name of the project"
          },
          description: { 
            type: "string",
            description: "A description of the project"
          }
        },
        required: ["id", "name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteProject",
      description: "Delete a project",
      parameters: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "ID of the project to delete"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addNotification",
      description: "Add a new notification for a task",
      parameters: {
        type: "object",
        properties: {
          taskId: { 
            type: "string",
            description: "ID of the task this notification is for"
          },
          time: { 
            type: "string", 
            format: "date-time",
            description: "Time when the notification should trigger. Provide in a standard format like 'YYYY-MM-DD', '5/31/2023 15:30', or 'May 31, 2023 15:30'. The system will convert to proper format."
          },
          type: { 
            type: "string", 
            enum: ["reminder", "due_date", "status_change", "PLANNED_TIME"],
            description: "Type of notification"
          },
          message: { 
            type: "string",
            description: "Custom message for the notification (optional, a default will be used if not provided)"
          }
        },
        required: ["taskId", "time", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateNotification",
      description: "Update an existing notification",
      parameters: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "ID of the notification to update"
          },
          taskId: { 
            type: "string",
            description: "ID of the task this notification is for"
          },
          time: { 
            type: "string", 
            format: "date-time",
            description: "Time when the notification should trigger. Provide in a standard format like '5/31/2023 15:30', or 'May 31, 2023 15:30'. The system will convert to proper format."
          },
          type: { 
            type: "string", 
            enum: ["reminder", "due_date", "status_change", "PLANNED_TIME"],
            description: "Type of notification"
          },
          message: { 
            type: "string",
            description: "Custom message for the notification"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteNotification",
      description: "Delete a notification",
      parameters: {
        type: "object",
        properties: {
          id: { 
            type: "string",
            description: "ID of the notification to delete"
          }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getNotificationsByTask",
      description: "Get all notifications for a specific task",
      parameters: {
        type: "object",
        properties: {
          taskId: { 
            type: "string",
            description: "ID of the task to get notifications for"
          }
        },
        required: ["taskId"]
      }
    }
  }
];

export default functionSchemas; 