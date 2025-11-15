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
        this.readWord = true; // Read word when completed (default)
        this.readVerse = false; // Read verse when it appears
        this.lastWordIndex = -1;
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
        this.readWord = settings.ttsReadWord !== undefined ? settings.ttsReadWord : true;
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
                    if (this.readWord) {
                        this.handleWordCompleted(data);
                    }
                    break;

                case 'chapter-loaded':
                    this.lastWordIndex = -1;
                    if (this.readVerse) {
                        this.handleChapterLoaded();
                    }
                    break;

                default:
                    break;
            }
        });
    }

    /**
     * Handle word completed event
     */
    handleWordCompleted(position) {
        // Avoid repeating the same word
        if (position.wordIndex === this.lastWordIndex) return;
        this.lastWordIndex = position.wordIndex;

        // Get the completed word
        const words = typingEngine.getCurrentWords();
        if (!words || position.wordIndex === 0) return;

        const completedWord = words[position.wordIndex - 1];
        if (completedWord && completedWord.text) {
            this.speak(completedWord.text);
        }
    }

    /**
     * Handle chapter loaded event
     */
    handleChapterLoaded() {
        // Read first verse
        const verses = typingEngine.verses;
        if (verses && verses.length > 0) {
            this.speak(verses[0]);
        }
    }

    /**
     * Speak text using TTS
     */
    speak(text) {
        if (!this.isAvailable || !this.isEnabled) return;

        // Cancel any ongoing speech
        this.stop();

        // Create new utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.voice = this.selectedVoice;
        this.currentUtterance.rate = this.speed;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;

        // Error handling
        this.currentUtterance.onerror = (event) => {
            console.warn('TTS error:', event.error);
        };

        // Speak
        speechSynthesis.speak(this.currentUtterance);
    }

    /**
     * Stop current speech
     */
    stop() {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }

    /**
     * Toggle TTS on/off
     */
    async toggle() {
        this.isEnabled = !this.isEnabled;
        await storageManager.saveSettings({ ttsEnabled: this.isEnabled });
        
        if (!this.isEnabled) {
            this.stop();
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
     * Set read word option
     */
    async setReadWord(enabled) {
        this.readWord = enabled;
        await storageManager.saveSettings({ ttsReadWord: enabled });
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
            readWord: this.readWord,
            readVerse: this.readVerse,
        };
    }
}

// Create singleton instance
const audioManager = new AudioManager();
