# TypePulse Privacy Policy

Last updated: April 7, 2026

TypePulse is a Chrome extension that lets users select text on a web page and practice typing it in an overlay.

## Summary

TypePulse is designed to keep user data local to the browser whenever possible.

TypePulse:

- reads text that the user explicitly selects on a web page in order to start a typing session
- stores typing session statistics locally in the browser using `chrome.storage.local`
- does not sell user data
- does not use user data for advertising
- does not transfer typing content or personal data to our servers

## Information TypePulse Handles

TypePulse may handle the following information:

- Selected page text
  TypePulse reads only the text that the user actively selects in the browser to create a typing exercise.
- Typing session statistics
  TypePulse stores summary stats such as WPM, accuracy, errors, character count, and elapsed time in `chrome.storage.local` so the last session can be shown in the popup.
- Extension settings
  TypePulse stores local preferences, such as whether the floating selection button should appear after selecting text.

## How Information Is Used

TypePulse uses this information only to provide its core functionality:

- launching a typing session from selected text
- rendering the typing overlay
- calculating typing performance statistics
- remembering simple extension preferences

## Data Storage

TypePulse stores extension data locally in the user's browser through Chrome extension storage.

TypePulse does not currently provide:

- account creation
- cloud sync operated by TypePulse
- remote analytics operated by TypePulse
- server-side storage of selected text or typing results

## Data Sharing

TypePulse does not sell, rent, or share user data with third parties for advertising or marketing.

TypePulse does not transmit selected text or typing session results to external servers controlled by TypePulse.

## Permissions

TypePulse uses the following Chrome permissions:

- `storage`
  To save the last session summary and simple extension settings locally.
- `contextMenus`
  To add the right-click action for starting a typing session from selected text.
- `activeTab`
  To interact with the current tab when needed.
- content script access on web pages
  To detect selected text, show the floating trigger button, and render the typing overlay on supported pages.

## User Controls

Users can:

- uninstall the extension at any time
- clear browser extension storage through Chrome
- turn the floating selection button on or off from the extension popup

## Children's Privacy

TypePulse is not directed to children under 13 and does not knowingly collect personal information from children.

## Changes to This Policy

This policy may be updated from time to time. If the policy changes, the updated version will be posted with a new effective date.

## Contact

For privacy questions about TypePulse, contact:

- wael.fadhel93@gmail.com
