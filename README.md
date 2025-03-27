# HNTip - Hacker News New Story Notifier

A simple Chrome extension that notifies you whenever a new *story* is submitted to Hacker News.

![](icons/icon128.png)

## Installation

Since this extension is not on the Chrome Web Store, you need to load it manually from GitHub using Developer Mode:

1.  Download the code as a ZIP file from the GitHub repository: `https://github.com/sitz/HNTip`
2.  Extract the contents of the downloaded `.zip` file to create the extension folder.
3.  In Chrome, go to `chrome://extensions/` and ensure "Developer mode" is enabled.
4.  Click "Load unpacked" (top-left) and select the extracted extension folder.

## Usage

Once installed, the extension starts working automatically. There's no browser action popup needed.

* It will check for new stories in the background regularly.
* When a new story is detected on Hacker News, a desktop notification will appear.
* Click the notification to open the story's link in a new Chrome tab.