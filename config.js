/**
 * MakerCode AI — central configuration.
 *
 * Everything that is likely to change (model name, endpoint, limits) lives here
 * so it can be updated without touching application logic.
 */

export const APP = {
  name: 'MakerCode AI',
  version: '1.0.0',
  tagline: 'Plan, wire and code Arduino, ESP32 and micro:bit projects.'
};

export const GEMINI = {
  /**
   * Model name. Change this one value to switch models.
   * Verified working IDs on the Gemini Developer API:
   *   gemini-3.8-flash      (current Flash, best reasoning, higher cost)
   *   gemini-3.7-flash      (previous Flash, fully supported)
   *   gemini-3.6-flash      (cheaper, fine for classroom volume)
   *   gemini-flash-latest   (rolling alias — moves without warning)
   */
  model: 'gemini-3.8-flash',

  modelChoices: [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (best reasoning)' },
    { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (balanced)' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (cheapest)' },
    { id: 'gemini-flash-latest', label: 'Gemini Flash (rolling latest)' }
  ],

  apiBase: 'https://generativelanguage.googleapis.com',
  apiVersion: 'v1beta',
  method: 'generateContent',

  /** Sent as generationConfig. Unknown keys are stripped automatically on a 400. */
  generationConfig: {
    temperature: 0.35,
    topP: 0.9,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json'
  },

  /** Attach the JSON schema. Disabled automatically if the model rejects it. */
  useResponseSchema: true,

  requestTimeoutMs: 90000,
  maxImageBytes: 4 * 1024 * 1024,
  maxChatTurnsSent: 12
};

/** Shape requested from the model. Rendered field-by-field — never shown raw. */
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    assistantMode: { type: 'string', enum: ['direct', 'socratic'] },
    board: { type: 'string' },
    language: { type: 'string' },
    projectTitle: { type: 'string' },
    understanding: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
    plan: { type: 'array', items: { type: 'string' } },
    parts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'integer' },
          purpose: { type: 'string' }
        },
        required: ['name', 'quantity', 'purpose']
      }
    },
    pins: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          component: { type: 'string' },
          componentPin: { type: 'string' },
          boardPin: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['component', 'componentPin', 'boardPin', 'notes']
      }
    },
    code: { type: 'string' },
    explanation: { type: 'array', items: { type: 'string' } },
    wiringSteps: { type: 'array', items: { type: 'string' } },
    safetyWarnings: { type: 'array', items: { type: 'string' } },
    testSteps: { type: 'array', items: { type: 'string' } },
    debuggingSteps: { type: 'array', items: { type: 'string' } },
    reflectionQuestion: { type: 'string' },
    extensionChallenge: { type: 'string' }
  },
  required: [
    'assistantMode', 'board', 'language', 'projectTitle', 'understanding',
    'questions', 'plan', 'parts', 'pins', 'code', 'explanation',
    'wiringSteps', 'safetyWarnings', 'testSteps', 'debuggingSteps',
    'reflectionQuestion', 'extensionChallenge'
  ]
};

export const EMPTY_RESPONSE = {
  assistantMode: 'direct',
  board: '',
  language: '',
  projectTitle: '',
  understanding: '',
  questions: [],
  plan: [],
  parts: [],
  pins: [],
  code: '',
  explanation: [],
  wiringSteps: [],
  safetyWarnings: [],
  testSteps: [],
  debuggingSteps: [],
  reflectionQuestion: '',
  extensionChallenge: ''
};

export const STORAGE_KEYS = {
  projects: 'makercode.projects.v1',
  activeProject: 'makercode.activeProject.v1',
  settings: 'makercode.settings.v1',
  apiKey: 'makercode.apiKey.v1'
};

export const EDITOR = {
  useMonaco: true,
  monacoBase: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
  monacoLoadTimeoutMs: 6000
};

export const LANGUAGES = {
  'arduino-cpp': { label: 'Arduino C++', ext: 'ino', monaco: 'cpp' },
  'micropython': { label: 'MicroPython', ext: 'py', monaco: 'python' },
  'makecode-js': { label: 'MakeCode JavaScript', ext: 'js', monaco: 'javascript' },
  'makecode-ts': { label: 'MakeCode TypeScript', ext: 'ts', monaco: 'typescript' },
  'makecode-blocks': { label: 'MakeCode blocks (as steps)', ext: 'txt', monaco: 'markdown' }
};

export const LEVELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
};

export const LINKS = {
  makecode: 'https://makecode.microbit.org/',
  micropython: 'https://python.microbit.org/v/3',
  arduinoIde: 'https://www.arduino.cc/en/software',
  apiKey: 'https://aistudio.google.com/apikey'
};

export const DEMO = {
  greeting:
    "Hello, I'm MakerCode AI. Tell me what you want to build using Arduino, " +
    'ESP32 or micro:bit. I can guide you step by step or use Socratic Mode to ' +
    'help you work out the solution.',
  greetingSocratic:
    "Hello, I'm MakerCode AI. Tell me what you want to build using Arduino, " +
    'ESP32 or micro:bit. Socratic Mode is on, so I will ask you questions and ' +
    'work through it with you rather than handing over the answer. Turn it off ' +
    'in the top bar or in Settings if you would rather see full solutions.',
  examplePrompt:
    'I want to create a micro:bit corridor light. A PIR sensor connected to P2 ' +
    'should detect movement and switch on a Neopixel strip connected to P1.'
};
