/**
 * popup.js — the extension popup answers short questions.
 *
 * Anything bigger (plans, pin checks, code generation) opens the full app.
 */

const DEFAULTS = {
  appUrl: 'https://YOUR-GITHUB-USERNAME.github.io/makercode-ai/',
  model: 'gemini-3.8-flash',
  apiKey: ''
};

const $ = (id) => document.getElementById(id);
const out = $('out');

const BOARD_LABEL = {
  'microbit-v2': 'BBC micro:bit V2 (3.3 V)',
  'microbit-v1': 'BBC micro:bit V1 (3.3 V)',
  'arduino-uno': 'Arduino Uno (5 V)',
  'arduino-nano': 'Arduino Nano (5 V)',
  'arduino-mega': 'Arduino Mega 2560 (5 V)',
  'esp32-dev': 'ESP32 dev board (3.3 V)'
};

async function settings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

$('board').addEventListener('change', async (e) => {
  await chrome.storage.sync.set({ board: e.target.value });
});

$('open').addEventListener('click', async () => {
  const { appUrl } = await settings();
  chrome.tabs.create({ url: appUrl });
});

$('opts').addEventListener('click', async (e) => {
  e.preventDefault();
  const current = await settings();
  const key = window.prompt('Gemini API key', current.apiKey);
  if (key === null) return;
  const url = window.prompt('Address of your hosted MakerCode AI', current.appUrl);
  if (url === null) return;
  await chrome.storage.sync.set({ apiKey: key.trim(), appUrl: url.trim() });
  out.textContent = 'Saved.';
});

$('ask').addEventListener('click', async () => {
  const question = $('q').value.trim();
  if (!question) { out.textContent = 'Type a question first.'; return; }

  const { apiKey, model } = await settings();
  if (!apiKey) { out.textContent = 'No API key saved. Open the options page and add one.'; return; }

  $('ask').disabled = true;
  out.textContent = 'Thinking…';

  const system = [
    `You are MakerCode AI helping with a ${BOARD_LABEL[$('board').value]}.`,
    'Answer in under 120 words, in plain language, for a school or polytechnic learner.',
    'If the question involves wiring, name the risk before the fix.',
    'You have not compiled or tested anything. Never claim code works or wiring is safe.'
  ].join(' ');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
        })
      }
    );
    if (!res.ok) {
      out.textContent = res.status === 429
        ? 'Rate limit reached. Wait a minute and try again.'
        : `Request failed (${res.status}). Check the key and model on the options page.`;
      return;
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    out.textContent = text || 'No answer came back. Try rewording the question.';
  } catch {
    out.textContent = 'Could not reach the service. Check the network connection.';
  } finally {
    $('ask').disabled = false;
  }
});

(async () => {
  const stored = await chrome.storage.sync.get({ board: 'microbit-v2' });
  $('board').value = stored.board;
})();
