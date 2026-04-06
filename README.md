# Reading Type Trainer — Chrome Extension

A Chrome extension that turns any article into a typing workout. Select text on a page, open the overlay, and type what you see. Real-time stats: WPM, accuracy, errors, and time.

## Project Structure

```
typing-overlay-extension/
├── manifest.json          # Manifest V3 config
├── background.js          # Service worker (state & persistence)
├── content.js             # Overlay injection + typing engine
├── overlay.css            # Styles for the in-page overlay
├── popup.html             # Extension popup UI
├── popup.css              # Popup styles
├── popup.js               # Popup logic
├── icons/                 # Extension icons (16, 48, 128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## How It Works

1. **Select text** on any webpage you want to practice typing.
2. **Click the extension icon** in the toolbar.
3. **Click "Start Typing"** in the popup.
4. An overlay appears showing the selected text character-by-character. A floating stats panel tracks your WPM, accuracy, errors, time, and progress.
5. Type the text. Characters turn green when correct, red when wrong. A cursor highlights your current position.
6. Stats persist to `chrome.storage.local` and appear in the popup on next open.

## Current Features

- Highlight-and-type workflow
- Real-time WPM calculation (standard: 5 chars = 1 word)
- Live accuracy percentage
- Error tracking with position highlighting
- Time elapsed counter
- Character progress tracker
- Session stats saved to local storage
- Auto-complete detection
- Responsive overlay positioning
- Reset and close controls
- Dark theme overlay that doesn't clash with page styles

## Planned Features

### Phase 2

- [ ] WPM history chart across sessions
- [ ] Best/worst speed highlights
- [ ] Adjustable difficulty modes (blind, words-only, strict)
- [ ] Sound effects on errors and completion
- [ ] Custom theme options (light/dark/accent color)

### Phase 3

- [ ] Export session data as CSV/JSON
- [ ] Practice mode: load custom text instead of page selection
- [ ] Streak tracking (consecutive days)
- [ ] Keyboard shortcut to open overlay (e.g., Ctrl+Shift+T)
- [ ] Multi-language support

### Phase 4

- [ ] Leaderboard (cloud-synced, opt-in)
- [ ] Share session results as image
- [ ] Integration with typing benchmarks

## Metrics Explained

| Metric   | Formula                                       |
| -------- | --------------------------------------------- |
| WPM      | (correct characters / 5) / minutes elapsed    |
| Accuracy | (correct keystrokes / total keystrokes) × 100 |
| Errors   | Count of mismatched characters                |
| Progress | characters typed / total characters           |

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `typing-overlay-extension` folder
5. The extension icon should appear in the toolbar

## Keyboard Shortcuts

| Key    | Action                                   |
| ------ | ---------------------------------------- |
| Tab    | Stay in textarea (prevents focus loss)   |
| Escape | Close overlay (to-do: implement)         |
| Ctrl+R | Reset current session (to-do: implement) |

## Tech Notes

- **Manifest V3** — uses a service worker, not a background page
- **No external dependencies** — pure vanilla JS/CSS
- **Isolated styles** — all overlay CSS uses `#` IDs and scoped selectors to avoid page conflicts
- **Max z-index (2147483646)** — ensures overlay renders above other page elements
- **Text normalization** — selected text is collapsed to single spaces and whitespace is normalized
