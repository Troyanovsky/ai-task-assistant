import { describe, it, expect, vi, beforeEach } from 'vitest';
import taskManager from '../task.js';
import databaseService from '../database.js';
import { Task, STATUS, PRIORITY } from '../../models/Task.js';

// Mock the database service
vi.mock('../database.js', () => ({
  default: {
    query: vi.fn(),
    queryOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock the Task model
vi.mock('../../models/Task.js', () => {
  const STATUS = {
    PLANNING: 'planning',
    DOING: 'doing',
    DONE: 'done'
  };
  
  const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  };
  
  const MockTask = function(data) {
    Object.assign(this, data);
    
    this.validate = vi.fn(() => true);
    this.toDatabase = vi.fn(() => ({
      id: this.id || 'task-123',
      name: this.name || 'Task Name',
      description: this.description || 'Task Description',
      duration: this.duration || 60,
      due_date: this.due_date || '2023-01-01T00:00:00.000Z',
      project_id: this.project_id || this.projectId || 'project-1',
      dependencies: this.dependencies || JSON.stringify([]),
      status: this.status || STATUS.PLANNING,
      labels: this.labels || JSON.stringify([]),
      priority: this.priority || PRIORITY.MEDIUM,
      created_at: this.created_at || '2023-01-01T00:00:00.000Z',
      updated_at: this.updated_at || '2023-01-01T00:00:00.000Z'
    }));
  };
  
  MockTask.fromDatabase = vi.fn(data => new MockTask(data));
  
  return {
    Task: MockTask,
    STATUS,
    PRIORITY
  };
});

// Import the mocked Task class
import { Task } from '../../models/Task.js';

describe('TaskManager', () => {
  const mockTasks = [
    { 
      id: 'task-1', 
      name: 'Task 1', 
      description: 'Description 1',
      duration: 30,
      due_date: '2023-01-01T00:00:00.000Z',
      project_id: 'project-1',
      dependencies: '[]',
      status: STATUS.PLANNING,
      labels: '[]',
      priority: PRIORITY.HIGH,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    },
    { 
      id: 'task-2', 
      name: 'Task 2', 
      description: 'Description 2',
      duration: 60,
      due_date: '2023-01-02T00:00:00.000Z',
      project_id: 'project-1',
      dependencies: '[]',
      status: STATUS.DOING,
      labels: '["important"]',
      priority: PRIORITY.MEDIUM,
      created_at: '2023-01-02T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z'
    }
  ];

  const mockTaskData = {
    name: 'New Task',
    description: 'New Task Description',
    duration: 45,
    due_date: '2023-01-03T00:00:00.000Z',
    project_id: 'project-1',
    status: STATUS.PLANNING,
    priority: PRIORITY.LOW
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTasks', () => {
    it('should return an array of tasks', async () => {
      databaseService.query.mockReturnValue(mockTasks);

      const result = await taskManager.getTasks();
      
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks ORDER BY created_at DESC'
      );
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
    });

    it('should return an empty array if there is an error', async () => {
      databaseService.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.getTasks();
      
      expect(result).toEqual([]);
    });
  });

  describe('getTaskById', () => {
    it('should return a task when found', async () => {
      databaseService.queryOne.mockReturnValue(mockTasks[0]);

      const result = await taskManager.getTaskById('task-1');
      
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE id = ?',
        ['task-1']
      );
      expect(result.id).toBe('task-1');
    });

    it('should return null when task is not found', async () => {
      databaseService.queryOne.mockReturnValue(null);

      const result = await taskManager.getTaskById('non-existent');
      
      expect(result).toBeNull();
    });

    it('should return null if there is an error', async () => {
      databaseService.queryOne.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.getTaskById('task-1');
      
      expect(result).toBeNull();
    });
  });

  describe('getTasksByProject', () => {
    it('should return tasks for a specific project', async () => {
      databaseService.query.mockReturnValue(mockTasks);

      const result = await taskManager.getTasksByProject('project-1');
      
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
        ['project-1']
      );
      expect(result.length).toBe(2);
    });

    it('should return an empty array if there is an error', async () => {
      databaseService.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.getTasksByProject('project-1');
      
      expect(result).toEqual([]);
    });
  });

  describe('addTask', () => {
    it('should add a task successfully', async () => {
      databaseService.insert.mockReturnValue({ changes: 1 });

      const result = await taskManager.addTask(mockTaskData);
      
      expect(databaseService.insert).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle projectId property correctly', async () => {
      databaseService.insert.mockReturnValue({ changes: 1 });
      
      const taskWithProjectId = {
        ...mockTaskData,
        project_id: undefined,
        projectId: 'project-2'
      };

      const result = await taskManager.addTask(taskWithProjectId);
      
      expect(result).toBe(true);
    });

    it('should return false if validation fails', async () => {
      // Mock the Task validate method to return false for this test
      vi.spyOn(Task.prototype, 'validate').mockReturnValue(false);
      
      // Clear the database mock
      databaseService.insert.mockClear();
      
      const result = await taskManager.addTask(mockTaskData);
      
      // Check that the database insert was not called
      expect(databaseService.insert).not.toHaveBeenCalled();
      expect(result).toBe(false);
      
      // Restore the original validate method
      vi.restoreAllMocks();
    });

    it('should return false if there is an error', async () => {
      databaseService.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.addTask(mockTaskData);
      
      expect(result).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      databaseService.update.mockReturnValue({ changes: 1 });
      
      const taskToUpdate = {
        id: 'task-1',
        ...mockTaskData
      };

      const result = await taskManager.updateTask(taskToUpdate);
      
      expect(databaseService.update).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if validation fails', async () => {
      // Mock the Task validate method to return false for this test
      vi.spyOn(Task.prototype, 'validate').mockReturnValue(false);
      
      // Clear the database mock
      databaseService.update.mockClear();
      
      const taskToUpdate = {
        id: 'task-1',
        ...mockTaskData
      };

      const result = await taskManager.updateTask(taskToUpdate);
      
      // Check that the database update was not called
      expect(databaseService.update).not.toHaveBeenCalled();
      expect(result).toBe(false);
      
      // Restore the original validate method
      vi.restoreAllMocks();
    });

    it('should return false if there is an error', async () => {
      databaseService.update.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      const taskToUpdate = {
        id: 'task-1',
        ...mockTaskData
      };

      const result = await taskManager.updateTask(taskToUpdate);
      
      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      databaseService.delete.mockReturnValue({ changes: 1 });

      const result = await taskManager.deleteTask('task-1');
      
      expect(databaseService.delete).toHaveBeenCalledWith(
        'DELETE FROM tasks WHERE id = ?',
        ['task-1']
      );
      expect(result).toBe(true);
    });

    it('should return false if there is an error', async () => {
      databaseService.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.deleteTask('task-1');
      
      expect(result).toBe(false);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      databaseService.queryOne.mockReturnValue(mockTasks[0]);
      databaseService.update.mockReturnValue({ changes: 1 });

      const result = await taskManager.updateTaskStatus('task-1', STATUS.DOING);
      
      expect(result).toBe(true);
    });

    it('should return false if status is invalid', async () => {
      const result = await taskManager.updateTaskStatus('task-1', 'invalid-status');
      
      expect(databaseService.queryOne).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if task is not found', async () => {
      databaseService.queryOne.mockReturnValue(null);

      const result = await taskManager.updateTaskStatus('non-existent', STATUS.DOING);
      
      expect(result).toBe(false);
    });

    it('should return false if there is an error', async () => {
      databaseService.queryOne.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.updateTaskStatus('task-1', STATUS.DOING);
      
      expect(result).toBe(false);
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks with the specified status', async () => {
      databaseService.query.mockReturnValue([mockTasks[0]]);

      const result = await taskManager.getTasksByStatus(STATUS.PLANNING);
      
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC',
        [STATUS.PLANNING]
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task-1');
    });

    it('should return an empty array if status is invalid', async () => {
      const result = await taskManager.getTasksByStatus('invalid-status');
      
      expect(databaseService.query).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return an empty array if there is an error', async () => {
      databaseService.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.getTasksByStatus(STATUS.PLANNING);
      
      expect(result).toEqual([]);
    });
  });

  describe('getTasksByPriority', () => {
    it('should return tasks with the specified priority', async () => {
      databaseService.query.mockReturnValue([mockTasks[0]]);

      const result = await taskManager.getTasksByPriority(PRIORITY.HIGH);
      
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE priority = ? ORDER BY created_at DESC',
        [PRIORITY.HIGH]
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('task-1');
    });

    it('should return an empty array if priority is invalid', async () => {
      const result = await taskManager.getTasksByPriority('invalid-priority');
      
      expect(databaseService.query).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return an empty array if there is an error', async () => {
      databaseService.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await taskManager.getTasksByPriority(PRIORITY.HIGH);
      
      expect(result).toEqual([]);
    });
  });
}); 