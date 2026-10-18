'use strict';

const { OAuth2Device } = require('homey-oauth2app');

class UserDevice extends OAuth2Device {
  /**
   * @override
   * @return {Promise<void>}
   */
  async onOAuth2Init() {
    this.log('onOAuth2Init');

    const data = this.getData();
    
    const isValid = await this.oAuth2Client.isTokenValid();
    if (!isValid) {
      this.log('OAuth token is invalid');
      await this.homey.notifications.createNotification({
        excerpt: this.homey.__('tokenInvalidTimeline', { name: this.getName() })
      });
      await this.setUnavailable(this.homey.__('tokenInvalid'));
      return;
    }
    this.log('OAuth token is valid');

    // A repair can be completed with a different Todoist account than the one this device was paired with.
    const { user } = await this.oAuth2Client.syncUser();
    if (String(user.id) !== String(data.id)) {
      this.log(`OAuth token belongs to user ${user.id}, but this device is for user ${data.id}`);
      await this.setUnavailable(this.homey.__('accountMismatch'));
      await this.homey.app.unregisterWebhookData({ data });
      return;
    }

    await this.setAvailable();

    await this.homey.app.registerWebhookData({ data });
  }

  /**
   * @override
   * @return {Promise<void>}
   */
  async onOAuth2Deleted() {
    await this.homey.app.unregisterWebhookData({ data: this.getData() });
  }
}

module.exports = UserDevice;
