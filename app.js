/**
 * app.js — MakerCode AI application logic.
 */

import { APP, GEMINI, LANGUAGES, LEVELS, DEMO, EDITOR, LINKS } from './config.js';
import {
  BOARDS, BOARD_GROUPS, COMPONENTS, STARTER_PROJECTS,
  getBoard, findPin, matchComponent, validatePins
} from './board-profiles.js';
import * as store from './project-store.js';
import * as gemini from './gemini-service.js';
import * as socratic from './socratic-engine.js';
import { connection, STATES } from './microbit-connection.js';

/* ------------------------------------------------------------------ dom */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const el = {
  boardSelect: $('#board-select'),
  languageSelect: $('#language-select'),
  levelSelect: $('#level-select'),
  socraticToggle: $('#socratic-toggle'),
  socraticState: $('#socratic-state'),
  socraticControls: $('#socratic-controls'),
  socraticStepLabel: $('#socratic-step-label'),
  socraticProgress: $('#socratic-progress-fill'),

  chat: $('#chat'),
  composer: $('#composer'),
  prompt: $('#prompt'),
  suggestions: $('#suggestions'),
  sendBtn: $('#btn-send'),
  imageInput: $('#image-input'),
  attachment: $('#attachment'),
  attachmentPreview: $('#attachment-preview'),
  attachmentName: $('#attachment-name'),

  planBody: $('#plan-body'),
  diagramBody: $('#diagram-body'),
  partsBody: $('#parts-body'),
  simulatorBody: $('#simulator-body'),

  codeFallback: $('#code-fallback'),
  monacoHost: $('#monaco-host'),
  editorNote: $('#editor-note'),
  linkMakecode: $('#link-makecode'),

  serialConsole: $('#serial-console'),
  serialInput: $('#serial-input'),
  serialForm: $('#serial-form'),

  railBoard: $('#rail-board'),
  railPins: $('#rail-pins'),
  railChecks: $('#rail-checks'),
  railComponents: $('#rail-components'),
  railProgress: $('#rail-progress'),
  railSafety: $('#rail-safety'),

  chipBoard: $('#chip-board'),
  chipMode: $('#chip-mode'),
  chipCompile: $('#chip-compile'),
  chipConnection: $('#chip-connection'),
  chipKey: $('#chip-key'),
  chipProject: $('#chip-project'),

  toast: $('#toast')
};

const dlg = {
  requirements: $('#dlg-requirements'),
  settings: $('#dlg-settings'),
  projects: $('#dlg-projects'),
  help: $('#dlg-help')
};

/* ---------------------------------------------------------------- state */

const state = {
  project: null,
  settings: store.getSettings(),
  apiKey: store.getApiKey(),
  pendingImage: null,
  busy: false,
  socraticSession: socratic.createSession(),
  lastResponse: null,
  monaco: null,
  monacoModel: null,
  originalCode: '',
  pinErrorCount: 0
};

/* -------------------------------------------------------------- helpers */

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

let toastTimer = null;
function toast(message, kind = '') {
  el.toast.textContent = message;
  el.toast.className = `toast ${kind}`.trim();
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 4200);
}

function setChip(node, text, kind = '') {
  node.textContent = text;
  node.className = `chip ${kind}`.trim();
}

const listHtml = (items, cls = 'tick-list') =>
  `<ul class="${cls}">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;

const numberedHtml = (items) =>
  `<ol class="numbered">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;

function block(title, count, inner) {
  return `<section class="block">
    <div class="block-head"><h3>${escapeHtml(title)}</h3>${
      count != null ? `<span class="block-count">${count}</span>` : ''}</div>
    ${inner}
  </section>`;
}

/* ------------------------------------------------------------ selectors */

function fillBoardSelect() {
  el.boardSelect.innerHTML = BOARD_GROUPS.map((group) => `
    <optgroup label="${escapeHtml(group.label)}">
      ${group.ids.map((id) => `<option value="${id}">${escapeHtml(BOARDS[id].name)}</option>`).join('')}
    </optgroup>`).join('');
}

function fillLanguageSelect(boardId) {
  const board = getBoard(boardId);
  el.languageSelect.innerHTML = board.languages
    .map((id) => `<option value="${id}">${escapeHtml(LANGUAGES[id].label)}</option>`)
    .join('');
  if (!board.languages.includes(state.project.language)) {
    state.project.language = board.defaultLanguage;
  }
  el.languageSelect.value = state.project.language;
}

function fillModelSelect() {
  const current = state.settings.model || GEMINI.model;
  $('#set-model').innerHTML = GEMINI.modelChoices
    .map((m) => `<option value="${m.id}">${escapeHtml(m.label)}</option>`)
    .join('');
  $('#set-model').value = GEMINI.modelChoices.some((m) => m.id === current) ? current : GEMINI.model;
}

/* ------------------------------------------------------------ chat view */

function addMessage(role, html, opts = {}) {
  const node = document.createElement('div');
  node.className = `msg ${role}${opts.error ? ' error' : ''}`;
  node.innerHTML = `
    <span class="msg-role">${role === 'user' ? 'You' : role === 'system' ? 'MakerCode AI' : 'Assistant'}</span>
    <div class="msg-body">${html}</div>`;
  el.chat.appendChild(node);
  el.chat.scrollTop = el.chat.scrollHeight;
  return node;
}

function showTyping() {
  const node = addMessage('assistant', '<span class="typing"><span></span><span></span><span></span></span>');
  node.dataset.typing = 'true';
  return node;
}

function renderSuggestions() {
  const board = getBoard(state.project.board);
  const starters = STARTER_PROJECTS
    .filter((s) => s.boards.includes(board.id))
    .slice(0, 5);

  el.suggestions.innerHTML = starters
    .map((s) => `<button type="button" class="suggestion" data-prompt="${escapeHtml(s.prompt)}">${escapeHtml(s.title)}</button>`)
    .join('') +
    `<button type="button" class="suggestion" data-prompt="${escapeHtml(DEMO.examplePrompt)}">Corridor light example</button>`;
}

function renderChecks(issues) {
  if (!issues.length) {
    el.railChecks.innerHTML = '<p class="muted">Pin checks appear once a design is generated.</p>';
    return;
  }
  const order = { err: 0, warn: 1, ok: 2 };
  const sorted = [...issues].sort((a, b) => order[a.level] - order[b.level]);
  el.railChecks.innerHTML = sorted.map((i) => `
    <div class="callout ${i.level === 'ok' ? 'ok' : i.level}">
      <div class="callout-title" data-icon="${i.level === 'err' ? '!!' : i.level === 'warn' ? '!' : 'OK'}">${escapeHtml(i.title)}</div>
      <div>${escapeHtml(i.detail)}</div>
    </div>`).join('');
}

/* ------------------------------------------------------------- rendering */

function renderBoardRail() {
  const board = getBoard(state.project.board);
  el.railBoard.innerHTML = `
    <dl class="kv">
      <dt>Board</dt><dd>${escapeHtml(board.name)}</dd>
      <dt>Logic level</dt><dd>${board.logic} V</dd>
      <dt>Per pin</dt><dd>~${board.pinCurrentMax} mA</dd>
      <dt>Whole board</dt><dd>~${board.boardCurrentMax} mA</dd>
    </dl>
    <h4 style="margin:12px 0 6px;font-size:.8rem;color:var(--muted)">Built in</h4>
    <div class="tag-list">${board.builtIn.map((b) => `<span class="tag">${escapeHtml(b)}</span>`).join('')}</div>
    <h4 style="margin:12px 0 6px;font-size:.8rem;color:var(--muted)">Watch out for</h4>
    ${listHtml(board.notes)}`;
}

function renderPinsRail(pins) {
  if (!pins.length) {
    el.railPins.innerHTML = '<p class="muted">No pins assigned yet.</p>';
    return;
  }
  el.railPins.innerHTML = pins.map((row) => {
    const pin = findPin(state.project.board, row.boardPin);
    const cls = pin ? '' : ' bad';
    return `<div class="pin-row">
      <span class="pin-tag${cls}">${escapeHtml(row.boardPin)}</span>
      <div class="pin-row-main">
        <div class="pin-row-name">${escapeHtml(row.component)}</div>
        <div class="pin-row-note">${escapeHtml(row.componentPin)}${row.notes ? ' — ' + escapeHtml(row.notes) : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function renderComponentsRail(parts) {
  if (!parts.length) {
    el.railComponents.innerHTML = '<p class="muted">No components yet.</p>';
    return;
  }
  el.railComponents.innerHTML = parts.map((p) => `
    <div class="pin-row">
      <span class="pin-tag">${p.quantity}&times;</span>
      <div class="pin-row-main">
        <div class="pin-row-name">${escapeHtml(p.name)}</div>
        <div class="pin-row-note">${escapeHtml(p.purpose)}</div>
      </div>
    </div>`).join('');
}

function renderProgressRail() {
  const s = state.socraticSession;
  const p = socratic.progress(s);
  const answered = s.answered.length;
  el.railProgress.innerHTML = `
    <dl class="kv">
      <dt>Mode</dt><dd>${state.project.socratic ? 'Socratic' : 'Direct'}</dd>
      <dt>Level</dt><dd>${LEVELS[state.project.level]}</dd>
      <dt>Questions answered</dt><dd>${answered}</dd>
      <dt>Hints used</dt><dd>${s.hintLevel}</dd>
      <dt>Solution shown</dt><dd>${s.solutionRevealed ? 'yes' : 'no'}</dd>
    </dl>
    ${state.project.socratic ? `<p class="muted" style="margin-top:8px">Currently on: ${escapeHtml(p.label)} (${p.step} of ${p.total}).</p>` : ''}`;
}

function renderPlan(r) {
  const parts = [];

  if (r.projectTitle) {
    parts.push(`<h2 style="font-size:1.25rem;margin-bottom:10px">${escapeHtml(r.projectTitle)}</h2>`);
  }
  if (r.understanding) {
    parts.push(`<div class="callout info"><div class="callout-title" data-icon="&gt;">What I understand</div><div>${escapeHtml(r.understanding)}</div></div>`);
  }
  if (r.questions.length) {
    parts.push(`<div class="callout"><div class="callout-title" data-icon="?">${r.questions.length > 1 ? 'Questions for you' : 'Question for you'}</div>${listHtml(r.questions)}</div>`);
  }
  if (r.safetyWarnings.length) {
    parts.push(`<div class="callout warn"><div class="callout-title" data-icon="!">Check before you power up</div>${listHtml(r.safetyWarnings)}</div>`);
  }
  if (r.plan.length) parts.push(block('Plan', `${r.plan.length} steps`, numberedHtml(r.plan)));
  if (r.wiringSteps.length) parts.push(block('Wiring', `${r.wiringSteps.length} steps`, numberedHtml(r.wiringSteps)));
  if (r.explanation.length) parts.push(block('How it works', null, listHtml(r.explanation)));
  if (r.testSteps.length) parts.push(block('Testing', `${r.testSteps.length} steps`, numberedHtml(r.testSteps)));
  if (r.debuggingSteps.length) parts.push(block('If it does not work', null, listHtml(r.debuggingSteps)));
  if (r.reflectionQuestion) {
    parts.push(`<div class="callout"><div class="callout-title" data-icon="?">Think about this</div><div>${escapeHtml(r.reflectionQuestion)}</div></div>`);
  }
  if (r.extensionChallenge) {
    parts.push(`<div class="callout ok"><div class="callout-title" data-icon="+">Extension challenge</div><div>${escapeHtml(r.extensionChallenge)}</div></div>`);
  }

  el.planBody.innerHTML = parts.length ? parts.join('') :
    '<div class="empty"><h3>Nothing to show yet</h3><p>Ask the assistant to plan your project.</p></div>';
}

function renderParts(r) {
  if (!r.parts.length) {
    el.partsBody.innerHTML = '<div class="empty"><h3>No parts list yet</h3><p>The parts you need appear here once a design is generated.</p></div>';
    return;
  }
  const rows = r.parts.map((p) => `
    <tr>
      <td class="pin">${p.quantity}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.purpose)}</td>
    </tr>`).join('');

  const known = r.parts.map((p) => matchComponent(p.name)).filter(Boolean);
  const notes = [...new Set(known.flatMap((c) => c.warnings))];

  el.partsBody.innerHTML = `
    ${block('Parts list', `${r.parts.length} items`, `
      <div class="table-wrap"><table>
        <thead><tr><th class="pin">Qty</th><th>Part</th><th>What it does</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`)}
    ${notes.length ? block('Component notes', null, listHtml(notes)) : ''}`;
}

function renderDiagram(r) {
  if (!r.pins.length) {
    el.diagramBody.innerHTML = '<div class="empty"><h3>No wiring yet</h3><p>Pin connections appear here as a wiring map once a design is generated.</p></div>';
    return;
  }
  const board = getBoard(state.project.board);
  const wires = r.pins.map((row) => {
    const raw = String(row.boardPin || '');
    const kind = /gnd|ground/i.test(raw) ? 'ground'
      : /^(3v3?|5v|vin|vcc)$|external|supply|battery/i.test(raw) ? 'power' : 'signal';
    const pin = findPin(state.project.board, raw);
    const badge = kind === 'signal' && !pin ? 'bad' : '';
    return `<div class="wire ${kind}">
      <div class="wire-end">
        <div class="wire-label">${escapeHtml(row.component)}</div>
        <div class="wire-sub">${escapeHtml(row.componentPin || 'pin')}</div>
      </div>
      <div class="wire-link" aria-hidden="true"></div>
      <div class="wire-end right">
        <span class="pin-tag ${badge}">${escapeHtml(raw)}</span>
        <div class="wire-sub">${escapeHtml(row.notes || (pin ? pin.note : 'not a pin on this board'))}</div>
      </div>
    </div>`;
  }).join('');

  el.diagramBody.innerHTML = `
    <div class="callout info">
      <div class="callout-title" data-icon="i">Wiring map, not a schematic</div>
      <div>This shows what connects to what on the ${escapeHtml(board.name)}. Colour also carries a label, so it reads the same in greyscale: signal, power, ground.</div>
    </div>
    ${block('Connections', `${r.pins.length} wires`, `<div class="wire-map">${wires}</div>`)}
    ${r.wiringSteps.length ? block('Wiring order', `${r.wiringSteps.length} steps`, numberedHtml(r.wiringSteps)) : ''}`;
}

function renderSimulator() {
  const board = getBoard(state.project.board);
  const isMicrobit = board.family === 'microbit';

  const cells = Array.from({ length: 25 }, (_, i) =>
    `<button type="button" class="led-cell" role="switch" aria-checked="false" aria-label="LED ${Math.floor(i / 5) + 1}, ${i % 5 + 1}"></button>`).join('');

  const assigned = (state.lastResponse?.pins || [])
    .filter((p) => findPin(state.project.board, p.boardPin))
    .map((p) => `<span class="pin-tag">${escapeHtml(p.boardPin)}</span> ${escapeHtml(p.component)}`)
    .join('<br>') || '<span class="muted">Nothing assigned</span>';

  el.simulatorBody.innerHTML = `
    <div class="callout warn">
      <div class="callout-title" data-icon="!">This is a sketchpad, not a simulator</div>
      <div>Nothing here runs your code. Use it to draw an LED pattern and check your pin plan. For a real simulator, open the code in MakeCode or the MicroPython editor.</div>
    </div>
    <div class="sim-board">
      ${isMicrobit ? `
        <div>
          <h3>LED pattern sketchpad</h3>
          <p class="muted">Click a dot to plan what the 5 by 5 display should show.</p>
          <div class="led-grid" id="led-grid">${cells}</div>
          <div class="sim-row" style="margin-top:12px">
            <button type="button" class="btn tiny" id="sim-clear">Clear</button>
            <button type="button" class="btn tiny" id="sim-copy">Copy as code</button>
          </div>
        </div>` : ''}
      <div>
        <h3>Pins in use</h3>
        <div class="sim-readout">${assigned}</div>
      </div>
      <div>
        <h3>Where to actually run this</h3>
        <div class="sim-row">
          <a class="btn tiny" href="${LINKS.makecode}" target="_blank" rel="noopener">MakeCode</a>
          <a class="btn tiny" href="${LINKS.micropython}" target="_blank" rel="noopener">MicroPython editor</a>
          <a class="btn tiny" href="${LINKS.arduinoIde}" target="_blank" rel="noopener">Arduino IDE</a>
        </div>
      </div>
    </div>`;

  const grid = $('#led-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('.led-cell');
      if (!cell) return;
      const on = cell.classList.toggle('on');
      cell.setAttribute('aria-checked', String(on));
    });
    $('#sim-clear').addEventListener('click', () => {
      $$('#led-grid .led-cell').forEach((c) => { c.classList.remove('on'); c.setAttribute('aria-checked', 'false'); });
    });
    $('#sim-copy').addEventListener('click', () => {
      const cellNodes = $$('#led-grid .led-cell');
      const rows = [];
      for (let r = 0; r < 5; r += 1) {
        rows.push(cellNodes.slice(r * 5, r * 5 + 5).map((c) => (c.classList.contains('on') ? '#' : '.')).join(' '));
      }
      const isPy = state.project.language === 'micropython';
      const text = isPy
        ? `display.show(Image("${rows.map((r) => r.replace(/ /g, '').replace(/#/g, '9').replace(/\./g, '0')).join(':')}"))`
        : `basic.showLeds(\`\n    ${rows.join('\n    ')}\n    \`)`;
      navigator.clipboard.writeText(text)
        .then(() => toast('Pattern copied', 'ok'))
        .catch(() => toast('Could not copy. Select the code manually.', 'err'));
    });
  }
}

function renderAll(r) {
  state.lastResponse = r;
  renderPlan(r);
  renderParts(r);
  renderDiagram(r);
  renderSimulator();
  renderPinsRail(r.pins);
  renderComponentsRail(r.parts);
  renderProgressRail();

  const issues = validatePins(r.pins, state.project.board);
  renderChecks(issues);

  if (r.code) {
    setCode(r.code);
    state.originalCode = r.code;
    markTabBadge('tab-code');
  }

  const errCount = issues.filter((i) => i.level === 'err').length;
  state.pinErrorCount = errCount;
  setChip(
    el.chipCompile,
    errCount ? `${errCount} pin problem${errCount > 1 ? 's' : ''}` : 'Not yet compiled',
    errCount ? 'err' : 'warn'
  );
}

function markTabBadge(tabId) {
  const tab = document.getElementById(tabId);
  if (tab && !tab.classList.contains('active')) tab.dataset.badge = 'new';
}

/* ---------------------------------------------------------------- editor */

function getCode() {
  return state.monaco ? state.monaco.getValue() : el.codeFallback.value;
}

function setCode(text) {
  if (state.monaco) state.monaco.setValue(text);
  else el.codeFallback.value = text;
}

function getSelection() {
  if (state.monaco) {
    const sel = state.monaco.getSelection();
    return sel ? state.monaco.getModel().getValueInRange(sel) : '';
  }
  const ta = el.codeFallback;
  return ta.value.slice(ta.selectionStart, ta.selectionEnd);
}

async function loadMonaco() {
  if (!EDITOR.useMonaco) return false;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), EDITOR.monacoLoadTimeoutMs);
    const script = document.createElement('script');
    script.src = `${EDITOR.monacoBase}/loader.js`;
    script.onerror = () => { clearTimeout(timer); resolve(false); };
    script.onload = () => {
      try {
        window.require.config({ paths: { vs: EDITOR.monacoBase } });
        window.require(['vs/editor/editor.main'], () => {
          clearTimeout(timer);
          try {
            window.monaco.editor.defineTheme('makercode', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: { 'editor.background': '#060A15', 'editorLineNumber.foreground': '#46557A' }
            });
            state.monaco = window.monaco.editor.create(el.monacoHost, {
              value: getCode(),
              language: LANGUAGES[state.project.language].monaco,
              theme: 'makercode',
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              wordWrap: 'on',
              ariaLabel: 'Generated code'
            });
            el.monacoHost.hidden = false;
            el.codeFallback.hidden = true;
            el.editorNote.textContent = 'Editor: Monaco with syntax highlighting. Nothing here has been compiled.';
            resolve(true);
          } catch {
            resolve(false);
          }
        }, () => { clearTimeout(timer); resolve(false); });
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    };
    document.head.appendChild(script);
  });
}

function setEditorLanguage(langId) {
  el.linkMakecode.href = langId === 'micropython' ? LINKS.micropython
    : getBoard(state.project.board).family === 'microbit' ? LINKS.makecode : LINKS.arduinoIde;
  el.linkMakecode.textContent = langId === 'micropython' ? 'Open MicroPython editor'
    : getBoard(state.project.board).family === 'microbit' ? 'Open MakeCode' : 'Open Arduino IDE';

  if (state.monaco && window.monaco) {
    window.monaco.editor.setModelLanguage(state.monaco.getModel(), LANGUAGES[langId].monaco);
  }
}

function downloadCode() {
  const code = getCode();
  if (!code.trim()) { toast('There is no code to download yet.'); return; }
  const ext = LANGUAGES[state.project.language].ext;
  const safe = (state.project.name || 'makercode').replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Saved ${safe}.${ext}. Open it in the editor for your board.`, 'ok');
}

/* ------------------------------------------------------------- the send */

function buildContext() {
  return {
    apiKey: state.apiKey,
    model: state.settings.model || GEMINI.model,
    boardId: state.project.board,
    language: state.project.language,
    level: state.project.level,
    socratic: state.project.socratic,
    history: state.project.messages.slice(-GEMINI.maxChatTurnsSent),
    requirements: state.project.requirements,
    image: state.pendingImage,
    serialLog: ''
  };
}

async function send(text, { systemNote = '', isAttempt = true } = {}) {
  if (state.busy) return;
  const trimmed = text.trim();
  if (!trimmed && !state.pendingImage) return;

  state.busy = true;
  el.sendBtn.disabled = true;
  el.sendBtn.textContent = 'Thinking…';
  setChip(el.chipCompile, 'Generating…', 'info busy');

  const imgHtml = state.pendingImage
    ? `<img class="msg-image" src="data:${state.pendingImage.mimeType};base64,${state.pendingImage.base64}" alt="Image you attached">`
    : '';
  addMessage('user', imgHtml + escapeHtml(trimmed).replace(/\n/g, '<br>'));
  state.project.messages.push({ role: 'user', text: trimmed });

  if (state.project.socratic && isAttempt && trimmed) {
    socratic.recordAttempt(state.socraticSession, trimmed);
  }

  const typing = showTyping();
  const ctx = buildContext();
  ctx.prompt = systemNote ? `${trimmed}\n\n[Instruction to the assistant: ${systemNote}]` : trimmed;

  try {
    const response = state.apiKey ? await gemini.generate(ctx) : gemini.offlineDemo(ctx);
    typing.remove();

    if (!state.apiKey) {
      addMessage('system', 'No API key saved, so this is the built-in offline example. Add a key in Settings for real answers.');
    }

    const summary = [];
    if (response.understanding) summary.push(`<p>${escapeHtml(response.understanding)}</p>`);
    if (response.questions.length) {
      summary.push(response.questions.map((q) => `<div class="msg-question">${escapeHtml(q)}</div>`).join(''));
    }
    if (!response.questions.length && response.plan.length) {
      summary.push(`<p class="muted">Plan, parts, wiring and testing are in the workspace tabs.</p>`);
    }
    addMessage('assistant', summary.join('') || '<p>Done. Check the workspace tabs.</p>');
    state.project.messages.push({
      role: 'assistant',
      text: response.understanding || 'Generated a project plan.'
    });

    renderAll(response);
    if (state.project.socratic && response.questions.length) {
      socratic.advance(state.socraticSession);
      updateSocraticUi();
    }
    autoSave();
  } catch (err) {
    typing.remove();
    const message = err instanceof gemini.GeminiError
      ? `<strong>${escapeHtml(err.message)}</strong>${err.hint ? `<p style="margin:6px 0 0">${escapeHtml(err.hint)}</p>` : ''}`
      : `<strong>Something went wrong.</strong><p style="margin:6px 0 0">${escapeHtml(String(err.message || err))}</p>`;
    addMessage('assistant', message, { error: true });
    setChip(el.chipCompile, 'Not yet compiled', 'warn');
  } finally {
    state.busy = false;
    el.sendBtn.disabled = false;
    el.sendBtn.textContent = 'Send';
    clearImage();
    if (!state.pinErrorCount) setChip(el.chipCompile, 'Not yet compiled', 'warn');
  }
}

/* ------------------------------------------------------------- socratic */

function updateSocraticUi() {
  const on = state.project.socratic;
  el.socraticControls.hidden = !on;
  el.socraticState.textContent = on ? 'on' : 'off';
  setChip(el.chipMode, on ? 'Socratic mode' : 'Direct mode', on ? 'info' : '');

  const p = socratic.progress(state.socraticSession);
  el.socraticStepLabel.textContent = `Step ${p.step} of ${p.total} — ${p.label}`;
  el.socraticProgress.style.width = `${p.percent}%`;
  el.socraticProgress.parentElement.setAttribute('aria-valuenow', String(p.percent));
  renderProgressRail();
}

function handleSocraticAction(action) {
  if (action === 'solution') {
    const nudge = socratic.nudgeBeforeSolution(state.socraticSession);
    if (nudge) {
      addMessage('system', escapeHtml(nudge));
      el.prompt.focus();
      return;
    }
  }
  const built = socratic.buildAction(action, state.socraticSession, {
    level: state.project.level
  });
  send(built.text, { systemNote: built.systemNote, isAttempt: false });
  updateSocraticUi();
}

/* --------------------------------------------------------------- images */

function clearImage() {
  state.pendingImage = null;
  el.attachment.hidden = true;
  el.imageInput.value = '';
}

function handleImage(file) {
  if (!file) return;
  if (file.size > GEMINI.maxImageBytes) {
    toast(`That image is too large. Keep it under ${Math.round(GEMINI.maxImageBytes / 1024 / 1024)} MB.`, 'err');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    const base64 = dataUrl.split(',')[1];
    state.pendingImage = { mimeType: file.type, base64 };
    el.attachmentPreview.src = dataUrl;
    el.attachmentName.textContent = file.name;
    el.attachment.hidden = false;
    if (!el.prompt.value.trim()) {
      el.prompt.value = 'Look at this photo of my circuit and tell me what you can see and what looks wrong.';
    }
  };
  reader.onerror = () => toast('Could not read that image.', 'err');
  reader.readAsDataURL(file);
}

/* --------------------------------------------------------------- serial */

function appendSerialLine(text, sent = false) {
  const line = document.createElement('div');
  line.className = `serial-line${sent ? ' sent' : ''}`;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  line.innerHTML = `<span class="serial-time">${time}</span><span class="serial-text">${sent ? '&gt; ' : ''}${escapeHtml(text)}</span>`;
  el.serialConsole.appendChild(line);
  if ($('#serial-autoscroll').checked) el.serialConsole.scrollTop = el.serialConsole.scrollHeight;
}

function wireSerial() {
  connection.addEventListener('line', (e) => appendSerialLine(e.detail.text));
  connection.addEventListener('cleared', () => { el.serialConsole.innerHTML = ''; });
  connection.addEventListener('state', (e) => {
    const { state: s, message } = e.detail;
    const map = {
      [STATES.unsupported]: ['Serial not supported', 'warn'],
      [STATES.disconnected]: ['Board disconnected', ''],
      [STATES.connecting]: ['Connecting…', 'info busy'],
      [STATES.connected]: ['Board connected', 'ok'],
      [STATES.error]: ['Connection error', 'err']
    };
    const [label, kind] = map[s] || ['Board disconnected', ''];
    setChip(el.chipConnection, label, kind);
    $('#btn-connect').disabled = s === STATES.connected || s === STATES.connecting;
    $('#btn-disconnect').disabled = s !== STATES.connected;
    if (message) appendSerialLine(`[${s}] ${message}`);
    if (s === STATES.connected) appendSerialLine('[connected] Reading serial at 115200 baud. This does not flash the board.');
  });

  $('#btn-connect').addEventListener('click', async () => {
    if (!connection.isSupported()) {
      appendSerialLine(`[unsupported] ${connection.browserAdvice()}`);
      toast(connection.browserAdvice(), 'err');
      return;
    }
    await connection.connect();
  });
  $('#btn-disconnect').addEventListener('click', () => connection.disconnect());
  $('#btn-clear-serial').addEventListener('click', () => connection.clearBuffer());
  $('#btn-serial-to-chat').addEventListener('click', () => {
    const text = connection.recentText();
    if (!text.trim()) { toast('There is no serial output to send yet.'); return; }
    el.prompt.value = `Here is the serial output from my board. Help me work out what is going wrong.\n\n${text}`;
    switchTab('tab-plan');
    el.prompt.focus();
  });
  el.serialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = el.serialInput.value;
    if (!text.trim()) return;
    const ok = await connection.send(text);
    if (ok) { appendSerialLine(text, true); el.serialInput.value = ''; }
    else toast('Not connected to a board.', 'err');
  });
}

/* ------------------------------------------------------------------ tabs */

function switchTab(tabId) {
  $$('.tab').forEach((tab) => {
    const active = tab.id === tabId;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active) delete tab.dataset.badge;
    const view = document.getElementById(tab.getAttribute('aria-controls'));
    view.classList.toggle('active', active);
    view.hidden = !active;
  });
}

function wireTabs() {
  const tabs = $$('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.id));
    tab.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(tab);
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); switchTab(next.id); next.focus(); }
    });
  });
}

/* -------------------------------------------------------------- projects */

function applyProject(project) {
  state.project = project;
  state.socraticSession = project.socraticSession
    ? { ...socratic.createSession(), ...project.socraticSession }
    : socratic.createSession();

  el.boardSelect.value = project.board;
  fillLanguageSelect(project.board);
  el.languageSelect.value = project.language;
  el.levelSelect.value = project.level;
  el.socraticToggle.checked = project.socratic;

  el.chat.innerHTML = '';
  if (project.messages.length) {
    project.messages.forEach((m) => addMessage(m.role, escapeHtml(m.text).replace(/\n/g, '<br>')));
  } else {
    addMessage('system', escapeHtml(project.socratic ? DEMO.greetingSocratic : DEMO.greeting));
  }

  setCode(project.code || '');
  state.originalCode = project.code || '';
  setChip(el.chipBoard, getBoard(project.board).name);
  setChip(el.chipProject, project.name, 'quiet');
  setEditorLanguage(project.language);
  renderBoardRail();
  renderSuggestions();
  updateSocraticUi();

  if (project.lastResponse) renderAll(project.lastResponse);
  else {
    renderPinsRail([]);
    renderComponentsRail([]);
    renderChecks([]);
    renderSimulator();
  }
}

function captureProject() {
  state.project.code = getCode();
  state.project.lastResponse = state.lastResponse;
  state.project.socraticSession = state.socraticSession;
  state.project.pins = state.lastResponse?.pins || [];
  state.project.components = state.lastResponse?.parts || [];
  return state.project;
}

function autoSave() {
  if (!state.settings.autoSave) return;
  store.saveProject(captureProject());
}

function renderProjectList() {
  const projects = store.listProjects();
  const list = $('#project-list');
  if (!projects.length) {
    list.innerHTML = '<p class="muted">No saved projects yet. Save one and it will appear here.</p>';
    return;
  }
  list.innerHTML = projects.map((p) => `
    <div class="project-item">
      <div class="project-item-main">
        <div class="project-item-name">${escapeHtml(p.name)}</div>
        <div class="project-item-meta">${escapeHtml(getBoard(p.board).name)} · ${escapeHtml(LANGUAGES[p.language]?.label || p.language)} · ${new Date(p.updatedAt).toLocaleString()}</div>
      </div>
      <button type="button" class="btn tiny" data-open="${p.id}">Open</button>
      <button type="button" class="btn tiny ghost" data-export="${p.id}">Export</button>
      <button type="button" class="btn tiny danger" data-delete="${p.id}">Delete</button>
    </div>`).join('');

  list.querySelectorAll('[data-open]').forEach((btn) => btn.addEventListener('click', () => {
    const project = store.getProject(btn.dataset.open);
    if (project) { applyProject(project); store.setActiveProject(project.id); dlg.projects.close(); toast(`Opened ${project.name}`, 'ok'); }
  }));
  list.querySelectorAll('[data-export]').forEach((btn) => btn.addEventListener('click', () => {
    const project = store.getProject(btn.dataset.export);
    if (!project) return;
    downloadText(store.exportProject(project), `${project.name.replace(/[^a-z0-9-_]+/gi, '_')}.json`);
  }));
  list.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    store.deleteProject(btn.dataset.delete);
    renderProjectList();
  }));
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------- settings */

function applySettings() {
  document.documentElement.style.setProperty('--font-scale', String(state.settings.fontScale));
  document.body.classList.toggle('reduce-motion', !!state.settings.reduceMotion);
  el.railSafety.parentElement.hidden = !state.settings.showSafety;
  setChip(el.chipKey, state.apiKey ? 'API key saved' : 'No API key', state.apiKey ? 'ok' : 'warn');
}

function openSettings() {
  $('#set-key').value = state.apiKey;
  $('#set-socratic-default').checked = !!state.settings.socraticDefault;
  $('#set-motion').checked = !!state.settings.reduceMotion;
  $('#set-safety').checked = !!state.settings.showSafety;
  $('#set-font').value = String(state.settings.fontScale);
  fillModelSelect();
  const usage = store.storageUsage();
  $('#storage-usage').textContent =
    `${usage.projects} project${usage.projects === 1 ? '' : 's'} stored, about ${(usage.bytes / 1024).toFixed(1)} KB in this browser.`;
  $('#key-result').textContent = '';
  dlg.settings.showModal();
}

/* ------------------------------------------------------------ code tools */

function codeAction(action) {
  const code = getCode();
  const selection = getSelection();

  switch (action) {
    case 'copy':
      if (!code.trim()) { toast('There is no code to copy yet.'); return; }
      navigator.clipboard.writeText(code)
        .then(() => toast('Code copied to the clipboard', 'ok'))
        .catch(() => toast('Could not copy. Select the code and copy it manually.', 'err'));
      return;
    case 'download':
      downloadCode();
      return;
    case 'reset':
      if (!state.originalCode) { toast('There is nothing to reset to.'); return; }
      setCode(state.originalCode);
      toast('Code reset to the generated version');
      return;
    case 'explain':
      if (!selection.trim()) { toast('Select some code first, then press Explain selection.'); return; }
      send(`Explain this part of my code, line by line:\n\n${selection}`, {
        systemNote: 'Explain only the selected lines. Put the explanation in "explanation" and leave "code" empty.',
        isAttempt: false
      });
      return;
    case 'findError':
      if (!code.trim()) { toast('There is no code to check yet.'); return; }
      send(`Check this code for likely errors:\n\n${code}`, {
        systemNote: 'Review the code for bugs, wrong pin use, blocking loops and off-by-one errors. List each finding in "debuggingSteps". Only put corrected code in "code" if you are confident. Remind the learner that you have not compiled it.',
        isAttempt: false
      });
      return;
    case 'improve':
      if (!code.trim()) { toast('There is no code to improve yet.'); return; }
      send(`Suggest improvements to this code:\n\n${code}`, {
        systemNote: 'Suggest improvements suited to the learner level. Explain each change in "explanation" before showing the improved code.',
        isAttempt: false
      });
      return;
    case 'convert': {
      const board = getBoard(state.project.board);
      const options = board.languages.filter((l) => l !== state.project.language);
      if (!options.length) { toast(`The ${board.name} only supports one language here.`); return; }
      const target = options[0];
      send(`Convert my code to ${LANGUAGES[target].label}:\n\n${code}`, {
        systemNote: `Rewrite the code in ${LANGUAGES[target].label} for the ${board.name}. Note in "explanation" anything that does not translate directly.`,
        isAttempt: false
      });
      return;
    }
    default:
  }
}

/* ------------------------------------------------------------------ wire */

function wireEvents() {
  // selectors
  el.boardSelect.addEventListener('change', () => {
    state.project.board = el.boardSelect.value;
    fillLanguageSelect(state.project.board);
    setChip(el.chipBoard, getBoard(state.project.board).name);
    setEditorLanguage(state.project.language);
    renderBoardRail();
    renderSuggestions();
    renderSimulator();
    if (state.lastResponse) renderChecks(validatePins(state.lastResponse.pins, state.project.board));
    autoSave();
  });

  el.languageSelect.addEventListener('change', () => {
    state.project.language = el.languageSelect.value;
    setEditorLanguage(state.project.language);
    autoSave();
  });

  el.levelSelect.addEventListener('change', () => {
    state.project.level = el.levelSelect.value;
    renderProgressRail();
    autoSave();
  });

  el.socraticToggle.addEventListener('change', () => {
    state.project.socratic = el.socraticToggle.checked;
    if (state.project.socratic) {
      socratic.reset(state.socraticSession);
      addMessage('system', 'Socratic Mode is on. I will ask questions instead of handing over the answer. Answer in your own words — a rough answer is fine.');
    } else {
      addMessage('system', 'Socratic Mode is off. I will give complete solutions with the reasoning behind them.');
    }
    updateSocraticUi();
    autoSave();
  });

  // composer
  el.composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = el.prompt.value;
    el.prompt.value = '';
    send(text);
  });
  el.prompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      el.composer.requestSubmit();
    }
  });

  el.suggestions.addEventListener('click', (e) => {
    const btn = e.target.closest('.suggestion');
    if (!btn) return;
    el.prompt.value = btn.dataset.prompt;
    el.prompt.focus();
  });

  $('#btn-upload').addEventListener('click', () => el.imageInput.click());
  el.imageInput.addEventListener('change', (e) => handleImage(e.target.files[0]));
  $('#btn-remove-image').addEventListener('click', clearImage);
  $('#btn-paste-serial').addEventListener('click', () => {
    const text = connection.recentText();
    if (!text.trim()) { toast('No serial output yet. Connect the board first.'); return; }
    el.prompt.value = `${el.prompt.value}\n\nSerial output:\n${text}`.trim();
    el.prompt.focus();
  });

  $('#btn-clear-chat').addEventListener('click', () => {
    if (!confirm('Clear the conversation? The plan and code stay.')) return;
    state.project.messages = [];
    el.chat.innerHTML = '';
    addMessage('system', escapeHtml(state.project.socratic ? DEMO.greetingSocratic : DEMO.greeting));
    autoSave();
  });

  el.socraticControls.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-socratic]');
    if (btn) handleSocraticAction(btn.dataset.socratic);
  });

  // code toolbar
  $$('[data-code]').forEach((btn) => btn.addEventListener('click', () => codeAction(btn.dataset.code)));
  el.codeFallback.addEventListener('input', () => { if (state.settings.autoSave) state.project.code = el.codeFallback.value; });

  // top bar
  $('#btn-new').addEventListener('click', () => {
    if (!confirm('Start a new project? Save the current one first if you need it.')) return;
    const project = store.newProject({
      board: state.project.board,
      language: state.project.language,
      level: state.project.level
    });
    applyProject(project);
    store.saveProject(project);
    toast('New project started', 'ok');
  });

  $('#btn-save').addEventListener('click', () => {
    const name = prompt('Project name', state.project.name === 'Untitled project' ? '' : state.project.name);
    if (name === null) return;
    state.project.name = name.trim() || 'Untitled project';
    const ok = store.saveProject(captureProject());
    setChip(el.chipProject, state.project.name, 'quiet');
    toast(ok ? `Saved ${state.project.name}` : 'Could not save. Browser storage may be full or blocked.', ok ? 'ok' : 'err');
  });

  $('#btn-open').addEventListener('click', () => { renderProjectList(); dlg.projects.showModal(); });
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-help').addEventListener('click', () => dlg.help.showModal());

  $('#btn-requirements').addEventListener('click', () => {
    $('#req-name').value = state.project.name === 'Untitled project' ? '' : state.project.name;
    dlg.requirements.showModal();
  });

  dlg.requirements.addEventListener('close', () => {
    if (dlg.requirements.returnValue !== 'save') return;
    const name = $('#req-name').value.trim();
    if (name) { state.project.name = name; setChip(el.chipProject, name, 'quiet'); }
    const fields = [
      ['Inputs', $('#req-inputs').value],
      ['Processing', $('#req-process').value],
      ['Outputs', $('#req-outputs').value],
      ['Constraints', $('#req-constraints').value]
    ].filter(([, v]) => v.trim());
    state.project.requirements = fields.map(([k, v]) => `${k}: ${v.trim()}`).join('\n');
    if (state.project.requirements) {
      addMessage('system', 'Requirements saved. They are sent with every message from now on.');
    }
    autoSave();
  });

  // settings dialog
  $('#set-key').addEventListener('change', (e) => {
    state.apiKey = e.target.value.trim();
    store.setApiKey(state.apiKey);
    applySettings();
  });
  $('#btn-forget-key').addEventListener('click', () => {
    state.apiKey = '';
    store.setApiKey('');
    $('#set-key').value = '';
    $('#key-result').textContent = 'Key removed from this browser.';
    applySettings();
  });
  $('#btn-test-key').addEventListener('click', async () => {
    const key = $('#set-key').value.trim();
    const result = $('#key-result');
    if (!key) { result.textContent = 'Paste a key first.'; return; }
    result.textContent = 'Testing…';
    try {
      await gemini.testKey(key, $('#set-model').value);
      state.apiKey = key;
      store.setApiKey(key);
      applySettings();
      result.textContent = 'Key works.';
    } catch (err) {
      result.textContent = `${err.message} ${err.hint || ''}`.trim();
    }
  });
  $('#set-model').addEventListener('change', (e) => {
    state.settings = store.saveSettings({ model: e.target.value });
  });
  $('#set-socratic-default').addEventListener('change', (e) => {
    const on = e.target.checked;
    state.settings = store.saveSettings({ socraticDefault: on });
    if (state.project.socratic !== on) {
      state.project.socratic = on;
      el.socraticToggle.checked = on;
      if (on) socratic.reset(state.socraticSession);
      updateSocraticUi();
      autoSave();
    }
    toast(on ? 'New projects will start in Socratic Mode' : 'New projects will start in Direct Mode');
  });

  $('#set-motion').addEventListener('change', (e) => {
    state.settings = store.saveSettings({ reduceMotion: e.target.checked });
    applySettings();
  });
  $('#set-safety').addEventListener('change', (e) => {
    state.settings = store.saveSettings({ showSafety: e.target.checked });
    applySettings();
  });
  $('#set-font').addEventListener('input', (e) => {
    state.settings = store.saveSettings({ fontScale: Number(e.target.value) });
    applySettings();
  });
  $('#btn-export').addEventListener('click', () => {
    downloadText(store.exportAll(), `makercode-projects-${new Date().toISOString().slice(0, 10)}.json`);
  });
  $('#btn-import').addEventListener('click', () => $('#import-input').click());
  $('#import-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = store.importFromJson(String(reader.result));
        toast(`Imported ${count} project${count === 1 ? '' : 's'}`, 'ok');
      } catch (err) {
        toast(err.message, 'err');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
  $('#btn-clear-data').addEventListener('click', () => {
    if (!confirm('Delete every saved project and setting in this browser? This cannot be undone.')) return;
    store.clearAllData();
    state.settings = store.getSettings();
    state.apiKey = '';
    applySettings();
    applyProject(store.newProject());
    dlg.settings.close();
    toast('All project data cleared', 'ok');
  });

  // empty-state example
  document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-try-example') {
      el.prompt.value = DEMO.examplePrompt;
      el.composer.requestSubmit();
    }
  });

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      store.saveProject(captureProject());
      toast('Project saved', 'ok');
    }
  });

  window.addEventListener('beforeunload', () => { if (state.settings.autoSave) autoSave(); });
}

/* ------------------------------------------------------------------ init */

async function init() {
  fillBoardSelect();
  const existing = store.getActiveProject();
  applyProject(existing || store.newProject());
  applySettings();

  wireTabs();
  wireSerial();
  wireEvents();

  if (!connection.isSupported()) {
    setChip(el.chipConnection, 'Serial not supported', 'warn');
    $('#btn-connect').disabled = false;
  }

  const monacoReady = await loadMonaco();
  if (!monacoReady) {
    el.editorNote.textContent = 'Editor: plain text fallback, Monaco could not load. Nothing here has been compiled.';
  } else {
    setEditorLanguage(state.project.language);
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
  }

  const params = new URLSearchParams(location.search);
  if (params.get('tab')) {
    const target = document.getElementById(`tab-${params.get('tab')}`);
    if (target) switchTab(target.id);
  }
  if (params.get('new') === '1') {
    const fresh = store.newProject({ board: state.project.board, language: state.project.language });
    applyProject(fresh);
    store.saveProject(fresh);
  }

  console.info(`${APP.name} ${APP.version} ready. Model: ${state.settings.model || GEMINI.model}`);
}

init();
