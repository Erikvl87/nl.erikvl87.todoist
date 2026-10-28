---
title: Project Widget
sidebar_position: 3
---

# Project Widget

The **Project** widget shows the tasks of a Todoist project on your Homey dashboard. Tasks are grouped by section, stay up to date in real time, and can be completed and added right from the dashboard.

## Overview

The widget shows:

* A heading with the project name and a small Todoist icon (optional, see **Show project heading**)
* Tasks grouped by section, with subtasks indented under their parent task
* A checkbox in front of every task to complete it (optional, see **Allow completing tasks from widget**)
* An **+ Add task** row at the end of every section to add a task there (optional, see **Allow adding tasks from widget**)

Tasks update in real time. When you complete, add or change a task in Todoist, the widget follows automatically.

## Widget Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Project | Autocomplete | None | The Todoist project to show. Select from all projects across all connected Todoist user devices. |
| Show project heading | Checkbox | Enabled | Shows a heading with the project name and the Todoist icon above the tasks. Turn it off to show only the tasks, for example when you use Homey's own widget title instead. |
| Allow completing tasks from widget | Checkbox | Enabled | Shows a checkbox in front of every task that completes it in Todoist. When disabled, the list is read-only. |
| Allow adding tasks from widget | Checkbox | Enabled | Shows an **+ Add task** row at the end of every section. See [Adding Tasks](#adding-tasks). |
| Use Todoist Quick Add | Checkbox | Disabled | Lets Todoist read dates, priorities, labels, projects and sections from the task text itself, like its own Quick Add bar. See [Todoist Quick Add](add-task-widget.md#todoist-quick-add). |
| Auto adjust height | Checkbox | Disabled | Resizes the widget to fit all tasks. When disabled, the widget has a fixed height and the list scrolls. |

## Adding the Widget

1. Open your **Homey dashboard**.
2. Click the **Edit** button to enter edit mode.
3. Click **Add Widget**.
4. Search for or select the **Todoist** app.
5. Choose the **Project** widget.
6. In the widget settings:
   * Select the **Project** you want to show.
   * Turn **Show project heading** off if you only want to see the tasks.
   * Turn **Allow completing tasks from widget** and **Allow adding tasks from widget** on or off, depending on what the dashboard is for.
   * Turn **Use Todoist Quick Add** on if you want to type dates, labels and priorities straight into the task text.
   * Turn **Auto adjust height** on if the widget should grow and shrink with the number of tasks.
7. Save and exit edit mode.

## Completing Tasks

When **Allow completing tasks from widget** is enabled:

* Each task has a round checkbox on the left.
* Tapping the checkbox completes the task in Todoist. A spinner shows on the checkbox while this happens.
* Once completed, the task is struck through, fades out and is removed from the list.

## Adding Tasks

When **Allow adding tasks from widget** is enabled, every section ends with an **+ Add task** row. So does the list of tasks without a section, at the top.

1. Tap **+ Add task** at the end of the section where the task belongs. A pop-up opens over the list, right at that row, with the section already selected. Your phone or tablet shows its own keyboard.
2. Type the task name.
3. Optionally fill in:
   * **Date**: a due date in your own words, such as *tomorrow 9am* or *every monday*. Todoist reads it in the language of your Homey.
   * **Priority**: tap the flag to pick P1 to P4. Until you pick one, it shows *Priority* and Todoist uses its default, P4.
   * **Section**: tap it to move the task to another section, or choose **No section**.
4. Tap **Add task** or the Enter key on the keyboard.

The button briefly shows **✓ Added**, and the task appears in the list behind the pop-up straight away. The pop-up stays open with the same section selected, so you can type the next task right away. As tasks are added, the pop-up moves down with its row, so the tasks you just added stay visible above it.

To close the pop-up, tap **Cancel** or anywhere outside it. Once you have added a task, the button reads **Close** instead: closing never undoes tasks that were added. Anything typed but not yet added is discarded.

If adding a task fails, for example because the connection is lost, the error is shown in the pop-up and the text you typed is kept, so you can try again.

With **Use Todoist Quick Add** enabled, the date and priority fields are hidden. Type them into the task text instead, for example `Buy milk tomorrow p1`. A `#project` or `/section` in the text overrides the section picker.

:::tip

Want a small widget that only adds tasks, and lets you pick the project too? Use the [Add Task widget](add-task-widget.md).

:::

## Real-Time Updates

The widget receives real-time updates for the following Todoist events:

| Event | Behavior |
|-------|----------|
| Task added | New task appears with a fade-in animation |
| Task completed | Task is struck through, fades out and is removed |
| Task deleted | Task is removed from the list |
| Task updated | Task content is refreshed in place |
| Task uncompleted | Task reappears in the list |
| Section added | New section appears with its tasks |
| Section updated | Section title is updated |
| Section deleted | Section and its tasks are removed |
| Project updated | Project name in the heading is updated |

:::info

Real-time updates are delivered via Homey webhooks. There may be a slight delay (0 to 30 seconds) between a change in Todoist and the update on the widget. Tasks you add from the widget itself show up immediately.

:::

## Error Handling

If the widget can't load the project (for example because of network issues or an API failure):

* An error overlay is displayed with a description of the issue.
* A progress bar counts down to an automatic retry.
* After the retry, the widget reloads all project data and returns to normal.

:::tip

You can add multiple Project widgets to your dashboard, each configured for a different project.

:::

## FAQ

### The widget is empty but I have tasks

Make sure you've selected the correct project in the widget settings. Also verify that the Todoist User device is still connected. If the OAuth token has expired, you'll need to repair the device first.

### Tasks are not updating in real time

Real-time updates depend on Homey webhooks. Ensure your Homey has a stable internet connection. If updates still don't appear, try removing and re-adding the widget.

### I don't see the + Add task rows

Check that **Allow adding tasks from widget** is enabled in the widget settings.

### A task I added doesn't show up in the list

With **Use Todoist Quick Add** enabled, a `#project` in the task text sends the task to that project, so it appears there instead of in this widget. Check the project in Todoist.
