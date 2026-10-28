import type HomeyWidget from 'homey/lib/HomeyWidget';

// Shared between widgets. Edit this file in widgets-shared; the copies in each widget's public/shared folder are generated.

/** A Todoist project the composer can add tasks to. */
export type ComposerProject = {
  id: string;
  userId: string;
  name: string;
  /** Name of the Todoist account (Homey device) the project belongs to. */
  description?: string;
};

/** A Todoist section within the current project. */
export type ComposerSection = {
  id: string;
  name: string;
};

/** The minimal task shape returned by the createTask widget endpoint. */
export type CreatedTask = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  child_order: number;
  content: string;
  updated_at: string;
};

export type ComposerTarget = {
  project: ComposerProject;
  section: ComposerSection | null;
};

export type TaskComposerOptions = {
  homey: HomeyWidget;
  /** Parse the text with Todoist Quick Add instead of showing the date and priority fields. */
  quickAdd: boolean;
  showDueDate: boolean;
  showPriority: boolean;
  /** Show a Cancel button that calls onCancel. */
  showCancel: boolean;
  /** Briefly turn the Add button into an "Added" confirmation after a task is created. */
  showSuccessMessage: boolean;
  /** When set, a project picker is shown and this loads the sections of the picked project. */
  loadSections?: (project: ComposerProject) => Promise<ComposerSection[]>;
  onCreated?: (task: CreatedTask, target: ComposerTarget) => void;
  onTargetChange?: (target: ComposerTarget) => void;
  onCancel?: () => void;
  /** Called whenever the composer's size may have changed. */
  onLayoutChange?: () => void;
};

type Translation = { en: string; nl: string };

const STRINGS = {
  taskName: { en: 'Task name', nl: 'Taaknaam' },
  quickAddPlaceholder: { en: 'e.g. Buy milk tomorrow p1 @errands', nl: 'bijv. Melk kopen morgen p1 @boodschappen' },
  quickAddHint: {
    en: '#project /section @label p1 and dates are recognised.',
    nl: '#project /sectie @label p1 en datums worden herkend.',
  },
  dueDate: { en: 'Date (e.g. tomorrow 9am)', nl: 'Datum (bijv. morgen 9:00)' },
  priority: { en: 'Priority', nl: 'Prioriteit' },
  priorityOption: { en: 'Priority __level__', nl: 'Prioriteit __level__' },
  project: { en: 'Project', nl: 'Project' },
  section: { en: 'Section', nl: 'Sectie' },
  noSection: { en: 'No section', nl: 'Geen sectie' },
  loading: { en: 'Loading…', nl: 'Laden…' },
  cancel: { en: 'Cancel', nl: 'Annuleren' },
  close: { en: 'Close', nl: 'Sluiten' },
  addTask: { en: 'Add task', nl: 'Taak toevoegen' },
  added: { en: 'Added', nl: 'Toegevoegd' },
  errorCreating: { en: 'Could not add the task.', nl: 'Kan de taak niet toevoegen.' },
  errorLoadingSections: { en: 'Could not load the sections.', nl: 'Kan de secties niet laden.' },
} satisfies Record<string, Translation>;

export type ComposerStringKey = keyof typeof STRINGS;

/** Translates one of the shared composer strings. */
export function translate(homey: HomeyWidget, key: ComposerStringKey, tags?: Record<string, string>): string {
  let text = homey.__(STRINGS[key]);
  Object.entries(tags ?? {}).forEach(([tag, value]) => {
    text = text.replace(`__${tag}__`, value);
  });
  return text;
}

/** Todoist shows P1 as the most urgent; the API calls that priority 4. P4 is also what Todoist uses when none is chosen. */
const PRIORITIES = [
  { level: 1, value: 4, color: '#d1453b' },
  { level: 2, value: 3, color: '#eb8909' },
  { level: 3, value: 2, color: '#246fe0' },
  { level: 4, value: 1, color: 'var(--homey-color-mono-400)' },
];
const DEFAULT_PRIORITY = 1;

const ICONS = {
  calendar: '<rect x="2.5" y="3.5" width="11" height="10" rx="2"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>',
  flag: '<path class="flag-fill" d="M3.5 3h8.25l-2 3 2 3H3.5z"/><path d="M3.5 14V2.5"/>',
  project: '<path d="M6.25 2.5 4.75 13.5M11.25 2.5 9.75 13.5M2.5 6h11M2 10h11"/>',
  section: '<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M2.5 6.5h11"/>',
  chevron: '<path d="m4.5 6.5 3.5 3.5 3.5-3.5"/>',
  check: '<path d="m3.5 8.5 3 3 6-7"/>',
};

const ADDED_CONFIRMATION_MS = 1800;

function icon(name: keyof typeof ICONS, className = 'composer-icon'): string {
  return `<svg class="${className}" viewBox="0 0 16 16" aria-hidden="true">${ICONS[name]}</svg>`;
}

/** Builds a project key that is unique across Todoist accounts. */
export function projectKey(project: Pick<ComposerProject, 'userId' | 'id'>): string {
  return `${project.userId}:${project.id}`;
}

/** A chip that looks custom but opens the native picker, through a transparent select on top of it. */
type SelectChip = {
  element: HTMLElement;
  select: HTMLSelectElement;
  label: HTMLElement;
};

/**
 * A form for adding a Todoist task. Native inputs and pickers are used, so phones show their own keyboard and lists.
 */
export class TaskComposer {
  public readonly element: HTMLFormElement;
  private readonly options: TaskComposerOptions;
  private readonly homey: HomeyWidget;
  private readonly titleInput: HTMLInputElement;
  private readonly dueInput: HTMLInputElement | null = null;
  private readonly projectChip: SelectChip | null = null;
  private readonly sectionChip: SelectChip;
  private readonly priorityChip: SelectChip | null = null;
  private readonly message: HTMLElement;
  private readonly messageText: HTMLElement;
  private readonly submitButton: HTMLButtonElement;
  private projects: ComposerProject[] = [];
  private project: ComposerProject | null = null;
  private sections: ComposerSection[] = [];
  private submitting = false;
  private sectionsRequest = 0;
  private addedTimer: number | null = null;

  constructor(options: TaskComposerOptions) {
    this.options = options;
    this.homey = options.homey;
    const t = (key: ComposerStringKey, tags?: Record<string, string>) => translate(this.homey, key, tags);

    this.element = document.createElement('form');
    this.element.className = 'composer';
    this.element.noValidate = true;
    this.element.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submit();
    });
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.options.onCancel) {
        event.preventDefault();
        this.options.onCancel();
      }
    });

    // Title and date, borderless like the Todoist quick add.
    const fields = document.createElement('div');
    fields.className = 'composer-fields';
    this.titleInput = this.createInput('composer-title', t(options.quickAdd ? 'quickAddPlaceholder' : 'taskName'));
    this.titleInput.maxLength = 500;
    this.titleInput.addEventListener('input', () => {
      this.hideAdded();
      this.updateSubmitState();
    });
    fields.append(this.titleInput);

    if (options.quickAdd) {
      const hint = document.createElement('p');
      hint.className = 'composer-hint';
      hint.textContent = t('quickAddHint');
      fields.append(hint);
    } else if (options.showDueDate) {
      const due = document.createElement('label');
      due.className = 'composer-due';
      due.innerHTML = icon('calendar');
      this.dueInput = this.createInput('composer-due-input', t('dueDate'));
      this.dueInput.maxLength = 100;
      due.append(this.dueInput);
      fields.append(due);
    }
    this.element.append(fields);

    // Where the task goes and how urgent it is.
    const chips = document.createElement('div');
    chips.className = 'composer-chips';
    if (options.loadSections) {
      this.projectChip = this.createSelectChip('composer-chip-project', 'project', t('project'));
      this.projectChip.select.addEventListener('change', () => void this.handleProjectChange());
      chips.append(this.projectChip.element);
    }

    this.sectionChip = this.createSelectChip('composer-chip-section', 'section', t('section'));
    this.sectionChip.element.hidden = true;
    this.sectionChip.select.addEventListener('change', () => {
      this.syncSectionChip();
      this.emitTargetChange();
    });
    chips.append(this.sectionChip.element);

    if (options.showPriority && !options.quickAdd) {
      this.priorityChip = this.createSelectChip('composer-chip-priority', 'flag', t('priority'));
      // A hidden "not chosen" option, so picking P4 is a real change and shows as P4 instead of the placeholder.
      const notChosen = new Option(t('priority'), '');
      notChosen.disabled = true;
      notChosen.hidden = true;
      this.priorityChip.select.append(
        notChosen,
        ...PRIORITIES.map(({ level, value }) => new Option(t('priorityOption', { level: String(level) }), String(value)))
      );
      this.priorityChip.select.value = '';
      this.priorityChip.select.addEventListener('change', () => this.syncPriorityChip());
      chips.append(this.priorityChip.element);
      this.syncPriorityChip();
    }
    this.element.append(chips);

    // Errors slide open between the fields and the buttons.
    this.message = document.createElement('div');
    this.message.className = 'composer-message';
    this.message.setAttribute('role', 'alert');
    this.messageText = document.createElement('p');
    this.messageText.className = 'composer-message-text';
    this.message.append(this.messageText);
    this.message.addEventListener('transitionend', () => this.options.onLayoutChange?.());
    this.element.append(this.message);

    const footer = document.createElement('div');
    footer.className = 'composer-footer';
    if (options.showCancel) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'composer-button composer-button-secondary';
      // Once a task has been added, "Cancel" would suggest it gets undone; the button then reads "Close".
      // Both labels share one spot, so the button keeps its size.
      cancelButton.innerHTML = '<span class="composer-cancel-label"></span><span class="composer-close-label"></span>';
      cancelButton.querySelector('.composer-cancel-label').textContent = t('cancel');
      cancelButton.querySelector('.composer-close-label').textContent = t('close');
      cancelButton.addEventListener('click', () => this.options.onCancel?.());
      footer.append(cancelButton);
    }

    this.submitButton = document.createElement('button');
    this.submitButton.type = 'submit';
    this.submitButton.className = 'composer-button composer-button-primary';
    // The label, the "Added" confirmation and the spinner share one spot, so the button never changes size.
    this.submitButton.innerHTML = `<span class="composer-button-label"></span><span class="composer-button-added" aria-live="polite">${icon('check')}<span></span></span><span class="composer-spinner" aria-hidden="true"></span>`;
    this.submitButton.querySelector('.composer-button-label').textContent = t('addTask');
    this.submitButton.querySelector('.composer-button-added span').textContent = t('added');
    // Keep focus in the text field when the button is tapped, so the on-screen keyboard stays open
    // instead of closing and reopening (which makes the dashboard jump).
    this.submitButton.addEventListener('mousedown', (event) => event.preventDefault());
    footer.append(this.submitButton);
    this.element.append(footer);

    this.updateSubmitState();
  }

  /** Sets the projects shown in the project picker (only used when loadSections is set). */
  public setProjects(projects: ComposerProject[]): void {
    if (!this.projectChip) return;

    this.projects = projects;
    const { select } = this.projectChip;
    select.replaceChildren();

    const accounts = new Set(projects.map((project) => project.description ?? ''));
    const groups = new Map<string, HTMLElement>();
    projects.forEach((project) => {
      const option = new Option(project.name, projectKey(project));
      if (accounts.size <= 1) {
        select.append(option);
        return;
      }

      const account = project.description ?? '';
      if (!groups.has(account)) {
        const group = document.createElement('optgroup');
        group.label = account;
        groups.set(account, group);
        select.append(group);
      }
      groups.get(account)!.append(option);
    });

    this.syncProjectChip();
  }

  /** Sets the project tasks are added to, with its sections and the section to preselect. */
  public setProject(project: ComposerProject, sections: ComposerSection[], sectionId: string | null = null): void {
    this.project = project;
    this.syncProjectChip();
    this.setSections(sections, sectionId);
    this.updateSubmitState();
  }

  /** Replaces the section options, keeping the current choice when it still exists. */
  public setSections(sections: ComposerSection[], sectionId: string | null = this.sectionChip.select.value || null): void {
    this.sections = sections;
    const { element, select } = this.sectionChip;
    select.replaceChildren(
      new Option(translate(this.homey, 'noSection'), ''),
      ...sections.map((section) => new Option(section.name, section.id))
    );
    select.value = sections.some((section) => section.id === sectionId) ? sectionId : '';

    const wasHidden = element.hidden;
    element.hidden = sections.length === 0;
    this.syncSectionChip();
    if (wasHidden !== element.hidden) this.options.onLayoutChange?.();
  }

  /** Preselects a section, e.g. when the composer is opened from a section's "Add task" row. */
  public selectSection(sectionId: string | null): void {
    this.sectionChip.select.value = this.sections.some((section) => section.id === sectionId) ? sectionId : '';
    this.syncSectionChip();
  }

  public getTarget(): ComposerTarget | null {
    if (!this.project) return null;
    const sectionId = this.sectionChip.select.value;
    return {
      project: this.project,
      section: this.sections.find((section) => section.id === sectionId) ?? null,
    };
  }

  public focus(): void {
    this.titleInput.focus();
  }

  /** Clears the typed values, the priority and any message. The project and section stay. */
  public reset(): void {
    this.titleInput.value = '';
    if (this.dueInput) this.dueInput.value = '';
    if (this.priorityChip) {
      this.priorityChip.select.value = '';
      this.syncPriorityChip();
    }
    this.hideMessage();
    this.updateSubmitState();
  }

  /** Resets the form and forgets the tasks added since it was opened, e.g. when a pop-up closes. */
  public endSession(): void {
    this.reset();
    this.hideAdded();
    this.element.classList.remove('has-added');
  }

  private async submit(): Promise<void> {
    const content = this.titleInput.value.trim();
    const target = this.getTarget();
    if (!content || !target || this.submitting) return;

    try {
      this.homey.hapticFeedback();
    } catch {
      // Only allowed right after a touch; submitting with the keyboard's Enter key is not one.
    }

    this.submitting = true;
    this.element.classList.add('submitting');
    this.updateSubmitState();
    this.hideMessage();

    try {
      const task = await this.homey.api('POST', `/users/${target.project.userId}/tasks`, {
        content,
        projectId: target.project.id,
        sectionId: target.section?.id,
        priority: Number(this.priorityChip?.select.value || DEFAULT_PRIORITY),
        dueString: this.dueInput?.value.trim() || undefined,
        quickAdd: this.options.quickAdd,
      }) as CreatedTask;

      this.reset();
      this.element.classList.add('has-added');
      if (this.options.showSuccessMessage) this.showAdded();
      this.options.onCreated?.(task, target);
    } catch (error) {
      const technical = (error as Error)?.message;
      this.showMessage([translate(this.homey, 'errorCreating'), technical].filter(Boolean).join(' '));
    } finally {
      this.submitting = false;
      this.element.classList.remove('submitting');
      this.updateSubmitState();
      // Keep the keyboard open so the next task can be typed right away.
      this.titleInput.focus();
    }
  }

  private async handleProjectChange(): Promise<void> {
    const project = this.projects.find((item) => projectKey(item) === this.projectChip.select.value);
    if (!project || !this.options.loadSections) return;

    this.project = project;
    this.syncProjectChip();
    this.hideMessage();
    const request = ++this.sectionsRequest;
    this.sectionChip.element.setAttribute('aria-busy', 'true');
    this.sectionChip.label.textContent = translate(this.homey, 'loading');
    try {
      const sections = await this.options.loadSections(project);
      if (request !== this.sectionsRequest) return;
      this.setSections(sections, null);
    } catch (error) {
      if (request !== this.sectionsRequest) return;
      this.setSections([], null);
      const technical = (error as Error)?.message;
      this.showMessage([translate(this.homey, 'errorLoadingSections'), technical].filter(Boolean).join(' '));
    } finally {
      if (request === this.sectionsRequest) this.sectionChip.element.removeAttribute('aria-busy');
    }
    this.emitTargetChange();
  }

  private emitTargetChange(): void {
    const target = this.getTarget();
    if (target) this.options.onTargetChange?.(target);
  }

  private showMessage(text: string): void {
    this.messageText.textContent = text;
    this.message.classList.add('visible');
    this.options.onLayoutChange?.();
  }

  private hideMessage(): void {
    if (!this.message.classList.contains('visible')) return;

    this.message.classList.remove('visible');
    this.options.onLayoutChange?.();
  }

  /** Shows "Added" in place of the button label for a moment; typing the next task ends it early. */
  private showAdded(): void {
    this.hideAdded();
    this.element.classList.add('added');
    this.addedTimer = window.setTimeout(() => this.hideAdded(), ADDED_CONFIRMATION_MS);
  }

  private hideAdded(): void {
    if (this.addedTimer !== null) window.clearTimeout(this.addedTimer);
    this.addedTimer = null;
    this.element.classList.remove('added');
  }

  private syncProjectChip(): void {
    if (!this.projectChip || !this.project) return;
    this.projectChip.select.value = projectKey(this.project);
    this.projectChip.label.textContent = this.project.name;
  }

  private syncSectionChip(): void {
    const { select, label } = this.sectionChip;
    label.textContent = select.selectedOptions[0]?.text ?? translate(this.homey, 'noSection');
    this.sectionChip.element.classList.toggle('is-set', select.value !== '');
  }

  private syncPriorityChip(): void {
    if (!this.priorityChip) return;

    const { element, select, label } = this.priorityChip;
    const priority = PRIORITIES.find(({ value }) => String(value) === select.value);
    element.classList.toggle('is-set', priority != null);
    if (priority) {
      element.dataset.level = String(priority.level);
      element.style.setProperty('--chip-color', priority.color);
      label.textContent = `P${priority.level}`;
    } else {
      delete element.dataset.level;
      element.style.removeProperty('--chip-color');
      label.textContent = translate(this.homey, 'priority');
    }
  }

  private updateSubmitState(): void {
    this.submitButton.disabled = this.submitting || !this.project || this.titleInput.value.trim() === '';
  }

  private createInput(className: string, placeholder: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.placeholder = placeholder;
    input.setAttribute('aria-label', placeholder);
    input.autocomplete = 'off';
    input.setAttribute('autocapitalize', 'sentences');
    input.setAttribute('enterkeyhint', 'send');
    return input;
  }

  private createSelectChip(className: string, iconName: keyof typeof ICONS, label: string): SelectChip {
    const element = document.createElement('span');
    element.className = `composer-chip ${className}`;
    element.innerHTML = `${icon(iconName)}<span class="composer-chip-label"></span>${icon('chevron', 'composer-icon composer-chevron')}`;

    const select = document.createElement('select');
    select.className = 'composer-chip-select';
    select.setAttribute('aria-label', label);
    select.title = label;
    element.append(select);

    return { element, select, label: element.querySelector<HTMLElement>('.composer-chip-label') };
  }

}
