/**
 * STORAGE MANAGER MODULE
 * Facade for database operations - wraps dbManager with same public API
 * Manages: progress, stats, settings via Dexie/IndexedDB
 */

class StorageManager {
    constructor() {
        this.ready = false;
        this.initPromise = null;
    }

    /**
     * Initialize storage (must be called before use)
     */
    async init() {
        if (this.ready) return true;
        if (this.initPromise) return this.initPromise;

        this.initPromise = dbManager.init().then(() => {
            this.ready = true;
            return true;
        }).catch(error => {
            console.error('Storage initialization failed:', error);
            this.ready = false;
            return false;
        });

        return this.initPromise;
    }

    /**
     * Ensure storage is ready (helper for async calls)
     */
    async ensureReady() {
        if (!this.ready) {
            await this.init();
        }
    }

    /**
     * SET OPERATIONS
     */

    /**
     * Save current reading position
     */
    async savePosition(bookId, chapterNumber, verseIndex, wordIndex, charIndex = 0, wordCount = null) {
        await this.ensureReady();
        const version = dataLoader.getCurrentVersion();

        await dbManager.saveProgress(version, bookId, chapterNumber, {
            verseIndex,
            wordIndex,
            charIndex,
            completed: false,
            wordCount,
        });
    }

    /**
     * Get current reading position
     */
    async getPosition() {
        await this.ensureReady();
        const version = dataLoader.getCurrentVersion();

        // Try to get last visited chapter
        const lastVisited = await dbManager.getLastVisited(version);

        if (lastVisited) {
            return {
                bookId: lastVisited.bookId,
                chapterNumber: lastVisited.chapterNumber,
                verseIndex: lastVisited.verseIndex || 0,
                wordIndex: lastVisited.wordIndex || 0,
                charIndex: lastVisited.charIndex || 0,
            };
        }

        // Default to Genesis 1:1
        return {
            bookId: 1,
            chapterNumber: 1,
            verseIndex: 0,
            wordIndex: 0,
            charIndex: 0,
        };
    }

    /**
     * Save user statistics
     */
    async saveStats(stats) {
        await this.ensureReady();
        await dbManager.saveStats({
            totalWordsTyped: stats.totalWordsTyped || 0,
            currentStreak: stats.currentStreak || 0,
            longestStreak: stats.longestStreak || 0,
            averageWPM: stats.averageWPM || 0,
            sessionsCompleted: stats.sessionsCompleted || 0,
            lastActiveTimestamp: Date.now(),
        });
    }

    /**
     * Get user statistics
     */
    async getStats() {
        await this.ensureReady();
        const stats = await dbManager.getStats();
        const version = dataLoader.getCurrentVersion();
        const totalWords = await dbManager.getTotalWordsTyped(version);

        // Use the calculated total words if available, otherwise fallback to stored stats
        // This ensures "accurate down to the word" across devices/sessions
        return {
            ...stats,
            totalWordsTyped: totalWords > 0 ? totalWords : (stats.totalWordsTyped || 0)
        };
    }

    /**
     * Save user settings
     */
    async saveSettings(settings) {
        await this.ensureReady();
        const current = await dbManager.getSettings();
        await dbManager.saveSettings({ ...current, ...settings });
    }

    /**
     * Get user settings
     */
    async getSettings() {
        await this.ensureReady();
        return await dbManager.getSettings();
    }

    /**
     * Save chapter completion tracking
     * Now includes version in the key
     */
    async saveChapterProgress(bookId, chapterNumber, isCompleted, version = null, wordCount = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();

        await dbManager.saveProgress(versionCode, bookId, chapterNumber, {
            verseIndex: 0,
            wordIndex: 0,
            charIndex: 0,
            completed: isCompleted,
            wordCount,
        });
    }

    /**
     * Check if chapter is completed
     * Now checks for specific version
     */
    async isChapterCompleted(bookId, chapterNumber, version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        const progress = await dbManager.getProgress(versionCode, bookId, chapterNumber);
        return progress ? progress.completed : false;
    }

    /**
     * Get all completed chapters count
     * Now filters by version
     */
    async getCompletedChaptersCount(version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        const allProgress = await dbManager.getAllProgress(versionCode);
        return allProgress.filter(p => p.completed).length;
    }

    /**
     * Get book progress (chapters completed in book)
     * Now filters by version
     */
    async getBookProgress(bookId, version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        const book = dataLoader.getBook(bookId);
        if (!book) return { completed: 0, total: 0, percentage: 0 };

        const allProgress = await dbManager.getAllProgress(versionCode);
        const bookProgress = allProgress.filter(p => p.bookId === bookId);
        const completed = bookProgress.filter(p => p.completed).length;

        return {
            completed,
            total: book.chapters,
            percentage: Math.round((completed / book.chapters) * 100),
        };
    }

    /**
     * Get total words typed for current version
     */
    async getTotalWordsTyped(version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        return await dbManager.getTotalWordsTyped(versionCode);
    }

    /**
     * Mark first-time user status
     */
    async markFirstTimeUserShown() {
        await this.ensureReady();
        // Store in localStorage for quick sync access
        try {
            localStorage.setItem('bibletype_firstTimeUserShown', 'true');
        } catch (e) {
            // Ignore if localStorage not available
        }
    }

    /**
     * Check if first-time user
     */
    isFirstTimeUser() {
        try {
            return localStorage.getItem('bibletype_firstTimeUserShown') !== 'true';
        } catch (e) {
            return false; // Assume not first time if can't check
        }
    }

    /**
     * NOTES OPERATIONS (NEW)
     */

    /**
     * Save note for current chapter
     */
    async saveNote(bookId, chapterNumber, noteText, version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        await dbManager.saveNote(versionCode, bookId, chapterNumber, noteText);
    }

    /**
     * Get note for chapter
     */
    async getNote(bookId, chapterNumber, version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        return await dbManager.getNote(versionCode, bookId, chapterNumber);
    }

    /**
     * Check if chapter has a note
     */
    async hasNote(bookId, chapterNumber, version = null) {
        await this.ensureReady();
        const versionCode = version || dataLoader.getCurrentVersion();
        return await dbManager.hasNote(versionCode, bookId, chapterNumber);
    }

    /**
     * LOW-LEVEL STORAGE OPERATIONS (DEPRECATED - kept for compatibility)
     */

    /**
     * Clear all data
     */
    async clearAllData() {
        await this.ensureReady();
        await dbManager.clearAllData();

        // Also clear localStorage migration flag
        try {
            localStorage.removeItem('bibletype_migrated_to_dexie');
            localStorage.removeItem('bibletype_firstTimeUserShown');
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Debounced save progress
     * Useful to prevent excessive writes during typing
     */
    createDebouncedProgressSave(delay = 500) {
        let timeoutId = null;

        return (position, stats, wordCount = null) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(async () => {
                await this.savePosition(
                    position.bookId,
                    position.chapterNumber,
                    position.verseIndex,
                    position.wordIndex,
                    position.charIndex || 0,
                    wordCount
                );
                await this.saveStats(stats);
            }, delay);
        };
    }
}

// Create singleton instance
const storageManager = new StorageManager();
