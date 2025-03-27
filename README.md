# Hacker News Tip

A simple Google Chrome extension to notify you about the latest top item posted on Hacker News.

### Installation (Manual)

Since this is a simplified version without build tooling, you need to load it manually into Chrome:

1.  Download or clone this repository's files.
2.  Make sure you have placed your Firebase configuration details in `app/scripts/service-worker.js`.
3.  You may need to manually download the Firebase SDK v9+ modular files (`firebase-app.js`, `firebase-database.js`, etc.) and place them in the `app/scripts/firebase/` directory (adjust paths in `service-worker.js` if needed).
4.  Open Chrome and navigate to `chrome://extensions/`.
5.  Enable "Developer mode" using the toggle switch in the top right corner.
6.  Click the "Load unpacked" button.
7.  Select the `app` directory from the project files.
8.  The extension should now be installed and active.

---
*Note: This extension relies on the Hacker News Firebase API.*