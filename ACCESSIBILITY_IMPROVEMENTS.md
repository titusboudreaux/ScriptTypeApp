# Accessibility Improvements - Bible Type

## Overview
Enhanced the app for better readability and reduced cognitive load, especially for dyslexic readers.

## Changes Made

### 1. **Dyslexia-Friendly Font: OpenDyslexic**
- **Previous**: Inter (UI) + Merriweather (content)
- **Current**: OpenDyslexic for all text (UI and content)
- **Benefits**:
  - Distinctive letterforms reduce letter confusion
  - Heavier, weighted baseline helps prevent letter flipping
  - Unique character designs (especially `b`, `d`, `p`, `q` which are easily confused)
  - Designed specifically by dyslexic individuals for dyslexic readers
  - Fallback to Trebuchet MS (similar sans-serif structure if font fails to load)

### 2. **Replaced Dizzying Shake Animation**
- **Previous**: Fast horizontal shake (translateX ±4px at 150ms)
  - Caused rapid, disorienting movement
  - Triggered motion sickness in some users
  - Hard to track visually
  
- **Current**: Gentle pulse animation (400ms duration)
  - Subtle scale expansion (1 → 1.05 → 1)
  - Soft red background color fade with scale effect
  - Non-directional movement feels less aggressive
  - Maintains error feedback without overwhelming the reader

### 3. **Animation Timing Adjustment**
- **Error feedback timeout**: Increased from 150ms → 400ms
- Matches the new animation duration for smooth cleanup
- Reduces jarring transitions

## CSS Changes

```css
/* Typography Base - Dyslexia-friendly fonts */
--font-ui: 'OpenDyslexic', 'Trebuchet MS', sans-serif;
--font-content: 'OpenDyslexic', 'Trebuchet MS', sans-serif;

/* Error feedback - gentle pulse instead of disorienting shake */
@keyframes gentleError {
    0%, 100% { 
        transform: scale(1);
        background-color: rgba(220, 38, 38, 0);
    }
    50% { 
        transform: scale(1.05);
        background-color: rgba(220, 38, 38, 0.15);
    }
}

.word.active.error {
    animation: gentleError 0.4s ease-out;
    color: var(--accent-danger);
}
```

## HTML Changes

- Updated Google Fonts import to include only OpenDyslexic
- Removed Inter and Merriweather fonts

## JavaScript Changes

- Updated error feedback timeout in `typing-engine.js` from 150ms to 400ms
- Ensures animation completes properly before cleanup

## Impact

### For Dyslexic Readers:
- ✅ Reduced visual stress from letter confusion
- ✅ Smoother, less disorienting error feedback
- ✅ Better focus and concentration
- ✅ Fewer accidental skip-outs from motion sensitivity

### For All Users:
- ✅ Clearer, more distinctive typography
- ✅ Less jarring error responses
- ✅ More meditative typing experience overall
- ✅ Improved visual comfort during long sessions

## Testing Recommendations

1. Test error feedback visual appearance and animation smoothness
2. Verify OpenDyslexic font loads correctly across browsers
3. Check fallback to Trebuchet MS on systems without web font support
4. Test with screen readers (fonts should not impact accessibility)
5. User feedback from dyslexic readers is valuable for future refinements

## Notes

- OpenDyslexic is an open-source font under the GPL 3 license
- The font is well-maintained and widely adopted for accessibility
- Font weights available: 400 (regular) and 700 (bold) for current implementation
