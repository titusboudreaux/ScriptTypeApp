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

        // Update TTS settings
        await this.updateTTSSettings(settings);
    }

    /**
     * Guarantee the version selector UI exists even if HTML markup changes
     */
    ensureVersionSection() {
        const modalBody = document.querySelector('#settings-modal .modal-body');
        if (!modalBody) {
            return;
        }

        let versionGroup = modalBody.querySelector('[data-role="version-settings"]');
        if (!versionGroup) {
            versionGroup = document.createElement('div');
            versionGroup.className = 'settings-group';
            versionGroup.setAttribute('data-role', 'version-settings');
            versionGroup.innerHTML = `
                <label for="version-select">Bible Version</label>
                <select id="version-select" class="input-select"></select>
                <p class="settings-help-text">Progress is tracked separately for each version</p>
            `;
            const firstGroup = modalBody.querySelector('.settings-group');
            if (firstGroup) {
                modalBody.insertBefore(versionGroup, firstGroup);
            } else {
                modalBody.appendChild(versionGroup);
            }
        }

        if (!versionGroup.querySelector('label')) {
            const label = document.createElement('label');
            label.setAttribute('for', 'version-select');
            label.textContent = 'Bible Version';
            versionGroup.prepend(label);
        }

        let versionSelect = versionGroup.querySelector('#version-select');
        if (!versionSelect) {
            versionSelect = document.createElement('select');
            versionSelect.id = 'version-select';
            versionSelect.className = 'input-select';
            const helpText = versionGroup.querySelector('.settings-help-text');
            versionGroup.insertBefore(versionSelect, helpText || null);
        }

        if (!versionGroup.querySelector('.settings-help-text')) {
            const helpText = document.createElement('p');
            helpText.className = 'settings-help-text';
            helpText.textContent = 'Progress is tracked separately for each version';
            versionGroup.appendChild(helpText);
        }
    }

    /**
     * Apply theme
     */
    async applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        await storageManager.saveSettings({
            theme: this.currentTheme,
            fontSize: this.fontSize,
        });
        this.notifyThemeChange();
    }

    /**
     * Apply font size
     */
    async applyFontSize(size) {
        this.fontSize = Math.max(14, Math.min(28, size));
        document.documentElement.style.setProperty('--font-base', `${this.fontSize}px`);
        
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
        notification.className = 'toast-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Setup TTS controls
     */
    setupTTSControls() {
        // Check if TTS is available
        if (!audioManager.isAvailableCheck()) {
            const unavailableMsg = document.getElementById('tts-unavailable-message');
            if (unavailableMsg) unavailableMsg.style.display = 'block';
            
            const ttsGroup = document.getElementById('tts-settings-group');
            if (ttsGroup) ttsGroup.style.display = 'none';
            return;
        }

        // TTS enabled checkbox
        const ttsEnabledCheckbox = document.getElementById('tts-enabled-checkbox');
        if (ttsEnabledCheckbox) {
            ttsEnabledCheckbox.addEventListener('change', async (e) => {
                await audioManager.toggle();
                this.toggleTTSOptions(e.target.checked);
            });
        }

        // Read word checkbox
        const readWordCheckbox = document.getElementById('tts-read-word-checkbox');
        if (readWordCheckbox) {
            readWordCheckbox.addEventListener('change', async (e) => {
                await audioManager.setReadWord(e.target.checked);
            });
        }

        // Speed select
        const speedSelect = document.getElementById('tts-speed-select');
        if (speedSelect) {
            speedSelect.addEventListener('change', async (e) => {
                await audioManager.setSpeed(parseFloat(e.target.value));
            });
        }
    }

    /**
     * Update TTS settings UI
     */
    async updateTTSSettings(settings) {
        if (!audioManager.isAvailableCheck()) return;

        const ttsEnabledCheckbox = document.getElementById('tts-enabled-checkbox');
        if (ttsEnabledCheckbox) {
            ttsEnabledCheckbox.checked = settings.ttsEnabled || false;
            this.toggleTTSOptions(settings.ttsEnabled || false);
        }

        const readWordCheckbox = document.getElementById('tts-read-word-checkbox');
        if (readWordCheckbox) {
            readWordCheckbox.checked = settings.ttsReadWord !== undefined ? settings.ttsReadWord : true;
        }

        const speedSelect = document.getElementById('tts-speed-select');
        if (speedSelect) {
            speedSelect.value = (settings.ttsSpeed || 1.0).toString();
        }
    }

    /**
     * Toggle TTS options visibility
     */
    toggleTTSOptions(show) {
        const ttsOptions = document.getElementById('tts-options');
        if (ttsOptions) {
            ttsOptions.style.display = show ? 'flex' : 'none';
        }
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
            modal.classList.add('active');
            this.trapFocus(modal);
        }
    }

    /**
     * Hide modal by ID
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        // Settings modal
        const settingsModal = document.getElementById('settings-modal');
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

        // Update book progress
        const bookProgress = data.bookProgress;
        const bookProgressFill = document.getElementById('book-progress-fill');
        if (bookProgressFill) {
            bookProgressFill.style.width = `${bookProgress.percentage}%`;
        }
        
        const bookProgressText = document.getElementById('book-progress-text');
        if (bookProgressText) {
            bookProgressText.textContent = 
                `${bookProgress.completed} of ${bookProgress.total} chapters completed`;
        }

        // Update estimated time to complete book
        const estimateElement = document.getElementById('book-completion-time');
        if (estimateElement) {
            estimateElement.textContent = data.estimatedTimeToCompleteBook;
        }

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
        
        const typingContent = document.querySelector('.typing-content');
        if (typingContent) {
            typingContent.scrollTop = 0;
        }
    }

    /**
     * Switch view
     */
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('#app-main .view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const view = document.getElementById(viewName);
        if (view) {
            view.classList.add('active');
        } else {
            console.warn(`View "${viewName}" not found.`);
        }

        // Update nav buttons
        document.querySelectorAll('#app-nav .nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        this.currentView = viewName;
        this.updateHeader(viewName);

        // If switching to dashboard, refresh its content
        if (viewName === 'dashboard-view') {
            this.updateDashboard();
        }
    }

    /**
     * Update the persistent header based on the current view
     */
    updateHeader(viewName) {
        const headerTitle = document.getElementById('header-title');
        const backBtn = document.getElementById('header-back-btn');
        const settingsBtn = document.getElementById('header-settings-btn');

        switch (viewName) {
            case 'dashboard-view':
                headerTitle.textContent = 'Bible Type';
                backBtn.style.display = 'none';
                settingsBtn.style.display = 'flex';
                break;
            case 'library-view':
                headerTitle.textContent = 'Library';
                backBtn.style.display = 'flex';
                settingsBtn.style.display = 'flex';
                break;
            case 'typing-view':
                const bookDisplay = document.getElementById('current-book');
                const chapterDisplay = document.getElementById('current-chapter');
                if (bookDisplay && chapterDisplay && bookDisplay.textContent) {
                    headerTitle.textContent = `${bookDisplay.textContent} ${chapterDisplay.textContent}`;
                } else {
                    headerTitle.textContent = 'Reader';
                }
                backBtn.style.display = 'flex';
                settingsBtn.style.display = 'flex'; // Or hide if not needed in typing view
                break;
        }
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
        const percentage = Math.round((completedChapters / totalChapters) * 100);

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${completedChapters} of ${totalChapters} chapters completed`;
        }

        // This was removed in a previous step, but it's needed.
        // Update stats cards
        document.getElementById('stat-words').textContent = stats.totalWordsTyped.toLocaleString();
        document.getElementById('stat-streak').textContent = stats.currentStreak;
        document.getElementById('stat-wpm').textContent = stats.averageWPM;

        // The `updateBooksGrid` was also removed but is required for the dashboard.
        // Update books grid
        await this.updateBooksGrid();
    }

    /**
     * Update books grid
     */
    async updateBooksGrid() {
        const booksGrid = document.getElementById('books-grid');
        if (!booksGrid) return; // Add guard clause
        booksGrid.innerHTML = '';

        const books = dataLoader.getAllBooks();
        for (const book of books) {
            const progress = await storageManager.getBookProgress(book.id);
            const isCompleted = progress.completed === progress.total;

            const bookItem = document.createElement('div');
            bookItem.className = `book-item ${isCompleted ? 'completed' : ''}`;
            bookItem.role = 'button';
            bookItem.tabIndex = 0;

            bookItem.innerHTML = `
                <div class="book-name">${book.abbr}</div>
                <div class="book-progress">
                    <div class="book-progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
                <div class="book-chapter-count">${progress.completed}/${progress.total}</div>
            `;

            bookItem.addEventListener('click', () => this.selectBook(book.id, 1));
            bookItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectBook(book.id, 1);
                }
            });

            booksGrid.appendChild(bookItem);
        }
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

        // Version selector
        const versionSelect = document.getElementById('version-select');
        if (versionSelect) {
            versionSelect.addEventListener('change', async (e) => {
                const success = await window.app.changeVersion(e.target.value);
                if (!success) {
                    this.showError(`Version ${e.target.value.toUpperCase()} is not available`);
                    e.target.value = this.currentVersion;
                }
            });
            this.populateVersionSelect();
        }

        // Font size controls
        const fontSizeInput = document.getElementById('font-size-input');
        if (fontSizeInput) {
            fontSizeInput.value = this.fontSize;
            fontSizeInput.addEventListener('change', (e) => {
                this.applyFontSize(parseInt(e.target.value));
            });
        }

        const fontDecreaseBtn = document.getElementById('font-decrease-btn');
        const fontIncreaseBtn = document.getElementById('font-increase-btn');

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

        // TTS controls
        this.setupTTSControls();

        // Book and chapter selection
        const bookSelect = document.getElementById('book-select');
        const chapterSelect = document.getElementById('chapter-select');

        if (bookSelect) {
            dataLoader.getAllBooks().forEach(book => {
                const option = document.createElement('option');
                option.value = book.id;
                option.textContent = book.name;
                bookSelect.appendChild(option);
            });

            bookSelect.addEventListener('change', (e) => {
                this.updateChapterSelect(parseInt(e.target.value));
            });

            // Initialize chapter select
            this.updateChapterSelect(1);
        }

        // Jump to chapter button
        const jumpBtn = document.getElementById('jump-to-chapter-btn');
        if (jumpBtn) {
            jumpBtn.addEventListener('click', () => {
                const bookId = parseInt(bookSelect.value);
                const chapterNumber = parseInt(chapterSelect.value);
                this.hideModal('settings-modal');
                this.selectBook(bookId, chapterNumber);
            });
        }

        // Reset progress button
        const resetBtn = document.getElementById('reset-progress-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                    await storageManager.clearAllData();
                    // Reload the app to reset state completely
                    window.location.reload();
                }
            });
        }

        // New V2 Navigation
        const navButtons = document.querySelectorAll('#app-nav .nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const viewName = btn.dataset.view;
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
                }
                 else {
                    this.switchView(viewName);
                }
            });
        });

        const headerBackBtn = document.getElementById('header-back-btn');
        if (headerBackBtn) {
            headerBackBtn.addEventListener('click', () => {
                // For now, back always goes to dashboard. This can be made more context-aware.
                this.switchView('dashboard-view');
            });
        }

        const headerSettingsBtn = document.getElementById('header-settings-btn');
        if (headerSettingsBtn) {
            headerSettingsBtn.addEventListener('click', () => {
                this.showModal('settings-modal');
            });
        }


        // DEPRECATED/REPLACED BUTTONS
        // The main "Resume" button on the dashboard was removed in favor of the nav bar.
        // This listener is for the card that might still exist.
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', async () => {
                const position = await storageManager.getPosition();
                const bookId = position?.bookId ?? 1;
                const chapterNumber = position?.chapterNumber ?? 1;
                this.selectBook(bookId, chapterNumber);
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
            });
        }

        // Error modal close
        const errorCloseBtn = document.getElementById('error-close-btn');
        if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', () => {
                this.hideModal('error-modal');
            });
        }
    }

    /**
     * Update chapter select based on book selection
     */
    updateChapterSelect(bookId) {
        const chapterSelect = document.getElementById('chapter-select');
        const book = dataLoader.getBook(bookId);

        if (!book || !chapterSelect) return;

        chapterSelect.innerHTML = '';
        for (let i = 1; i <= book.chapters; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Chapter ${i}`;
            chapterSelect.appendChild(option);
        }
    }

    /**
     * Update typing view stats
     */
    updateTypingStats(wpm, percentage) {
        const wpmCounter = document.getElementById('wpm-counter');
        const progressCounter = document.getElementById('progress-counter');

        if (wpmCounter) {
            wpmCounter.textContent = `${wpm} WPM`;
        }
        if (progressCounter) {
            progressCounter.textContent = `${percentage}%`;
        }
    }

    /**
     * Update current location display
     */
    updateLocationDisplay(book, chapterNumber) {
        const bookDisplay = document.getElementById('current-book');
        const chapterDisplay = document.getElementById('current-chapter');

        if (bookDisplay) {
            bookDisplay.textContent = book.name;
        }
        if (chapterDisplay) {
            chapterDisplay.textContent = `${chapterNumber}`;
        }

        // Also update the main header if we are in the typing view
        if (this.currentView === 'typing-view') {
            this.updateHeader('typing-view');
        }
    }

    /**
     * ACCESSIBILITY
     */

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Announce theme changes
        const observer = new MutationObserver(() => {
            this.announceToScreenReader('Theme changed');
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }

    /**
     * Prefer reduced motion
     */
    setupReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('prefers-reduced-motion');
        }
    }

    /**
     * NOTIFICATIONS
     */

    /**
     * Notify theme change
     */
    notifyThemeChange() {
        const themeName = {
            light: 'Light theme',
            dark: 'Dark theme',
            sepia: 'Sepia theme',
        }[this.currentTheme] || 'Theme changed';

        this.announceToScreenReader(themeName);
    }

    /**
     * VERSION MANAGEMENT
     */

    /**
     * Populate version selector
     */
    populateVersionSelect() {
        const versionSelects = document.querySelectorAll('#version-select, #library-version-select');
        if (versionSelects.length === 0) {
            console.warn('UIManager.populateVersionSelect: version select elements not found');
            return;
        }

        const versions = dataLoader.getAvailableVersions();
        console.log('UIManager.populateVersionSelect: available versions', versions);

        versionSelects.forEach(versionSelect => {
            // Clear existing options
            versionSelect.innerHTML = '';

            // If no versions discovered yet, add available versions or default
            if (versions.length === 0) {
                // Fallback: add common versions that might be available
                const fallbackVersions = ['esv', 'niv', 'nlt', 'nasb'];
                fallbackVersions.forEach(version => {
                    const option = document.createElement('option');
                    option.value = version;
                    option.textContent = version.toUpperCase();
                    versionSelect.appendChild(option);
                });
                
                console.warn('UIManager.populateVersionSelect: using fallback versions');
            } else {
                // Add discovered versions
                versions.forEach(version => {
                    const metadata = dataLoader.getVersionMetadata(version);
                    const option = document.createElement('option');
                    option.value = version;
                    option.textContent = metadata ? `${metadata.version.toUpperCase()} - ${metadata.name}` : version.toUpperCase();
                    versionSelect.appendChild(option);
                });
            }

            versionSelect.value = dataLoader.getCurrentVersion();
            console.log(`UIManager.populateVersionSelect: ${versionSelect.id} value set to`, versionSelect.value);
        });
    }

    /**
     * Update version display
     */
    updateVersionDisplay() {
        const currentVersion = dataLoader.getCurrentVersion();
        const versionSelect = document.getElementById('version-select');
        
        if (versionSelect) {
            versionSelect.value = currentVersion;
        }

        // Update any version badges in the UI
        const versionBadge = document.getElementById('version-badge');
        if (versionBadge) {
            versionBadge.textContent = currentVersion.toUpperCase();
        }
    }

    /**
     * Notify version change
     */
    notifyVersionChange(versionCode) {
        const metadata = dataLoader.getVersionMetadata(versionCode.toLowerCase());
        const versionName = metadata ? metadata.name : versionCode.toUpperCase();
        
        this.announceToScreenReader(`Switched to ${versionName}`);
        this.updateVersionDisplay();
    }
}

// Create singleton instance
const uiManager = new UIManager();
