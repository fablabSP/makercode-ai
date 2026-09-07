/**
 * project-store.js — localStorage persistence.
 *
 * Nothing leaves the browser except the prompt text sent to Gemini. There is no
 * account, no server and no conversation logging.
 */

import { STORAGE_KEYS, APP } from './config.js';

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('Could not save to localStorage', err);
    return false;
  }
};

export function newProject(overrides = {}) {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: 'Untitled project',
    board: 'microbit-v2',
    language: 'makecode-blocks',
    level: 'beginner',
    socratic: getSettings().socraticDefault,
    requirements: '',
    messages: [],
    code: '',
    components: [],
    pins: [],
    notes: '',
    lastResponse: null,
    socraticSession: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

export function listProjects() {
  const all = read(STORAGE_KEYS.projects, {});
  return Object.values(all).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function getProject(id) {
  return read(STORAGE_KEYS.projects, {})[id] || null;
}

export function saveProject(project) {
  const all = read(STORAGE_KEYS.projects, {});
  project.updatedAt = new Date().toISOString();
  all[project.id] = project;
  const ok = write(STORAGE_KEYS.projects, all);
  if (ok) write(STORAGE_KEYS.activeProject, project.id);
  return ok;
}

export function deleteProject(id) {
  const all = read(STORAGE_KEYS.projects, {});
  delete all[id];
  write(STORAGE_KEYS.projects, all);
}

export function getActiveProject() {
  const id = read(STORAGE_KEYS.activeProject, null);
  return id ? getProject(id) : null;
}

export function setActiveProject(id) {
  write(STORAGE_KEYS.activeProject, id);
}

/* --------------------------------------------------------------- settings */

export const DEFAULT_SETTINGS = {
  model: '',
  socraticDefault: true,
  reduceMotion: false,
  fontScale: 1,
  autoSave: true,
  showSafety: true
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(STORAGE_KEYS.settings, {}) };
}

export function saveSettings(patch) {
  const merged = { ...getSettings(), ...patch };
  write(STORAGE_KEYS.settings, merged);
  return merged;
}

/* ----------------------------------------------------------------- api key */

export function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEYS.apiKey) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_KEYS.apiKey, key);
    else localStorage.removeItem(STORAGE_KEYS.apiKey);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- export and import */

export function exportProject(project) {
  return JSON.stringify({
    format: 'makercode-ai-project',
    version: APP.version,
    exportedAt: new Date().toISOString(),
    project
  }, null, 2);
}

export function exportAll() {
  return JSON.stringify({
    format: 'makercode-ai-archive',
    version: APP.version,
    exportedAt: new Date().toISOString(),
    projects: listProjects()
  }, null, 2);
}

export function importFromJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const incoming = data.projects || (data.project ? [data.project] : Array.isArray(data) ? data : null);
  if (!incoming) throw new Error('No projects found in that file.');

  const all = read(STORAGE_KEYS.projects, {});
  let count = 0;
  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object') continue;
    const project = newProject({ ...raw, id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
    all[project.id] = project;
    count += 1;
  }
  write(STORAGE_KEYS.projects, all);
  return count;
}

export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  });
}

export function storageUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.projects) || '';
    return { bytes: new Blob([raw]).size, projects: listProjects().length };
  } catch {
    return { bytes: 0, projects: 0 };
  }
}
