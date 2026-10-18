'use strict';

const LOOKUP_TIMEOUT = 10000;
const LOOKUP_INTERVAL = 250;

/**
 * Finds the user device for a Todoist user id and waits until it is initialized.
 * Right after an app (re)start, API calls (e.g. from an open dashboard widget) can arrive
 * before the devices exist, so the lookup is retried for a short while.
 * @return {Promise<import('homey').Device|null>}
 */
async function getUserDevice({ homey, userId }) {
  const driver = homey.drivers.getDriver('user');
  await driver.ready();

  const find = () => driver.getDevices()
    .find((device) => String(device.getData().id) === String(userId));

  const deadline = Date.now() + LOOKUP_TIMEOUT;
  let device = find();
  while (!device && Date.now() < deadline) {
    await new Promise((resolve) => homey.setTimeout(resolve, LOOKUP_INTERVAL));
    device = find();
  }

  if (!device) return null;

  await device.ready();
  return device;
}

module.exports = { getUserDevice };
