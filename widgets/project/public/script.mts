import type HomeyWidget from 'homey/lib/HomeyWidget';
import {
  TaskTree,
  TodoistProject,
  TodoistProjectResponse,
  type TodoistTask,
  type TodoistSectionInput,
} from './TaskTree.mjs';
import { EventQueue } from './EventQueue.mjs';
import { TaskComposer, translate, type CreatedTask } from './shared/TaskComposer.mjs';

/**
 * Typed Homey widget settings for the Todoist project widget.
 */
type ProjectWidgetSettings = {
  project: {
    userId: string;
    id: string;
  },
  allowCompletingTasks: boolean;
  autoAdjustHeight: boolean;
  showProjectHeading?: boolean;
  allowAddingTasks?: boolean;
  useQuickAdd?: boolean;
};

/**
 * Manages Todoist project data rendering inside a Homey widget runtime.
 */
class ProjectWidgetScript {
  private homey: HomeyWidget;
  private settings: ProjectWidgetSettings;
  private taskTree: TaskTree;
  private composer: TaskComposer | null = null;
  private composerOpen = false;
  /** Section of the "Add task" row the pop-up was opened from; the pop-up stays next to that row. */
  private composerAnchorSectionId: string | null = null;
  private composerPositionFrame: number | null = null;
  private eventQueue: any[] = [];
  private processingQueue = false;
  private todoistEventQueue: EventQueue;
  private readonly removalFallbackMs = 3000;
  private readonly heightTransitionMs = 1200;
  private readonly errorAutoHideMs = 8000;
  private errorHideTimer: number | null = null;
  private heightAnimationFrame: number | null = null;
  private lastMeasuredHeight = 0;
  private readonly domElements: {
    [key: string]: HTMLElement;
  };

  /**
   * Creates a new project widget instance bound to the provided Homey bridge.
   * @param homey Homey widget context used for configuration, API access, and event binding.
   */
  constructor(homey: HomeyWidget) {
    this.homey = homey;
    this.settings = homey.getSettings() as ProjectWidgetSettings;

    this.domElements = {
      main: document.querySelector<HTMLElement>('main'),
      header: document.querySelector<HTMLElement>('.header'),
      projectTitle: document.querySelector<HTMLElement>('.project-title'),
      project: document.querySelector<HTMLElement>('.project'),
      composerSlot: document.querySelector<HTMLElement>('.composer-slot'),
      error: document.querySelector<HTMLElement>('#error'),
      errorMessage: document.querySelector<HTMLElement>('.error-message'),
      errorTechnical: document.querySelector<HTMLElement>('.error-technical'),
      errorRefresh: document.querySelector<HTMLElement>('.error-refresh'),
      errorRefreshBar: document.querySelector<HTMLElement>('.error-refresh-bar'),
      errorRetryButton: document.querySelector<HTMLButtonElement>('.error-retry-button'),
      errorHeader: document.querySelector<HTMLElement>('.error-header'),
    };

    this.domElements.main.classList.toggle('auto-height', this.settings.autoAdjustHeight);
    this.domElements.project.classList.toggle('auto-height', this.settings.autoAdjustHeight);
    // Widgets added before this setting existed have no value yet, so default to showing the heading.
    this.domElements.header.hidden = this.settings.showProjectHeading === false;
    // Same for adding tasks: widgets saved before this setting existed get it enabled.
    const allowAddingTasks = this.settings.allowAddingTasks !== false;

    this.taskTree = new TaskTree(this.domElements.project,
      this.settings.allowCompletingTasks, {
      onTaskAdd: (element) => this.handleAdd(element),
      onTaskRemove: (element, done) => this.handleRemove(element, done),
      onSectionAdd: (element) => this.handleAdd(element),
      onSectionRemove: (element, done) => this.handleRemove(element, done),
      onTaskCheckboxClick: (taskId, element) => this.handleTaskCheckboxClick(taskId, element),
      onAddTaskClick: allowAddingTasks ? (sectionId) => this.openComposer(sectionId) : undefined,
      onTreeChange: () => {
        this.composer?.setSections(this.taskTree.getSections());
        this.scheduleHeightUpdate();
        this.scheduleComposerPosition();
      },
    }, translate(homey, 'addTask'));

    // The composer is a pop-up over the task list. It lives outside the list, which is re-rendered on every
    // change; inside it, focus and the on-screen keyboard would be lost.
    if (allowAddingTasks) {
      this.composer = new TaskComposer({
        homey,
        quickAdd: this.settings.useQuickAdd === true,
        showDueDate: true,
        showPriority: true,
        showCancel: true,
        showSuccessMessage: true,
        onCreated: (task) => this.handleTaskCreated(task),
        onCancel: () => this.closeComposer(),
        onLayoutChange: () => this.scheduleHeightUpdate(),
      });
      this.domElements.composerSlot.append(this.composer.element);

      // The slot is the dimmed backdrop around the pop-up; tapping it closes the pop-up.
      this.domElements.composerSlot.addEventListener('click', (event) => {
        if (event.target === this.domElements.composerSlot) this.closeComposer();
      });
    }

    if (this.settings.autoAdjustHeight) {
      this.scheduleHeightUpdate(); // when?
    }

    // Follow every size change, including rows that animate open after a render and the composer pop-up.
    const resizeObserver = new ResizeObserver(() => {
      this.scheduleHeightUpdate();
      this.scheduleComposerPosition();
    });
    resizeObserver.observe(this.domElements.main);
    if (this.composer) resizeObserver.observe(this.composer.element);

    this.todoistEventQueue = new EventQueue(
      (event) => this.processEvent(event),
      (message, technical) => {
        this.showError(message, technical, async () => {
          await this.synchronize();
        });
      }
    );
  }

  /**
   * Called by Homey when the widget receives the runtime bridge, allowing us to fetch data and bind listeners.
   * Initializes the project view by loading Todoist data and registering realtime update handlers.
   * @returns Promise resolved when initialisation flow completes.
   */
  public async onHomeyReady(): Promise<void> {
    await this.synchronize();
    this.homey.ready();

    this.homey.on(`${this.settings.project.userId}:${this.settings.project.id}`, (message: any) => {
      this.eventQueue.push(message);
      this.processEventQueue();
    });
  }

  /**
   * Fetches the latest project data from the Homey Todoist driver and triggers a re-render.
   * @returns Promise resolved when synchronization completes.
   **/
  private async synchronize(): Promise<void> {
    await this.homey
      .api('GET', `/users/${this.settings.project.userId}/projects/${this.settings.project.id}`, {})
      .then((data) => {
        const projectData = data as TodoistProjectResponse;
        this.domElements.projectTitle.textContent = projectData.project.name;
        this.taskTree.organize(projectData);
        this.composer?.setProject(
          { userId: this.settings.project.userId, id: this.settings.project.id, name: projectData.project.name },
          this.taskTree.getSections(),
          this.composer.getTarget()?.section?.id ?? null,
        );
      })
      .catch((error) => {
        this.showError('Error fetching project data', error?.message, undefined, async () => {
          await this.synchronize();
        });
      });
  }

  /**
   * Processes the event queue sequentially to avoid race conditions.
   */
  private async processEventQueue(): Promise<void> {
    if (this.processingQueue)
      return;

    this.processingQueue = true;
    while (this.eventQueue.length > 0) {
      const message = this.eventQueue.shift()!;
      try {
        this.todoistEventQueue.process(message);
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Processes a single Todoist event by dispatching to the appropriate TaskTree method.
   * Throws errors which are caught by TodoistEventQueue for reordering.
   * @param message The event payload containing the event name and associated data.
   */
  private processEvent(message: any): void {
    switch (message.event_name) {
      case 'item:completed':
      case 'item:deleted':
        this.taskTree.removeTask(message.event_data.id);
        break;

      case 'section:archived':
      case 'section:deleted':
        this.taskTree.removeSection(message.event_data.id);
        break;

      case 'item:updated': {
        this.taskTree.updateTask(message.event_data as TodoistTask);
        break;
      }

      case 'project:updated':
        this.domElements.projectTitle.textContent = (message.event_data as TodoistProject).name;
        break;

      case 'item:added':
      case 'item:uncompleted': {
        // A task added from this widget is already shown before its webhook event arrives.
        const task = message.event_data as TodoistTask;
        if (this.taskTree.hasTask(task.id))
          this.taskTree.updateTask(task);
        else
          this.taskTree.addTask(task);
        break;
      }

      case 'section:added':
      case 'section:unarchived':
        this.taskTree.addSection(message.event_data as TodoistSectionInput);
        break;

      case 'section:updated':
        this.taskTree.updateSection(message.event_data as TodoistSectionInput);
        break;
      default:
        break;
    }
  }

  /**
   * Handles checkbox click events for tasks.
   * @param taskId The ID of the task whose checkbox was clicked.
   * @param element The task element.
   */
  private async handleTaskCheckboxClick(taskId: string, element: HTMLElement): Promise<void> {
    if (!this.settings.allowCompletingTasks)
      return;

    this.homey.hapticFeedback();
    element.classList.add('loading');
    await this.homey.api('POST', `/users/${this.settings.project.userId}/tasks/${taskId}/complete`, {})
      .catch((error) => {
        console.error('Error completing task:', error);
        this.showError('Error completing task', error?.message, async () => {
          element.classList.remove('loading');
          await this.synchronize();
        });
      });
  }

  /**
   * Opens the composer pop-up over the task list, with the section of the clicked "Add task" row preselected.
   * Focusing inside the click handler lets mobile webviews open the on-screen keyboard.
   * @param sectionId The section to add to, or null for tasks without a section.
   */
  private openComposer(sectionId: string | null): void {
    if (!this.composer) return;

    this.homey.hapticFeedback();
    this.composerOpen = true;
    this.composerAnchorSectionId = sectionId;
    this.composer.selectSection(sectionId);

    // Place the pop-up at the tapped row right away; later moves (as tasks are added) slide smoothly.
    const { composerSlot: slotEl } = this.domElements;
    slotEl.hidden = false;
    slotEl.classList.add('placing');
    this.positionComposer();
    window.requestAnimationFrame(() => slotEl.classList.remove('placing'));

    this.composer.focus();
    this.scheduleHeightUpdate();
  }

  /**
   * Moves the pop-up onto the "Add task" row it was opened from, so on a long list it shows where the user tapped.
   * Tasks added to that section appear just above the row, so they stay visible above the pop-up.
   * Near the bottom of the widget the pop-up is moved up just enough to fit.
   */
  private positionComposer(): void {
    if (!this.composer || !this.composerOpen) return;

    const { composerSlot: slotEl, project: projectEl } = this.domElements;
    const card = this.composer.element;
    const anchor = projectEl.hidden
      ? null
      : projectEl.querySelector<HTMLElement>(`.add-task[data-section-id="${this.composerAnchorSectionId ?? ''}"]`);
    const inset = parseFloat(window.getComputedStyle(slotEl).paddingTop) || 0;
    const anchorTop = anchor ? anchor.getBoundingClientRect().top : inset;
    const maxTop = window.innerHeight - card.offsetHeight - inset;
    const top = Math.max(inset, Math.min(anchorTop, maxTop));
    card.style.marginTop = `${Math.round(top - inset)}px`;
  }

  /**
   * Repositions the pop-up on the next animation frame, e.g. after the list changed below it.
   */
  private scheduleComposerPosition(): void {
    if (!this.composerOpen || this.composerPositionFrame !== null) return;
    this.composerPositionFrame = window.requestAnimationFrame(() => {
      this.composerPositionFrame = null;
      this.positionComposer();
    });
  }

  /**
   * Discards what was typed and closes the pop-up.
   */
  private closeComposer(): void {
    if (!this.composer) return;

    this.composerOpen = false;
    this.composer.endSession();
    (document.activeElement as HTMLElement | null)?.blur();
    this.domElements.composerSlot.hidden = true;
    this.scheduleHeightUpdate();
  }

  /**
   * Shows a task created from the widget right away instead of waiting for its webhook event.
   * @param task The task returned by Todoist.
   */
  private handleTaskCreated(task: CreatedTask): void {
    if (String(task.project_id) !== String(this.settings.project.id) || this.taskTree.hasTask(task.id))
      return;

    this.taskTree.addTask(task);
  }

  /**
   * Handles the addition animation for a task element when it is added to the DOM.
   * @param element 
   * @param _taskId 
   */
  private handleAdd(element: HTMLElement): void {
    const targetHeight = element.offsetHeight;

    // The list is hidden behind the error message; it shows the task without animating once it is back.
    if (this.domElements.project.hidden) {
      element.classList.remove('fading-out');
      return;
    }

    element.style.minHeight = '0px';
    element.style.maxHeight = '0px';
    element.style.overflow = 'hidden';
    element.classList.add('fading-out');

    requestAnimationFrame(() => {
      element.classList.remove('fading-out');
      element.style.minHeight = `${targetHeight}px`;
      element.style.maxHeight = `${targetHeight}px`;

      const clearInline = () => {
        element.style.minHeight = '';
        element.style.maxHeight = '';
        element.style.overflow = '';
        element.removeEventListener('transitionend', onHeightEnd);
        // With a fixed height the widget itself doesn't resize, so move the pop-up below the grown row here.
        this.scheduleComposerPosition();
      };

      const onHeightEnd = (event: TransitionEvent) => {
        if (event.target === element && (event.propertyName === 'min-height' || event.propertyName === 'max-height')) {
          clearInline();
        }
      };
      element.addEventListener('transitionend', onHeightEnd);

      window.setTimeout(clearInline, this.heightTransitionMs + 50);
    });
  }

  /**
   * Handles the removal animation for a task element before it is removed from the DOM.
   * @param element The task element being removed.
   * @param _taskId The ID of the task being removed.
   * @param done Callback to invoke once the removal animation completes.
   */
  private handleRemove(element: HTMLElement, done: () => void): void {
    let finished = false;
    let collapseStarted = false;
    let heightDone = false;

    const startHeight = element.offsetHeight;
    element.style.transition = getComputedStyle(element).transition;
    element.style.minHeight = `${startHeight}px`;
    element.style.maxHeight = `${startHeight}px`;
    element.style.overflow = 'hidden';
    void element.offsetHeight;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      element.removeEventListener('transitionend', onTransitionEnd);
      done();
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== element) return;

      if (event.propertyName === 'height') {
        heightDone = true;
        cleanup();
      }
    };

    const startCollapse = () => {
      if (collapseStarted) return;
      collapseStarted = true;
      requestAnimationFrame(() => {
        element.style.minHeight = '0px';
        element.style.maxHeight = '0px';
      });
    };

    element.addEventListener('transitionend', onTransitionEnd);
    element.classList.add('deleting');
    requestAnimationFrame(() => {
      element.classList.add('fading-out');
    });

    window.setTimeout(() => {
      if (!collapseStarted) startCollapse();
    }, 300);

    window.setTimeout(() => {
      if (finished) return;
      if (!collapseStarted) startCollapse();
      if (!heightDone) cleanup();
    }, this.removalFallbackMs);
  }

  /**
   * Shows an error message overlaying the main widget content.
   * Pass `onAutoHide` to show an animated progress bar that auto-retries after a timeout.
   * Pass `onManualRetry` to show a button the user must click to retry (used for sync failures).
   * The two callbacks are mutually exclusive; `onManualRetry` takes priority.
   * @param message The error message to display.
   */
  private showError(
    message: string,
    technical?: string,
    onAutoHide?: () => Promise<void> | void,
    onManualRetry?: () => Promise<void> | void,
  ): void {
    const { project: projectEl, error: errorEl, errorMessage: errorMessageEl, errorTechnical: errorTechnicalEl, errorRefresh: errorRefreshEl, errorRetryButton: errorRetryButtonEl } = this.domElements;
    errorMessageEl.textContent = message;
    errorTechnicalEl.textContent = technical ?? '';
    errorTechnicalEl.toggleAttribute('hidden', !technical);

    projectEl.hidden = true;
    this.domElements.composerSlot.hidden = true;
    errorEl.hidden = false;

    if (onManualRetry) {
      this.clearErrorAutoHide();
      errorRefreshEl.hidden = true;
      errorRetryButtonEl.hidden = false;
      errorRetryButtonEl.onclick = async () => {
        this.hideError();
        await onManualRetry();
      };
    } else if (onAutoHide) {
      errorRefreshEl.hidden = false;
      errorRetryButtonEl.hidden = true;
      this.scheduleErrorAutoHide(onAutoHide);
    } else {
      errorRefreshEl.hidden = false;
      errorRetryButtonEl.hidden = true;
      this.clearErrorAutoHide();
    }

    this.scheduleHeightUpdate();
  }

  /**
   * Hides the error message and reveals the main widget content.
   */
  private hideError(): void {
    const { project: projectEl, error: errorEl, errorTechnical: errorTechnicalEl, errorRetryButton: errorRetryButtonEl } = this.domElements;
    projectEl.hidden = false;
    this.domElements.composerSlot.hidden = !this.composerOpen;
    errorEl.hidden = true;
    errorTechnicalEl.textContent = '';
    errorTechnicalEl.hidden = true;
    errorRetryButtonEl.hidden = true;
    errorRetryButtonEl.onclick = null;
    this.clearErrorAutoHide();
    this.scheduleHeightUpdate();
  }

  /** Starts an auto-hide countdown with a progress bar, then hides the error and runs the callback. */
  private scheduleErrorAutoHide(onDone: () => Promise<void> | void): void {
    this.clearErrorAutoHide();
    const { errorRefreshBar: errorRefreshBarEl } = this.domElements;
    errorRefreshBarEl.style.transition = 'none';
    errorRefreshBarEl.style.width = '0%';
    void errorRefreshBarEl.offsetWidth;
    errorRefreshBarEl.style.transition = `width ${this.errorAutoHideMs}ms linear`;

    requestAnimationFrame(() => {
      errorRefreshBarEl.style.width = '100%';
      this.scheduleHeightUpdate();
      window.setTimeout(() => this.scheduleHeightUpdate(), 50);
    });

    this.errorHideTimer = window.setTimeout(async () => {
      this.hideError();
      await onDone();
    }, this.errorAutoHideMs);
  }

  /**
   * Clears any existing error auto-hide timers and resets the progress bar.
   */
  private clearErrorAutoHide(): void {
    if (this.errorHideTimer !== null) {
      window.clearTimeout(this.errorHideTimer);
      this.errorHideTimer = null;
    }
    const { errorRefreshBar: errorRefreshBarEl } = this.domElements;
    errorRefreshBarEl.style.transition = 'none';
    errorRefreshBarEl.style.width = '0%';
  }

  /**
   * Schedules a height update on the next animation frame if auto height adjustment is enabled.
   */
  private scheduleHeightUpdate(): void {
    if (!this.settings.autoAdjustHeight) return;

    if (this.heightAnimationFrame !== null) return;
    this.heightAnimationFrame = window.requestAnimationFrame(() => {
      this.heightAnimationFrame = null;
      this.updateWidgetHeight();
    });
  }

  /**
   * Calculates and sets the widget height.
   **/
  private updateWidgetHeight(): void {
    if (!this.settings.autoAdjustHeight) return;

    const { main: mainEl } = this.domElements;
    const elementRect = mainEl.getBoundingClientRect();
    const elementStyles = window.getComputedStyle(mainEl);
    const bodyStyles = window.getComputedStyle(document.body);

    const marginBottom = parseFloat(elementStyles.marginBottom) || 0;
    const paddingTop = parseFloat(bodyStyles.paddingTop) || 0;
    const paddingBottom = parseFloat(bodyStyles.paddingBottom) || 0;
    let measuredHeight = elementRect.bottom + marginBottom + paddingBottom;
    // The pop-up floats over the list, so the widget must also be tall enough for it.
    // Uses the same margin as positionComposer, so moving the pop-up never makes the widget grow a little more.
    if (this.composerOpen) {
      const inset = parseFloat(window.getComputedStyle(this.domElements.composerSlot).paddingBottom) || 0;
      measuredHeight = Math.max(measuredHeight, this.composer.element.getBoundingClientRect().bottom + inset);
    }
    const minimumHeight = paddingTop;

    const nextHeight = Math.ceil(Math.max(measuredHeight, minimumHeight));
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    if (this.lastMeasuredHeight === nextHeight) return;

    this.lastMeasuredHeight = nextHeight;
    this.homey.setHeight(nextHeight);
  }
}

/**
 * Extends the global Window shape with Homey specific hooks so the widget can register its entrypoint.
 * This declaration keeps TypeScript aware of the Homey runtime contract exposed on window for widgets.
 */
interface ModuleWindow extends Window {
  onHomeyReady: (homey: HomeyWidget) => Promise<void>;
}

declare const window: ModuleWindow;
/**
 * Homey invokes this hook when the widget runtime boots, enabling us to instantiate the scripted widget.
 * @param homey Homey widget bridge that exposes settings, events, and API helpers for this widget instance.
 * @returns Promise resolved after the widget initialisation routine finishes.
 */
window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
  await new ProjectWidgetScript(homey).onHomeyReady();
