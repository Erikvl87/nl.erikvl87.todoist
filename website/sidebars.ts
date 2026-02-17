import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'getting-started',
    'flow-cards',
    'widget',
    'homeyscript-api',
    'troubleshooting',
    'changelog',
  ],
};

export default sidebars;
