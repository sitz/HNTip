'use strict';

console.log('HNTip: Event Page');

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('Installation Details: ', details);
});

var notificationData = {};

chrome.notifications.onClosed.addListener(function (notificationId) {
  delete notificationData[notificationId];
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  chrome.notifications.clear(notificationId);
  chrome.tabs.create({
    'url': 'https://news.ycombinator.com/item?id=' + notificationData[notificationId].id
  });
});

function createNotification(itemData) {
  var itemDetails = itemData.val();
  console.log(itemDetails);

  if (itemDetails && itemDetails.hasOwnProperty('title') && itemDetails.hasOwnProperty('by')) {

    chrome.notifications.create('', {
      type: 'basic',
      title: itemDetails.title,
      message: 'by: ' + itemDetails.by,
      iconUrl: '/images/icon-128.png'
    }, function onCreation(createdId) {

      notificationData[createdId] = itemDetails;
    });
  }
}

function checkHN() {
  var hn = new Firebase('https://hacker-news.firebaseio.com/v0/');

  hn.child('maxitem').on('value', function (snapshot) {
    var itemId = snapshot.val();
    console.log('Id: ' + itemId);

    hn.child('item/' + itemId).on('value', createNotification);
  }, function (errorObject) {
    console.log('The read failed: ' + errorObject.code);
  });
}

window.onload = checkHN;