/**
 * MAIN APP MODULE
 * Orchestrates all modules and coordinates application flow
 */

class BibleTypeApp {
    constructor() {
        this.currentBook = null;
        this.currentChapterNumber = null;
        this.typingInput = null;
        this.typingContainer = null;
        this.typingModeBanner = null;
        this.typingModeText = null;
        this.typingResumeBtn = null;
        this.browseModeToggle = null;
        this.debouncedSave = null;
        this.typingEngineUnsubscribe = null;
        this.isFirstLoad = true;
        this.typingPauseReasons = new Set();
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing Bible Type app...');

        // Initialize storage first
        await storageManager.init();

        // Initialize audio manager
        await audioManager.init();

        // Initialize notes manager
        await notesManager.init();

        // Initialize library manager
        await libraryManager.init();

        this.typingInput = document.getElementById('typing-input');
        this.typingContainer = document.querySelector('.typing-container');
        this.typingModeBanner = document.getElementById('typing-mode-banner');
        this.typingModeText = document.getElementById('typing-mode-text');
        this.typingResumeBtn = document.getElementById('typing-resume-btn');
        this.browseModeToggle = document.getElementById('typing-browse-toggle');
        this.setupTypingInput();
        this.setupTypingModeControls();
        this.setupKeyboardListeners();
        this.subscribeToEngine();

        // Discover available versions FIRST (before setting)
        await dataLoader.discoverVersions();
        console.log('App.init: discovered versions', dataLoader.getAvailableVersions());

        // Load settings and set version
        const settings = await storageManager.getSettings();
        const preferredVersion = settings.version || 'esv';
        
        // Ensure the preferred version is actually available
        const availableVersions = dataLoader.getAvailableVersions();
        const versionToLoad = availableVersions.includes(preferredVersion) ? preferredVersion : 'esv';
        
        await dataLoader.setVersion(versionToLoad);
        
        // Update version selector with discovered versions
        uiManager.populateVersionSelect();

        // Check if first-time user
        if (storageManager.isFirstTimeUser()) {
            uiManager.showHowToPlay();
        }

        // Load saved position or default
        const savedPosition = await storageManager.getPosition();
        await this.loadChapter(savedPosition.bookId, savedPosition.chapterNumber, savedPosition);

        // Show dashboard initially
        this.isFirstLoad = false;
        uiManager.switchView('dashboard-view');

        console.log('App initialized successfully');
    }

    /**
     * Load a chapter
     */
    async loadChapter(bookId, chapterNumber, position = null) {
        try {
            const success = await typingEngine.loadChapter(bookId, chapterNumber, position);
            if (!success) {
                uiManager.showError('Failed to load chapter. Please try again.');
                return false;
            }

            this.currentBook = dataLoader.getBook(bookId);
            this.currentChapterNumber = chapterNumber;

            // Update UI
            uiManager.updateLocationDisplay(this.currentBook, chapterNumber);

            // Load notes for this chapter
            await notesManager.loadChapterNotes(bookId, chapterNumber);

            // Render text to DOM
            const textContainer = document.getElementById('text-container');
            typingEngine.renderChapterToDOM(textContainer);

            // Reset scroll to top after rendering
            if (textContainer) {
                textContainer.scrollTop = 0;
            }
            
            const typingContent = textContainer.parentElement;
            if (typingContent && typingContent.classList.contains('typing-content')) {
                typingContent.scrollTop = 0;
            }

            // Setup debounced save
            this.debouncedSave = storageManager.createDebouncedProgressSave(500);

            // Ensure typing pause state persists across chapter loads
            typingEngine.setPaused(this.typingPauseReasons.size > 0);

            // Focus input
            setTimeout(() => {
                if (this.typingInput) {
                    this.typingInput.value = '';
                    if (!typingEngine.isPaused) {
                        this.typingInput.focus();
                    }
                }
            }, 100);

            return true;
        } catch (error) {
            console.error('Failed to load chapter:', error);
            uiManager.showError(`Error loading chapter: ${error.message}`);
            return false;
        }
    }

    /**
     * Go to next chapter
     */
    async goToNextChapter() {
        const nextCoords = typingEngine.getNextChapterCoordinates();
        if (nextCoords) {
            await this.loadChapter(nextCoords.bookId, nextCoords.chapterNumber);
            uiManager.showTypingView();
        } else {
            // Completed the entire Bible!
            uiManager.showError('🎉 You have completed typing the entire Bible! Congratulations!');
            uiManager.showDashboard();
        }
    }

    /**
     * Setup typing input
     */
    setupTypingInput() {
        if (!this.typingInput) return;

        // Clear placeholder on focus
        this.typingInput.addEventListener('focus', () => {
            this.typingInput.setAttribute('aria-label', 'Type the first letter of each word');
        });

        // Keep input focused during typing
        this.typingInput.addEventListener('blur', () => {
            if (
                typingEngine.isActive &&
                !typingEngine.isPaused &&
                uiManager.currentView === 'typing-view'
            ) {
                setTimeout(() => {
                    this.typingInput.focus();
                }, 100);
            }
        });
    }

    /**
     * Setup browse mode + resume controls
     */
    setupTypingModeControls() {
        if (this.typingResumeBtn) {
            this.typingResumeBtn.addEventListener('click', () => {
                // Blur notes textarea if active to avoid immediate re-pause
                if (notesManager?.textarea && document.activeElement === notesManager.textarea) {
                    notesManager.textarea.blur();
                }
                this.clearTypingPauses();
            });
        }

        if (this.browseModeToggle) {
            this.browseModeToggle.addEventListener('click', () => {
                const manualActive = this.typingPauseReasons.has('manual');
                if (manualActive) {
                    this.resumeTyping('manual');
                } else {
                    this.pauseTyping('manual');
                    if (this.typingInput) {
                        this.typingInput.blur();
                    }
                }
            });
        }
    }

    /**
     * Setup keyboard listeners
     */
    setupKeyboardListeners() {
        this.typingInput.addEventListener('input', (e) => {
            if (uiManager.currentView === 'typing-view' && typingEngine.isActive) {
                const key = e.data;
                if (key) {
                    typingEngine.handleKeystroke(key);
                }
                
                // Clear input after processing
                if (this.typingInput) {
                    this.typingInput.value = '';
                }
            }
        });

        // Handle Escape key - go back to dashboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && uiManager.currentView === 'typing-view') {
                if (this.typingPauseReasons.size > 0) {
                    this.clearTypingPauses();
                    return;
                }
                uiManager.showDashboard();
            }
        });
    }

    /**
     * Subscribe to typing engine events
     */
    subscribeToEngine() {
        if (this.typingEngineUnsubscribe) {
            this.typingEngineUnsubscribe();
        }

        this.typingEngineUnsubscribe = typingEngine.subscribe((eventType, data) => {
            switch (eventType) {
                case 'keystroke':
                    this.handleKeystroke(data);
                    break;

                case 'word-advanced':
                    this.handleWordAdvanced(data);
                    break;

                case 'chapter-completed':
                    this.handleChapterCompleted(data);
                    break;

                case 'error':
                    uiManager.showError(data.message);
                    break;

                default:
                    break;
            }
        });
    }

    /**
     * Handle keystroke event
     */
    handleKeystroke(data) {
        const { isCorrect } = data;

        // Update stats display
        const stats = typingEngine.getTypingStats();
        const percentage = typingEngine.getProgressPercentage();

        uiManager.updateTypingStats(stats.currentSessionWPM, percentage);

        // Save progress periodically (debounced)
        if (this.debouncedSave) {
            const appStats = storageManager.getStats().then(stats => {
                const position = typingEngine.getPosition();
                const wordCount = typingEngine.getCurrentWords().length;
                this.debouncedSave(position, stats, wordCount);
            });
        }
    }

    /**
     * Handle word advanced event
     */
    handleWordAdvanced(position) {
        // Auto-scroll is handled in engine, but we can add additional logic here
    }

    /**
     * Handle chapter completed event
     */
    async handleChapterCompleted(data) {
        console.log('Chapter completed:', data);

        // Save progress to storage
        await storageManager.savePosition(
            data.position.bookId,
            data.position.chapterNumber,
            0,
            0,
            0,
            typingEngine.getCurrentWords().length
        );
        await storageManager.saveStats(data.stats);

        // Get book progress
        const bookProgress = await storageManager.getBookProgress(data.position.bookId);
        
        // Calculate estimated time to complete book
        const remainingChapters = bookProgress.total - bookProgress.completed;
        const averageSessionDuration = data.sessionDuration; // Duration of current session in minutes
        const estimatedMinutesRemaining = remainingChapters * averageSessionDuration;
        const estimatedTimeToCompleteBook = this.formatEstimatedTime(estimatedMinutesRemaining);

        // Show completion modal with stats
        uiManager.showChapterComplete({
            book: this.currentBook,
            chapterNumber: this.currentChapterNumber,
            wordsTyped: data.wordsTyped,
            sessionDuration: data.sessionDuration,
            wpm: data.wpm,
            bookProgress: bookProgress,
            estimatedTimeToCompleteBook: estimatedTimeToCompleteBook,
        });

        // Update dashboard
        await uiManager.updateDashboard();
    }

    /**
     * Format estimated time to readable string
     */
    formatEstimatedTime(minutes) {
        if (minutes === 0) return 'Already completed!';
        
        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = Math.floor(minutes % 60);

        if (days > 0) {
            return `~${days} day${days > 1 ? 's' : ''} ${hours}h`;
        } else if (hours > 0) {
            return `~${hours}h ${mins}m`;
        } else {
            return `~${mins}m`;
        }
    }

    /**
     * Utility: Check if all essential data files are available
     */
    async checkDataAvailability() {
        // Try to load first chapter
        try {
            await dataLoader.loadChapter(1, 1);
            return true;
        } catch (error) {
            console.error('Data check failed:', error);
            return false;
        }
    }

    /**
     * Change Bible version
     */
    async changeVersion(versionCode) {
        const success = await dataLoader.setVersion(versionCode);
        
        if (success) {
            // Save version preference
            const settings = await storageManager.getSettings();
            settings.version = versionCode.toLowerCase();
            await storageManager.saveSettings(settings);
            
            // Reload current chapter with new version
            const position = await storageManager.getPosition();
            await this.loadChapter(position.bookId, position.chapterNumber, position);
            
            // Update UI
            await uiManager.updateDashboard();
            uiManager.notifyVersionChange(versionCode);
            
            return true;
        }
        
        return false;
    }

    /**
     * Pause typing (enter browse mode)
     */
    pauseTyping(reason = 'manual') {
        if (!reason) return;
        this.typingPauseReasons.add(reason);
        this.applyTypingPauseState();
    }

    /**
     * Resume typing for a specific reason
     */
    resumeTyping(reason) {
        if (reason) {
            this.typingPauseReasons.delete(reason);
        }
        this.applyTypingPauseState();
    }

    /**
     * Clear every pause reason (resume entirely)
     */
    clearTypingPauses() {
        if (this.typingPauseReasons.size === 0) return;
        this.typingPauseReasons.clear();
        this.applyTypingPauseState();
    }

    pauseTypingForNotes() {
        this.pauseTyping('notes');
        if (this.typingInput) {
            this.typingInput.blur();
        }
    }

    resumeTypingFromNotes() {
        this.resumeTyping('notes');
    }

    applyTypingPauseState() {
        const isPaused = this.typingPauseReasons.size > 0;
        typingEngine.setPaused(isPaused);

        if (this.typingContainer) {
            this.typingContainer.classList.toggle('typing-paused', isPaused);
        }

        if (this.typingModeBanner) {
            this.typingModeBanner.classList.toggle('active', isPaused);
            if (this.typingModeText) {
                this.typingModeText.textContent = this.getTypingPauseMessage();
            }
        }

        if (this.browseModeToggle) {
            const manualActive = this.typingPauseReasons.has('manual');
            this.browseModeToggle.setAttribute('aria-pressed', manualActive ? 'true' : 'false');
            this.browseModeToggle.textContent = manualActive ? 'Resume Typing' : 'Browse Mode';
        }

        if (!isPaused && uiManager.currentView === 'typing-view' && this.typingInput) {
            this.typingInput.focus();
            this.typingInput.value = '';
        }
    }

    getTypingPauseMessage() {
        if (this.typingPauseReasons.has('manual')) {
            return 'Browse mode on. Typing is paused until you resume.';
        }
        if (this.typingPauseReasons.has('notes')) {
            return 'Notes editing mode on. Typing is paused so you can write freely.';
        }
        return 'Typing paused';
    }
}

// Create app instance and expose it on window for UI manager
const app = new BibleTypeApp();
window.app = app;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init().catch(error => {
            console.error('Failed to initialize app:', error);
            uiManager.showError('Failed to initialize the app. Please refresh the page.');
        });
    });
} else {
    app.init().catch(error => {
        console.error('Failed to initialize app:', error);
        uiManager.showError('Failed to initialize the app. Please refresh the page.');
    });
}
