---
title: HomeyScript API
sidebar_position: 4
---

# HomeyScript API

The Todoist app exposes a REST-like API that can be used from [HomeyScript](https://homey.app/en-us/stories/homeyscript/) to interact with your Todoist data programmatically.

## Getting Started

First, get a reference to the Todoist app and retrieve your user:

```javascript
const app = await Homey.apps.getApp({ id: 'nl.jwienk.todoist' });
const users = await app.get({ path: '/users' });

// If you have multiple users, pick the right one
const me = users[0];
const userId = me.id;
```

## API Endpoints

### Users

#### List all users

Returns all connected Todoist user devices.

```javascript
const users = await app.get({ path: '/users' });
// Returns: [{ id: "123456", name: "John Doe" }, ...]
```

#### Get a specific user

```javascript
const user = await app.get({ path: `/users/${userId}` });
// Returns: { id: "123456", name: "John Doe" }
```

### Projects

#### List all projects

Returns all Todoist projects for a user.

```javascript
const projects = await app.get({ path: `/users/${userId}/projects` });
```

#### Get a specific project

```javascript
const project = await app.get({ path: `/users/${userId}/projects/${projectId}` });
```

### Tasks

#### List all tasks

Returns all active tasks for a user.

```javascript
const tasks = await app.get({ path: `/users/${userId}/tasks` });
```

#### List tasks for a project

Returns all tasks within a specific project.

```javascript
const tasks = await app.get({ path: `/users/${userId}/projects/${projectId}/tasks` });
```

#### Get a specific task

```javascript
const task = await app.get({ path: `/users/${userId}/tasks/${taskId}` });
// Or within a project context:
const task = await app.get({ path: `/users/${userId}/projects/${projectId}/tasks/${taskId}` });
```

#### Create a task

Creates a new task. Refer to the [Todoist API documentation](https://developer.todoist.com/api/v1#tag/Tasks/operation/create_task_api_v1_tasks_post) for all available fields.

```javascript
const task = await app.post({
  path: `/users/${userId}/tasks`,
  body: {
    content: 'My new task',
    project_id: projectId,        // optional
    due_string: 'tomorrow at 3pm', // optional
    priority: 4,                   // optional (1=P4, 4=P1)
  }
});
```

#### Update a task

```javascript
await app.post({
  path: `/users/${userId}/tasks/${taskId}`,
  body: { content: 'Updated task content' }
});
```

#### Complete (close) a task

```javascript
await app.post({ path: `/users/${userId}/tasks/${taskId}/close` });
```

#### Reopen a task

```javascript
await app.post({ path: `/users/${userId}/tasks/${taskId}/reopen` });
```

#### Delete a task

```javascript
await app.delete({ path: `/users/${userId}/tasks/${taskId}` });
```

## Full Example

Below is a comprehensive example that demonstrates most of the API operations:

```javascript
const app = await Homey.apps.getApp({ id: 'nl.jwienk.todoist' });
const users = await app.get({ path: '/users' });

const me = users[0];
const userId = me.id;

// Get projects
const projects = await app.get({ path: `/users/${userId}/projects` });
const firstProject = projects[0];
console.log('First project:', firstProject.name);

// Get tasks for the first project
const projectTasks = await app.get({
  path: `/users/${userId}/projects/${firstProject.id}/tasks`
});
console.log('Tasks in project:', projectTasks.length);

// Create a new task
const newTask = await app.post({
  path: `/users/${userId}/tasks`,
  body: { content: 'Task from HomeyScript' }
});
console.log('Created task:', newTask.id);

// Complete the task
await app.post({ path: `/users/${userId}/tasks/${newTask.id}/close` });

// Reopen the task
await app.post({ path: `/users/${userId}/tasks/${newTask.id}/reopen` });

// Delete the task
await app.delete({ path: `/users/${userId}/tasks/${newTask.id}` });
```

## Sharing Data Between Scripts

You can use HomeyScript's global storage to share task IDs between scripts:

```javascript
// In script 1: Create a task and store its ID
const task = await app.post({
  path: `/users/${userId}/tasks`,
  body: { content: 'My task' }
});
global.set('taskId', task.id);

// In script 2: Complete the stored task
const taskId = global.get('taskId');
await app.post({ path: `/users/${userId}/tasks/${taskId}/close` });
```

:::tip

You can also use `await tag('Task ID', task.id)` to make the task ID available as an Insights tag, visible in HomeyScript's output.

:::
