import { describe, it, expect, vi, beforeEach } from 'vitest';
import projectManager from '../project.js';
import databaseService from '../database.js';
import Project from '../../models/Project.js';

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

// Mock the Project model
vi.mock('../../models/Project.js', () => {
  const mockProject = {
    fromDatabase: vi.fn(data => ({
      ...data,
      validate: () => true,
      toDatabase: () => data
    })),
    validate: vi.fn(() => true),
    toDatabase: vi.fn(function() {
      return this;
    })
  };
  
  return {
    default: mockProject
  };
});

describe('ProjectManager', () => {
  const mockProjects = [
    { 
      id: 'project-1', 
      name: 'Project 1', 
      description: 'Description 1',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    },
    { 
      id: 'project-2', 
      name: 'Project 2', 
      description: 'Description 2',
      created_at: '2023-01-02T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z'
    }
  ];

  const mockProject = {
    id: 'project-3',
    name: 'Project 3',
    description: 'Description 3',
    created_at: '2023-01-03T00:00:00.000Z',
    updated_at: '2023-01-03T00:00:00.000Z',
    validate: () => true,
    toDatabase: () => ({
      id: 'project-3',
      name: 'Project 3',
      description: 'Description 3',
      created_at: '2023-01-03T00:00:00.000Z',
      updated_at: '2023-01-03T00:00:00.000Z'
    })
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getProjects', () => {
    it('should return an array of projects', async () => {
      databaseService.query.mockReturnValue(mockProjects);
      Project.fromDatabase.mockImplementation(data => ({
        ...data,
        validate: () => true,
        toDatabase: () => data
      }));

      const result = await projectManager.getProjects();
      
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM projects ORDER BY created_at DESC'
      );
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('project-1');
      expect(result[1].id).toBe('project-2');
    });

    it('should return an empty array if there is an error', async () => {
      databaseService.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.getProjects();
      
      expect(result).toEqual([]);
    });
  });

  describe('getProjectById', () => {
    it('should return a project when found', async () => {
      databaseService.queryOne.mockReturnValue(mockProjects[0]);
      Project.fromDatabase.mockImplementation(data => ({
        ...data,
        validate: () => true,
        toDatabase: () => data
      }));

      const result = await projectManager.getProjectById('project-1');
      
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM projects WHERE id = ?',
        ['project-1']
      );
      expect(result.id).toBe('project-1');
    });

    it('should return null when project is not found', async () => {
      databaseService.queryOne.mockReturnValue(null);

      const result = await projectManager.getProjectById('non-existent');
      
      expect(result).toBeNull();
    });

    it('should return null if there is an error', async () => {
      databaseService.queryOne.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.getProjectById('project-1');
      
      expect(result).toBeNull();
    });
  });

  describe('addProject', () => {
    it('should add a project successfully', async () => {
      databaseService.insert.mockReturnValue({ changes: 1 });

      const result = await projectManager.addProject(mockProject);
      
      expect(databaseService.insert).toHaveBeenCalledWith(
        'INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [
          mockProject.id,
          mockProject.name,
          mockProject.description,
          mockProject.created_at,
          mockProject.updated_at
        ]
      );
      expect(result).toBe(true);
    });

    it('should return false if validation fails', async () => {
      const invalidProject = {
        ...mockProject,
        validate: () => false
      };

      const result = await projectManager.addProject(invalidProject);
      
      expect(databaseService.insert).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if there is an error', async () => {
      databaseService.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.addProject(mockProject);
      
      expect(result).toBe(false);
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      databaseService.update.mockReturnValue({ changes: 1 });

      const result = await projectManager.updateProject(mockProject);
      
      expect(databaseService.update).toHaveBeenCalledWith(
        'UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?',
        [
          mockProject.name,
          mockProject.description,
          mockProject.updated_at,
          mockProject.id
        ]
      );
      expect(result).toBe(true);
    });

    it('should return false if validation fails', async () => {
      const invalidProject = {
        ...mockProject,
        validate: () => false
      };

      const result = await projectManager.updateProject(invalidProject);
      
      expect(databaseService.update).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if there is an error', async () => {
      databaseService.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.updateProject(mockProject);
      
      expect(result).toBe(false);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      databaseService.delete.mockReturnValue({ changes: 1 });

      const result = await projectManager.deleteProject('project-1');
      
      expect(databaseService.delete).toHaveBeenCalledWith(
        'DELETE FROM projects WHERE id = ?',
        ['project-1']
      );
      expect(result).toBe(true);
    });

    it('should return false if there is an error', async () => {
      databaseService.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.deleteProject('project-1');
      
      expect(result).toBe(false);
    });
  });

  describe('getProjectCount', () => {
    it('should return the correct project count', async () => {
      databaseService.queryOne.mockReturnValue({ count: 5 });

      const result = await projectManager.getProjectCount();
      
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM projects'
      );
      expect(result).toBe(5);
    });

    it('should return 0 if no result is returned', async () => {
      databaseService.queryOne.mockReturnValue(null);

      const result = await projectManager.getProjectCount();
      
      expect(result).toBe(0);
    });

    it('should return 0 if there is an error', async () => {
      databaseService.queryOne.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.getProjectCount();
      
      expect(result).toBe(0);
    });
  });

  describe('searchProjects', () => {
    it('should return projects matching the search query', async () => {
      databaseService.query.mockReturnValue(mockProjects);
      Project.fromDatabase.mockImplementation(data => ({
        ...data,
        validate: () => true,
        toDatabase: () => data
      }));

      const result = await projectManager.searchProjects('Project');
      
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT * FROM projects WHERE name LIKE ? ORDER BY created_at DESC',
        ['%Project%']
      );
      expect(result.length).toBe(2);
    });

    it('should return an empty array if there is an error', async () => {
      databaseService.query.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await projectManager.searchProjects('Project');
      
      expect(result).toEqual([]);
    });
  });
}); 