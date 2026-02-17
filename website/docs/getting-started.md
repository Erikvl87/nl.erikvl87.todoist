---
title: Getting Started
sidebar_position: 1
---

# Getting Started

## Prerequisites

Before you can use this Homey app, you need:

* A [Todoist](https://todoist.com/) account (free or premium).
* A Homey Pro. This app is currently only available for Homey Pro.

## Installation Steps

### Step 1: Install the app

* Navigate to the following URL: [Todoist | Homey](https://homey.app/a/nl.jwienk.todoist/)
* Log in with your Homey account if prompted.
* Click the **Install App** button to add the app to your Homey.

### Step 2: Verify installation (Optional)

You can confirm that the app was installed correctly before adding a device:

* **In the Homey Mobile App:**
  1. Go to **More → Apps**.
  2. Check that **Todoist** appears in the list of installed apps.
* **In the Homey Web App:**
  1. Click the **⚙️ Gear icon** in the bottom-left corner to open **Settings**.
  2. Scroll down to the list of installed apps.
  3. Verify that **Todoist** is listed there.

### Step 3: Add Your Todoist User Device

The Todoist app uses a "User" device that represents your Todoist account. You need to add at least one user device to start using flow cards.

1. Open the **Homey Web App** or **Homey Mobile App**.
2. Go to the **Devices** pane.
3. Click or tap the **＋ (plus)** button to add a new device.
4. Search for and select **Todoist** from the list of available apps.
5. Choose **Todoist User** as the device type.
6. Click or tap **Connect**.
7. You will be redirected to the Todoist OAuth login page. Log in with your **Todoist account credentials**.
8. After successful authorization, your Todoist user will appear as a device.

### Step 4: Complete Setup

* Follow Homey's on-screen instructions to complete setup and assign the device to a **zone**.

### Step 5: Start Using Flows

Your Todoist account is now connected to Homey. You can:

* Create tasks using action flow cards, with optional due dates, priorities, and assignees
* React to task events like completions using trigger flow cards
* Check if tasks exist using condition flow cards
* Fetch project tasks and use them in advanced flows
* Display tasks on your Homey dashboard using the Project widget

:::tip

If you have multiple Todoist accounts, you can add multiple Todoist User devices, one for each account.

:::
