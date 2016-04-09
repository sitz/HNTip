'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

//var imported = document.createElement('script');
//imported.src = '../bower_components/firebase/firebase.js';
//document.head.appendChild(imported);

window.onload = function checkHN() {
  var hn = new Firebase('https://hacker-news.firebaseio.com/v0/maxitem/');

  console.log(hn);

  hn.on('value', function (snapshot) {
    console.log(snapshot.val());
  }, function (errorObject) {
    console.log('The read failed: ' + errorObject.code);
  });

  console.log('value listener set');

  hn.on('child_moved', function (childSnapshot, prevChildKey) {
    console.log('child_moved');
  });

  hn.on('child_moved', function (oldChildSnapshot) {
    console.log('child_moved');
  });

  console.log('child_moved listener set');

  hn.on('child_changed', function (childSnapshot, prevChildKey) {
    console.log('child_changed');
  });

  hn.on('child_changed', function (oldChildSnapshot) {
    console.log('child_changed');
  });

  console.log('child_changed listener set');

  hn.on('child_added', function (childSnapshot, prevChildKey) {
    console.log('child_added');
  });

  hn.on('child_added', function (oldChildSnapshot) {
    console.log('child_added');
  });

  console.log('child_added listener set');

  hn.on('child_removed', function (oldChildSnapshot) {
    console.log('child_removed');
  });

  console.log('child_removed listener set');

  //console.log(hn);

  //hn.on('value', function (snapshot) {
  //  console.log(snapshot.val());
  //});
};

//setInterval(checkHN, 5 * 1000);

console.log('\'Allo \'Allo! Event Page');
