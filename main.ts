import { App, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface PeriodicRemindersSettings {
	enable: boolean;
	reminders: string;
	interval: number;
}

const DEFAULT_SETTINGS: PeriodicRemindersSettings = {
	enable: false,
	reminders: "Update your reminders",
	interval: 15,
}

export default class PeriodicReminders extends Plugin {
	settings: PeriodicRemindersSettings;
	intervalInstance: number;
	modal: ReminderModal;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new PeriodicRemindersSettingTab(this.app, this));

		if (this.settings.enable) {
			this.startCountdown();
		}

		this.modal = new ReminderModal(this.app, this.settings);
	}

	startCountdown() {
		this.registerInterval(this.intervalInstance = window.setInterval(() => this.openModal(), this.settings.interval * 60000));
	}

	openModal() {
		this.modal.open();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ReminderModal extends Modal {
	settings: PeriodicRemindersSettings
	shuffledReminders: Array<string>
	count: number = 0;

	constructor(app: App, settings: PeriodicRemindersSettings) {
		super(app);
		this.settings = settings;
		this.prepReminders();
		const { contentEl } = this;
		contentEl.addClass("periodic-reminders");
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.shuffledReminders[this.count]);
		if (this.count+1 >= this.shuffledReminders.length) {this.count = 0}
		else {this.count++;}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	prepReminders() {
		let reminderArray = this.settings.reminders.split("\n");
		this.shuffledReminders = this.shuffleArray(reminderArray);
	}

	shuffleArray<T>(array: T[]): T[] { const arrayCopy = [...array]; for (let i = arrayCopy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]]; } return arrayCopy; }
}

class PeriodicRemindersSettingTab extends PluginSettingTab {
	plugin: PeriodicReminders;

	constructor(app: App, plugin: PeriodicReminders) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable Reminders')
			.setDesc('If enabled, reminders will start popping up. Disable to end reminders.')
			.addToggle(bool => bool
				.setValue(this.plugin.settings.enable)
				.onChange(async (value) => {
					this.plugin.settings.enable = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.enable) {
						this.plugin.startCountdown();
						this.plugin.modal.prepReminders();
					} else {
						window.clearInterval(this.plugin.intervalInstance);
					}
				}));

		new Setting(containerEl)
			.setName('Minutes Between Reminders')
			.setDesc('Enter an amount of minutes between reminder popups.')
			.addSlider(num => num
				.setLimits(1, 60, 1)
				.setValue(this.plugin.settings.interval)
				.onChange(async (value) => {
					this.plugin.settings.interval = value;
					this.plugin.startCountdown();
					window.clearInterval(this.plugin.intervalInstance);
					await this.plugin.saveSettings();
				})
				.setDynamicTooltip()
				.showTooltip()
			);

		new Setting(containerEl)
			.setName('Reminders Text')
			.setDesc('The text of the reminders you want shown to you. One per line. These will be displayed in a random order.')
			.addTextArea(area => area
				.setPlaceholder('One per line')
				.setValue(this.plugin.settings.reminders)
				.onChange(async (value) => {
					this.plugin.settings.reminders = value;
					this.plugin.modal.prepReminders();
					await this.plugin.saveSettings();
				}));
	}
}
