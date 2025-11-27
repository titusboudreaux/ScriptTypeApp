/**
 * UI MANAGER MODULE
 * Handles all UI interactions and view management
 * Manages: modals, view switching, theme, settings
 */

class UIManager {
    constructor() {
        this.currentView = 'dashboard-view';
        this.currentTheme = 'light';
        this.fontSize = 18;
        this.currentVersion = 'esv';
        this.debouncedSave = null;
        this.ready = false;
        this.initPromise = this.init();
    }

    /**
     * Wait for manager to be ready
     */
    async ensureReady() {
        if (!this.ready) {
            await this.initPromise;
        }
    }

    /**
     * Initialize UI Manager
     */
    async init() {
        await this.loadSettings();
        this.ensureVersionSection();
        this.setupEventListeners();
        this.setupModalHandlers();
        this.setupAccessibility();
        this.ready = true;
    }

    /**
     * Load saved user settings
     */
    async loadSettings() {
        const settings = await storageManager.getSettings();
        this.currentTheme = settings.theme || 'light';
        this.fontSize = settings.fontSize || 18;
        this.currentVersion = settings.version || 'esv';

        this.applyTheme(this.currentTheme);
        this.applyFontSize(this.fontSize);
        this.updateVersionDisplay();

        // Update typing mode select
        const typingModeSelect = document.getElementById('typing-mode-select');
        if (typingModeSelect) {
            typingModeSelect.value = settings.typingMode || 'first-letter';
        }

        // Update case sensitive checkbox
        const caseSensitiveCheckbox = document.getElementById('case-sensitive-checkbox');
        if (caseSensitiveCheckbox) {
            caseSensitiveCheckbox.checked = settings.caseSensitive || false;
        }
    }

    /**
     * Guarantee the version selector UI exists even if HTML markup changes
     */
    ensureVersionSection() {
        const modalBody = document.querySelector('#settings-modal .space-y-6');
        if (!modalBody) return;

        // Check if version select exists in the modal, if not add it (though it should be there in new HTML)
        let versionSelect = document.getElementById('version-select');
        if (!versionSelect) {
            // Logic to add it if missing, but we trust index.html for now
        }
    }

    /**
     * Apply theme
     */
    async applyTheme(theme) {
        this.currentTheme = theme;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        document.documentElement.setAttribute('data-theme', theme);

        await storageManager.saveSettings({
            theme: this.currentTheme,
            fontSize: this.fontSize,
        });
    }

    /**
     * Apply font size
     */
    async applyFontSize(size) {
        this.fontSize = Math.max(14, Math.min(28, size));
        const textContainer = document.getElementById('text-container');
        if (textContainer) {
            textContainer.style.fontSize = `${this.fontSize}px`;
        }

        // Update associated elements
        const display = document.getElementById('font-size-display');
        if (display) {
            display.textContent = `${this.fontSize}px`;
        }

        const input = document.getElementById('font-size-input');
        if (input) {
            input.value = this.fontSize;
        }

        await storageManager.saveSettings({
            theme: this.currentTheme,
            fontSize: this.fontSize,
        });
    }

    /**
     * Apply typing mode
     */
    async applyTypingMode(mode) {
        await storageManager.saveSettings({ typingMode: mode });

        // Show notification
        const modeName = mode === 'first-letter' ? 'First Letter' : 'Full Word';
        this.showTemporaryNotification(`Typing mode changed to ${modeName}. Restart current chapter to apply.`);
    }

    /**
     * Apply case sensitive setting
     */
    async applyCaseSensitive(enabled) {
        await storageManager.saveSettings({ caseSensitive: enabled });

        // Show notification
        const status = enabled ? 'enabled' : 'disabled';
        this.showTemporaryNotification(`Case sensitive ${status}. Restart current chapter to apply.`);
    }

    /**
     * Show temporary notification (toast-style)
     */
    showTemporaryNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300 opacity-0';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.remove('opacity-0');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * MODAL MANAGEMENT
     */

    /**
     * Show modal by ID
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            this.trapFocus(modal);
        }
    }

    /**
     * Hide modal by ID
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        // Settings modal
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            const settingsCloseButtons = settingsModal.querySelectorAll('.modal-close');
            settingsCloseButtons.forEach(btn => {
                btn.addEventListener('click', () => this.hideModal('settings-modal'));
            });

            // Backdrop click to close
            const settingsBackdrop = document.getElementById('settings-backdrop');
            if (settingsBackdrop) {
                settingsBackdrop.addEventListener('click', () => {
                    this.hideModal('settings-modal');
                });
            }
        }

        // Chapter complete modal
        const chapterCompleteBackdrop = document.getElementById('chapter-complete-backdrop');
        if (chapterCompleteBackdrop) {
            chapterCompleteBackdrop.addEventListener('click', () => {
                // Don't close on backdrop click for completion modal
            });
        }

        // How to play modal
        const howToPlayBackdrop = document.getElementById('how-to-play-backdrop');
        if (howToPlayBackdrop) {
            howToPlayBackdrop.addEventListener('click', () => {
                // Don't close on backdrop click for how to play
            });
        }

        // Error modal
        const errorBackdrop = document.getElementById('error-backdrop');
        if (errorBackdrop) {
            errorBackdrop.addEventListener('click', () => {
                this.hideModal('error-modal');
            });
        }
    }

    /**
     * Focus trap for modals (accessibility)
     */
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        modal.addEventListener('keydown', handleKeyDown);
        firstElement.focus();
    }

    /**
     * Setup Accessibility
     */
    setupAccessibility() {
        // Add any global accessibility setup here
    }

    /**
     * Show error modal
     */
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        this.showModal('error-modal');
    }

    /**
     * Show how to play modal
     */
    showHowToPlay() {
        this.showModal('how-to-play-modal');
    }

    /**
     * Show chapter complete modal
     */
    showChapterComplete(data) {
        document.getElementById('completion-location').textContent =
            `${data.book.name} ${data.chapterNumber} Complete!`;
        document.getElementById('completion-word-count').textContent = data.wordsTyped;
        document.getElementById('completion-time').textContent = `${data.sessionDuration}m`;
        document.getElementById('completion-wpm').textContent = data.wpm;

        this.showModal('chapter-complete-modal');
    }

    /**
     * VIEW MANAGEMENT
     */

    /**
     * Switch to dashboard view
     */
    async showDashboard() {
        await this.ensureReady();
        this.switchView('dashboard-view');
        await this.updateDashboard();
    }

    /**
     * Switch to library view
     */
    async showLibrary() {
        await this.ensureReady();
        this.switchView('library-view');
        await libraryManager.renderLibrary();
    }

    /**
     * Switch to typing view
     */
    showTypingView() {
        this.switchView('typing-view');

        // Reset scroll position to top when showing typing view
        const textContainer = document.getElementById('text-container');
        if (textContainer) {
            textContainer.scrollTop = 0;
        }
    }

    /**
     * Switch view
     */
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('#app-main .view').forEach(view => {
            view.classList.add('hidden');
            view.classList.remove('active'); // Keep active class for legacy checks if any
        });

        // Show selected view
        const view = document.getElementById(viewName);
        if (view) {
            view.classList.remove('hidden');
            view.classList.add('active');
        } else {
            console.warn(`View "${viewName}" not found.`);
        }

        // Update nav buttons
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.view === viewName;
            if (isActive) {
                btn.classList.add('bg-primary/10', 'text-primary', 'border-r-4', 'border-primary'); // Added border for extra emphasis
                btn.classList.remove('text-subtext-light', 'dark:text-subtext-dark');
            } else {
                btn.classList.remove('bg-primary/10', 'text-primary', 'border-r-4', 'border-primary');
                btn.classList.add('text-subtext-light', 'dark:text-subtext-dark');
            }
        });

        this.currentView = viewName;
        this.updateViewHeaders(viewName);

        // If switching to dashboard, refresh its content
        if (viewName === 'dashboard-view') {
            this.updateDashboard();
        }
    }

    /**
     * Update headers based on current view
     */
    updateViewHeaders(viewName) {
        if (viewName === 'typing-view') {
            const bookDisplay = document.getElementById('typing-book-title');
            const chapterDisplay = document.getElementById('typing-chapter-title');

            // These are updated by updateLocationDisplay usually, but we ensure visibility here if needed
        }
    }

    /**
     * Update location display in typing view
     */
    updateLocationDisplay(book, chapterNumber) {
        const bookDisplay = document.getElementById('typing-book-title');
        const chapterDisplay = document.getElementById('typing-chapter-title');

        if (bookDisplay) bookDisplay.textContent = book.name;
        if (chapterDisplay) chapterDisplay.textContent = `Chapter ${chapterNumber}`;
    }

    /**
     * Update dashboard with current stats
     */
    async updateDashboard() {
        // Ensure dataLoader is ready before rendering anything that depends on it
        await dataLoader.ensureReady();

        await notesManager.renderNotesHub();
        const stats = await storageManager.getStats();
        const completedChapters = await storageManager.getCompletedChaptersCount();
        const totalChapters = dataLoader.getTotalChapters();

        // Update overall progress
        const progressFill = document.getElementById('overall-progress-fill');
        const progressText = document.getElementById('overall-progress-text');
        const percentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${percentage}% Complete`;
        }

        // Update stats cards
        const statWords = document.getElementById('stat-words');
        if (statWords) statWords.textContent = stats.totalWordsTyped.toLocaleString();

        const statStreak = document.getElementById('stat-streak');
        if (statStreak) statStreak.textContent = `${stats.currentStreak} Days`;

        const statWpm = document.getElementById('stat-wpm');
        if (statWpm) statWpm.textContent = stats.averageWPM;
    }

    /**
     * Select a book to jump to
     */
    async selectBook(bookId, chapterNumber) {
        const savedPosition = await storageManager.getPosition();
        const resumePosition = savedPosition && savedPosition.bookId === bookId && savedPosition.chapterNumber === chapterNumber
            ? savedPosition
            : null;

        const loaded = await window.app.loadChapter(bookId, chapterNumber, resumePosition);
        if (loaded) {
            this.showTypingView();
        }
    }

    /**
     * Populate version select
     */
    populateVersionSelect() {
        const selects = [
            document.getElementById('version-select'), // Settings modal
            document.getElementById('library-version-select') // Library view
        ];

        const versions = dataLoader.getAvailableVersions();
        const currentVersion = dataLoader.getCurrentVersion();

        selects.forEach(select => {
            if (!select) return;

            select.innerHTML = '';
            versions.forEach(v => {
                const option = document.createElement('option');
                option.value = v;
                option.textContent = v.toUpperCase();
                if (v === currentVersion) option.selected = true;
                select.appendChild(option);
            });
        });
    }

    /**
     * Notify version change
     */
    notifyVersionChange(version) {
        this.updateVersionDisplay();
        this.populateVersionSelect(); // Ensure all selectors are synced
    }

    updateVersionDisplay() {
        // If we had a global version display, update it here
    }

    updateTypingStats(wpm, progressPercentage) {
        const wpmCounter = document.getElementById('wpm-counter');
        if (wpmCounter) wpmCounter.textContent = `${wpm} WPM`;

        const progressCounter = document.getElementById('progress-counter');
        if (progressCounter) progressCounter.textContent = `${progressPercentage}%`;
    }



    /**
     * EVENT LISTENERS
     */

    /**
     * Setup main event listeners
     */
    setupEventListeners() {
        // Theme selector
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
            themeSelect.value = this.currentTheme;
        }

        // Version selector (Settings Modal)
        const versionSelect = document.getElementById('version-select');
        if (versionSelect) {
            versionSelect.addEventListener('change', async (e) => {
                const success = await window.app.changeVersion(e.target.value);
                if (!success) {
                    this.showError(`Version ${e.target.value.toUpperCase()} is not available`);
                    e.target.value = this.currentVersion;
                }
            });
        }

        // Font size controls
        const fontSizeInput = document.getElementById('font-size-input');
        if (fontSizeInput) {
            fontSizeInput.value = this.fontSize;
            fontSizeInput.addEventListener('change', (e) => {
                this.applyFontSize(parseInt(e.target.value));
            });
        }

        const fontDecreaseBtn = document.getElementById('font-size-decrease');
        const fontIncreaseBtn = document.getElementById('font-size-increase');

        if (fontDecreaseBtn) {
            fontDecreaseBtn.addEventListener('click', () => {
                this.applyFontSize(this.fontSize - 2);
            });
        }

        if (fontIncreaseBtn) {
            fontIncreaseBtn.addEventListener('click', () => {
                this.applyFontSize(this.fontSize + 2);
            });
        }

        // Typing mode selector
        const typingModeSelect = document.getElementById('typing-mode-select');
        if (typingModeSelect) {
            typingModeSelect.addEventListener('change', async (e) => {
                await this.applyTypingMode(e.target.value);
            });
        }

        // Case sensitive checkbox
        const caseSensitiveCheckbox = document.getElementById('case-sensitive-checkbox');
        if (caseSensitiveCheckbox) {
            caseSensitiveCheckbox.addEventListener('change', async (e) => {
                await this.applyCaseSensitive(e.target.checked);
            });
        }



        // Export data button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const data = await storageManager.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bible-type-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }

        // Reset progress button
        const resetBtn = document.getElementById('clear-data-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                    await storageManager.clearAllData();
                    // Reload the app to reset state completely
                    window.location.reload();
                }
            });
        }

        // Navigation Buttons
        const navButtons = document.querySelectorAll('#app-nav .nav-btn, .nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const viewName = btn.dataset.view;
                if (btn.id === 'nav-settings') {
                    this.showModal('settings-modal');
                    return;
                }

                if (viewName === 'typing-view') {
                    // This is the "Resume" button
                    const position = await storageManager.getPosition();
                    const fallbackBook = 1;
                    const fallbackChapter = 1;
                    const bookId = position?.bookId ?? fallbackBook;
                    const chapterNumber = position?.chapterNumber ?? fallbackChapter;
                    await this.selectBook(bookId, chapterNumber);
                } else if (viewName === 'library-view') {
                    await this.showLibrary();
                } else if (viewName) {
                    this.switchView(viewName);
                }
            });
        });

        // Mobile Menu Button
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('aside');
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('hidden');
                sidebar.classList.toggle('absolute');
                sidebar.classList.toggle('inset-0');
                sidebar.classList.toggle('z-50');
                sidebar.classList.toggle('w-full');
            });
        }

        // Chapter complete modal buttons
        const nextChapterBtn = document.getElementById('next-chapter-btn');
        if (nextChapterBtn) {
            nextChapterBtn.addEventListener('click', () => {
                this.hideModal('chapter-complete-modal');
                window.app.goToNextChapter();
            });
        }

        const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => {
                this.hideModal('chapter-complete-modal');
                this.switchView('dashboard-view');
            });
        }

        // How to play modal
        const startTypingBtn = document.getElementById('start-typing-btn');
        if (startTypingBtn) {
            startTypingBtn.addEventListener('click', () => {
                this.hideModal('how-to-play-modal');
                storageManager.markFirstTimeUserShown();
                // If we are on dashboard, maybe go to typing view? 
                // Or just stay on dashboard. Let's stay on dashboard.
            });
        }

        // Error modal close
        const errorCloseBtn = document.getElementById('error-close-btn');
        if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', () => {
                this.hideModal('error-modal');
            });
        }

        // Resume Overlay Button
        const resumeOverlayBtn = document.getElementById('resume-overlay-btn');
        if (resumeOverlayBtn) {
            resumeOverlayBtn.addEventListener('click', () => {
                window.app.resumeTyping('notes');
            });
        }

        // Back to Library Button
        const backToLibraryBtn = document.getElementById('back-to-library-btn');
        if (backToLibraryBtn) {
            backToLibraryBtn.addEventListener('click', () => {
                this.switchView('library-view');
            });
        }
    }
}

// Create app instance and expose it on window for UI manager
const uiManager = new UIManager();
window.uiManager = uiManager;
