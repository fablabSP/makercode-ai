# MakerCode AI

An AI coding tutor for Arduino, ESP32 and BBC micro:bit projects. Learners
describe what they want to build, and the app produces a plan, a parts list,
pin assignments, wiring steps, code, testing steps and debugging guidance.
It can also run in Socratic Mode, where it asks questions instead of handing
over the answer.

Static single page app. No build step, no Node, no framework. HTML, CSS and
plain ES modules only, so it drops straight onto GitHub Pages.

## Run it locally

ES modules need a real HTTP server. Opening `index.html` with a `file://` URL
will not work.

```bash
git clone https://github.com/YOUR-USERNAME/makercode-ai.git
cd makercode-ai
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Any static server works: `npx serve`, `php -S localhost:8080`, the VS Code Live
Server extension, or a GitHub Codespace with port 8080 forwarded.

## Put it on GitHub

Create an empty repository on GitHub first, called `makercode-ai`. Do not add a
README or licence when creating it, or the first push will be rejected.

Then from this folder:

```bash
git init
git add .
git commit -m "MakerCode AI first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/makercode-ai.git
git push -u origin main
```

### Turn on Pages

Two ways. Pick one.

**Branch deploy, simplest.** Settings, then Pages. Source: Deploy from a
branch. Branch `main`, folder `/ (root)`. Save. Wait about a minute.

**Actions deploy.** Settings, then Pages. Source: GitHub Actions. The included
`.github/workflows/deploy.yml` then publishes on every push to `main`. Use this
if you want deploys to show up as a build you can watch and roll back. If you
are using branch deploy, delete that file.

Either way the site lands at:

```
https://YOUR-USERNAME.github.io/makercode-ai/
```

All paths are relative, so it works from that subfolder with no changes.

`.nojekyll` is included so GitHub serves the files as they are rather than
running them through Jekyll.

### After you push an update

The service worker caches the app shell, so a returning user sees the old files
once and the new ones on their next visit. To push a change out immediately,
bump `CACHE` in `sw.js`, for example `makercode-ai-v2`. Anyone testing can also
hard reload with Ctrl+Shift+R.

### Pointing the extension at your site

If you use the optional browser extension, edit `appUrl` in
`extension/background.js` and `extension/popup.js` to your Pages address before
loading it.

## Get an API key

The app talks directly to the Gemini API from the browser. Each person needs
their own key.

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account and create an API key.
3. In MakerCode AI, open Settings and paste it in.
4. Press Test key. It should say "Key works."

The key is stored in that browser's `localStorage` and is sent only to Google.
It is never sent anywhere else and nothing is logged on a server.

### For teachers running a class

- Give every student their own key. One shared key hits its rate limit fast
  with a class of 20 or more, and everyone gets 429 errors at once.
- On shared lab machines, tell students to press Forget key in Settings at the
  end of the lesson, or use a private window.
- The free tier is enough for a normal lesson. Pick a lighter model in Settings
  if you want answers to come back faster and cost less.
- Without a key the app still runs and shows a built-in offline example. That
  is enough to demo it on a projector before students set up their own keys.
- A browser-held key can be read by anyone with access to that browser profile.
  For anything beyond classroom use, put a small proxy in front of the API and
  keep the key on the server.

## Changing the model

The model name lives in one place, `config.js`:

```js
export const GEMINI = {
  model: 'gemini-3.8-flash',
  ...
};
```

Model IDs retire, so when requests start failing with a 404, change this value.
Users can also pick from `modelChoices` in Settings without touching the code.

## What is in each file

| File | What it does |
| --- | --- |
| `index.html` | Layout, dialogs, ARIA structure |
| `styles.css` | Theme tokens, three panel layout, responsive rules |
| `app.js` | UI wiring, rendering, editor, serial, settings |
| `config.js` | Model name, endpoint, response schema, storage keys |
| `board-profiles.js` | Board pin data, component library, pin validator |
| `gemini-service.js` | The only file that calls the API |
| `socratic-engine.js` | Question sequence, hint escalation, solution gate |
| `project-store.js` | localStorage, export and import |
| `microbit-connection.js` | Web Serial connection and serial console |
| `sw.js` | Service worker for offline use |
| `manifest.webmanifest` | PWA manifest |
| `extension/` | Optional Manifest V3 browser extension |
| `.nojekyll` | Tells GitHub Pages to serve files as they are |
| `.github/workflows/deploy.yml` | Optional Pages deploy on push |

## How the AI part works

Every request sends the model a system instruction built from the real board
profile: the actual pin list with capabilities, current limits, logic level and
the known traps for that board. It asks for JSON in a fixed shape, which the app
renders field by field into the workspace tabs. Raw JSON is never shown.

The response is then checked locally by `validatePins`, which is not AI. It
looks for:

- the same pin assigned to two components
- analogue input requested on a pin with no ADC
- PWM requested on a pin that cannot do PWM
- pin names that do not exist on the selected board
- input-only and strapping pins used as outputs
- I2C and serial pins used for something else
- components that need their own power supply and a shared ground
- likely voltage mismatches, for example a 5 V HC-SR04 on a 3.3 V board
- current budgets, for example Neopixel strips

So even when the model gets a pin wrong, the app catches it and says so.

## Socratic Mode

**On by default.** The assistant does not give answers straight away. It works through ten
questions: trigger, input, decision, output, structure, component, pin, test,
edge case, improvement. One question at a time.

Hints escalate. First press gives a small hint, second gives a stronger one,
third gives a partial worked example. Show solution stays locked until the
learner has typed at least one real attempt.

To change it:

- **Per project**, use the toggle in the top bar. Switching it off gives full
  solutions with the reasoning behind them.
- **For every new project**, uncheck "Start in Socratic Mode" in Settings. That
  also switches the project you have open, so it is the one place to turn it off
  if you are demonstrating on a projector and want complete answers.

Existing saved projects keep whichever mode they were saved with.

## What this app does not do

These limits are deliberate, and the interface says so rather than pretending
otherwise.

- **It does not compile.** Code is always labelled "Not yet compiled". Nothing
  claims to be verified. Add a compilation backend later if you need one; the
  status chip and code panel are already structured for it.
- **It does not flash the board.** Download the file and open it in MakeCode,
  the MicroPython editor or the Arduino IDE. The serial connection reads and
  writes the serial port only.
- **It cannot confirm wiring is safe from a photo.** Image analysis lists what
  it can see and flags what is unclear, and it labels uncertain observations as
  uncertain.

## Connecting a micro:bit

Press Connect micro:bit on the Serial Monitor tab. This uses Web Serial, which
needs Chrome, Edge or Opera on a desktop. Firefox and Safari do not support it,
and the app says so with instructions for downloading the file instead.

Serial output can be sent straight into the chat with Send to assistant, which
is the fastest way to debug a program that runs but misbehaves.

## Install as an app (PWA)

Open the site in Chrome or Edge and use Install from the address bar. The shell
is cached, so the interface, saved projects and the offline example work without
a network. API calls still need a connection.

## Browser extension (optional)

The `extension/` folder is a Manifest V3 extension with a popup for quick
questions while working in MakeCode or the Arduino IDE.

1. Edit `appUrl` in `extension/background.js` and `extension/popup.js` to point
   at your deployed site.
2. Chrome, then `chrome://extensions`, turn on Developer mode.
3. Load unpacked, and select the `extension` folder.
4. Open the popup, click options page, and add your API key.

## Accessibility

Keyboard navigation throughout, arrow keys move between workspace tabs, visible
focus rings, ARIA labels on controls and live regions on the chat and status
areas. Status is never carried by colour alone; every state has a text label.
Reduced motion is respected both from the OS setting and from a toggle in
Settings. Text size is adjustable.

## Data and privacy

- Projects, settings and the API key are stored in `localStorage` in that
  browser. Nothing is sent to any server run by this project.
- Prompts and any uploaded images go to Google's Gemini API. Nothing else does.
- Export and import moves projects between machines as a JSON file.
- Clear Project Data in Settings deletes everything, including the key.
- Do not put names or other personal information in prompts, and do not upload
  images with identifiable students in them without consent and approval.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Blank page, console shows a CORS or module error | You opened the file directly. Serve it over HTTP. |
| "That model name was not found" | The model ID retired. Change `GEMINI.model` in `config.js`. |
| "Rate limit reached" | Too many requests on one key. Give each student their own. |
| "That API key was rejected" | Re-copy the key, or make a new one in AI Studio. |
| Connect button does nothing | Web Serial needs Chrome or Edge on a desktop. |
| "The port is already in use" | Close the MakeCode tab or any other serial monitor. |
| Editor has no syntax colours | Monaco could not load from the CDN. The plain fallback still works. |
| Projects vanished | localStorage is per browser and per profile. Private windows clear on close. |
| Pushed a change but the site looks the same | Service worker cache. Bump `CACHE` in `sw.js`, or hard reload with Ctrl+Shift+R. |
| Pages shows a 404 | Give it a minute after enabling, and check the branch and folder are `main` and `/ (root)`. |

## Adding a compilation backend later

`gemini-service.js` is the only network boundary, and the compile status chip is
driven from one place in `app.js`. To add real compilation, add a service module
alongside it, post the code to your compiler endpoint, and set the chip to
success only on a real compiler response. The rule to keep: never show
"Compile successful" without a compiler having actually said so.

## Licence

MIT.
