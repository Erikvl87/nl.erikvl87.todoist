'use strict';

/**
 * Lists the projects of all connected Todoist user devices.
 * A device that fails (e.g. an expired token) is skipped so the other accounts still show up.
 * @return {Promise<Array<{id: string, userId: string, name: string, description: string}>>}
 */
async function listProjects({ homey }) {
  const driver = homey.drivers.getDriver('user');
  const devices = driver.getDevices();

  const lists = await Promise.all(
    devices.map(async (device) => {
      try {
        const projects = await device.oAuth2Client.getProjects();
        return projects.map((project) => ({
          id: project.id,
          userId: String(device.getData().id),
          name: project.name,
          description: device.getName(),
        }));
      } catch (error) {
        homey.error(`Error fetching projects for ${device.getName()}:`, error);
        return [];
      }
    })
  );

  return lists.flat();
}

/**
 * Filters autocomplete items on every word of the query, matching name or description.
 */
function filterByQuery(items, query) {
  if (!query) return items;

  const queryParts = query.toLowerCase().split(' ');
  return items.filter((item) =>
    queryParts.every(
      (part) =>
        item.name.toLowerCase().includes(part) ||
        (item.description ?? '').toLowerCase().includes(part)
    )
  );
}

module.exports = { listProjects, filterByQuery };
