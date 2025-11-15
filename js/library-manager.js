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
        document.getElementById('old-testament-tab')?.classList.toggle('active', testament === 'old');
        document.getElementById('new-testament-tab')?.classList.toggle('active', testament === 'new');

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
     * Render books list as an accordion
     */
    async renderBooksList() {
        const booksListContainer = document.getElementById('library-books-list');
        if (!booksListContainer) return;

        booksListContainer.innerHTML = '<div class="loading-spinner"></div>'; // Show spinner

        const books = dataLoader.getAllBooks().filter(
            book => book.testament === this.currentTestament
        );

        // Create a document fragment to build the list off-DOM
        const fragment = document.createDocumentFragment();

        for (const book of books) {
            const bookCard = await this.createBookAccordion(book);
            fragment.appendChild(bookCard);
        }

        // Replace spinner with the fully built list
        booksListContainer.innerHTML = '';
        booksListContainer.appendChild(fragment);
    }

    /**
     * Create a single book accordion item
     */
    async createBookAccordion(book) {
        const card = document.createElement('div');
        card.className = 'book-card';

        const progress = await storageManager.getBookProgress(book.id);

        // Header (the clickable part of the accordion)
        const header = document.createElement('div');
        header.className = 'book-card-header';
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', 'false');
        header.innerHTML = `
            <div class="book-card-main">
                <h3 class="book-card-title">${book.name}</h3>
                <div class="book-card-progress-bar">
                    <div class="progress-fill" style="width: ${progress.percentage}%;"></div>
                </div>
            </div>
            <div class="book-card-meta">
                <span class="book-card-progress-text">${progress.completed}/${progress.total}</span>
                <span class="accordion-icon">▶</span>
            </div>
        `;

        // Chapter grid (the collapsible panel)
        const chaptersGrid = document.createElement('div');
        chaptersGrid.className = 'chapters-grid';
        chaptersGrid.style.display = 'none'; // Initially hidden

        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', !isExpanded);
            chaptersGrid.style.display = isExpanded ? 'none' : 'grid';
            header.querySelector('.accordion-icon').textContent = isExpanded ? '▶' : '▼';

            // Lazy-load chapters only when expanded for the first time
            if (!isExpanded && chaptersGrid.children.length === 0) {
                this.populateChapterGrid(chaptersGrid, book);
            }
        });

        card.appendChild(header);
        card.appendChild(chaptersGrid);

        return card;
    }

    /**
     * Populate the chapter grid for a book (lazy-loaded)
     */
    async populateChapterGrid(gridElement, book) {
        gridElement.innerHTML = '<div class="loading-spinner"></div>';
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
        btn.className = 'chapter-btn';
        btn.textContent = chapterNumber;
        btn.setAttribute('aria-label', `Chapter ${chapterNumber}`);

        const version = dataLoader.getCurrentVersion();
        const progress = await dbManager.getProgress(version, bookId, chapterNumber);

        if (progress?.completed || progress?.isCompleted) {
            btn.classList.add('completed');
            btn.style.setProperty('--chapter-progress', '100%');
        } else if (progress?.wordIndex > 0) {
            btn.classList.add('in-progress');

            const totalWords = typeof progress.wordCount === 'number' && progress.wordCount > 0
                ? progress.wordCount
                : (typeof progress.totalWords === 'number' && progress.totalWords > 0
                    ? progress.totalWords
                    : null);

            const percent = totalWords
                ? Math.min(100, Math.round((progress.wordIndex / totalWords) * 100))
                : 10; // fallback glow when total unknown

            btn.style.setProperty('--chapter-progress', `${percent}%`);
        }

        if (await storageManager.hasNote(bookId, chapterNumber)) {
            btn.classList.add('has-note');
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the accordion from closing
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
