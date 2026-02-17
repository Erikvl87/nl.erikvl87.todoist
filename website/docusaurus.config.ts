import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import path from 'path';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Todoist',
  tagline: 'Integrate your Todoist tasks with Homey',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://todoist.erikvl87.nl',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'Erikvl87', // Usually your GitHub org/user name.
  projectName: 'nl.erikvl87.todoist', // Usually your repo name.

  onBrokenLinks: 'throw',

  plugins: [
    function aliasPlugin() {
      return {
        name: 'alias-plugin',
        configureWebpack() {
          return {
            resolve: {
              alias: {
                '@homeycompose': path.resolve(__dirname, '../.homeycompose'),
                '@root': path.resolve(__dirname, '..'),
              },
            },
            module: {
              rules: [
                {
                  test: /\.homeychangelog\.json$/,
                  type: 'json',
                },
              ],
            },
          };
        },
      };
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Todoist',
      logo: {
        alt: 'Todoist Logo',
        src: 'img/icon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://community.homey.app/',
          label: 'Community',
          position: 'left',
        },
        {
          href: 'https://github.com/erikvl87/nl.erikvl87.todoist',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.paypal.com/paypalme/erikvl87',
          label: 'Donate',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Flow Cards',
              to: '/docs/flow-cards',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Homey Community Forum',
              href: 'https://community.homey.app/',
            },
            {
              label: 'Todoist Topic',
              href: 'https://community.homey.app/t/42818',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/erikvl87/nl.erikvl87.todoist',
            },
            {
              label: 'Donate',
              href: 'https://www.paypal.com/paypalme/erikvl87',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Erik van Leeuwen.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
