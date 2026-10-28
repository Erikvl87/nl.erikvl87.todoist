'use strict';

const MAX_CONTENT_LENGTH = 500;
const MAX_DUE_STRING_LENGTH = 100;

// Quick Add tokens that pick a project or section. When present they win over the widget pickers.
const PROJECT_TOKEN = /(^|\s)#\S/;
const SECTION_TOKEN = /(^|\s)\/\S/;

// Homey language codes mapped to the languages Todoist can parse due strings in.
const DUE_LANGUAGES = {
  en: 'en', nl: 'nl', de: 'de', fr: 'fr', it: 'it', es: 'es', sv: 'sv', da: 'da',
  no: 'nb', ru: 'ru', pl: 'pl', ko: 'ko',
};

/**
 * Creates a task from a dashboard widget request.
 * @param {object} args
 * @param {import('homey')} args.homey
 * @param {import('./TodoistClient').TodoistClient} args.client
 * @param {{content: string, projectId?: string, sectionId?: string, priority?: number, dueString?: string, quickAdd?: boolean}} args.body
 * @return {Promise<object>} The created Todoist task.
 */
async function createWidgetTask({ homey, client, body }) {
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) throw new Error('Task name is required');
  if (content.length > MAX_CONTENT_LENGTH) throw new Error(`Task name is longer than ${MAX_CONTENT_LENGTH} characters`);

  const projectId = body.projectId ? String(body.projectId) : undefined;
  const sectionId = body.sectionId ? String(body.sectionId) : undefined;

  if (body.quickAdd) {
    return quickAdd({ client, content, projectId, sectionId });
  }

  const priority = Number(body.priority);
  const dueString = typeof body.dueString === 'string'
    ? body.dueString.trim().slice(0, MAX_DUE_STRING_LENGTH)
    : '';

  return client.createTask({
    content,
    project_id: projectId,
    section_id: sectionId,
    priority: [1, 2, 3, 4].includes(priority) ? priority : undefined,
    due_string: dueString || undefined,
    due_lang: dueString ? DUE_LANGUAGES[homey.i18n.getLanguage()] : undefined,
  });
}

/**
 * Creates the task through Todoist Quick Add, then moves it to the chosen project and section
 * unless the text already picked them with #project or /section.
 */
async function quickAdd({ client, content, projectId, sectionId }) {
  const task = await client.quickAddTask({ text: content });

  if (PROJECT_TOKEN.test(content)) return task;

  if (sectionId && !SECTION_TOKEN.test(content)) {
    if (task.section_id === sectionId) return task;
    return client.moveTask(task.id, { section_id: sectionId });
  }

  if (projectId && task.project_id !== projectId) {
    return client.moveTask(task.id, { project_id: projectId });
  }

  return task;
}

module.exports = { createWidgetTask };
