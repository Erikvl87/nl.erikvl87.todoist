'use strict';

const Homey = require('homey');
const { OAuth2App } = require('homey-oauth2app');
const { TodoistClient } = require('./lib/TodoistClient');

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

    const widget = this.homey.dashboards.getWidget('project');
    widget.registerSettingAutocompleteListener('project', async (query) => {
      try {
        const driver = this.homey.drivers.getDriver('user');
        const devices = driver.getDevices();

        if (devices.length === 0) return [];

        const results = await Promise.all(
          devices.map(async (device) => {
            const projects = await device.oAuth2Client.getProjects();
            return projects.map((project) => ({
              id: project.id,
              userId: device.getData().id,
              name: project.name,
              description: device.getName(),
            }));
          })
        ).then((lists) => lists.reduce((all, list) => all.concat(list), []));

        const filteredResults = query
          ? results.filter((result) => {
              const queryParts = query.toLowerCase().split(' ');
              return queryParts.every(
                (part) =>
                  result.name.toLowerCase().includes(part) ||
                  result.description.toLowerCase().includes(part)
              );
            })
          : results;

        return filteredResults;
      } catch (error) {
        this.log('Error fetching projects for autocomplete:', error);
        throw new Error('Failed to fetch projects');
      }
    });
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
