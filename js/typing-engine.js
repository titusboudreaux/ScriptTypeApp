/**
 * TYPING ENGINE MODULE
 * Core game logic for typing mechanics
 * Handles: word parsing, keystroke validation, progress tracking
 */

class TypingEngine {
    constructor() {
        this.currentPosition = {
            bookId: 1,
            chapterNumber: 1,
            verseIndex: 0,
            wordIndex: 0,
            charIndex: 0, // NEW: for full-word mode
        };

        this.verses = [];
        this.words = [];
        this.wordElements = [];

        this.typingStats = {
            startTime: null,
            endTime: null,
            totalWordsTyped: 0,
            correctKeystrokes: 0,
            incorrectKeystrokes: 0,
            currentSessionWPM: 0,
        };

        this.sessionStartTime = Date.now();
        this.isActive = false;
        this.isPaused = false;
        this.listeners = [];

        // NEW: Typing mode settings
        this.typingMode = 'first-letter'; // 'first-letter' | 'full-word'
        this.caseSensitive = false;
    }

    /**
     * LIFECYCLE METHODS
     */

    /**
     * Initialize engine with chapter data
     */
    async loadChapter(bookId, chapterNumber, position = null) {
        try {
            const verses = await dataLoader.loadChapter(bookId, chapterNumber);
            this.verses = verses;

            // Load typing mode from settings
            const settings = await storageManager.getSettings();
            this.typingMode = settings.typingMode || 'first-letter';
            this.caseSensitive = settings.caseSensitive || false;

            // Use saved position if provided, otherwise start from beginning
            this.currentPosition = position ? { ...position } : {
                bookId,
                chapterNumber,
                verseIndex: 0,
                wordIndex: 0,
                charIndex: 0,
            };

            this.parseWords();

            // Clamp saved word index to available words (in case parsing rules changed)
            if (Array.isArray(this.words)) {
                if (this.words.length === 0) {
                    this.currentPosition.wordIndex = 0;
                } else if (this.currentPosition.wordIndex >= this.words.length) {
                    this.currentPosition.wordIndex = this.words.length - 1;
                } else if (this.currentPosition.wordIndex < 0) {
                    this.currentPosition.wordIndex = 0;
                }
            }
            this.typingStats.startTime = Date.now();
            this.isActive = true;
            this.isPaused = false;

            // Prefetch next chapter for better UX
            dataLoader.prefetchNextChapter(bookId, chapterNumber);

            this.notifyListeners('chapter-loaded');
            return true;
        } catch (error) {
            console.error('Failed to load chapter:', error);
            this.notifyListeners('error', { message: error.message });
            return false;
        }
    }

    /**
     * Parse verses into individual words
     */
    parseWords() {
        this.words = [];
        this.verses.forEach((verse, verseIndex) => {
            // Split on whitespace to get word-like tokens
            const tokens = verse.split(/\s+/).filter(t => t.length > 0);

            tokens.forEach(token => {
                // Find the first actual letter in the token
                const firstLetterMatch = token.match(/[a-zA-Z]/);
                if (firstLetterMatch) {
                    this.words.push({
                        text: token, // Keep the original token with punctuation
                        firstLetter: firstLetterMatch[0], // The actual first letter
                        verseIndex: verseIndex,
                    });
                }
            });
        });
    }

    /**
     * Render chapter text to DOM with word spans
     */
    renderChapterToDOM(containerElement) {
        if (!containerElement) {
            console.error('Render failed: container element not found.');
            return;
        }
        containerElement.innerHTML = '';
        this.wordElements = [];
        let wordCounter = 0;

        this.verses.forEach((verse, verseIndex) => {
            const verseElement = document.createElement('div');
            verseElement.className = 'verse';

            const verseText = verse.split(/(\s+)/); // Split while preserving spaces

            verseText.forEach(part => {
                if (part.trim() === '') {
                    // It's a whitespace part
                    verseElement.appendChild(document.createTextNode(part));
                } else {
                    // It's a word part
                    const wordData = this.words[wordCounter];

                    // Ensure the part from the verse matches the parsed word
                    if (wordData && wordData.text === part && wordData.verseIndex === verseIndex) {
                        const span = document.createElement('span');
                        span.className = 'word';
                        span.dataset.wordIndex = wordCounter;

                        // Find the index of the first letter to wrap it
                        const firstLetterMatch = part.match(/[a-zA-Z]/);
                        if (firstLetterMatch) {
                            const firstLetterIndex = firstLetterMatch.index;

                            // Text before the first letter (e.g., a quote)
                            if (firstLetterIndex > 0) {
                                span.appendChild(document.createTextNode(part.substring(0, firstLetterIndex)));
                            }

                            // The first letter itself
                            const letterSpan = document.createElement('span');
                            letterSpan.className = 'first-letter';
                            letterSpan.textContent = part[firstLetterIndex];
                            span.appendChild(letterSpan);

                            // The rest of the word
                            span.appendChild(document.createTextNode(part.substring(firstLetterIndex + 1)));
                        } else {
                            // Fallback for words without letters (shouldn't happen with current parsing)
                            span.textContent = part;
                        }

                        this.wordElements.push(span);
                        verseElement.appendChild(span);
                        wordCounter++;
                    } else {
                        // This part is not a "typeable" word (e.g., standalone punctuation)
                        verseElement.appendChild(document.createTextNode(part));
                    }
                }
            });
            containerElement.appendChild(verseElement);
        });

        this.restoreProgressDOM();
        this.notifyListeners('chapter-rendered');
    }

    /**
     * Restores the DOM to match the current position (wordIndex)
     */
    restoreProgressDOM() {
        if (!this.wordElements || this.wordElements.length === 0) return;

        let wordIndex = this.currentPosition.wordIndex || 0;
        if (wordIndex >= this.wordElements.length) {
            wordIndex = this.wordElements.length - 1;
        }
        if (wordIndex < 0) wordIndex = 0;

        // Mark previous words as completed
        for (let i = 0; i < wordIndex; i++) {
            if (this.wordElements[i]) {
                this.wordElements[i].classList.remove('highlight');
                this.wordElements[i].classList.add('correct');
            }
        }

        // Mark all subsequent words as not completed/not active
        for (let i = wordIndex; i < this.wordElements.length; i++) {
            if (this.wordElements[i]) {
                this.wordElements[i].classList.remove('highlight', 'correct');
            }
        }

        // Mark the current word as active
        const activeElement = this.wordElements[wordIndex];
        if (activeElement) {
            activeElement.classList.add('highlight');
            this.scrollToActiveWord();
        } else if (this.wordElements.length > 0) {
            // Fallback if index is out of bounds
            this.wordElements[0].classList.add('highlight');
        }
    }

    /**
     * Handle keystroke
     */
    handleKeystroke(key) {
        if (!this.isActive || this.isPaused) return;

        const currentWord = this.words[this.currentPosition.wordIndex];
        if (!currentWord) {
            // Call async endChapter but don't wait
            this.endChapter().catch(err => console.error('Failed to end chapter:', err));
            return;
        }

        if (this.typingMode === 'first-letter') {
            this.handleFirstLetterMode(key, currentWord);
        } else if (this.typingMode === 'full-word') {
            this.handleFullWordMode(key, currentWord);
        }

        this.updateWPM();
    }

    /**
     * Handle first-letter typing mode
     */
    handleFirstLetterMode(key, currentWord) {
        const expectedLetter = currentWord.firstLetter;
        const inputLetter = key; // Keep case for comparison if needed

        // Default to case-insensitive comparison
        const isCorrect = this.caseSensitive
            ? inputLetter === expectedLetter
            : inputLetter.toLowerCase() === expectedLetter.toLowerCase();

        if (isCorrect) {
            this.typingStats.correctKeystrokes++;
            this.typingStats.totalWordsTyped++;
            this.advanceWord();
        } else {
            this.typingStats.incorrectKeystrokes++;
            this.triggerErrorFeedback();
        }

        this.notifyListeners('keystroke', { isCorrect, mode: 'first-letter' });
    }

    /**
     * Handle full-word typing mode
     */
    handleFullWordMode(key, currentWord) {
        const charIndex = this.currentPosition.charIndex;
        const wordText = currentWord.text;

        if (charIndex >= wordText.length) {
            // Word complete, shouldn't happen
            return;
        }

        const expectedChar = wordText[charIndex];
        const inputChar = this.caseSensitive ? key : key.toLowerCase();
        const expected = this.caseSensitive ? expectedChar : expectedChar.toLowerCase();

        const isCorrect = inputChar === expected;

        if (isCorrect) {
            this.typingStats.correctKeystrokes++;
            this.currentPosition.charIndex++;

            // Update visual feedback for this character
            this.updateCharacterProgress(charIndex);

            // Check if word is complete
            if (this.currentPosition.charIndex >= wordText.length) {
                this.typingStats.totalWordsTyped++;
                this.currentPosition.charIndex = 0;
                this.advanceWord();
            }
        } else {
            this.typingStats.incorrectKeystrokes++;
            this.triggerErrorFeedback();
        }

        this.notifyListeners('keystroke', {
            isCorrect,
            mode: 'full-word',
            charIndex,
            wordProgress: this.currentPosition.charIndex / wordText.length
        });
    }

    /**
     * Update visual feedback for character progress in full-word mode
     */
    updateCharacterProgress(charIndex) {
        const currentElement = this.wordElements[this.currentPosition.wordIndex];
        if (!currentElement) return;

        const currentWord = this.words[this.currentPosition.wordIndex];
        const charProgress = this.currentPosition.charIndex;
        const charTotal = currentWord.text.length;

        // Set data attributes and CSS variables for visual feedback
        currentElement.dataset.charProgress = charProgress;
        currentElement.style.setProperty('--char-progress', charProgress);
        currentElement.style.setProperty('--char-total', charTotal);

        // Fire event for UI updates
        this.notifyListeners('character-progress', {
            wordIndex: this.currentPosition.wordIndex,
            charIndex: this.currentPosition.charIndex,
            progress: charProgress / charTotal,
        });
    }

    /**
     * Advance to next word
     */
    advanceWord() {
        const currentElement = this.wordElements[this.currentPosition.wordIndex];
        if (currentElement) {
            currentElement.classList.remove('highlight', 'incorrect');
            currentElement.classList.add('correct');
        }

        this.currentPosition.wordIndex++;

        // Check if chapter is complete
        if (this.currentPosition.wordIndex >= this.words.length) {
            // Call async endChapter but don't wait (fire and forget)
            this.endChapter().catch(err => console.error('Failed to end chapter:', err));
            return;
        }

        // Update active word
        const nextElement = this.wordElements[this.currentPosition.wordIndex];
        if (nextElement) {
            nextElement.classList.add('highlight');
            this.scrollToActiveWord();
        }

        this.notifyListeners('word-advanced', this.currentPosition);
    }

    /**
     * Trigger visual error feedback
     */
    triggerErrorFeedback() {
        const currentElement = this.wordElements[this.currentPosition.wordIndex];
        if (currentElement) {
            currentElement.classList.add('incorrect');

            // Remove class after animation
            setTimeout(() => {
                if (currentElement) {
                    currentElement.classList.remove('incorrect');
                }
            }, 500);
        }

        this.notifyListeners('error-feedback', {
            wordIndex: this.currentPosition.wordIndex
        });
    }

    /**
    /**
     * Scroll active word into view
     */
    scrollToActiveWord() {
        const activeWord = this.wordElements[this.currentPosition.wordIndex];
        if (activeWord && activeWord.scrollIntoView) {
            // Use a small timeout to ensure the DOM has been painted
            setTimeout(() => {
                activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        }
    }

    /**
     * End current chapter session
     */
    async endChapter() {
        this.isActive = false;
        this.isPaused = false;
        this.typingStats.endTime = Date.now();

        // Calculate session stats
        const sessionDuration = (this.typingStats.endTime - this.typingStats.startTime) / 1000 / 60; // minutes
        const wpm = Math.round(this.words.length / sessionDuration);

        // Update cumulative stats
        const stats = await storageManager.getStats();
        stats.totalWordsTyped += this.words.length;
        stats.sessionsCompleted++;

        // Update streak and longest streak
        stats.currentStreak = (stats.currentStreak || 0) + 1;
        stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);

        // Update average WPM
        const totalSessions = stats.sessionsCompleted;
        stats.averageWPM = Math.round(
            (stats.averageWPM * (totalSessions - 1) + wpm) / totalSessions
        );

        await storageManager.saveStats(stats);

        // Save chapter as completed
        await storageManager.saveChapterProgress(
            this.currentPosition.bookId,
            this.currentPosition.chapterNumber,
            true,
            null,
            this.words.length
        );

        this.notifyListeners('chapter-completed', {
            position: this.currentPosition,
            sessionDuration: Math.round(sessionDuration),
            wpm,
            wordsTyped: this.words.length,
            stats,
        });
    }

    /**
     * Calculate current WPM
     */
    updateWPM() {
        if (!this.typingStats.startTime) return;

        const elapsedSeconds = (Date.now() - this.typingStats.startTime) / 1000;
        const elapsedMinutes = elapsedSeconds / 60;

        if (elapsedMinutes > 0) {
            this.typingStats.currentSessionWPM = Math.round(
                this.typingStats.totalWordsTyped / elapsedMinutes
            );
        }
    }

    /**
     * Get current progress percentage
     */
    getProgressPercentage() {
        if (this.words.length === 0) return 0;
        return Math.round((this.currentPosition.wordIndex / this.words.length) * 100);
    }

    /**
     * LISTENER PATTERN
     */

    /**
     * Subscribe to engine events
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners
     */
    notifyListeners(eventType, data = {}) {
        this.listeners.forEach(listener => {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * GETTERS
     */

    getCurrentBook() {
        return dataLoader.getBook(this.currentPosition.bookId);
    }

    getCurrentWords() {
        return this.words;
    }

    getTypingStats() {
        return this.typingStats;
    }

    getPosition() {
        return { ...this.currentPosition };
    }

    /**
     * UTILITY METHODS
     */

    /**
     * Check if chapter is last
     */
    isLastChapter() {
        const book = this.getCurrentBook();
        return this.currentPosition.bookId === 66 &&
            this.currentPosition.chapterNumber === book.chapters;
    }

    /**
     * Get next chapter coordinates
     */
    getNextChapterCoordinates() {
        const book = this.getCurrentBook();

        if (this.currentPosition.chapterNumber < book.chapters) {
            return {
                bookId: this.currentPosition.bookId,
                chapterNumber: this.currentPosition.chapterNumber + 1,
            };
        } else if (this.currentPosition.bookId < 66) {
            return {
                bookId: this.currentPosition.bookId + 1,
                chapterNumber: 1,
            };
        }

        return null;
    }

    /**
     * Reset engine state
     */
    reset() {
        this.currentPosition = {
            bookId: 1,
            chapterNumber: 1,
            verseIndex: 0,
            wordIndex: 0,
        };
        this.verses = [];
        this.words = [];
        this.wordElements = [];
        this.typingStats = {
            startTime: null,
            endTime: null,
            totalWordsTyped: 0,
            correctKeystrokes: 0,
            incorrectKeystrokes: 0,
            currentSessionWPM: 0,
        };
        this.isActive = false;
        this.isPaused = false;
        this.listeners = [];
    }

    /**
     * Pause or resume typing without unloading chapter
     */
    setPaused(paused) {
        this.isPaused = Boolean(paused);

        if (!this.isActive) {
            return;
        }

        this.notifyListeners('typing-paused', { paused: this.isPaused });
    }
}

// Create singleton instance
const typingEngine = new TypingEngine();
