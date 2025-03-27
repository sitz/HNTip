const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const CHECK_ALARM_NAME = 'hnNewStoryCheck';
const LAST_SEEN_ID_KEY = 'lastSeenMaxId';
const CHECK_INTERVAL_MINUTES = 1; // Check every 1 minute

// --- Initialization ---

// Function to fetch the current max item ID and store it
async function initializeLastSeenId() {
  try {
    const response = await fetch(`${HN_API_BASE}/maxitem.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const maxItemId = await response.json();
    // Only set if not already set, or on install/update explicitly
    const currentData = await chrome.storage.local.get(LAST_SEEN_ID_KEY);
    if (!currentData[LAST_SEEN_ID_KEY]) {
        await chrome.storage.local.set({ [LAST_SEEN_ID_KEY]: maxItemId });
        console.log(`Initialized. Last seen item ID set to: ${maxItemId}`);
    } else {
        console.log(`Initialization check: Last seen ID already exists (${currentData[LAST_SEEN_ID_KEY]}). Current max: ${maxItemId}`);
    }
  } catch (error) {
    console.error('Error initializing last seen ID:', error);
    // Attempt to set a default if initialization fails completely
    const currentData = await chrome.storage.local.get(LAST_SEEN_ID_KEY);
     if (!currentData[LAST_SEEN_ID_KEY]) {
        await chrome.storage.local.set({ [LAST_SEEN_ID_KEY]: 0 });
        console.warn('Initialization failed, setting last seen ID to 0.');
     }
  }
}

// Run initialization and set alarm when the extension is installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed or updated:', details.reason);
  // Force setting the max ID on install/update to avoid missing items during update
   try {
    const response = await fetch(`${HN_API_BASE}/maxitem.json`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const maxItemId = await response.json();
    await chrome.storage.local.set({ [LAST_SEEN_ID_KEY]: maxItemId });
    console.log(`Install/Update: Last seen item ID explicitly set to: ${maxItemId}`);
  } catch (error) {
     console.error('Error setting last seen ID on install/update:', error);
     await chrome.storage.local.set({ [LAST_SEEN_ID_KEY]: 0 }); // Fallback on error
     console.warn('Install/Update failed, setting last seen ID to 0.');
  }

  // Create or update the recurring alarm
  await chrome.alarms.create(CHECK_ALARM_NAME, {
    // delayInMinutes: 1, // Start check soon after install/update
    when: Date.now() + 30 * 1000, // Start check 30 seconds after install/update
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
   console.log(`Alarm '${CHECK_ALARM_NAME}' created/updated to run every ${CHECK_INTERVAL_MINUTES} minutes.`);
});

// Ensure alarm exists on browser startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('Browser started. Ensuring alarm exists.');
    await initializeLastSeenId(); // Also check/initialize ID on startup
    const alarm = await chrome.alarms.get(CHECK_ALARM_NAME);
    if (!alarm) {
        console.log('Alarm not found on startup, creating it.');
        await chrome.alarms.create(CHECK_ALARM_NAME, {
            delayInMinutes: 1, // Start 1 min after browser start
            periodInMinutes: CHECK_INTERVAL_MINUTES
        });
    } else {
        console.log('Alarm already exists.');
    }
});


// --- Core Logic ---

// Function to fetch item details
async function fetchItemDetails(itemId) {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${itemId}.json`);
    if (!response.ok) {
      console.warn(`Failed to fetch item ${itemId}: ${response.status}`);
      return null; // Don't throw, just return null for failed fetches
    }
    const item = await response.json();
    // Handle cases where API might return null for a valid ID briefly
    if (!item) {
        console.warn(`API returned null for item ${itemId}`);
        return null;
    }
    return item;
  } catch (error) {
    console.error(`Network or parsing error fetching item ${itemId}:`, error);
    return null;
  }
}

// Function to show a notification
function showNotification(item) {
  const notificationId = `hn-item-${item.id}`; // Unique ID for the notification
  const hnItemUrl = `https://news.ycombinator.com/item?id=${item.id}`;
  const urlToOpen = item.url || hnItemUrl; // Prioritize external URL

  const options = {
    type: 'basic',
    iconUrl: 'icons/icon128.png', // Path relative to extension root
    title: item.title,
    message: urlToOpen,
    priority: 1 // Value between -2 and 2 (defaults to 0)
  };

  chrome.notifications.create(notificationId, options, (createdId) => {
    if (chrome.runtime.lastError) {
        console.error("Notification creation failed: ", chrome.runtime.lastError.message);
        return;
    }
    console.log(`Notification shown for item ${item.id}. ID: ${createdId}`);
    // Store the URL to open when clicked, keyed by the notification ID Chrome generated
    chrome.storage.local.set({ [createdId]: urlToOpen });
  });
}

// Main function to check for new stories
async function checkForNewStories() {
  console.log('Checking for new HN stories...');
  let lastSeenMaxId = 0;
  try {
    const data = await chrome.storage.local.get(LAST_SEEN_ID_KEY);
    lastSeenMaxId = data[LAST_SEEN_ID_KEY] || 0;
  } catch(e){
      console.error("Error getting lastSeenMaxId from storage:", e);
      return; // Can't proceed without the last seen ID
  }

  let currentMaxId;
  try {
    const response = await fetch(`${HN_API_BASE}/maxitem.json`);
    if (!response.ok) {
      throw new Error(`HTTP error fetching maxitem! status: ${response.status}`);
    }
    currentMaxId = await response.json();
     if (typeof currentMaxId !== 'number') {
        throw new Error(`Invalid maxitem received: ${currentMaxId}`);
    }
  } catch (error) {
    console.error('Error fetching current max item ID:', error);
    return; // Exit if we can't get the current max ID
  }

  if (currentMaxId > lastSeenMaxId) {
    console.log(`New items detected. Current max ID: ${currentMaxId}, Last seen: ${lastSeenMaxId}`);

    // Limit the number of items to fetch in one go to prevent overload/hitting limits
    const MAX_ITEMS_TO_FETCH_AT_ONCE = 50; // Adjust as needed
    let startId = Math.max(lastSeenMaxId + 1, currentMaxId - MAX_ITEMS_TO_FETCH_AT_ONCE + 1);
    let endId = currentMaxId;

    if (currentMaxId - lastSeenMaxId > MAX_ITEMS_TO_FETCH_AT_ONCE) {
        console.warn(`More than ${MAX_ITEMS_TO_FETCH_AT_ONCE} new items detected. Processing the latest ${MAX_ITEMS_TO_FETCH_AT_ONCE}.`);
    }

    const newPotentialIds = [];
    for (let id = startId; id <= endId; id++) {
      newPotentialIds.push(id);
    }

    if (newPotentialIds.length === 0) {
        console.log("Potential ID range was empty, nothing to fetch.");
        // Still update lastSeenMaxId to prevent re-processing later if something went wrong
         await chrome.storage.local.set({ [LAST_SEEN_ID_KEY]: currentMaxId });
         console.log(`Updating last seen ID to ${currentMaxId} even though no items fetched.`);
        return;
    }

    console.log(`Workspaceing details for IDs ${startId} to ${endId}`);
    const itemPromises = newPotentialIds.map(id => fetchItemDetails(id));
    const results = await Promise.allSettled(itemPromises);

    let newStoriesFound = 0;
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value && result.value.type === 'story') {
        console.log(`Found new story: ${result.value.id} - ${result.value.title}`);
        showNotification(result.value);
        newStoriesFound++;
      } else if (result.status === 'rejected') {
          console.warn("A fetchItemDetails promise was rejected:", result.reason);
      }
    });

    console.log(`Processed ${newPotentialIds.length} potential new items, found ${newStoriesFound} new stories.`);

    // Update the last seen ID in storage
    try {
        await chrome.storage.local.set({ [LAST_SEEN_ID_KEY]: currentMaxId });
        console.log(`Updated last seen ID to: ${currentMaxId}`);
    } catch (e) {
        console.error("Error setting lastSeenMaxId in storage:", e);
    }

  } else {
    console.log('No new items since last check.');
  }
}

// --- Event Listeners ---

// Listen for the alarm to trigger the check
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM_NAME) {
    checkForNewStories();
  }
});

// Listen for notification clicks to open the story link
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Check if the clicked ID looks like one we generated
  if (notificationId.startsWith('hn-item-')) {
    console.log(`Notification clicked: ${notificationId}`);
    // Retrieve the URL associated with this notification
    try {
        const data = await chrome.storage.local.get(notificationId);
        const urlToOpen = data[notificationId];

        if (urlToOpen) {
            chrome.tabs.create({ url: urlToOpen });
            // Clean up the stored URL for this notification now that it's used
            chrome.storage.local.remove(notificationId);
        } else {
            console.warn(`No URL found stored for notification ID: ${notificationId}. Might have been cleaned up already.`);
            // As a fallback, maybe try to parse item ID from notificationId and open HN comments?
             const itemId = notificationId.replace('hn-item-', '');
             if (itemId) {
                 console.log(`Falling back to opening HN comments page for item ${itemId}`);
                 chrome.tabs.create({ url: `https://news.ycombinator.com/item?id=${itemId}` });
             }
        }
    } catch (e) {
        console.error("Error handling notification click:", e);
    }
     // Close the notification after click
     chrome.notifications.clear(notificationId);
  }
});

// Listen for notification closure (e.g., user clicks 'X') to clean up storage
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    // Only clean up if the user closed it and it's one of ours
    if (byUser && notificationId.startsWith('hn-item-')) {
        console.log(`Notification closed by user: ${notificationId}. Cleaning up stored URL.`);
        // Clean up the stored URL
        chrome.storage.local.remove(notificationId);
    }
});