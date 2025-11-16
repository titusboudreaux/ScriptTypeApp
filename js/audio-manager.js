/**
 * AUDIO MANAGER MODULE
 * Handles Text-to-Speech using Web Speech API
 * Provides audio feedback while typing
 */

class AudioManager {
    constructor() {
        this.isAvailable = false;
        this.isEnabled = false;
        this.currentUtterance = null;
        this.voices = [];
        this.selectedVoice = null;
        this.speed = 1.0;
        this.readVerse = false; // Read verse when it appears
        this.wordQueue = [];
        this.isProcessingQueue = false;
        this.wordsPerPhrase = 3;
        this.lookaheadWindow = 12; // Keep audio slightly ahead without reading full chapter early
        this.nextWordToQueueIndex = 0;
        this.lastSpokenWordIndex = -1;
        this.currentPhraseMeta = null;
        this.warmupDone = false;
        this.ready = false;
    }

    /**
     * Initialize audio manager
     */
    async init() {
        // Check if Web Speech API is available
        if (!('speechSynthesis' in window)) {
            console.warn('Text-to-Speech not supported in this browser');
            this.isAvailable = false;
            return false;
        }

        this.isAvailable = true;

        // Load voices
        await this.loadVoices();

        // Load settings
        await this.loadSettings();

        // Subscribe to typing engine events
        this.subscribeToEngine();

        this.ready = true;
        console.log('✓ Audio Manager initialized');
        return true;
    }

    /**
     * Load available voices
     */
    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoiceList = () => {
                this.voices = speechSynthesis.getVoices();
                
                if (this.voices.length > 0) {
                    // Prefer English voices
                    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
                    
                    // Default to first English voice or first available
                    if (!this.selectedVoice) {
                        this.selectedVoice = englishVoices[0] || this.voices[0];
                    }
                    
                    resolve();
                } else {
                    // Voices not loaded yet, wait for voiceschanged event
                    speechSynthesis.addEventListener('voiceschanged', () => {
                        loadVoiceList();
                    }, { once: true });
                }
            };

            loadVoiceList();
        });
    }

    /**
     * Load settings
     */
    async loadSettings() {
        const settings = await storageManager.getSettings();
        this.isEnabled = settings.ttsEnabled || false;
        this.speed = settings.ttsSpeed || 1.0;
        this.readVerse = settings.ttsReadVerse || false;

        // Load selected voice if saved
        if (settings.ttsVoice && this.voices.length > 0) {
            const savedVoice = this.voices.find(v => v.name === settings.ttsVoice);
            if (savedVoice) {
                this.selectedVoice = savedVoice;
            }
        }
    }

    /**
     * Subscribe to typing engine events
     */
    subscribeToEngine() {
        typingEngine.subscribe((eventType, data) => {
            if (!this.isEnabled || !this.isAvailable) return;

            switch (eventType) {
                case 'word-advanced':
                    this.handleTypingProgress(data);
                    break;

                case 'keystroke':
                    this.handleTypingProgress();
                    break;

                case 'chapter-loaded':
                    this.resetChapterState();
                    if (this.readVerse) {
                        this.handleChapterLoaded();
                    }
                    break;

                default:
                    break;
            }
        });
    }

    handleTypingProgress(position = null) {
        const words = typingEngine.getCurrentWords();
        if (!words || words.length === 0) {
            return;
        }

        const currentPosition = position || typingEngine.getPosition();
        const targetIndex = Math.min(
            words.length,
            (currentPosition?.wordIndex || 0) + this.lookaheadWindow
        );

        this.ensureWarmup();
        this.queuePhrasesUpTo(words, targetIndex);
    }

    /**
     * Handle chapter loaded event
     */
    handleChapterLoaded() {
        // Read first verse
        const verses = typingEngine.verses;
        if (verses && verses.length > 0) {
            this.flushQueue();
            this.skipCurrentUtterance();
            this.speak(verses[0]);
        }
    }

    /**
     * Speak text using TTS
     */
    speak(text, { queue = false, meta = null } = {}) {
        if (!this.isAvailable || !this.isEnabled) return;

        if (!queue) {
            this.flushQueue();
            this.stop();
        }

        // Create new utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.voice = this.selectedVoice;
        this.currentUtterance.rate = this.speed;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;
        this.currentPhraseMeta = queue ? meta : null;

        // Error handling / completion
        this.currentUtterance.onerror = (event) => {
            console.warn('TTS error:', event.error);
            this.currentUtterance = null;
            if (queue) {
                this.isProcessingQueue = false;
                this.requeueCurrentMeta();
                this.processQueue();
            }
        };

        this.currentUtterance.onend = () => {
            this.currentUtterance = null;
            if (queue) {
                this.isProcessingQueue = false;
                this.markPhraseComplete();
                this.processQueue();
            }
        };

        // Speak
        speechSynthesis.speak(this.currentUtterance);
    }

    queuePhrasesUpTo(words, targetIndex) {
        if (!this.isEnabled) return;

        while (this.nextWordToQueueIndex < targetIndex) {
            const start = this.nextWordToQueueIndex;
            const end = Math.min(words.length - 1, start + this.wordsPerPhrase - 1);
            const phraseText = words
                .slice(start, end + 1)
                .map((word) => word.text)
                .join(' ');

            this.wordQueue.push({
                text: phraseText,
                startWordIndex: start,
                endWordIndex: end,
            });

            this.nextWordToQueueIndex = end + 1;
        }

        this.processQueue();
    }

    processQueue() {
        if (this.isProcessingQueue || this.wordQueue.length === 0 || !this.isEnabled) {
            return;
        }

        const nextPhrase = this.wordQueue.shift();
        if (!nextPhrase || !nextPhrase.text) return;

        this.isProcessingQueue = true;
        this.speak(nextPhrase.text, { queue: true, meta: nextPhrase });
    }

    /**
     * Stop current speech
     */
    stop() {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.currentUtterance = null;
        this.isProcessingQueue = false;
    }

    /**
     * Toggle TTS on/off
     */
    async toggle() {
        this.isEnabled = !this.isEnabled;
        await storageManager.saveSettings({ ttsEnabled: this.isEnabled });
        
        if (!this.isEnabled) {
            this.stop();
            this.flushQueue({ resetQueuedWords: true });
        } else {
            this.resetQueueOffsetsIfNeeded();
            this.ensureWarmup();
            this.handleTypingProgress();
        }
    }

    /**
     * Set voice
     */
    async setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            await storageManager.saveSettings({ ttsVoice: voiceName });
        }
    }

    /**
     * Set speed
     */
    async setSpeed(speed) {
        this.speed = Math.max(0.5, Math.min(2.0, speed));
        await storageManager.saveSettings({ ttsSpeed: this.speed });
    }

    /**
     * Set read verse option
     */
    async setReadVerse(enabled) {
        this.readVerse = enabled;
        await storageManager.saveSettings({ ttsReadVerse: enabled });
    }

    /**
     * Get available voices
     */
    getVoices() {
        return this.voices;
    }

    /**
     * Get English voices only
     */
    getEnglishVoices() {
        return this.voices.filter(v => v.lang.startsWith('en'));
    }

    /**
     * Check if TTS is available
     */
    isAvailableCheck() {
        return this.isAvailable;
    }

    /**
     * Get current state
     */
    getState() {
        return {
            available: this.isAvailable,
            enabled: this.isEnabled,
            voice: this.selectedVoice?.name || null,
            speed: this.speed,
            readVerse: this.readVerse,
        };
    }

    /**
     * Flush queued words and optionally skip current playback
     */
    flushQueue({ resetQueuedWords = false } = {}) {
        this.wordQueue = [];
        this.isProcessingQueue = false;
        this.currentPhraseMeta = null;

        if (resetQueuedWords) {
            const position = typingEngine.getPosition();
            this.lastSpokenWordIndex = Math.max((position?.wordIndex || 0) - 1, -1);
            this.nextWordToQueueIndex = this.lastSpokenWordIndex + 1;
        }
    }

    skipCurrentUtterance() {
        if (!this.isProcessingQueue && !speechSynthesis.speaking) {
            return;
        }
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.isProcessingQueue = false;
        this.currentUtterance = null;
        this.requeueCurrentMeta();
    }

    markPhraseComplete() {
        if (this.currentPhraseMeta) {
            this.lastSpokenWordIndex = this.currentPhraseMeta.endWordIndex;
            this.currentPhraseMeta = null;
        }
    }

    requeueCurrentMeta() {
        if (this.currentPhraseMeta) {
            // Put the phrase back at the front so we do not lose words
            this.wordQueue.unshift(this.currentPhraseMeta);
            this.currentPhraseMeta = null;
        }
    }

    resetChapterState() {
        this.flushQueue({ resetQueuedWords: true });
        this.lastSpokenWordIndex = -1;
        this.nextWordToQueueIndex = 0;
    }

    resetQueueOffsetsIfNeeded() {
        const position = typingEngine.getPosition();
        const currentIndex = position?.wordIndex || 0;
        if (this.nextWordToQueueIndex < currentIndex) {
            this.nextWordToQueueIndex = currentIndex;
        }
    }

    ensureWarmup() {
        if (this.warmupDone || !this.isAvailable) return;
        this.warmupDone = true;

        const warmupUtterance = new SpeechSynthesisUtterance('.');
        warmupUtterance.volume = 0;
        warmupUtterance.rate = this.speed;
        warmupUtterance.voice = this.selectedVoice;
        speechSynthesis.speak(warmupUtterance);
    }
}

// Create singleton instance
const audioManager = new AudioManager();
