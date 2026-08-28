const ALARM_NAME = 'reptrack-water-reminder';
const DEFAULT_INTERVAL_MINUTES = 60;

async function syncAlarm() {
  const settings = await chrome.storage.local.get([
    'waterReminderEnabled',
    'waterReminderIntervalMinutes',
  ]);
  const enabled = settings.waterReminderEnabled ?? true;
  const interval = Number(settings.waterReminderIntervalMinutes || DEFAULT_INTERVAL_MINUTES);
  await chrome.alarms.clear(ALARM_NAME);
  if (!enabled) return;
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: interval,
    periodInMinutes: interval,
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get([
    'waterReminderEnabled',
    'waterReminderIntervalMinutes',
  ]);
  const patch = {};
  if (current.waterReminderEnabled === undefined) patch.waterReminderEnabled = true;
  if (current.waterReminderIntervalMinutes === undefined) patch.waterReminderIntervalMinutes = DEFAULT_INTERVAL_MINUTES;
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
  await syncAlarm();
});

chrome.runtime.onStartup.addListener(syncAlarm);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.waterReminderEnabled || changes.waterReminderIntervalMinutes) syncAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const hour = new Date().getHours();
  if (hour < 9 || hour >= 22) return;
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <rect width="128" height="128" rx="28" fill="#141414"/>
        <path d="M64 24c-14 19-28 34-28 52a28 28 0 0 0 56 0c0-18-14-33-28-52Z" fill="#fff"/>
      </svg>
    `),
    title: 'Water check',
    message: 'Have some water, then log it in RepTrack.',
    priority: 0,
  });
});
