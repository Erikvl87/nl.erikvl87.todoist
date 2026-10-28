// Copies the shared widget sources in widgets-shared/ into every widget's public/shared/ folder.
// Homey serves each widget from its own public/ folder only, so shared code has to be copied in.
// TypeScript (.mts) copies are compiled by tsc afterwards. Other files are also copied straight into
// .homeybuild, because the Homey CLI may have copied the app there before running the build script.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharedDir = join(root, 'widgets-shared');
const widgetsDir = join(root, 'widgets');
const buildDir = join(root, '.homeybuild');

const files = readdirSync(sharedDir);
const widgets = readdirSync(widgetsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(widgetsDir, entry.name, 'public')))
  .map((entry) => entry.name);

for (const widget of widgets) {
  const target = join(widgetsDir, widget, 'public', 'shared');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const file of files) cpSync(join(sharedDir, file), join(target, file));

  const buildTarget = join(buildDir, 'widgets', widget, 'public', 'shared');
  if (existsSync(join(buildDir, 'widgets', widget, 'public'))) {
    mkdirSync(buildTarget, { recursive: true });
    for (const file of files.filter((name) => !name.endsWith('.mts'))) {
      cpSync(join(sharedDir, file), join(buildTarget, file));
    }
  }
}

console.log(`Synced ${files.length} shared file(s) into ${widgets.join(', ')}`);
