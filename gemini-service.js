/**
 * gemini-service.js — the only file that talks to the Gemini API.
 *
 * The model name lives in config.js. Nothing here hard-codes it.
 */

import { GEMINI, RESPONSE_SCHEMA, EMPTY_RESPONSE, LANGUAGES, LEVELS } from './config.js';
import { getBoard, COMPONENTS } from './board-profiles.js';

let schemaSupported = GEMINI.useResponseSchema;

export class GeminiError extends Error {
  constructor(message, { kind = 'unknown', status = 0, hint = '' } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = status;
    this.hint = hint;
  }
}

/* ------------------------------------------------------------------ prompt */

function boardBriefing(boardId) {
  const board = getBoard(boardId);
  const usable = board.pins
    .filter((pin) => pin.caps.length)
    .map((pin) => `${pin.name} [${pin.caps.join(',')}]${pin.note ? ' — ' + pin.note : ''}`)
    .join('\n  ');

  return [
    `BOARD: ${board.name}`,
    `Logic level: ${board.logic} V.`,
    `Per-pin current guide: about ${board.pinCurrentMax} mA. Whole board: about ${board.boardCurrentMax} mA.`,
    `Built-in features: ${board.builtIn.join(', ')}.`,
    'Board notes:\n  - ' + board.notes.join('\n  - '),
    'Usable pins:\n  ' + usable
  ].join('\n');
}

function componentBriefing() {
  return Object.values(COMPONENTS)
    .map((c) => `- ${c.name} (needs ${c.needs.join(' + ')}, power: ${c.power}): ${c.warnings[0]}`)
    .join('\n');
}

const LEVEL_RULES = {
  beginner: [
    'Keep every explanation short and concrete. One idea per sentence.',
    'Explain sequence, variable, loop, condition and event when they first appear.',
    'Prefer MakeCode-compatible JavaScript or MicroPython over C++ where the board allows it.',
    'Describe every hardware connection in plain words, one wire at a time.',
    'Avoid jargon. If you must use a term, define it immediately.'
  ],
  intermediate: [
    'Push the learner towards functions and reusable code.',
    'Ask about sensor thresholds, units and edge cases.',
    'Include at least one debugging question in the explanation.',
    'Point out where a magic number should become a named constant.'
  ],
  advanced: [
    'Discuss program architecture, timing, state management and non-blocking code.',
    'Avoid delay() style blocking loops. Prefer timers, state machines and events.',
    'Comment on performance, memory and hardware limits.',
    'Suggest modular functions and where the design would break under load.'
  ]
};

function systemInstruction(ctx) {
  const language = LANGUAGES[ctx.language]?.label || ctx.language;
  const mode = ctx.socratic ? 'socratic' : 'direct';

  const modeRules = ctx.socratic
    ? [
      'SOCRATIC MODE IS ON.',
      'Do not give the finished solution. Leave "code" empty unless the learner has asked to see the solution or has made a genuine attempt you can build on.',
      'Put exactly ONE meaningful question in "questions". Never more than one.',
      'Start by helping the learner define the input, the process and the output.',
      'Ask the learner to predict what should happen before you confirm anything.',
      'If their last answer was wrong or incomplete, give a small hint inside "understanding", then ask the next question.',
      'Use "plan" for the steps the learner has already worked out, not for steps you are giving away.',
      'Never shame the learner. Acknowledge what they got right first.',
      'Set "assistantMode" to "socratic".'
    ]
    : [
      'DIRECT MODE IS ON.',
      'Give a complete, working proposed solution.',
      'Still explain the reasoning, the testing process and the likely failure points.',
      'Leave "questions" empty unless a detail is genuinely missing and blocks the design.',
      'Set "assistantMode" to "direct".'
    ];

  return [
    'You are MakerCode AI, a physical computing tutor for a school and polytechnic makerspace.',
    'You help learners plan, wire, code, test and debug Arduino, ESP32 and BBC micro:bit projects.',
    '',
    boardBriefing(ctx.boardId),
    '',
    'COMPONENT NOTES:',
    componentBriefing(),
    '',
    `TARGET LANGUAGE: ${language}.`,
    ctx.language === 'makecode-blocks'
      ? 'The learner is using MakeCode blocks. Put numbered, block-by-block build steps in "code" as plain text, naming the exact block category and block, for example: "Basic > forever", "Pins > digital read pin P2". Do not output JavaScript in the code field.'
      : `Write "code" as valid ${language} that compiles or runs as-is.`,
    '',
    `LEARNER LEVEL: ${LEVELS[ctx.level] || ctx.level}.`,
    '- ' + (LEVEL_RULES[ctx.level] || LEVEL_RULES.beginner).join('\n- '),
    '',
    ...modeRules,
    '',
    'HARDWARE RULES YOU MUST FOLLOW:',
    '- Never assign two components to the same pin.',
    '- Check that each pin actually supports what the component needs: analogue input, PWM or plain digital.',
    '- Warn when a component needs a different voltage from the board.',
    '- Warn when a component needs its own power supply and a shared ground.',
    '- Warn when the total current is likely to exceed what the board can supply.',
    '- Tell the learner to disconnect power before changing any wiring.',
    '- Where two similar modules behave differently, say so and tell the learner how to check which one they have.',
    '',
    'HONESTY RULES:',
    '- You have not compiled anything. Never say the code compiles or is verified.',
    '- Never say wiring is safe. Say what to check.',
    '- If you are unsure about a module or a connection, say you are unsure.',
    '',
    `Reply with JSON only, matching this shape exactly. Every key must be present. Empty arrays are fine:\n${JSON.stringify(EMPTY_RESPONSE)}`,
    `Set "board" to "${getBoard(ctx.boardId).name}" and "language" to "${language}" and "assistantMode" to "${mode}".`
  ].join('\n');
}

/* ----------------------------------------------------------------- request */

function buildContents(ctx) {
  const history = (ctx.history || []).slice(-GEMINI.maxChatTurnsSent);
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  const parts = [];
  if (ctx.image) {
    parts.push({ inlineData: { mimeType: ctx.image.mimeType, data: ctx.image.base64 } });
    parts.push({
      text: [
        'Look at the attached image of the learner\'s circuit, drawing or code.',
        'In "understanding", list: components you can see, the connections you think you can trace,',
        'connections that appear missing, likely wiring mistakes, and anything obscured or unclear.',
        'Label every uncertain observation as uncertain. Never say the wiring is safe based on an image alone.'
      ].join(' ')
    });
  }
  parts.push({ text: ctx.prompt });
  if (ctx.requirements) parts.push({ text: `Project requirements from the form:\n${ctx.requirements}` });
  if (ctx.serialLog) parts.push({ text: `Recent serial output from the learner's board:\n${ctx.serialLog}` });

  contents.push({ role: 'user', parts });
  return contents;
}

function classify(status, bodyText) {
  if (status === 400 && /API key not valid/i.test(bodyText)) {
    return new GeminiError('That API key was rejected.', {
      kind: 'auth', status, hint: 'Check the key in Settings, or make a new one in Google AI Studio.'
    });
  }
  if (status === 401 || status === 403) {
    return new GeminiError('The API key is missing permission for this model.', {
      kind: 'auth', status, hint: 'Check the key restrictions, or pick a different model in Settings.'
    });
  }
  if (status === 404) {
    return new GeminiError('That model name was not found.', {
      kind: 'model', status, hint: 'Change the model in Settings. Model names retire without much notice.'
    });
  }
  if (status === 429) {
    return new GeminiError('Rate limit reached.', {
      kind: 'rate', status, hint: 'Wait a minute and try again. In class, give each student their own key.'
    });
  }
  if (status >= 500) {
    return new GeminiError('The Gemini service returned an error.', {
      kind: 'server', status, hint: 'Try again in a moment.'
    });
  }
  return new GeminiError(`Request failed (${status}).`, { kind: 'http', status, hint: bodyText.slice(0, 200) });
}

async function post(apiKey, body, model) {
  const url = `${GEMINI.apiBase}/${GEMINI.apiVersion}/models/${model}:${GEMINI.method}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI.requestTimeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new GeminiError('The request took too long and was cancelled.', {
        kind: 'timeout', hint: 'Try a shorter description, or a lighter model in Settings.'
      });
    }
    throw new GeminiError('Could not reach the Gemini service.', {
      kind: 'network', hint: 'Check the network connection. School networks sometimes block this domain.'
    });
  }
  clearTimeout(timer);

  const text = await res.text();
  if (!res.ok) throw classify(res.status, text);

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError('The service returned a response that could not be read.', { kind: 'parse' });
  }
}

/* ------------------------------------------------------------------- parse */

function extractText(payload) {
  const cand = payload?.candidates?.[0];
  if (!cand) {
    const blocked = payload?.promptFeedback?.blockReason;
    throw new GeminiError(
      blocked ? `The request was blocked (${blocked}).` : 'The model returned no answer.',
      { kind: 'empty', hint: 'Rewrite the description and try again.' }
    );
  }
  if (cand.finishReason === 'MAX_TOKENS') {
    throw new GeminiError('The answer was cut off before it finished.', {
      kind: 'length', hint: 'Ask for a smaller part of the project, or raise maxOutputTokens in config.js.'
    });
  }
  return (cand.content?.parts || []).map((part) => part.text || '').join('').trim();
}

/** Tolerant JSON parse — handles fences and leading chatter. */
export function parseStructured(raw) {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  const attempt = (s) => { try { return JSON.parse(s); } catch { return null; } };

  let obj = attempt(text);
  if (!obj) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) obj = attempt(text.slice(start, end + 1));
  }
  if (!obj || typeof obj !== 'object') {
    throw new GeminiError('The answer was not in the expected format.', {
      kind: 'schema', hint: 'Send the message again. This usually clears on a retry.'
    });
  }

  const out = { ...EMPTY_RESPONSE };
  for (const key of Object.keys(EMPTY_RESPONSE)) {
    const value = obj[key];
    if (Array.isArray(EMPTY_RESPONSE[key])) {
      out[key] = Array.isArray(value) ? value : (value ? [value] : []);
    } else if (typeof value === 'string') {
      out[key] = value;
    } else if (value != null && typeof value !== 'object') {
      out[key] = String(value);
    }
  }
  out.parts = out.parts
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({ name: String(x.name || ''), quantity: Number(x.quantity) || 1, purpose: String(x.purpose || '') }));
  out.pins = out.pins
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      component: String(x.component || ''),
      componentPin: String(x.componentPin || ''),
      boardPin: String(x.boardPin || ''),
      notes: String(x.notes || '')
    }));
  out.questions = out.questions.map(String).filter(Boolean);
  ['plan', 'explanation', 'wiringSteps', 'safetyWarnings', 'testSteps', 'debuggingSteps']
    .forEach((k) => { out[k] = out[k].map(String).filter(Boolean); });

  return out;
}

/* ------------------------------------------------------------------ public */

/**
 * @param {object} ctx  { apiKey, model, boardId, language, level, socratic,
 *                        prompt, history, requirements, image, serialLog }
 */
export async function generate(ctx) {
  if (!ctx.apiKey) {
    throw new GeminiError('No API key saved yet.', {
      kind: 'nokey', hint: 'Open Settings and paste a Gemini API key, or use the offline demo.'
    });
  }

  const model = ctx.model || GEMINI.model;
  const base = {
    systemInstruction: { parts: [{ text: systemInstruction(ctx) }] },
    contents: buildContents(ctx),
    generationConfig: { ...GEMINI.generationConfig }
  };
  if (schemaSupported) base.generationConfig.responseSchema = RESPONSE_SCHEMA;

  let payload;
  try {
    payload = await post(ctx.apiKey, base, model);
  } catch (err) {
    // Some models reject responseSchema or a generationConfig key. Retry lean.
    if (err instanceof GeminiError && err.status === 400) {
      schemaSupported = false;
      const lean = {
        systemInstruction: base.systemInstruction,
        contents: base.contents,
        generationConfig: {
          temperature: GEMINI.generationConfig.temperature,
          maxOutputTokens: GEMINI.generationConfig.maxOutputTokens,
          responseMimeType: 'application/json'
        }
      };
      payload = await post(ctx.apiKey, lean, model);
    } else {
      throw err;
    }
  }

  return parseStructured(extractText(payload));
}

/** Quick key check used by Settings. */
export async function testKey(apiKey, model) {
  const res = await fetch(
    `${GEMINI.apiBase}/${GEMINI.apiVersion}/models/${model || GEMINI.model}`,
    { headers: { 'x-goog-api-key': apiKey } }
  );
  if (res.ok) return true;
  throw classify(res.status, await res.text());
}

/**
 * Offline demo so the app is usable with no key — for example when showing it
 * on a projector before students have made their own keys.
 */
export function offlineDemo(ctx) {
  const socratic = !!ctx.socratic;
  return {
    ...EMPTY_RESPONSE,
    assistantMode: socratic ? 'socratic' : 'direct',
    board: getBoard(ctx.boardId).name,
    language: LANGUAGES[ctx.language]?.label || ctx.language,
    projectTitle: 'Offline demo — corridor light',
    understanding:
      'This is the built-in offline example. No API key is saved, so nothing was sent to Gemini. ' +
      'A PIR sensor watches for movement and a Neopixel strip lights up for a set time.',
    questions: socratic ? ['What should make the light turn on, and what should make it turn off again?'] : [],
    plan: socratic ? [] : [
      'Read the PIR sensor on P2 as a digital input.',
      'When it reads 1, light the Neopixel strip on P1.',
      'Start a timer when movement is seen.',
      'Turn the strip off when the timer runs past 20 seconds with no new movement.'
    ],
    parts: [
      { name: 'micro:bit V2', quantity: 1, purpose: 'Reads the sensor and drives the strip.' },
      { name: 'PIR motion sensor', quantity: 1, purpose: 'Detects movement in the corridor.' },
      { name: 'Neopixel strip, 10 pixels', quantity: 1, purpose: 'The light output.' },
      { name: 'Battery pack or 5 V supply', quantity: 1, purpose: 'Powers the strip separately from the board.' }
    ],
    pins: [
      { component: 'PIR sensor', componentPin: 'OUT', boardPin: 'P2', notes: 'Digital input.' },
      { component: 'Neopixel strip', componentPin: 'DIN', boardPin: 'P1', notes: 'Data line.' },
      { component: 'Neopixel strip', componentPin: '5V', boardPin: 'External 5 V', notes: 'Not from the micro:bit.' },
      { component: 'Neopixel strip', componentPin: 'GND', boardPin: 'GND', notes: 'Must share ground with the board.' }
    ],
    code: socratic ? '' :
      '// Offline demo. Add an API key in Settings for a real generated answer.\n' +
      'let lastSeen = 0\n' +
      'const strip = neopixel.create(DigitalPin.P1, 10, NeoPixelMode.RGB)\n' +
      'basic.forever(function () {\n' +
      '    if (pins.digitalReadPin(DigitalPin.P2) == 1) {\n' +
      '        lastSeen = input.runningTime()\n' +
      '        strip.showColor(neopixel.colors(NeoPixelColors.White))\n' +
      '    } else if (input.runningTime() - lastSeen > 20000) {\n' +
      '        strip.clear()\n' +
      '        strip.show()\n' +
      '    }\n' +
      '})',
    explanation: socratic ? [] : [
      'The forever loop checks the PIR pin over and over.',
      'runningTime() gives milliseconds since the board started, so the difference is the time since movement.',
      'clear() only changes the buffer. show() sends it to the strip.'
    ],
    wiringSteps: [
      'Disconnect all power first.',
      'PIR OUT to P2, PIR GND to GND, PIR VCC to its supply.',
      'Neopixel DIN to P1.',
      'Neopixel 5 V and GND to the external supply.',
      'Join the external supply ground to the micro:bit ground.'
    ],
    safetyWarnings: [
      'Ten Neopixels at full white can draw about 600 mA. That is far more than the micro:bit can supply.',
      'Most PIR modules expect 5 V. Check your module before connecting it.',
      'The board and the strip must share a ground or the data signal will not work.'
    ],
    testSteps: [
      'Power the board only and check it starts.',
      'Print the PIR reading and wave a hand to confirm it changes.',
      'Test the strip on its own with a fixed colour.',
      'Only then run the full program.'
    ],
    debuggingSteps: [
      'Strip stays dark: check DIN is on the input end of the strip, and that grounds are joined.',
      'Light never turns off: the PIR hold time trimmer may be set long.',
      'Random flickers: give the PIR a minute to settle after power on.'
    ],
    reflectionQuestion: 'What would happen if someone walked past every 19 seconds?',
    extensionChallenge: 'Only switch on when the light level is below a threshold, so it stays off in daylight.'
  };
}
