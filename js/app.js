/**
 * MAIN APP MODULE
 * Orchestrates all modules and coordinates application flow
 */

class BibleTypeApp {
    constructor() {
        this.currentBook = null;
        this.currentChapterNumber = null;
        this.typingInput = null;
        this.debouncedSave = null;
        this.typingEngineUnsubscribe = null;
        this.isFirstLoad = true;
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('Initializing Bible Type app...');

        this.typingInput = document.getElementById('typing-input');
        this.setupTypingInput();
        this.setupKeyboardListeners();
        this.subscribeToEngine();

        // Discover available versions FIRST (before setting)
        await dataLoader.discoverVersions();
        console.log('App.init: discovered versions', dataLoader.getAvailableVersions());

        // Load settings and set version
        const settings = storageManager.getSettings();
        const preferredVersion = settings.version || 'esv';
        const versionSet = await dataLoader.setVersion(preferredVersion);
        
        if (!versionSet) {
            console.warn(`App.init: version ${preferredVersion} not available, using default 'esv'`);
            await dataLoader.setVersion('esv');
        }

        // Update version selector with discovered versions
        uiManager.populateVersionSelect();

        // Check if first-time user
        if (storageManager.isFirstTimeUser()) {
            uiManager.showHowToPlay();
        }

        // Load saved position or default
        const savedPosition = storageManager.getPosition();
        await this.loadChapter(savedPosition.bookId, savedPosition.chapterNumber, savedPosition);

        // Show dashboard initially
        uiManager.showDashboard();

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

            // Focus input
            setTimeout(() => {
                if (this.typingInput) {
                    this.typingInput.focus();
                    this.typingInput.value = '';
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
            if (typingEngine.isActive && uiManager.currentView === 'typing') {
                setTimeout(() => {
                    this.typingInput.focus();
                }, 100);
            }
        });
    }

    /**
     * Setup keyboard listeners
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Only process single character keys
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (uiManager.currentView === 'typing' && typingEngine.isActive) {
                    e.preventDefault();
                    typingEngine.handleKeystroke(e.key);
                    
                    // Clear input after processing
                    if (this.typingInput) {
                        this.typingInput.value = '';
                    }
                }
            }
        });

        // Handle Escape key - go back to dashboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && uiManager.currentView === 'typing') {
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
            const appStats = storageManager.getStats();
            this.debouncedSave(typingEngine.getPosition(), appStats);
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
    handleChapterCompleted(data) {
        console.log('Chapter completed:', data);

        // Save progress to storage
        storageManager.savePosition(data.position.bookId, data.position.chapterNumber, 0, 0);
        storageManager.saveStats(data.stats);

        // Get book progress
        const bookProgress = storageManager.getBookProgress(data.position.bookId);
        
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
        uiManager.updateDashboard();
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
            const settings = storageManager.getSettings();
            settings.version = versionCode.toLowerCase();
            storageManager.saveSettings(settings);
            
            // Reload current chapter with new version
            const position = storageManager.getPosition();
            await this.loadChapter(position.bookId, position.chapterNumber, position);
            
            // Update UI
            uiManager.updateDashboard();
            uiManager.notifyVersionChange(versionCode);
            
            return true;
        }
        
        return false;
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
