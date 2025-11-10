/**
 * UI MANAGER MODULE
 * Handles all UI interactions and view management
 * Manages: modals, view switching, theme, settings
 */

class UIManager {
    constructor() {
        this.currentView = 'dashboard';
        this.currentTheme = 'light';
        this.fontSize = 18;
        this.currentVersion = 'esv';
        this.debouncedSave = null;
        this.init();
    }

    /**
     * Initialize UI Manager
     */
    init() {
        this.loadSettings();
        this.ensureVersionSection();
        this.setupEventListeners();
        this.setupModalHandlers();
        this.setupAccessibility();
    }

    /**
     * Load saved user settings
     */
    loadSettings() {
        const settings = storageManager.getSettings();
        this.currentTheme = settings.theme || 'light';
        this.fontSize = settings.fontSize || 18;
        this.currentVersion = settings.version || 'esv';

        this.applyTheme(this.currentTheme);
        this.applyFontSize(this.fontSize);
        this.updateVersionDisplay();
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
    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        storageManager.saveSettings({
            theme: this.currentTheme,
            fontSize: this.fontSize,
        });
        this.notifyThemeChange();
    }

    /**
     * Apply font size
     */
    applyFontSize(size) {
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

        storageManager.saveSettings({
            theme: this.currentTheme,
            fontSize: this.fontSize,
        });
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
        const settingsBtnDashboard = document.getElementById('settings-btn-dashboard');
        const settingsCloseButtons = settingsModal.querySelectorAll('.modal-close');

        if (settingsBtnDashboard) {
            settingsBtnDashboard.addEventListener('click', () => {
                this.showModal('settings-modal');
            });
        }

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
    showDashboard() {
        this.switchView('dashboard');
        this.updateDashboard();
    }

    /**
     * Switch to typing view
     */
    showTypingView() {
        this.switchView('typing');
        
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
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const view = document.getElementById(`${viewName}-view`);
        if (view) {
            view.classList.add('active');
        }

        this.currentView = viewName;
    }

    /**
     * Update dashboard with current stats
     */
    updateDashboard() {
        const stats = storageManager.getStats();
        const completedChapters = storageManager.getCompletedChaptersCount();
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

        // Update stats cards
        document.getElementById('stat-words').textContent = stats.totalWordsTyped.toLocaleString();
        document.getElementById('stat-streak').textContent = stats.currentStreak;
        document.getElementById('stat-wpm').textContent = stats.averageWPM;

        // Update books grid
        this.updateBooksGrid();
    }

    /**
     * Update books grid
     */
    updateBooksGrid() {
        const booksGrid = document.getElementById('books-grid');
        booksGrid.innerHTML = '';

        dataLoader.getAllBooks().forEach(book => {
            const progress = storageManager.getBookProgress(book.id);
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
        });
    }

    /**
     * Select a book to jump to
     */
    selectBook(bookId, chapterNumber) {
        this.showTypingView();
        window.app.loadChapter(bookId, chapterNumber);
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
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                    storageManager.clearAllData();
                    this.updateDashboard();
                    this.showError('All progress has been reset.');
                }
            });
        }

        // Continue button
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                const position = storageManager.getPosition();
                this.selectBook(position.bookId, position.chapterNumber);
            });
        }

        // Typing view close button
        const closeTypingBtn = document.getElementById('close-typing-btn');
        if (closeTypingBtn) {
            closeTypingBtn.addEventListener('click', () => {
                this.showDashboard();
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
                this.showDashboard();
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
        const versionSelect = document.getElementById('version-select');
        if (!versionSelect) {
            console.warn('UIManager.populateVersionSelect: version select element not found');
            return;
        }

        const versions = dataLoader.getAvailableVersions();
        console.log('UIManager.populateVersionSelect: available versions', versions);
        
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
        console.log('UIManager.populateVersionSelect: select value set to', versionSelect.value);
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
