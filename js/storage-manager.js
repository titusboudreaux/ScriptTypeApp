/**
 * STORAGE MANAGER MODULE
 * Handles localStorage persistence with fallback for private browsing
 * Manages: progress, stats, settings
 */

class StorageManager {
    constructor() {
        this.storageAvailable = this.checkStorageAvailable();
        this.prefix = 'bibletype_';
        this.fallbackData = {}; // Fallback storage for private browsing
    }

    /**
     * Check if localStorage is available
     */
    checkStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using fallback');
            return false;
        }
    }

    /**
     * SET OPERATIONS
     */

    /**
     * Save current reading position
     */
    savePosition(bookId, chapterNumber, verseIndex, wordIndex) {
        this.setItem('position', {
            bookId,
            chapterNumber,
            verseIndex,
            wordIndex,
            timestamp: Date.now(),
        });
    }

    /**
     * Get current reading position
     */
    getPosition() {
        return this.getItem('position') || {
            bookId: 1,
            chapterNumber: 1,
            verseIndex: 0,
            wordIndex: 0,
        };
    }

    /**
     * Save user statistics
     */
    saveStats(stats) {
        this.setItem('stats', {
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
    getStats() {
        return this.getItem('stats') || {
            totalWordsTyped: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageWPM: 0,
            sessionsCompleted: 0,
            lastActiveTimestamp: Date.now(),
        };
    }

    /**
     * Save user settings
     */
    saveSettings(settings) {
        this.setItem('settings', {
            theme: settings.theme || 'light',
            fontSize: settings.fontSize || 18,
            version: settings.version || 'esv',
        });
    }

    /**
     * Get user settings
     */
    getSettings() {
        return this.getItem('settings') || {
            theme: 'light',
            fontSize: 18,
            version: 'esv',
        };
    }

    /**
     * Save chapter completion tracking
     * Now includes version in the key
     */
    saveChapterProgress(bookId, chapterNumber, isCompleted, version = null) {
        const versionCode = version || dataLoader.getCurrentVersion();
        const key = `chapter_${versionCode}_${bookId}_${chapterNumber}`;
        this.setItem(key, {
            bookId,
            chapterNumber,
            version: versionCode,
            completed: isCompleted,
            completedAt: isCompleted ? Date.now() : null,
        });
    }

    /**
     * Check if chapter is completed
     * Now checks for specific version
     */
    isChapterCompleted(bookId, chapterNumber, version = null) {
        const versionCode = version || dataLoader.getCurrentVersion();
        const key = `chapter_${versionCode}_${bookId}_${chapterNumber}`;
        const data = this.getItem(key);
        return data ? data.completed : false;
    }

    /**
     * Get all completed chapters count
     * Now filters by version
     */
    getCompletedChaptersCount(version = null) {
        const versionCode = version || dataLoader.getCurrentVersion();
        let count = 0;
        for (let bookId = 1; bookId <= 66; bookId++) {
            const book = dataLoader.getBook(bookId);
            if (!book) continue;
            
            for (let ch = 1; ch <= book.chapters; ch++) {
                if (this.isChapterCompleted(bookId, ch, versionCode)) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Get book progress (chapters completed in book)
     * Now filters by version
     */
    getBookProgress(bookId, version = null) {
        const versionCode = version || dataLoader.getCurrentVersion();
        const book = dataLoader.getBook(bookId);
        if (!book) return { completed: 0, total: 0 };

        let completed = 0;
        for (let ch = 1; ch <= book.chapters; ch++) {
            if (this.isChapterCompleted(bookId, ch, versionCode)) {
                completed++;
            }
        }

        return {
            completed,
            total: book.chapters,
            percentage: Math.round((completed / book.chapters) * 100),
        };
    }

    /**
     * Mark first-time user status
     */
    markFirstTimeUserShown() {
        this.setItem('firstTimeUserShown', true);
    }

    /**
     * Check if first-time user
     */
    isFirstTimeUser() {
        return !this.getItem('firstTimeUserShown');
    }

    /**
     * LOW-LEVEL STORAGE OPERATIONS
     */

    /**
     * Generic setItem with fallback
     */
    setItem(key, value) {
        const prefixedKey = this.prefix + key;
        const serialized = JSON.stringify(value);

        if (this.storageAvailable) {
            try {
                localStorage.setItem(prefixedKey, serialized);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('localStorage quota exceeded');
                    this.fallbackData[prefixedKey] = serialized;
                } else {
                    throw e;
                }
            }
        } else {
            this.fallbackData[prefixedKey] = serialized;
        }
    }

    /**
     * Generic getItem with fallback
     */
    getItem(key) {
        const prefixedKey = this.prefix + key;

        if (this.storageAvailable) {
            try {
                const item = localStorage.getItem(prefixedKey);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Error reading from localStorage:', e);
                return null;
            }
        } else {
            const item = this.fallbackData[prefixedKey];
            return item ? JSON.parse(item) : null;
        }
    }

    /**
     * Clear all data
     */
    clearAllData() {
        if (this.storageAvailable) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } else {
            this.fallbackData = {};
        }
    }

    /**
     * Debounced save progress
     * Useful to prevent excessive writes during typing
     */
    createDebouncedProgressSave(delay = 500) {
        let timeoutId = null;

        return (position, stats) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                this.savePosition(position.bookId, position.chapterNumber, position.verseIndex, position.wordIndex);
                this.saveStats(stats);
            }, delay);
        };
    }
}

// Create singleton instance
const storageManager = new StorageManager();
