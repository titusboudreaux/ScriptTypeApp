/**
 * NOTES MANAGER MODULE
 * Handles per-chapter notes with auto-save
 */

class NotesManager {
    constructor() {
        this.currentBookId = null;
        this.currentChapterNumber = null;
        this.textarea = null;
        this.charCounter = null;
        this.toggleBtn = null;
        this.panel = null;
        this.saveTimeout = null;
        this.isCollapsed = false; // Default to open if visible
        this.ready = false;
    }

    /**
     * Initialize notes manager
     */
    async init() {
        this.textarea = document.getElementById('notes-textarea');
        this.charCounter = document.getElementById('notes-char-counter');
        this.toggleBtn = document.getElementById('notes-toggle-btn'); // Might not exist in new layout
        this.panel = document.getElementById('notes-panel');

        if (!this.textarea || !this.charCounter || !this.panel) {
            // It's possible notes panel is not in the DOM for some views or layouts, 
            // but for typing view it should be.
            // We'll warn but not fail hard if it's just missing elements.
            // console.warn('Notes panel elements not found');
        }

        this.setupEventListeners();

        this.ready = true;
        console.log('✓ Notes Manager initialized');
        return true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle button (if exists)
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                this.toggle();
            });
        }

        // Textarea input - character counter and auto-save
        if (this.textarea) {
            this.textarea.addEventListener('input', () => {
                this.updateCharCounter();
                this.debouncedSave();
            });

            // Textarea blur - immediate save
            this.textarea.addEventListener('blur', () => {
                this.saveNote();
                const nextFocus = document.activeElement;
                const stillInPanel = this.panel && nextFocus ? this.panel.contains(nextFocus) : false;
                if (!stillInPanel) {
                    if (window.app && typeof window.app.resumeTypingFromNotes === 'function') {
                        window.app.resumeTypingFromNotes();
                    }
                }
            });

            // Textarea focus - pause typing so notes can be entered freely
            this.textarea.addEventListener('focus', () => {
                if (window.app && typeof window.app.pauseTypingForNotes === 'function') {
                    window.app.pauseTypingForNotes();
                }
            });
        }
    }

    /**
     * Load chapter notes
     */
    async loadChapterNotes(bookId, chapterNumber) {
        this.currentBookId = bookId;
        this.currentChapterNumber = chapterNumber;

        // Load note from storage
        const noteText = await storageManager.getNote(bookId, chapterNumber);

        if (this.textarea) {
            this.textarea.value = noteText || '';
            this.updateCharCounter();
        }
    }

    /**
     * Save note (debounced)
     */
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.saveNote();
        }, 500);
    }

    /**
     * Save note immediately
     */
    async saveNote() {
        if (!this.currentBookId || !this.currentChapterNumber || !this.textarea) {
            return;
        }

        const noteText = this.textarea.value.trim();
        await storageManager.saveNote(
            this.currentBookId,
            this.currentChapterNumber,
            noteText
        );

        // Update library view note indicator if needed
        // The library will check hasNote() when rendering
    }

    /**
     * Update character counter
     */
    updateCharCounter() {
        if (!this.textarea || !this.charCounter) return;

        const length = this.textarea.value.length;
        const maxLength = 280;

        this.charCounter.textContent = `${length}/${maxLength}`;

        // Update counter color based on length
        this.charCounter.classList.remove('text-red-500', 'text-yellow-500');

        if (length >= maxLength) {
            this.charCounter.classList.add('text-red-500');
        } else if (length >= maxLength * 0.9) {
            this.charCounter.classList.add('text-yellow-500');
        }
    }

    /**
     * Toggle notes panel
     */
    toggle() {
        this.isCollapsed = !this.isCollapsed;

        if (this.panel) {
            this.panel.classList.toggle('hidden', this.isCollapsed);
        }
    }

    /**
     * Expand notes panel
     */
    expand() {
        this.isCollapsed = false;
        if (this.panel) {
            this.panel.classList.remove('hidden');
        }
    }

    /**
     * Collapse notes panel
     */
    collapse() {
        this.isCollapsed = true;
        if (this.panel) {
            this.panel.classList.add('hidden');
        }
    }

    /**
     * NEW: Render all notes for the Notes Hub
     */
    async renderNotesHub() {
        const container = document.getElementById('notes-hub-container');
        if (!container) return;

        const allNotes = await storageManager.getAllNotes();

        if (allNotes.length === 0) {
            container.innerHTML = '<p class="text-subtext-light dark:text-subtext-dark text-sm">You haven\'t taken any notes yet.</p>';
            return;
        }

        // Sort notes by most recently modified
        allNotes.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

        container.innerHTML = ''; // Clear existing content

        for (const note of allNotes) {
            const book = dataLoader.getBook(note.bookId);
            if (!book) continue;

            const noteCard = document.createElement('div');
            noteCard.className = 'bg-background-light dark:bg-background-dark p-4 rounded-lg border border-border-light dark:border-border-dark hover:border-primary transition-colors cursor-pointer group';
            noteCard.dataset.bookId = note.bookId;
            noteCard.dataset.chapter = note.chapterNumber;

            const snippet = note.text.length > 100 ? note.text.substring(0, 100) + '...' : note.text;

            noteCard.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="font-semibold text-text-light dark:text-text-dark text-sm group-hover:text-primary transition-colors">${book.name} ${note.chapterNumber}</span>
                    <span class="text-xs text-subtext-light dark:text-subtext-dark">${new Date(note.lastModified).toLocaleDateString()}</span>
                </div>
                <p class="text-sm text-subtext-light dark:text-subtext-dark line-clamp-2">${snippet}</p>
            `;

            noteCard.addEventListener('click', () => {
                // Use app to load the chapter and then show the typing view
                window.app.loadChapter(note.bookId, note.chapterNumber).then(() => {
                    uiManager.switchView('typing-view');
                    // Optionally, expand the notes panel automatically if we had a toggle
                });
            });

            container.appendChild(noteCard);
        }
    }

    /**
     * Clear notes
     */
    clear() {
        if (this.textarea) {
            this.textarea.value = '';
            this.updateCharCounter();
        }
    }
}

// Create singleton instance
const notesManager = new NotesManager();
