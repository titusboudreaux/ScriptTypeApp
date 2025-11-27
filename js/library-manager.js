/**
 * LIBRARY MANAGER MODULE
 * Handles the library view - Bible-app-style chapter picker
 * Manages: book/chapter selection, progress indicators, testament filtering
 */

class LibraryManager {
    constructor() {
        this.currentTestament = 'old';
        this.ready = false;
        this.initPromise = this.init();
    }

    async ensureReady() {
        if (!this.ready) {
            await this.initPromise;
        }
    }

    /**
     * Initialize library manager
     */
    async init() {
        await this.setupEventListeners();
        this.ready = true;
    }

    /**
     * Setup event listeners
     */
    async setupEventListeners() {
        // Version selector
        const versionSelect = document.getElementById('library-version-select');
        if (versionSelect) {
            versionSelect.addEventListener('change', async (e) => {
                const success = await window.app.changeVersion(e.target.value);
                if (success) {
                    await this.renderBooksList(); // Re-render on version change
                }
            });
        }

        // Testament tabs
        const oldTestamentTab = document.getElementById('old-testament-tab');
        const newTestamentTab = document.getElementById('new-testament-tab');

        if (oldTestamentTab) {
            oldTestamentTab.addEventListener('click', () => this.switchTestament('old'));
        }

        if (newTestamentTab) {
            newTestamentTab.addEventListener('click', () => this.switchTestament('new'));
        }
    }

    /**
     * Switch testament tab
     */
    switchTestament(testament) {
        this.currentTestament = testament;

        // Update tab active states
        const oldTab = document.getElementById('old-testament-tab');
        const newTab = document.getElementById('new-testament-tab');

        if (oldTab && newTab) {
            if (testament === 'old') {
                oldTab.classList.remove('text-subtext-light', 'dark:text-subtext-dark', 'hover:text-text-light', 'dark:hover:text-text-dark', 'bg-transparent');
                oldTab.classList.add('bg-primary', 'text-white');

                newTab.classList.add('text-subtext-light', 'dark:text-subtext-dark', 'hover:text-text-light', 'dark:hover:text-text-dark', 'bg-transparent');
                newTab.classList.remove('bg-primary', 'text-white');
            } else {
                newTab.classList.remove('text-subtext-light', 'dark:text-subtext-dark', 'hover:text-text-light', 'dark:hover:text-text-dark', 'bg-transparent');
                newTab.classList.add('bg-primary', 'text-white');

                oldTab.classList.add('text-subtext-light', 'dark:text-subtext-dark', 'hover:text-text-light', 'dark:hover:text-text-dark', 'bg-transparent');
                oldTab.classList.remove('bg-primary', 'text-white');
            }
        }

        // Re-render books list
        this.renderBooksList();
    }

    /**
     * Render the entire library view content
     */
    async renderLibrary() {
        await this.ensureReady();
        uiManager.populateVersionSelect(); // Use the central UI manager method
        await this.renderBooksList();
    }

    /**
     * Render books list as a grid of cards
     */
    async renderBooksList() {
        const booksListContainer = document.getElementById('library-books-list');
        if (!booksListContainer) return;

        booksListContainer.innerHTML = '<div class="col-span-full flex justify-center p-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';

        const books = dataLoader.getAllBooks().filter(
            book => book.testament === this.currentTestament
        );

        // Create a document fragment to build the list off-DOM
        const fragment = document.createDocumentFragment();

        for (const book of books) {
            const bookCard = await this.createBookCard(book);
            fragment.appendChild(bookCard);
        }

        // Replace spinner with the fully built list
        booksListContainer.innerHTML = '';
        booksListContainer.appendChild(fragment);
    }

    /**
     * Create a single book card
     */
    async createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-sm border border-border-light dark:border-border-dark hover:shadow-md transition-all cursor-pointer group relative overflow-hidden';

        const progress = await storageManager.getBookProgress(book.id);
        const isCompleted = progress.completed === progress.total;

        // Calculate progress ring parameters
        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress.percentage / 100) * circumference;
        const strokeColor = isCompleted ? '#10B981' : '#3B82F6'; // green-500 : blue-500

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-text-light dark:text-text-dark group-hover:text-primary transition-colors">${book.name}</h3>
                    <p class="text-sm text-subtext-light dark:text-subtext-dark">${book.chapters} Chapters</p>
                </div>
                <div class="relative w-12 h-12 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="24"
                            cy="24"
                            r="${radius}"
                            stroke="currentColor"
                            stroke-width="4"
                            fill="transparent"
                            class="text-background-light dark:text-background-dark"
                        />
                        <circle
                            cx="24"
                            cy="24"
                            r="${radius}"
                            stroke="${strokeColor}"
                            stroke-width="4"
                            fill="transparent"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}"
                            stroke-linecap="round"
                            class="transition-all duration-500"
                        />
                    </svg>
                    <span class="absolute text-[10px] font-bold text-text-light dark:text-text-dark">${Math.round(progress.percentage)}%</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center text-sm">
                <span class="text-subtext-light dark:text-subtext-dark">${progress.completed}/${progress.total} Completed</span>
                <span class="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">arrow_forward</span>
            </div>

            <!-- Expanded Content (Chapters) - Initially Hidden -->
            <div class="chapters-container hidden mt-6 pt-6 border-t border-border-light dark:border-border-dark">
                <div class="grid grid-cols-5 gap-2">
                    <!-- Chapters populated on click -->
                </div>
            </div>
        `;

        // Handle click to expand/collapse
        card.addEventListener('click', (e) => {
            // If clicking a chapter button, don't toggle
            if (e.target.closest('.chapter-btn')) return;

            const container = card.querySelector('.chapters-container');
            const grid = container.querySelector('.grid');
            const isHidden = container.classList.contains('hidden');

            // Close other open cards (optional, but good for grid layout)
            document.querySelectorAll('.chapters-container').forEach(el => {
                if (el !== container) el.classList.add('hidden');
            });

            if (isHidden) {
                container.classList.remove('hidden');
                if (grid.children.length === 0) {
                    this.populateChapterGrid(grid, book);
                }
            } else {
                container.classList.add('hidden');
            }
        });

        return card;
    }

    /**
     * Populate the chapter grid for a book (lazy-loaded)
     */
    async populateChapterGrid(gridElement, book) {
        gridElement.innerHTML = '<div class="col-span-full flex justify-center"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div></div>';
        const fragment = document.createDocumentFragment();

        for (let ch = 1; ch <= book.chapters; ch++) {
            const chapterBtn = await this.createChapterButton(book.id, ch);
            fragment.appendChild(chapterBtn);
        }

        gridElement.innerHTML = '';
        gridElement.appendChild(fragment);
    }

    /**
     * Create a single chapter button
     */
    async createChapterButton(bookId, chapterNumber) {
        const btn = document.createElement('button');
        btn.className = 'chapter-btn w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors border border-transparent';
        btn.textContent = chapterNumber;
        btn.setAttribute('aria-label', `Chapter ${chapterNumber}`);

        const version = dataLoader.getCurrentVersion();
        const progress = await dbManager.getProgress(version, bookId, chapterNumber);
        const hasNote = await storageManager.hasNote(bookId, chapterNumber);

        if (progress?.completed || progress?.isCompleted) {
            btn.classList.add('bg-green-100', 'text-green-700', 'dark:bg-green-900/30', 'dark:text-green-400', 'hover:bg-green-200', 'dark:hover:bg-green-900/50');
        } else if (progress?.wordIndex > 0) {
            // Calculate percentage for gradient
            let percent = 0;
            if (progress.wordCount && progress.wordCount > 0) {
                percent = Math.round((progress.wordIndex / progress.wordCount) * 100);
            } else {
                // Fallback if wordCount not available (legacy data)
                percent = 10; // Show a little progress to indicate started
            }

            // Apply gradient
            btn.style.background = `linear-gradient(to right, rgba(59, 130, 246, 0.3) ${percent}%, transparent ${percent}%)`;
            btn.classList.add('text-blue-700', 'dark:text-blue-400', 'border-blue-200', 'dark:border-blue-800');
            // Add a base background color for dark mode readability if needed, or rely on transparent
            btn.classList.add('bg-blue-50', 'dark:bg-blue-900/10');
        } else {
            btn.classList.add('bg-background-light', 'dark:bg-background-dark', 'text-text-light', 'dark:text-text-dark', 'hover:bg-gray-100', 'dark:hover:bg-gray-800', 'border-border-light', 'dark:border-border-dark');
        }

        if (hasNote) {
            // Add a small indicator for notes
            const indicator = document.createElement('span');
            indicator.className = 'absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full';
            btn.style.position = 'relative';
            btn.appendChild(indicator);
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card toggle
            this.selectChapter(bookId, chapterNumber);
        });

        return btn;
    }

    /**
     * Select a chapter and navigate to the typing view
     */
    async selectChapter(bookId, chapterNumber) {
        // Immediately switch view to provide user feedback
        uiManager.switchView('typing-view');

        const version = dataLoader.getCurrentVersion();
        const progress = await dbManager.getProgress(version, bookId, chapterNumber);

        const position = progress ? {
            bookId,
            chapterNumber,
            verseIndex: progress.verseIndex || 0,
            wordIndex: progress.wordIndex || 0,
            charIndex: progress.charIndex || 0,
        } : null;

        // Load the chapter
        await window.app.loadChapter(bookId, chapterNumber, position);
    }

    /**
     * Public method to show and render the library
     */
    async show() {
        await this.renderLibrary();
    }
}

// Create singleton instance
const libraryManager = new LibraryManager();
libraryManager.init(); // Initialize immediately
