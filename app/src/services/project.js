/**
 * Project Service
 * Handles project-related operations
 */

import databaseService from './database.js';
import Project from '../models/Project.js';

// Determine which logger to use based on the environment
let logger;
try {
  // Check if we're in the main process (Node.js environment)
  if (typeof window === 'undefined') {
    // We're in the main process
    logger = require('../../electron-main/logger.js').default;
  } else {
    // We're in the renderer process
    logger = require('./logger.js').default;
  }
} catch (error) {
  // Fallback console logger
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    verbose: console.debug,
    silly: console.debug,
    logError: (error, context = '') => {
      if (error instanceof Error) {
        console.error(`${context}: ${error.message}`, error.stack);
      } else {
        console.error(`${context}: ${error}`);
      }
    }
  };
}

class ProjectManager {
  /**
   * Get all projects
   * @returns {Array} - Array of Project instances
   */
  async getProjects() {
    try {
      const projects = databaseService.query('SELECT * FROM projects ORDER BY created_at DESC');
      return projects.map(project => Project.fromDatabase(project));
    } catch (error) {
      logger.error('Error getting projects:', error);
      return [];
    }
  }

  /**
   * Get a project by ID
   * @param {string} id - Project ID
   * @returns {Project|null} - Project instance or null
   */
  async getProjectById(id) {
    try {
      const project = databaseService.queryOne('SELECT * FROM projects WHERE id = ?', [id]);
      return project ? Project.fromDatabase(project) : null;
    } catch (error) {
      logger.error(`Error getting project ${id}:`, error);
      return null;
    }
  }

  /**
   * Add a new project
   * @param {Project} project - Project instance
   * @returns {boolean} - Success status
   */
  async addProject(project) {
    try {
      if (!project.validate()) {
        logger.error('Invalid project data');
        return false;
      }

      const data = project.toDatabase();
      const result = databaseService.insert(
        'INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [data.id, data.name, data.description, data.created_at, data.updated_at]
      );

      return result && result.changes > 0;
    } catch (error) {
      logger.error('Error adding project:', error);
      return false;
    }
  }

  /**
   * Update an existing project
   * @param {Project} project - Project instance
   * @returns {boolean} - Success status
   */
  async updateProject(project) {
    try {
      if (!project.validate()) {
        logger.error('Invalid project data');
        return false;
      }

      const data = project.toDatabase();
      const result = databaseService.update(
        'UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?',
        [data.name, data.description, data.updated_at, data.id]
      );

      return result && result.changes > 0;
    } catch (error) {
      logger.error(`Error updating project ${project.id}:`, error);
      return false;
    }
  }

  /**
   * Delete a project
   * @param {string} id - Project ID
   * @returns {boolean} - Success status
   */
  async deleteProject(id) {
    try {
      const result = databaseService.delete('DELETE FROM projects WHERE id = ?', [id]);
      return result && result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting project ${id}:`, error);
      return false;
    }
  }

  /**
   * Get project count
   * @returns {number} - Number of projects
   */
  async getProjectCount() {
    try {
      const result = databaseService.queryOne('SELECT COUNT(*) as count FROM projects');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Error getting project count:', error);
      return 0;
    }
  }

  /**
   * Search projects by name
   * @param {string} query - Search query
   * @returns {Array} - Array of Project instances
   */
  async searchProjects(query) {
    try {
      const projects = databaseService.query(
        'SELECT * FROM projects WHERE name LIKE ? ORDER BY created_at DESC',
        [`%${query}%`]
      );
      return projects.map(project => Project.fromDatabase(project));
    } catch (error) {
      logger.error('Error searching projects:', error);
      return [];
    }
  }
}

// Create singleton instance
const projectManager = new ProjectManager();

export default projectManager;