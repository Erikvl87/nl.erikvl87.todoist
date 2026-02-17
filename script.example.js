const app = await Homey.apps.getApp({ id: 'nl.jwienk.todoist' });
const users = await app.get({path: '/users'});

// if you have multiple users pick the right one
const me = users[0];
const userId = me.id;
const user = await app.get({path: `/users/${userId}`});

// should be equal
console.log({
  me,
  user
});

const projects = await app.get({path: `/users/${userId}/projects`});
const firstProject = projects[0] || {};
const project = await app.get({path: `/users/${userId}/projects/${firstProject.id}`});

console.log({
  firstProject,
  project
});

const projectTasks = await app.get({path: `/users/${userId}/projects/${firstProject.id}/tasks`});
const firstProjectTask = projectTasks[0] || {};
const projectTask = await app.get({path: `/users/${userId}/projects/${firstProject.id}/tasks/${firstProjectTask.id}`});

console.log({
  firstProjectTask,
  projectTask
});

const allTasks = await app.get({path: `/users/${userId}/tasks`});
const allTasksFirstTask = allTasks[0] || {};
const task = await app.get({path: `/users/${userId}/tasks/${allTasksFirstTask.id}`});

console.log({
  allTasksFirstTask,
  task
})

// https://developer.todoist.com/rest/v2/?shell#create-a-new-task
const createdTask = await app.post({path: `/users/${userId}/tasks`, body: { content: 'My task' }});
const createdTask2 = await app.post({path: `/users/${userId}/tasks`, body: { content: 'My task2' }});
const createdTask3 = await app.post({path: `/users/${userId}/tasks`, body: { content: 'My task3' }});
// https://developer.todoist.com/rest/v2/?shell#update-a-task
await app.post({path: `/users/${userId}/tasks/${createdTask.id}`, body: { content: 'My updated task' }});

console.log({
  createdTask,
})

// complete/close task
await app.post({path: `/users/${userId}/tasks/${createdTask.id}/close`});
await app.post({path: `/users/${userId}/tasks/${createdTask2.id}/close`});
// reopen task
await app.post({path: `/users/${userId}/tasks/${createdTask.id}/reopen`});

// delete task
await app.delete({path: `/users/${userId}/tasks/${createdTask3.id}`});

await tag('Task ID', createdTask.id);
global.set("taskId", createdTask.id);

// from other script
const taskId = global.get('taskId');
await app.post({path: `/users/${userId}/tasks/${taskId}/close`});
