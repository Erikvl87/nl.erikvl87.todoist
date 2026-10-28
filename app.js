'use strict';

const Homey = require('homey');
const { OAuth2App } = require('homey-oauth2app');
const { TodoistClient } = require('./lib/TodoistClient');
const { getUserDevice } = require('./lib/getUserDevice');
const { listProjects, filterByQuery } = require('./lib/listProjects');

// if (process.env.DEBUG === '1') {
//   require('inspector').open(9229, '0.0.0.0', false);
// }

class App extends OAuth2App {
  // static OAUTH2_CLIENT = TodoistClient; // Default: OAuth2Client
  // static OAUTH2_DEBUG = false; // Default: false
  // static OAUTH2_MULTI_SESSION = true; // Default: false
  // static OAUTH2_DRIVERS = [ 'user' ]; // Default: all drivers

  /**
   * @override
   * @return {Promise<void>}
   */
  async onOAuth2Init() {
    this.log('onOAuth2Init');

    this.enableOAuth2Debug();
    this.setOAuth2Config({
      client: TodoistClient,
      clientId: Homey.env.CLIENT_ID,
      clientSecret: Homey.env.CLIENT_SECRET,
      grantType: 'authorization_code',
      apiUrl: 'https://api.todoist.com',
      tokenUrl: 'https://todoist.com/oauth/access_token',
      authorizationUrl: 'https://todoist.com/oauth/authorize',
      redirectUrl: 'https://callback.athom.com/oauth2/callback',
      scopes: ['data:read_write'],
      allowMultiSession: true,
    });

    this.ids = new Set();
    this.webhook = null;

    const projectWidget = this.homey.dashboards.getWidget('project');
    projectWidget.registerSettingAutocompleteListener('project', (query) => this.onProjectAutocomplete(query));

    const addTaskWidget = this.homey.dashboards.getWidget('add-task');
    addTaskWidget.registerSettingAutocompleteListener('project', (query) => this.onProjectAutocomplete(query));
    addTaskWidget.registerSettingAutocompleteListener('section', (query, settings) =>
      this.onSectionAutocomplete(query, settings)
    );
  }

  async onProjectAutocomplete(query) {
    try {
      const projects = await listProjects({ homey: this.homey });
      return filterByQuery(projects, query);
    } catch (error) {
      this.log('Error fetching projects for autocomplete:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  /**
   * Lists the sections of the project chosen in the same widget's settings.
   * The chosen section remembers its project, so the widget can ignore it after the project changes.
   */
  async onSectionAutocomplete(query, settings) {
    const project = settings?.project;
    if (!project?.id) {
      return [{ id: null, projectId: null, name: this.homey.__('chooseProjectFirst') }];
    }

    try {
      const device = await getUserDevice({ homey: this.homey, userId: project.userId });
      if (device == null) throw new Error('User device not found');

      const sections = await device.oAuth2Client.getSections({ project_id: project.id });
      const results = [
        { id: null, projectId: project.id, name: this.homey.__('noSection') },
        ...sections
          .sort((a, b) => a.section_order - b.section_order)
          .map((section) => ({ id: section.id, projectId: project.id, name: section.name })),
      ];

      return filterByQuery(results, query);
    } catch (error) {
      this.log('Error fetching sections for autocomplete:', error);
      throw new Error('Failed to fetch sections');
    }
  }

  async registerWebhookData({ data }) {
    this.ids.add(String(data.id));
    await this.refreshWebhook();
  }

  async unregisterWebhookData({ data }) {
    this.ids.delete(String(data.id));
    await this.refreshWebhook();
  }

  /**
   * Re-creates the cloud webhook with the current set of user ids as keys.
   * Calls are serialized so devices initializing in parallel don't race.
   */
  refreshWebhook() {
    this.webhookQueue = (this.webhookQueue ?? Promise.resolve())
      .catch(() => {})
      .then(() => this._refreshWebhook());
    return this.webhookQueue;
  }

  async _refreshWebhook() {
    if (this.webhook) {
      await this.webhook.unregister().catch((err) => this.error('Failed to unregister webhook:', err));
      this.webhook = null;
    }

    const ids = [...this.ids];
    if (ids.length === 0) return;

    const id = Homey.env.WEBHOOK_ID;
    const secret = Homey.env.WEBHOOK_SECRET;

    this.webhook = await this.homey.cloud.createWebhook(id, secret, { $keys: ids });

    this.webhook.on('message', async (args) => {
      try {
        const driver = this.homey.drivers.getDriver('user');
        await driver.onWebhookEvent({ body: args.body });
      } catch (err) {
        this.error('Failed to handle webhook event:', err);
      }
    });
  }
}

module.exports = App;
