/**
 * DATABASE MANAGER MODULE
 * Manages IndexedDB via Dexie.js for reliable storage
 * Handles: progress, notes, settings with migration from localStorage
 */

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isAvailable = false;
        this.fallbackData = {}; // In-memory fallback for private browsing
        this.migrationComplete = false;
    }

    /**
     * Initialize database
     */
    async init() {
        try {
            // Create database
            this.db = new Dexie('BibleTypeDB');
            
            // Define schema
            this.db.version(1).stores({
                // Progress: track position for each version/book/chapter
                progress: '[version+bookId+chapterNumber], version, bookId, completed, lastVisited',
                
                // Notes: per-chapter notes
                notes: '[version+bookId+chapterNumber], version, bookId, lastModified',
                
                // Settings: app-wide settings (single row with id=1)
                settings: 'id',
                
                // Stats: cumulative statistics (single row with id=1)
                stats: 'id'
            });

            // Test database availability
            await this.db.open();
            this.isAvailable = true;
            
            console.log('✓ Database initialized successfully');
            
            // Perform migration from localStorage if needed
            await this.migrateFromLocalStorage();
            
            return true;
        } catch (error) {
            console.warn('Database initialization failed, using fallback:', error);
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Migrate data from localStorage to Dexie (one-time, silent)
     */
    async migrateFromLocalStorage() {
        try {
            // Check if migration already done
            const migrationFlag = localStorage.getItem('bibletype_migrated_to_dexie');
            if (migrationFlag === 'true') {
                console.log('Migration already completed, skipping');
                this.migrationComplete = true;
                return;
            }

            console.log('Starting silent migration from localStorage...');

            // Migrate settings
            const oldSettings = this.getFromLocalStorage('settings');
            if (oldSettings) {
                await this.db.settings.put({
                    id: 1,
                    theme: oldSettings.theme || 'light',
                    fontSize: oldSettings.fontSize || 18,
                    version: oldSettings.version || 'esv',
                    typingMode: 'first-letter', // New default
                    caseSensitive: false, // New default
                    ttsEnabled: false, // New default
                    ttsVoice: null,
                    ttsSpeed: 1.0,
                    ttsReadVerse: false,
                    ttsReadWord: false,
                });
                console.log('✓ Migrated settings');
            }

            // Migrate stats
            const oldStats = this.getFromLocalStorage('stats');
            if (oldStats) {
                await this.db.stats.put({
                    id: 1,
                    totalWordsTyped: oldStats.totalWordsTyped || 0,
                    currentStreak: oldStats.currentStreak || 0,
                    longestStreak: oldStats.longestStreak || 0,
                    averageWPM: oldStats.averageWPM || 0,
                    sessionsCompleted: oldStats.sessionsCompleted || 0,
                    lastActiveTimestamp: oldStats.lastActiveTimestamp || Date.now(),
                });
                console.log('✓ Migrated stats');
            }

            // Migrate position
            const oldPosition = this.getFromLocalStorage('position');
            if (oldPosition) {
                const version = oldSettings?.version || 'esv';
                await this.db.progress.put({
                    version,
                    bookId: oldPosition.bookId || 1,
                    chapterNumber: oldPosition.chapterNumber || 1,
                    verseIndex: oldPosition.verseIndex || 0,
                    wordIndex: oldPosition.wordIndex || 0,
                    charIndex: 0, // New field for full-word mode
                    completed: false,
                    lastVisited: oldPosition.timestamp || Date.now(),
                });
                console.log('✓ Migrated current position');
            }

            // Migrate chapter completion data
            let migratedChapters = 0;
            const version = oldSettings?.version || 'esv';
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('bibletype_chapter_')) {
                    try {
                        const value = JSON.parse(localStorage.getItem(key));
                        if (value && value.completed) {
                            // Extract version, bookId, chapterNumber from key
                            // Key format: bibletype_chapter_VERSION_BOOKID_CHAPTERNUMBER
                            const parts = key.replace('bibletype_chapter_', '').split('_');
                            let chapterVersion, chapterBookId, chapterChapter;
                            
                            if (parts.length === 3) {
                                // New format with version
                                [chapterVersion, chapterBookId, chapterChapter] = parts;
                            } else if (parts.length === 2) {
                                // Old format without version
                                chapterVersion = version;
                                [chapterBookId, chapterChapter] = parts;
                            } else {
                                continue; // Invalid format
                            }

                            await this.db.progress.put({
                                version: chapterVersion.toLowerCase(),
                                bookId: parseInt(chapterBookId),
                                chapterNumber: parseInt(chapterChapter),
                                verseIndex: 0,
                                wordIndex: 0,
                                charIndex: 0,
                                completed: true,
                                lastVisited: value.completedAt || Date.now(),
                            });
                            migratedChapters++;
                        }
                    } catch (e) {
                        console.warn('Failed to migrate chapter:', key, e);
                    }
                }
            }
            console.log(`✓ Migrated ${migratedChapters} completed chapters`);

            // Mark migration as complete
            localStorage.setItem('bibletype_migrated_to_dexie', 'true');
            this.migrationComplete = true;
            
            console.log('✓ Migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            // Continue anyway - fresh start is fine
        }
    }

    /**
     * Helper to read from localStorage
     */
    getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem('bibletype_' + key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * PROGRESS OPERATIONS
     */

    /**
     * Save chapter progress
     */
    async saveProgress(version, bookId, chapterNumber, data) {
        const key = { version, bookId, chapterNumber };
        const record = {
            ...key,
            verseIndex: data.verseIndex || 0,
            wordIndex: data.wordIndex || 0,
            charIndex: data.charIndex || 0,
            completed: data.completed || false,
            lastVisited: Date.now(),
        };

        if (typeof data.wordCount === 'number' && data.wordCount >= 0) {
            record.wordCount = data.wordCount;
        }

        if (this.isAvailable) {
            try {
                await this.db.progress.put(record);
                return true;
            } catch (error) {
                console.error('Failed to save progress:', error);
                this.fallbackData[`progress_${version}_${bookId}_${chapterNumber}`] = record;
                return false;
            }
        } else {
            this.fallbackData[`progress_${version}_${bookId}_${chapterNumber}`] = record;
            return true;
        }
    }

    /**
     * Get chapter progress
     */
    async getProgress(version, bookId, chapterNumber) {
        if (this.isAvailable) {
            try {
                return await this.db.progress.get({ version, bookId, chapterNumber });
            } catch (error) {
                console.error('Failed to get progress:', error);
                return this.fallbackData[`progress_${version}_${bookId}_${chapterNumber}`];
            }
        } else {
            return this.fallbackData[`progress_${version}_${bookId}_${chapterNumber}`];
        }
    }

    /**
     * Get all progress for a version
     */
    async getAllProgress(version) {
        if (this.isAvailable) {
            try {
                return await this.db.progress.where('version').equals(version).toArray();
            } catch (error) {
                console.error('Failed to get all progress:', error);
                return [];
            }
        } else {
            return Object.values(this.fallbackData)
                .filter(item => item.version === version);
        }
    }

    /**
     * Get last visited chapter
     */
    async getLastVisited(version) {
        if (this.isAvailable) {
            try {
                const records = await this.db.progress
                    .where('version').equals(version)
                    .reverse()
                    .sortBy('lastVisited');
                return records[0] || null;
            } catch (error) {
                console.error('Failed to get last visited:', error);
                return null;
            }
        } else {
            const records = Object.values(this.fallbackData)
                .filter(item => item.version === version)
                .sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0));
            return records[0] || null;
        }
    }

    /**
     * NOTES OPERATIONS
     */

    /**
     * Save note for chapter
     */
    async saveNote(version, bookId, chapterNumber, noteText) {
        const key = { version, bookId, chapterNumber };
        const record = {
            ...key,
            text: noteText.slice(0, 280), // Enforce 280 char limit
            lastModified: Date.now(),
        };

        if (this.isAvailable) {
            try {
                if (noteText.trim() === '') {
                    // Delete empty notes
                    await this.db.notes.delete(key);
                } else {
                    await this.db.notes.put(record);
                }
                return true;
            } catch (error) {
                console.error('Failed to save note:', error);
                this.fallbackData[`note_${version}_${bookId}_${chapterNumber}`] = record;
                return false;
            }
        } else {
            this.fallbackData[`note_${version}_${bookId}_${chapterNumber}`] = record;
            return true;
        }
    }

    /**
     * Get note for chapter
     */
    async getNote(version, bookId, chapterNumber) {
        if (this.isAvailable) {
            try {
                const note = await this.db.notes.get({ version, bookId, chapterNumber });
                return note?.text || '';
            } catch (error) {
                console.error('Failed to get note:', error);
                const fallback = this.fallbackData[`note_${version}_${bookId}_${chapterNumber}`];
                return fallback?.text || '';
            }
        } else {
            const fallback = this.fallbackData[`note_${version}_${bookId}_${chapterNumber}`];
            return fallback?.text || '';
        }
    }

    /**
     * Check if chapter has a note
     */
    async hasNote(version, bookId, chapterNumber) {
        if (this.isAvailable) {
            try {
                const note = await this.db.notes.get({ version, bookId, chapterNumber });
                return note && note.text.trim().length > 0;
            } catch (error) {
                return false;
            }
        } else {
            const fallback = this.fallbackData[`note_${version}_${bookId}_${chapterNumber}`];
            return fallback && fallback.text.trim().length > 0;
        }
    }

    /**
     * SETTINGS OPERATIONS
     */

    /**
     * Save settings
     */
    async saveSettings(settings) {
        const record = { id: 1, ...settings };

        if (this.isAvailable) {
            try {
                await this.db.settings.put(record);
                return true;
            } catch (error) {
                console.error('Failed to save settings:', error);
                this.fallbackData['settings'] = record;
                return false;
            }
        } else {
            this.fallbackData['settings'] = record;
            return true;
        }
    }

    /**
     * Get settings
     */
    async getSettings() {
        if (this.isAvailable) {
            try {
                const settings = await this.db.settings.get(1);
                return settings || this.getDefaultSettings();
            } catch (error) {
                console.error('Failed to get settings:', error);
                return this.fallbackData['settings'] || this.getDefaultSettings();
            }
        } else {
            return this.fallbackData['settings'] || this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            id: 1,
            theme: 'light',
            fontSize: 18,
            version: 'esv',
            typingMode: 'first-letter', // 'first-letter' | 'full-word'
            caseSensitive: false,
            ttsEnabled: false,
            ttsVoice: null,
            ttsSpeed: 1.0,
            ttsReadVerse: false,
            ttsReadWord: false,
        };
    }

    /**
     * STATS OPERATIONS
     */

    /**
     * Save stats
     */
    async saveStats(stats) {
        const record = { id: 1, ...stats };

        if (this.isAvailable) {
            try {
                await this.db.stats.put(record);
                return true;
            } catch (error) {
                console.error('Failed to save stats:', error);
                this.fallbackData['stats'] = record;
                return false;
            }
        } else {
            this.fallbackData['stats'] = record;
            return true;
        }
    }

    /**
     * Get stats
     */
    async getStats() {
        if (this.isAvailable) {
            try {
                const stats = await this.db.stats.get(1);
                return stats || this.getDefaultStats();
            } catch (error) {
                console.error('Failed to get stats:', error);
                return this.fallbackData['stats'] || this.getDefaultStats();
            }
        } else {
            return this.fallbackData['stats'] || this.getDefaultStats();
        }
    }

    /**
     * Get default stats
     */
    getDefaultStats() {
        return {
            id: 1,
            totalWordsTyped: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageWPM: 0,
            sessionsCompleted: 0,
            lastActiveTimestamp: Date.now(),
        };
    }

    /**
     * UTILITY OPERATIONS
     */

    /**
     * Clear all data
     */
    async clearAllData() {
        if (this.isAvailable) {
            try {
                await this.db.progress.clear();
                await this.db.notes.clear();
                await this.db.stats.put(this.getDefaultStats());
                console.log('✓ Database cleared');
                return true;
            } catch (error) {
                console.error('Failed to clear database:', error);
                return false;
            }
        } else {
            this.fallbackData = {};
            return true;
        }
    }

    /**
     * Export data (for backup)
     */
    async exportData() {
        if (!this.isAvailable) return null;

        try {
            const [progress, notes, settings, stats] = await Promise.all([
                this.db.progress.toArray(),
                this.db.notes.toArray(),
                this.db.settings.get(1),
                this.db.stats.get(1),
            ]);

            return {
                version: 1,
                exportDate: new Date().toISOString(),
                progress,
                notes,
                settings,
                stats,
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }
}

// Create singleton instance
const dbManager = new DatabaseManager();
