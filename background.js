const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const CHECK_ALARM_NAME = 'hnNewStoryCheck';
const LAST_SEEN_STORIES_KEY = 'lastSeenStories';
const CHECK_INTERVAL_MINUTES = 5;

// Function to fetch top stories
async function fetchTopStories() {
  try {
    const response = await fetch(`${HN_API_BASE}/topstories.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const storyIds = await response.json();
    return storyIds.slice(0, 30); // Only take top 30
  } catch (error) {
    console.error('Error fetching top stories:', error);
    return [];
  }
}

// Function to fetch item details
async function fetchItemDetails(itemId) {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${itemId}.json`);
    if (!response.ok) return null;
    const item = await response.json();
    return item;
  } catch (error) {
    console.error(`Error fetching item ${itemId}:`, error);
    return null;
  }
}

// Function to show a notification
function showNotification(item) {
  const notificationId = `hn-item-${item.id}`;
  const hnItemUrl = `https://news.ycombinator.com/item?id=${item.id}`;
  const urlToOpen = item.url || hnItemUrl;

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: item.title,
    message: urlToOpen,
    priority: 1
  });
}

// Main function to check for new stories
async function checkForNewStories() {
  console.log('Checking for new stories on HN front page...');
  
  // Get current top stories
  const currentStories = await fetchTopStories();
  if (currentStories.length === 0) {
    console.log('No stories found on front page');
    return;
  }

  // Get previously seen stories
  const data = await chrome.storage.local.get(LAST_SEEN_STORIES_KEY);
  const previousStories = new Set(data[LAST_SEEN_STORIES_KEY] || []);

  // Find new stories
  const newStories = currentStories.filter(id => !previousStories.has(id));
  
  if (newStories.length > 0) {
    console.log(`Found ${newStories.length} new stories on front page`);
    
    // Fetch details and notify for each new story
    for (const storyId of newStories) {
      const story = await fetchItemDetails(storyId);
      console.log(`Notifying for new story: ${story.title}`);
      showNotification(story);
    }
  } else {
    console.log('No new stories on front page');
  }

  // Save current stories for next check
  await chrome.storage.local.set({ [LAST_SEEN_STORIES_KEY]: currentStories });
}

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated');
  // Initialize with current top stories
  const currentStories = await fetchTopStories();
  await chrome.storage.local.set({ [LAST_SEEN_STORIES_KEY]: currentStories });
  
  // Set up alarm
  await chrome.alarms.create(CHECK_ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

// Ensure alarm exists on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started');
  const alarm = await chrome.alarms.get(CHECK_ALARM_NAME);
  if (!alarm) {
    await chrome.alarms.create(CHECK_ALARM_NAME, {
      periodInMinutes: CHECK_INTERVAL_MINUTES
    });
  }
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM_NAME) {
    checkForNewStories();
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('hn-item-')) {
    const itemId = notificationId.replace('hn-item-', '');
    chrome.tabs.create({ url: `https://news.ycombinator.com/item?id=${itemId}` });
    chrome.notifications.clear(notificationId);
  }
});