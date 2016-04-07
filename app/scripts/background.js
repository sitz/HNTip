'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('HNTip: v', details.previousVersion);
});

console.log('\'Allo \'Allo! Event Page');