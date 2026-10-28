import type HomeyWidget from 'homey/lib/HomeyWidget';
import {
  TaskComposer,
  projectKey,
  type ComposerProject,
  type ComposerSection,
  type ComposerTarget,
} from './shared/TaskComposer.mjs';

/**
 * Typed Homey widget settings for the Todoist add task widget.
 * Autocomplete settings store the whole chosen item, see onProjectAutocomplete and onSectionAutocomplete in app.js.
 */
type AddTaskWidgetSettings = {
  project?: ComposerProject | null;
  section?: { id: string | null; projectId: string | null; name: string } | null;
  allowChangingProject?: boolean;
  showHeading?: boolean;
  showDueDate?: boolean;
  showPriority?: boolean;
  useQuickAdd?: boolean;
};

/** The last used project and section, remembered per widget instance. */
type StoredTarget = {
  /** The default project from the settings when this was stored; a new default replaces the stored choice. */
  defaultProject: string | null;
  project: string;
  section: string | null;
};

const STRINGS = {
  title: { en: 'New task', nl: 'Nieuwe taak' },
  noProject: { en: 'Choose a project in the widget settings.', nl: 'Kies een project in de widgetinstellingen.' },
  noAccounts: {
    en: 'No Todoist account found. Add a Todoist device in Homey first.',
    nl: 'Geen Todoist-account gevonden. Voeg eerst een Todoist-apparaat toe in Homey.',
  },
  errorLoading: { en: 'Could not load the project.', nl: 'Kan het project niet laden.' },
};

/**
 * A compact widget for adding Todoist tasks to a chosen project and section.
 */
class AddTaskWidgetScript {
  private homey: HomeyWidget;
  private settings: AddTaskWidgetSettings;
  private composer: TaskComposer | null = null;
  private isReady = false;
  private lastMeasuredHeight = 0;
  private readonly storageKey: string;
  private readonly domElements: {
    [key: string]: HTMLElement;
  };

  constructor(homey: HomeyWidget) {
    this.homey = homey;
    this.settings = homey.getSettings() as AddTaskWidgetSettings;
    this.storageKey = `todoist-add-task:${homey.getWidgetInstanceId()}`;

    this.domElements = {
      main: document.querySelector<HTMLElement>('main'),
      header: document.querySelector<HTMLElement>('.header'),
      title: document.querySelector<HTMLElement>('.title'),
      composerSlot: document.querySelector<HTMLElement>('.composer-slot'),
      message: document.querySelector<HTMLElement>('.message'),
    };

    this.domElements.title.textContent = homey.__(STRINGS.title);
    this.domElements.header.hidden = this.settings.showHeading === false;
  }

  /**
   * Loads the projects and sections, then shows the composer.
   */
  public async onHomeyReady(): Promise<void> {
    try {
      await this.initialize();
    } catch (error) {
      this.showMessage(this.homey.__(STRINGS.errorLoading), (error as Error)?.message);
    }

    this.isReady = true;
    this.homey.ready({ height: this.measureHeight() });
    new ResizeObserver(() => this.updateHeight()).observe(this.domElements.main);
  }

  private async initialize(): Promise<void> {
    const allowChangingProject = this.settings.allowChangingProject !== false;
    const defaultProject = this.settings.project?.id ? this.settings.project : null;
    const defaultKey = defaultProject ? projectKey(defaultProject) : null;
    const stored = this.readStoredTarget();
    const storedTarget = stored && stored.defaultProject === defaultKey ? stored : null;

    let projects: ComposerProject[] = [];
    let project: ComposerProject | null = defaultProject;
    if (allowChangingProject) {
      projects = await this.homey.api('GET', '/projects') as ComposerProject[];
      if (projects.length === 0) {
        this.showMessage(this.homey.__(STRINGS.noAccounts));
        return;
      }

      project = projects.find((item) => projectKey(item) === storedTarget?.project)
        ?? projects.find((item) => projectKey(item) === defaultKey)
        ?? projects[0];
    }

    if (!project) {
      this.showMessage(this.homey.__(STRINGS.noProject));
      return;
    }

    const sections = await this.loadSections(project);
    let sectionId: string | null = null;
    if (storedTarget?.project === projectKey(project))
      sectionId = storedTarget.section;
    else if (String(this.settings.section?.projectId) === String(project.id))
      sectionId = this.settings.section.id;

    this.composer = new TaskComposer({
      homey: this.homey,
      quickAdd: this.settings.useQuickAdd === true,
      showDueDate: this.settings.showDueDate !== false,
      showPriority: this.settings.showPriority !== false,
      showCancel: false,
      showSuccessMessage: true,
      loadSections: allowChangingProject ? (item) => this.loadSections(item) : undefined,
      onTargetChange: (target) => this.storeTarget(target, defaultKey),
      onCreated: (_task, target) => this.storeTarget(target, defaultKey),
    });

    if (allowChangingProject) this.composer.setProjects(projects);
    this.composer.setProject(project, sections, sectionId);
    this.domElements.composerSlot.append(this.composer.element);
  }

  private async loadSections(project: ComposerProject): Promise<ComposerSection[]> {
    return await this.homey.api('GET', `/users/${project.userId}/projects/${project.id}/sections`) as ComposerSection[];
  }

  private showMessage(message: string, technical?: string): void {
    const { message: messageEl } = this.domElements;
    messageEl.textContent = technical ? `${message} ${technical}` : message;
    messageEl.hidden = false;
  }

  private readStoredTarget(): StoredTarget | null {
    try {
      const value = window.localStorage.getItem(this.storageKey);
      return value ? JSON.parse(value) as StoredTarget : null;
    } catch {
      return null;
    }
  }

  private storeTarget(target: ComposerTarget, defaultProject: string | null): void {
    const value: StoredTarget = {
      defaultProject,
      project: projectKey(target.project),
      section: target.section?.id ?? null,
    };

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in the dashboard webview; the settings defaults are used instead.
    }
  }

  /**
   * Calculates the height the widget needs to show all of its content.
   */
  private measureHeight(): number {
    const { main: mainEl } = this.domElements;
    const elementRect = mainEl.getBoundingClientRect();
    const marginBottom = parseFloat(window.getComputedStyle(mainEl).marginBottom) || 0;
    const paddingBottom = parseFloat(window.getComputedStyle(document.body).paddingBottom) || 0;
    return Math.ceil(elementRect.bottom + marginBottom + paddingBottom);
  }

  private updateHeight(): void {
    if (!this.isReady) return;

    const nextHeight = this.measureHeight();
    if (!Number.isFinite(nextHeight) || nextHeight <= 0 || nextHeight === this.lastMeasuredHeight) return;

    this.lastMeasuredHeight = nextHeight;
    this.homey.setHeight(nextHeight);
  }
}

interface ModuleWindow extends Window {
  onHomeyReady: (homey: HomeyWidget) => Promise<void>;
}

declare const window: ModuleWindow;
window.onHomeyReady = async (homey: HomeyWidget): Promise<void> =>
  await new AddTaskWidgetScript(homey).onHomeyReady();
