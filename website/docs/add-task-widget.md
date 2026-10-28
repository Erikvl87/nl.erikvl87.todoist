---
title: Add Task Widget
sidebar_position: 4
---

# Add Task Widget

The **Add task** widget is a compact form on your Homey dashboard for adding tasks to Todoist. Pick the project and section, type the task, and it lands in Todoist straight away. It works well on a wall tablet in the kitchen or hallway, for example to add groceries the moment you run out.

## Overview

The widget shows:

* A heading with a small Todoist icon (optional, see **Show heading**)
* A field for the task name. Tapping it opens the keyboard of your phone or tablet.
* A date field (optional, see **Show date field**)
* Small buttons to pick the project, the section and the priority. Tapping one opens the picker of your phone or tablet.
* An **Add task** button

The widget sizes itself to fit the form, so there is no height setting.

## Widget Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Default project | Autocomplete | None | The project the widget starts with. Select from all projects across all connected Todoist user devices. |
| Default section | Autocomplete | None | The section the widget starts with. The list shows the sections of the chosen default project, so choose the project first. Choose **No section** to add tasks without a section. |
| Allow choosing another project in the widget | Checkbox | Enabled | Shows a project picker in the widget with the projects of all connected accounts. When disabled, tasks always go to the default project. |
| Show heading | Checkbox | Enabled | Shows a heading with the Todoist icon above the form. |
| Show date field | Checkbox | Enabled | Shows a field for a due date in your own words. |
| Show priority | Checkbox | Enabled | Shows the P1 to P4 priority picker. |
| Use Todoist Quick Add | Checkbox | Disabled | Lets Todoist read dates, priorities, labels, projects and sections from the task text itself. The date field and priority picker are then hidden. See [Todoist Quick Add](#todoist-quick-add). |

## Adding the Widget

1. Open your **Homey dashboard**.
2. Click the **Edit** button to enter edit mode.
3. Click **Add Widget**.
4. Search for or select the **Todoist** app.
5. Choose the **Add task** widget.
6. Select a **Default project** and, optionally, a **Default section**.
7. Adjust the other settings if you like, for example turn **Allow choosing another project in the widget** off for a widget that should always add to one list.
8. Save and exit edit mode.

## Adding Tasks

1. Type the task name.
2. Optionally fill in:
   * **Date**: a due date in your own words, such as *tomorrow 9am* or *every monday*. Todoist reads it in the language of your Homey.
   * **Project**: tap it to pick another project. If you have more than one Todoist account, the projects are grouped by account. The section picker then shows the sections of that project.
   * **Section**: tap it to pick a section, or choose **No section**. This button is hidden for projects without sections.
   * **Priority**: tap the flag to pick P1 to P4. Until you pick one, it shows *Priority* and Todoist uses its default, P4.
3. Tap **Add task** or the Enter key on the keyboard. The button stays disabled until you've typed a task name.

The button briefly shows **✓ Added**, and the form is cleared for the next task. The project and section stay as they are, so you can add several tasks to the same place in a row.

The widget remembers the project and section you used last on that device, also after the dashboard is closed. It starts with the defaults from the settings again when you change the **Default project**.

If adding a task fails, for example because the connection is lost, the error is shown in the form and the text you typed is kept, so you can try again.

## Todoist Quick Add

With **Use Todoist Quick Add** enabled, in this widget or in the [Project widget](widget.md), Todoist reads the task text the same way as its own Quick Add bar:

| Text | Meaning |
|------|---------|
| `tomorrow 9am`, `every friday` | Due date |
| `p1` to `p4` | Priority |
| `@errands` | Label |
| `#Groceries` | Project |
| `/Dairy` | Section |

For example: `Buy milk tomorrow #Groceries /Dairy p1 @errands`.

A project or section in the text wins over the pickers. Without them, the task goes to the project and section selected in the widget.

## FAQ

### The widget says "Choose a project in the widget settings."

**Allow choosing another project in the widget** is disabled and no **Default project** is set. Open the widget settings and choose a project.

### The widget says "No Todoist account found."

There is no Todoist User device in Homey yet. Add one first, see [Getting Started](getting-started.md).

### The section list in the settings is empty

Choose the **Default project** first. The section list only shows the sections of that project.

### I changed the default project, but the widget still uses the old one

The widget remembers the project you used last until the default project in the settings changes. After changing the default, the widget starts with the new default again.
