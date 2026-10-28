---
title: Add Task Widget
sidebar_position: 3.5
---

# Add Task Widget

The **Add task** widget is a small form on your Homey dashboard for adding tasks to Todoist. Pick the project and section, type the task, and it lands in Todoist straight away. It works well on a wall tablet in the kitchen or hallway.

## Overview

The widget shows:

* A heading with a small Todoist icon (optional, see **Show heading**)
* A field for the task name. Tapping it opens the keyboard of your phone or tablet.
* An optional date field and priority picker
* A project picker (optional) and a section picker
* An **Add task** button

After a task is added, the button briefly shows **✓ Added** and the form is cleared for the next task. The widget remembers the project and section you used last.

## Widget Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Default project | Autocomplete | None | The project the widget starts with. Select from all projects across all connected Todoist user devices. |
| Default section | Autocomplete | None | The section the widget starts with. The list shows the sections of the chosen default project; choose the project first. |
| Allow choosing another project in the widget | Checkbox | Enabled | When enabled, the widget shows a project picker with the projects of all connected accounts. When disabled, tasks always go to the default project. |
| Show heading | Checkbox | Enabled | Shows a heading with the Todoist icon above the form. |
| Show date field | Checkbox | Enabled | Shows a field for a due date in your own words, such as *tomorrow 9am* or *every monday*. |
| Show priority | Checkbox | Enabled | Shows the P1 to P4 priority picker. |
| Use Todoist Quick Add syntax | Checkbox | Disabled | Parses the task text like the Todoist Quick Add bar. See below. |

## Todoist Quick Add Syntax

With **Use Todoist Quick Add syntax** enabled, Todoist reads the task text the same way as its own Quick Add bar:

| Text | Meaning |
|------|---------|
| `tomorrow 9am`, `every friday` | Due date |
| `p1` to `p4` | Priority |
| `@errands` | Label |
| `#Groceries` | Project |
| `/Dairy` | Section |

For example: `Buy milk tomorrow #Groceries /Dairy p1`.

A project or section in the text wins over the pickers. Without them, the task goes to the project and section selected in the widget.

## Adding the Widget

1. Open your **Homey dashboard**.
2. Click the **Edit** button to enter edit mode.
3. Click **Add Widget**.
4. Search for or select the **Todoist** app.
5. Choose the **Add task** widget.
6. Select a **Default project** and, optionally, a **Default section**.
7. Save and exit edit mode.

## FAQ

### The section list in the settings is empty

Choose the **Default project** first. The section list only shows the sections of that project.

### I changed the default project, but the widget still uses the old one

The widget remembers the project you used last until the default project in the settings changes. After changing the default, the widget starts with the new default again.
