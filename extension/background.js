/**
 * background.js — MV3 service worker.
 *
 * Sets defaults on install and opens the full app when asked. Deliberately
 * small: the popup does the talking, and no page content is read or stored.
 */

const DEFAULTS = {
  appUrl: 'https://YOUR-GITHUB-USERNAME.github.io/makercode-ai/',
  model: 'gemini-3.8-flash',
  board: 'microbit-v2',
  apiKey: ''
};

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...existing });

  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'openApp') {
    chrome.storage.sync.get(DEFAULTS).then(({ appUrl }) => {
      chrome.tabs.create({ url: appUrl });
      sendResponse({ ok: true });
    });
    return true;
  }
  return false;
});
