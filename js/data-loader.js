/**
 * DATA LOADER MODULE
 * Handles loading Bible chapter data from JSON files
 * Supports lazy loading and prefetching
 */

class DataLoader {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.bibleBooks = this.initializeBibleBooks();
        this.dataPath = 'data'; // Path to data folder
        this.currentVersion = 'esv'; // Default version
        this.availableVersions = []; // Will be populated
        this.versionMetadata = new Map(); // Store version metadata
    }

    /**
     * Initialize Bible book metadata
     * Complete list of 66 books with chapter counts
     */
    initializeBibleBooks() {
        return [
            // Old Testament - 39 books
            { id: 1, name: 'Genesis', abbr: 'Gen', chapters: 50, testament: 'old' },
            { id: 2, name: 'Exodus', abbr: 'Exo', chapters: 40, testament: 'old' },
            { id: 3, name: 'Leviticus', abbr: 'Lev', chapters: 27, testament: 'old' },
            { id: 4, name: 'Numbers', abbr: 'Num', chapters: 36, testament: 'old' },
            { id: 5, name: 'Deuteronomy', abbr: 'Deu', chapters: 34, testament: 'old' },
            { id: 6, name: 'Joshua', abbr: 'Jos', chapters: 24, testament: 'old' },
            { id: 7, name: 'Judges', abbr: 'Jdg', chapters: 21, testament: 'old' },
            { id: 8, name: 'Ruth', abbr: 'Rut', chapters: 4, testament: 'old' },
            { id: 9, name: '1 Samuel', abbr: '1Sa', chapters: 31, testament: 'old' },
            { id: 10, name: '2 Samuel', abbr: '2Sa', chapters: 24, testament: 'old' },
            { id: 11, name: '1 Kings', abbr: '1Ki', chapters: 22, testament: 'old' },
            { id: 12, name: '2 Kings', abbr: '2Ki', chapters: 25, testament: 'old' },
            { id: 13, name: '1 Chronicles', abbr: '1Ch', chapters: 29, testament: 'old' },
            { id: 14, name: '2 Chronicles', abbr: '2Ch', chapters: 36, testament: 'old' },
            { id: 15, name: 'Ezra', abbr: 'Ezr', chapters: 10, testament: 'old' },
            { id: 16, name: 'Nehemiah', abbr: 'Neh', chapters: 13, testament: 'old' },
            { id: 17, name: 'Esther', abbr: 'Est', chapters: 10, testament: 'old' },
            { id: 18, name: 'Job', abbr: 'Job', chapters: 42, testament: 'old' },
            { id: 19, name: 'Psalms', abbr: 'Psa', chapters: 150, testament: 'old' },
            { id: 20, name: 'Proverbs', abbr: 'Pro', chapters: 31, testament: 'old' },
            { id: 21, name: 'Ecclesiastes', abbr: 'Ecc', chapters: 12, testament: 'old' },
            { id: 22, name: 'Song of Solomon', abbr: 'Song', chapters: 8, testament: 'old' },
            { id: 23, name: 'Isaiah', abbr: 'Isa', chapters: 66, testament: 'old' },
            { id: 24, name: 'Jeremiah', abbr: 'Jer', chapters: 52, testament: 'old' },
            { id: 25, name: 'Lamentations', abbr: 'Lam', chapters: 5, testament: 'old' },
            { id: 26, name: 'Ezekiel', abbr: 'Eze', chapters: 48, testament: 'old' },
            { id: 27, name: 'Daniel', abbr: 'Dan', chapters: 12, testament: 'old' },
            { id: 28, name: 'Hosea', abbr: 'Hos', chapters: 14, testament: 'old' },
            { id: 29, name: 'Joel', abbr: 'Joe', chapters: 3, testament: 'old' },
            { id: 30, name: 'Amos', abbr: 'Amo', chapters: 9, testament: 'old' },
            { id: 31, name: 'Obadiah', abbr: 'Oba', chapters: 1, testament: 'old' },
            { id: 32, name: 'Jonah', abbr: 'Jon', chapters: 4, testament: 'old' },
            { id: 33, name: 'Micah', abbr: 'Mic', chapters: 7, testament: 'old' },
            { id: 34, name: 'Nahum', abbr: 'Nah', chapters: 3, testament: 'old' },
            { id: 35, name: 'Habakkuk', abbr: 'Hab', chapters: 3, testament: 'old' },
            { id: 36, name: 'Zephaniah', abbr: 'Zep', chapters: 3, testament: 'old' },
            { id: 37, name: 'Haggai', abbr: 'Hag', chapters: 2, testament: 'old' },
            { id: 38, name: 'Zechariah', abbr: 'Zec', chapters: 14, testament: 'old' },
            { id: 39, name: 'Malachi', abbr: 'Mal', chapters: 4, testament: 'old' },
            
            // New Testament - 27 books
            { id: 40, name: 'Matthew', abbr: 'Mat', chapters: 28, testament: 'new' },
            { id: 41, name: 'Mark', abbr: 'Mar', chapters: 16, testament: 'new' },
            { id: 42, name: 'Luke', abbr: 'Luk', chapters: 24, testament: 'new' },
            { id: 43, name: 'John', abbr: 'Joh', chapters: 21, testament: 'new' },
            { id: 44, name: 'Acts', abbr: 'Act', chapters: 28, testament: 'new' },
            { id: 45, name: 'Romans', abbr: 'Rom', chapters: 16, testament: 'new' },
            { id: 46, name: '1 Corinthians', abbr: '1Co', chapters: 16, testament: 'new' },
            { id: 47, name: '2 Corinthians', abbr: '2Co', chapters: 13, testament: 'new' },
            { id: 48, name: 'Galatians', abbr: 'Gal', chapters: 6, testament: 'new' },
            { id: 49, name: 'Ephesians', abbr: 'Eph', chapters: 6, testament: 'new' },
            { id: 50, name: 'Philippians', abbr: 'Phi', chapters: 4, testament: 'new' },
            { id: 51, name: 'Colossians', abbr: 'Col', chapters: 4, testament: 'new' },
            { id: 52, name: '1 Thessalonians', abbr: '1Th', chapters: 5, testament: 'new' },
            { id: 53, name: '2 Thessalonians', abbr: '2Th', chapters: 3, testament: 'new' },
            { id: 54, name: '1 Timothy', abbr: '1Ti', chapters: 6, testament: 'new' },
            { id: 55, name: '2 Timothy', abbr: '2Ti', chapters: 4, testament: 'new' },
            { id: 56, name: 'Titus', abbr: 'Tit', chapters: 3, testament: 'new' },
            { id: 57, name: 'Philemon', abbr: 'Phm', chapters: 1, testament: 'new' },
            { id: 58, name: 'Hebrews', abbr: 'Heb', chapters: 13, testament: 'new' },
            { id: 59, name: 'James', abbr: 'Jas', chapters: 5, testament: 'new' },
            { id: 60, name: '1 Peter', abbr: '1Pe', chapters: 5, testament: 'new' },
            { id: 61, name: '2 Peter', abbr: '2Pe', chapters: 3, testament: 'new' },
            { id: 62, name: '1 John', abbr: '1Jo', chapters: 5, testament: 'new' },
            { id: 63, name: '2 John', abbr: '2Jo', chapters: 1, testament: 'new' },
            { id: 64, name: '3 John', abbr: '3Jo', chapters: 1, testament: 'new' },
            { id: 65, name: 'Jude', abbr: 'Jud', chapters: 1, testament: 'new' },
            { id: 66, name: 'Revelation', abbr: 'Rev', chapters: 22, testament: 'new' },
        ];
    }

    /**
     * Get all books
     */
    getAllBooks() {
        return this.bibleBooks;
    }

    /**
     * Get a specific book by ID
     */
    getBook(bookId) {
        return this.bibleBooks.find(b => b.id === bookId);
    }

    /**
     * Load chapter data
     * Returns promise that resolves with chapter verses array
     */
    async loadChapter(bookId, chapterNumber) {
        const cacheKey = `${bookId}-${chapterNumber}`;
        
        // Return from cache if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Return pending request if already loading
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Create new request
        const request = this.fetchChapterData(bookId, chapterNumber)
            .then(data => {
                this.cache.set(cacheKey, data);
                this.pendingRequests.delete(cacheKey);
                return data;
            })
            .catch(error => {
                this.pendingRequests.delete(cacheKey);
                throw error;
            });

        this.pendingRequests.set(cacheKey, request);
        return request;
    }

    /**
     * Fetch chapter data from JSON file
     */
    async fetchChapterData(bookId, chapterNumber) {
        const book = this.getBook(bookId);
        if (!book) {
            throw new Error(`Book with ID ${bookId} not found`);
        }

        if (chapterNumber < 1 || chapterNumber > book.chapters) {
            throw new Error(`Chapter ${chapterNumber} not found in ${book.name}`);
        }

        try {
            // Construct path like: data/esv/genesis/1.json (with version)
            const bookFolderName = book.name.toLowerCase().replace(/\s+/g, '_');
            const dataUrl = `${this.dataPath}/${this.currentVersion}/${bookFolderName}/${chapterNumber}.json`;
            
            const response = await fetch(dataUrl);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Try fallback without version (backward compatibility)
                    const fallbackUrl = `${this.dataPath}/${bookFolderName}/${chapterNumber}.json`;
                    const fallbackResponse = await fetch(fallbackUrl);
                    
                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json();
                        if (Array.isArray(data) && data.every(verse => typeof verse === 'string')) {
                            return data;
                        }
                    }
                    
                    // Return sample data for demonstration if file not found
                    return this.generateSampleChapter(book.name, chapterNumber);
                }
                throw new Error(`Failed to load chapter: ${response.status}`);
            }

            const data = await response.json();
            
            // Validate that data is an array of strings
            if (!Array.isArray(data) || !data.every(verse => typeof verse === 'string')) {
                throw new Error('Invalid chapter data format');
            }

            return data;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to load chapter data');
            }
            throw error;
        }
    }

    /**
     * Generate sample chapter data for demonstration
     */
    generateSampleChapter(bookName, chapterNumber) {
        const samples = {
            'Genesis': [
                'In the beginning God created the heavens and the earth.',
                'Now the earth was formless and empty, darkness was over the surface of the deep.',
            ],
            'Matthew': [
                'This is the genealogy of Jesus the Messiah, the son of David.',
                'Abraham was the father of Isaac, Isaac the father of Jacob, and Jacob the father of Judah.',
            ],
        };

        // Return sample verses or generate generic ones
        if (samples[bookName]) {
            return samples[bookName];
        }

        return Array.from({ length: 10 }, (_, i) => 
            `This is verse ${i + 1} of ${bookName} chapter ${chapterNumber}. Lorem ipsum dolor sit amet.`
        );
    }

    /**
     * Prefetch next chapter (optimization)
     */
    prefetchNextChapter(bookId, chapterNumber) {
        const book = this.getBook(bookId);
        if (!book) return;

        if (chapterNumber < book.chapters) {
            // Prefetch next chapter in this book
            this.loadChapter(bookId, chapterNumber + 1).catch(() => {
                // Silently fail - it's just a prefetch
            });
        } else if (bookId < 66) {
            // Prefetch first chapter of next book
            this.loadChapter(bookId + 1, 1).catch(() => {
                // Silently fail
            });
        }
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get total chapter count
     */
    getTotalChapters() {
        return this.bibleBooks.reduce((sum, book) => sum + book.chapters, 0);
    }

    /**
     * MULTI-VERSION SUPPORT
     */

    /**
     * Set current Bible version
     */
    async setVersion(versionCode) {
        const normalized = versionCode.toLowerCase();
        
        // Check if version exists by trying to load metadata
        try {
            const metadata = await this.loadVersionMetadata(normalized);
            this.currentVersion = normalized;
            this.clearCache(); // Clear cache when switching versions
            return true;
        } catch (error) {
            console.error(`Version ${versionCode} not available:`, error);
            return false;
        }
    }

    /**
     * Get current version
     */
    getCurrentVersion() {
        return this.currentVersion;
    }

    /**
     * Load version metadata
     */
    async loadVersionMetadata(versionCode) {
        const normalized = versionCode.toLowerCase();
        
        // Return cached metadata if available
        if (this.versionMetadata.has(normalized)) {
            return this.versionMetadata.get(normalized);
        }

        try {
            const metadataUrl = `${this.dataPath}/${normalized}/version.json`;
            const response = await fetch(metadataUrl);
            
            if (!response.ok) {
                throw new Error(`Version metadata not found for ${versionCode}`);
            }

            const metadata = await response.json();
            this.versionMetadata.set(normalized, metadata);
            return metadata;
        } catch (error) {
            throw new Error(`Failed to load version ${versionCode}: ${error.message}`);
        }
    }

    /**
     * Discover available versions
     */
    async discoverVersions() {
        // Try to discover available versions by checking common ones
        const commonVersions = ['esv', 'niv', 'nlt', 'nasb', 'kjv'];
        const available = [];

        for (const version of commonVersions) {
            try {
                const metadata = await this.loadVersionMetadata(version);
                available.push(version);
                console.log(`✓ Discovered version: ${version}`);
            } catch (error) {
                console.log(`✗ Version ${version} not available: ${error.message}`);
                // Version not available, skip
            }
        }

        this.availableVersions = available;
        console.log(`Total versions discovered: ${available.length}`, available);
        return available;
    }

    /**
     * Get available versions
     */
    getAvailableVersions() {
        return this.availableVersions;
    }

    /**
     * Get version metadata
     */
    getVersionMetadata(versionCode) {
        const normalized = versionCode.toLowerCase();
        return this.versionMetadata.get(normalized);
    }
}

// Create singleton instance
const dataLoader = new DataLoader();
