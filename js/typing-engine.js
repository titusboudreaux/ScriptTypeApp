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
        this.listeners = [];
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
            
            // Use saved position if provided, otherwise start from beginning
            this.currentPosition = position ? { ...position } : {
                bookId,
                chapterNumber,
                verseIndex: 0,
                wordIndex: 0,
            };
            
            this.parseWords();
            this.typingStats.startTime = Date.now();
            this.isActive = true;

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
            // Remove punctuation and split into words
            const verseWords = verse
                .split(/\s+/)
                .filter(word => word.length > 0)
                .map(word => {
                    // Clean punctuation from word but preserve the root
                    const cleaned = word.replace(/[^\w'-]/g, '');
                    return cleaned.length > 0 ? cleaned : word;
                });

            verseWords.forEach((word, wordIndex) => {
                this.words.push({
                    text: word,
                    firstLetter: word.charAt(0).toLowerCase(),
                    verseIndex,
                    wordIndex,
                    verse: verse,
                });
            });
        });
    }

    /**
     * Render chapter text to DOM with word spans
     */
    renderChapterToDOM(containerElement) {
        containerElement.innerHTML = '';
        this.wordElements = [];
        let wordTracker = 0; // Track position in this.words array

        this.verses.forEach((verse, verseIndex) => {
            // Find the first word of this verse
            const firstWordOfVerse = this.words.findIndex(w => w.verseIndex === verseIndex);
            if (firstWordOfVerse !== -1) {
                wordTracker = firstWordOfVerse;
            }
            
            // Parse verse into words (preserving whitespace)
            const verseWords = verse.split(/(\s+)/);
            
            verseWords.forEach((part) => {
                if (/^\s+$/.test(part)) {
                    // Whitespace - create text node
                    containerElement.appendChild(document.createTextNode(part));
                } else if (part.length > 0) {
                    // Word - create span
                    const span = document.createElement('span');
                    span.className = 'word';
                    span.dataset.verseIndex = verseIndex;
                    
                    // Clean the part to match against parsed words
                    const cleanedPart = part.replace(/[^\w'-]/g, '');
                    
                    // Only process if there's actual content after cleaning
                    if (cleanedPart.length === 0) {
                        // Pure punctuation - just render as text node
                        containerElement.appendChild(document.createTextNode(part));
                    } else {
                        // Find the matching word in the words array
                        // Look for next word starting from wordTracker
                        let foundWord = null;
                        let foundIndex = -1;
                        
                        for (let i = wordTracker; i < this.words.length; i++) {
                            const w = this.words[i];
                            if (w.verseIndex === verseIndex && w.text === cleanedPart) {
                                foundWord = w;
                                foundIndex = i;
                                wordTracker = i + 1;
                                break;
                            }
                        }

                        if (foundWord) {
                            span.dataset.wordIndex = foundIndex;
                            
                            // Find first actual letter (skip punctuation)
                            let firstLetterIndex = 0;
                            for (let i = 0; i < part.length; i++) {
                                if (/[a-zA-Z]/.test(part[i])) {
                                    firstLetterIndex = i;
                                    break;
                                }
                            }
                            
                            // Split word text and wrap first letter
                            const beforeLetter = part.slice(0, firstLetterIndex);
                            const firstLetter = part.charAt(firstLetterIndex);
                            const restOfWord = part.slice(firstLetterIndex + 1);
                            
                            if (beforeLetter) {
                                span.appendChild(document.createTextNode(beforeLetter));
                            }
                            
                            const letterSpan = document.createElement('span');
                            letterSpan.className = 'first-letter';
                            letterSpan.textContent = firstLetter;
                            span.appendChild(letterSpan);
                            
                            if (restOfWord) {
                                span.appendChild(document.createTextNode(restOfWord));
                            }

                            this.wordElements.push(span);
                            containerElement.appendChild(span);
                        } else {
                            // Fallback: just render the part as is
                            span.textContent = part;
                            containerElement.appendChild(span);
                        }
                    }
                }
            });
        });

        // Mark first word as active
        if (this.wordElements.length > 0) {
            this.wordElements[0].classList.add('active');
        }

        // Force scroll to top after rendering
        setTimeout(() => {
            if (containerElement.parentElement) {
                containerElement.parentElement.scrollTop = 0;
            }
            containerElement.scrollTop = 0;
        }, 50);

        // Restore progress if applicable
        if (this.currentPosition.wordIndex > 0) {
            this.restoreProgressDOM();
        }
    }

    /**
     * Restores the DOM to match the current position (wordIndex)
     */
    restoreProgressDOM() {
        if (!this.wordElements || this.wordElements.length === 0) return;

        // Mark previous words as completed
        for (let i = 0; i < this.currentPosition.wordIndex; i++) {
            if (this.wordElements[i]) {
                this.wordElements[i].classList.remove('active');
                this.wordElements[i].classList.add('completed');
            }
        }

        // Mark the current word as active
        const activeElement = this.wordElements[this.currentPosition.wordIndex];
        if (activeElement) {
            activeElement.classList.add('active');
            this.scrollToActiveWord();
        }
    }

    /**
     * Handle keystroke
     */
    handleKeystroke(key) {
        if (!this.isActive) return;

        const currentWord = this.words[this.currentPosition.wordIndex];
        if (!currentWord) {
            this.endChapter();
            return;
        }

        const expectedLetter = currentWord.firstLetter;
        const inputLetter = key.toLowerCase();

        const isCorrect = inputLetter === expectedLetter;

        if (isCorrect) {
            this.typingStats.correctKeystrokes++;
            this.advanceWord();
        } else {
            this.typingStats.incorrectKeystrokes++;
            this.triggerErrorFeedback();
        }

        this.typingStats.totalWordsTyped++;
        this.updateWPM();
        this.notifyListeners('keystroke', { isCorrect });
    }

    /**
     * Advance to next word
     */
    advanceWord() {
        const currentElement = this.wordElements[this.currentPosition.wordIndex];
        if (currentElement) {
            currentElement.classList.remove('active', 'error');
            currentElement.classList.add('completed');
        }

        this.currentPosition.wordIndex++;

        // Check if chapter is complete
        if (this.currentPosition.wordIndex >= this.words.length) {
            this.endChapter();
            return;
        }

        // Update active word
        const nextElement = this.wordElements[this.currentPosition.wordIndex];
        if (nextElement) {
            nextElement.classList.add('active');
            this.scrollToActiveWord();
        }

        this.notifyListeners('word-advanced', this.currentPosition);
    }

    /**
     * Trigger error feedback
     */
    triggerErrorFeedback() {
        const currentElement = this.wordElements[this.currentPosition.wordIndex];
        if (currentElement) {
            currentElement.classList.add('error');
            
            // Remove error class after animation completes (400ms to match CSS animation)
            setTimeout(() => {
                if (currentElement.classList.contains('error')) {
                    currentElement.classList.remove('error');
                }
            }, 400);
        }
    }

    /**
     * Scroll active word into view
     */
    scrollToActiveWord() {
        // Don't auto-scroll if we're on the first word (start of chapter)
        if (this.currentPosition.wordIndex === 0) {
            return;
        }
        
        const activeWord = this.wordElements[this.currentPosition.wordIndex];
        if (activeWord && activeWord.scrollIntoView) {
            activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * End current chapter session
     */
    endChapter() {
        this.isActive = false;
        this.typingStats.endTime = Date.now();

        // Calculate session stats
        const sessionDuration = (this.typingStats.endTime - this.typingStats.startTime) / 1000 / 60; // minutes
        const wpm = Math.round(this.words.length / sessionDuration);

        // Update cumulative stats
        const stats = storageManager.getStats();
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

        storageManager.saveStats(stats);
        
        // Save chapter as completed
        storageManager.saveChapterProgress(
            this.currentPosition.bookId,
            this.currentPosition.chapterNumber,
            true
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
        this.listeners = [];
    }
}

// Create singleton instance
const typingEngine = new TypingEngine();
