const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    send: (channel, data) => {
      // whitelist channels
      let validChannels = ['toMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel, func) => {
      let validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    }
  }
);

// Expose project-related methods
contextBridge.exposeInMainWorld(
  'electron', {
    getProjects: () => ipcRenderer.invoke('projects:getAll'),
    addProject: (project) => ipcRenderer.invoke('projects:add', project),
    updateProject: (project) => ipcRenderer.invoke('projects:update', project),
    deleteProject: (projectId) => ipcRenderer.invoke('projects:delete', projectId),
    
    getTasks: () => ipcRenderer.invoke('tasks:getAll'),
    getTasksByProject: (projectId) => ipcRenderer.invoke('tasks:getByProject', projectId),
    addTask: (task) => ipcRenderer.invoke('tasks:add', task),
    updateTask: (task) => ipcRenderer.invoke('tasks:update', task),
    deleteTask: (taskId) => ipcRenderer.invoke('tasks:delete', taskId),
    updateTaskStatus: (taskId, status) => ipcRenderer.invoke('tasks:updateStatus', taskId, status)
  }
);