'use strict';

console.log('HNTip: Event Page');

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('Installation Details: ', details);
});

window.onload = function checkHN() {
  var hn = new Firebase('https://hacker-news.firebaseio.com/v0/');
  var notificationId;

  hn.child('maxitem').on('value', function (snapshot) {
    var itemId = snapshot.val();
    console.log('Id: ' + itemId);

    hn.child('item/' + itemId).on('value', function (itemData) {
      var itemDetails = itemData.val();
      console.log(itemDetails);

      if (itemDetails && itemDetails.hasOwnProperty('title') && itemDetails.hasOwnProperty('by')) {

        var currentNotificationId = chrome.notifications.create('', {
          type: 'basic',
          title: itemDetails.title,
          message: 'by: ' + itemDetails.by,
          iconUrl: '/images/icon-128.png'
        }, function onCreation(notificationId) {
          console.log('notificationId: ' + notificationId);

          chrome.notifications.onClicked.addListener(function (notificationId) {
            if (currentNotificationId === notificationId) {
              chrome.notifications.clear(notificationId);
              chrome.tabs.create({ 'url': 'https://news.ycombinator.com/item?id=' + itemId });
            }
          });

          console.log('Last error:', chrome.runtime.lastError);
        });
      }
    });
  }, function (errorObject) {
    console.log('The read failed: ' + errorObject.code);
  });
};