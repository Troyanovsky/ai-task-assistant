/**
 * Database Service
 * Handles all database operations using better-sqlite3
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import * as initialMigration from '../../database/migrations/initial.js';

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = '';
  }

  /**
   * Initialize the database connection
   * @returns {boolean} - Success status
   */
  async init() {
    try {
      // Determine the database file path
      this.dbPath = path.join(app ? app.getPath('userData') : process.cwd(), 'ai-task-assistant.db');
      
      // Create directory if it doesn't exist
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Connect to the database
      this.db = new Database(this.dbPath, { 
        verbose: console.log,
        fileMustExist: false
      });
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Run migrations
      await this.runMigrations();
      
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing database:', error);
      return false;
    }
  }

  /**
   * Run database migrations
   * @returns {boolean} - Success status
   */
  async runMigrations() {
    try {
      // Run initial migration to create tables
      await initialMigration.up(this.db);
      return true;
    } catch (error) {
      console.error('Error running migrations:', error);
      return false;
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Execute a SQL query with parameters
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Array|Object} - Query results
   */
  query(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query and return the first result
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Object|null} - First result or null
   */
  queryOne(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Execute an insert query
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Object} - Result with lastInsertRowid
   */
  insert(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return result;
    } catch (error) {
      console.error('Error executing insert:', error);
      throw error;
    }
  }

  /**
   * Execute an update query
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Object} - Result with changes count
   */
  update(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return result;
    } catch (error) {
      console.error('Error executing update:', error);
      throw error;
    }
  }

  /**
   * Execute a delete query
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Object} - Result with changes count
   */
  delete(sql, params = {}) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return result;
    } catch (error) {
      console.error('Error executing delete:', error);
      throw error;
    }
  }

  /**
   * Begin a transaction
   * @returns {Object} - Transaction object
   */
  beginTransaction() {
    return this.db.transaction(() => {});
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;