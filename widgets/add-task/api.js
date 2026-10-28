'use strict';

const { getUserDevice } = require('../../lib/getUserDevice');
const { listProjects } = require('../../lib/listProjects');
const { createWidgetTask } = require('../../lib/createWidgetTask');

module.exports = {
  async getProjects({ homey }) {
    try {
      return await listProjects({ homey });
    } catch (error) {
      homey.log('Error fetching projects:', error);
      throw error;
    }
  },
  async getSections({ homey, params }) {
    const device = await getUserDevice({ homey, userId: params.userId });
    if (device == null)
      throw new Error('User device not found');

    try {
      const sections = await device.oAuth2Client.getSections({ project_id: params.projectId });
      return sections
        .sort((a, b) => a.section_order - b.section_order)
        .map((section) => ({ id: section.id, name: section.name }));
    } catch (error) {
      homey.log('Error fetching sections:', error);
      throw error;
    }
  },
  async createTask({ homey, params, body }) {
    const device = await getUserDevice({ homey, userId: params.userId });
    if (device == null)
      throw new Error('User device not found');

    try {
      return await createWidgetTask({ homey, client: device.oAuth2Client, body });
    } catch (error) {
      homey.log('Error creating task:', error);
      throw error;
    }
  }
};
