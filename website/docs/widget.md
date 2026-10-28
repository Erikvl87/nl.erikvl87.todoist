---
title: Project Widget
sidebar_position: 3
---

# Project Widget

The **Project** widget displays your Todoist project tasks directly on your Homey dashboard. It provides a live view of tasks organized by sections, with real-time updates via webhooks.

## Overview

The widget shows:

* A heading with the project name and a small Todoist icon (optional, see **Show project heading**)
* Tasks organized by sections (if any)
* Subtasks nested under their parent tasks with indentation

Tasks update in real time. When you complete, add, or modify a task in Todoist, the widget reflects the change automatically.

## Widget Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Project | Autocomplete | None | The Todoist project to display. Select from all projects across all connected Todoist user devices. |
| Show project heading | Checkbox | Enabled | When enabled, a heading with the project name and Todoist icon is shown above the tasks. Disable it to hide the whole heading and show only the tasks, for example when you use Homey's own widget title instead. |
| Allow completing tasks from widget | Checkbox | Enabled | When enabled, each task shows a clickable checkbox that completes the task directly from the dashboard. |
| Allow adding tasks from widget | Checkbox | Enabled | When enabled, every section ends with an **+ Add task** row that opens a form for a new task. See [Adding Tasks](#adding-tasks). |
| Use Todoist Quick Add syntax | Checkbox | Disabled | When enabled, the task text is parsed like the Todoist Quick Add bar, so `#project`, `/section`, `@label`, `p1` and dates in the text are recognised. The date and priority fields are hidden. |
| Auto adjust height | Checkbox | Disabled | When enabled, the widget height automatically adjusts to fit the content. When disabled, the widget uses a fixed height with scrolling. |

## Adding the Widget

1. Open your **Homey dashboard**.
2. Click the **Edit** button to enter edit mode.
3. Click **Add Widget**.
4. Search for or select the **Todoist** app.
5. Choose the **Project** widget.
6. In the widget settings:
   * Select the **Project** you want to display.
   * Toggle **Show project heading** off if you only want to see the tasks.
   * Toggle **Allow completing tasks from widget** on or off depending on your preference.
   * Toggle **Auto adjust height** if you want the widget to resize based on the number of tasks.
7. Save and exit edit mode.

## Completing Tasks

When **Allow completing tasks from widget** is enabled:

* Each task displays a circular checkbox on the left side.
* Clicking the checkbox sends a completion request to Todoist.
* A loading spinner appears on the checkbox while the request is being processed.
* Once completed, the task fades out with a strikethrough animation and is removed from the list.

When disabled, the checkboxes are hidden and the widget is read-only.

## Adding Tasks

When **Allow adding tasks from widget** is enabled:

* Every section, and the list of tasks without a section, ends with an **+ Add task** row.
* Tapping it opens a pop-up over the task list, with that section already selected. Your phone or tablet shows its own keyboard.
* Type the task name and, optionally, a date in your own words (for example *tomorrow 9am*) and a priority (P1 to P4).
* Use the section picker to place the task in another section, or choose **No section**.
* Press **Add task** or the Enter key on the keyboard. The task appears in the list behind the pop-up right away, and the pop-up stays open for the next task.
* Press **Cancel** or tap outside the pop-up to close it. Once you've added a task, the button reads **Close**: closing never undoes tasks that were added.

If adding the task fails, the error is shown in the pop-up and the text you typed is kept, so you can try again.

:::tip

Want a small widget that only adds tasks, to any project? Use the [Add Task widget](add-task-widget.md).

:::

## Real-Time Updates

The widget receives real-time updates for the following Todoist events:

| Event | Behavior |
|-------|----------|
| Task added | New task appears with a fade-in animation |
| Task completed | Task is removed with a strikethrough and fade-out animation |
| Task deleted | Task is removed from the list |
| Task updated | Task content is refreshed in place |
| Task uncompleted | Task reappears in the list |
| Section added | New section appears with its tasks |
| Section updated | Section title is updated |
| Section deleted | Section and its tasks are removed |
| Project updated | Project name in the heading is updated |

:::info

Real-time updates are delivered via Homey webhooks. There may be a slight delay (0 to 30 seconds) between the action in Todoist and the update appearing on the widget.

:::

## Error Handling

If the widget encounters an error (e.g., network issues or API failures):

* An error overlay is displayed with a description of the issue.
* A progress bar counts down to an automatic retry.
* After the retry, the widget re-fetches all project data and returns to normal.

:::tip

You can add multiple Project widgets to your dashboard, each configured for a different project.

:::

## FAQ

### The widget is empty but I have tasks

Make sure you've selected the correct project in the widget settings. Also verify that the Todoist User device is still connected. If the OAuth token has expired, you'll need to repair the device first.

### Tasks are not updating in real time

Real-time updates depend on Homey webhooks. Ensure your Homey has a stable internet connection. If updates still don't appear, try removing and re-adding the widget.
