# MakerCode AI

An AI coding assistant for Arduino, ESP32, ESP8266 and BBC micro:bit projects.
Learners describe what they want to build, and it produces a plan, a parts list,
pin assignments, wiring steps, code, testing steps and debugging guidance.

Socratic mode is the default: it asks questions and works through the problem
with the learner instead of handing over the answer.

**One HTML file. No modules, no build step, no server.** Everything runs in the
browser and each person uses their own free Gemini API key.

## Try it

Double click `index.html`. That is the whole install.

It also works from any web server, and from GitHub Pages.

## Put it on GitHub

Create an empty repository on GitHub called `makercode-ai`. Do not tick "add a
README" or the first push gets rejected.

```bash
git init
git add .
git commit -m "MakerCode AI"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/makercode-ai.git
git push -u origin main
```

Then Settings, then Pages. Source: Deploy from a branch. Branch `main`, folder
`/ (root)`. Save and wait about a minute.

Your site: `https://YOUR-USERNAME.github.io/makercode-ai/`

If you would rather deploy through Actions so you can watch and roll back
builds, set Source to GitHub Actions instead and the included
`.github/workflows/deploy.yml` takes over. Using branch deploy? Delete that
file.

`.nojekyll` is included so GitHub serves the files as they are.

### After you push an update

The service worker caches the app, so a returning user sees the old version once
and the new one on their next visit. To push a change out straight away, bump
`CACHE` in `sw.js` to `makercode-ai-v3`. Testing yourself? Hard reload with
Ctrl+Shift+R.

## Get an API key

The app talks to Google's Gemini API directly from the browser, so everyone uses
their own key.

1. Open https://aistudio.google.com/apikey and sign in with a Google account.
2. Create an API key and copy it.
3. Paste it into MakerCode AI when it asks, or in Settings later.
4. Press Test key.

The key is stored in that browser's localStorage. It goes to Google and nowhere
else. There is no account and no server holding anyone's work.

### Running a class

- Give every student their own key. One shared key hits its rate limit within
  minutes with a class of 20, and everyone gets 429 errors at once.
- On shared lab machines, have students press Forget key in Settings before they
  leave, or use a private window.
- The free tier covers a normal lesson. Pick a lighter model in Settings for
  faster and cheaper answers.
- A key held in a browser can be read by anyone with access to that browser
  profile. That is fine for classroom use. For anything wider, put a small proxy
  in front of the API and keep the key on the server.

## Supported boards

| Board | Mounted on |
| --- | --- |
| Arduino UNO | breadboard |
| Arduino Nano | breadboard, usually pushed straight in |
| ESP32-WROOM-32U DevKitC V4 | breadboard, needs a full size one |
| ESP32-C3 Super Mini | its expansion board |
| ESP32-CAM | breadboard, plus a USB to serial adapter |

Each board carries its real pin list, capabilities, current limits, logic level
and the traps specific to it. That data goes to the model with every request and
is also used locally to check the answer.

Profiles for UNO R4 WiFi, Mega 2560, ESP32 DEVKIT V1, C3 OLED 0.42, S3 N16R8,
NodeMCU V3, Wemos D1 Mini, ESP-01, micro:bit V1 and V2 are still in the file but
hidden. To show them all, set `showAllBoards: true` in `FEATURES`. To show one,
delete `hidden: true` from its `reg({ ... })` entry.

### Breadboard versus expansion board

Each board says how it is normally wired, and that goes into the prompt so the
advice matches. The Super Mini is the odd one out: it sits on an expansion
board, and there is no public pinout drawing for that board. The assistant is
told never to invent expansion board labels, to give every connection as the
GPIO number printed on the Super Mini itself, and to tell the learner to trace
each expansion board socket back to that GPIO before wiring.

## The three modes

Buttons above the message box, and a default you can set in Settings.

- **Socratic** (default). Ten questions, one at a time, in a fixed order:
  trigger, input, decision, output, structure, component, pin, test, edge case,
  improvement. Most are multiple choice and ask the learner to predict a
  behaviour ("the button is pressed, what happens to the LED?"), read a
  consequence, or spot a fault. Some are open questions in their own words.

  **There is no way to skip to the code.** No Show solution button, no Show one
  step. Once all ten are answered the complete commented program is written
  automatically, built on the learner's own answers, saying things like "you
  said the light stays on for 20 seconds, so that is the number in the timer".

  Progress is earned, not counted. A wrong answer stays on the same question and
  the assistant comes at the idea from a different angle, so ten answered means
  ten understood. After three tries on one question it moves on anyway, so
  nobody gets stuck in a loop.

- **Build**. The complete solution with reasoning, testing steps and debugging
  guidance.
- **Ask**. Short answers with no project plan attached.

## My answers

Every question and answer is stored on the chat, word for word. The My answers
panel shows each one with the options, which the learner picked, which was
correct, and why. Ask about this on any entry sends it back to the assistant
with the exact wording, so the explanation is about the real question rather
than a reconstruction of it. That is the self-revision part: a learner can come
back a week later and work out why an answer was right.

Two things protect accuracy, because a saved record that teaches something wrong
is worse than no record:

- The assistant is told that every question is saved for revision, that the
  correct option must be checkably correct for the selected board, that no
  question may have two defensible answers, and that it should not build a
  question on a fact it is unsure of.
- If the stated correct answer does not match any of the options, the app
  refuses to grade it. The question becomes an open one instead of quietly
  marking a learner wrong against a broken key.

## The circuit drawing

The Diagram panel draws the circuit from the pin table: the board on the left,
components on the right, a red board power rail across the top and a grey ground
rail across the bottom. Signal wires are coloured and labelled at both ends with
the component pin and the board pin.

Two details that matter more than they look:

- Anything the model marks as needing its own supply gets a **separate amber
  rail**, never the board power rail, with a dashed line showing that the two
  grounds still have to be joined. A drawing that quietly told a student to run
  a Neopixel strip off the Arduino 5V pin would undo the safety warnings.
- A wire to a pin that does not exist on the selected board is drawn **dashed in
  red** with a question mark.

Download drawing saves it as an SVG, so it can go into a worksheet or a report.

It is a wiring guide, not a schematic, and it is not to scale.

## The pin checker

This part is not AI. After the model answers, the app checks its pin table
against the real board profile and flags:

- the same pin assigned to two components
- analogue input requested on a pin with no ADC
- PWM requested on a pin that cannot do it
- pin names that do not exist on the selected board
- input-only pins used as outputs, and strapping pins that break boot
- I2C and serial pins used for something else
- components that need their own supply and a shared ground
- voltage mismatches, such as a 5 V HC-SR04 on a 3.3 V board
- current budgets, such as Neopixel strips

So when the model gets a pin wrong, the app contradicts it and says why.

## When something goes wrong

Errors are explained rather than just reported. A 500 or 503 says plainly that
the fault is at Google's end and that the key, the question and the app are all
fine. A 429 explains that the free tier limit was hit and that a shared class
key will do this constantly.

Requests that fail with 429, 500, 502, 503, 504 or a dropped connection are
retried automatically twice, backing off, before the learner sees anything. If
it still fails, a Try again button resends the same message without retyping it.

## What it does not do

Deliberate limits. The interface says so rather than pretending.

- **It does not compile.** Code is always marked "Not compiled". Nothing claims
  to be verified.
- **It does not flash your board.** Download the file and open it in MakeCode,
  the MicroPython editor or the Arduino IDE. The serial monitor reads and writes
  the serial port only.
- **It cannot confirm wiring is safe from a photo.** Image analysis says what it
  can see and labels anything unclear as uncertain.

## Teacher controls

Students have no mode buttons. Click the MakerCode AI logo in the top left, or
open Settings, and there is a Teacher controls box:

- **Mode.** Socratic, Build or Ask, for the whole app.
- **Let students switch mode themselves.** Off by default. Turning it on puts the
  three mode buttons back above the message box.

There is no password on it. If you are handing machines to a class and want it
properly locked, the honest options are to set it once per machine, or to add a
PIN check on `#btn-teacher`, which is a few lines.

## Turning things on and off

Near the top of the script:

```js
var FEATURES = {
  serialMonitor: false,      // Web Serial panel
  showAllBoards: false,      // every board profile, not just the five in use
  questionsBeforeCode: 10,   // questions to answer before the code is written
  maxTriesPerQuestion: 3     // tries on one question before it moves on anyway
};
```

Set `questionsBeforeCode` lower for a shorter lesson. The serial monitor is
hidden but the code is still there, so flipping that flag brings the panel
back.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The entire application: markup, styles, script and the board photos |
| `sw.js` | Service worker, for offline use and installing as an app |
| `manifest.webmanifest` | PWA manifest |
| `icons/` | App icons |
| `.nojekyll` | Tells GitHub Pages to serve files as they are |
| `.github/workflows/deploy.yml` | Optional Pages deploy on push |

Inside `index.html` the script is in labelled sections: config and feature
flags, board photos, board illustrations, board profiles, component library,
storage, pin validator, socratic engine, gemini service, then the UI (board
picker, circuit diagram, the answer record, quizzes, chat).

Board photos are downscaled to fit a 260 px box, encoded as WebP and embedded as
data URIs. That is about 47 KB in total and keeps the app to one file that works
offline.

## Models and daily quota

Two models, chosen by task, because the ten questions are what eat quota:

| Used for | Default | Why |
| --- | --- | --- |
| The ten questions | Gemini 3.5 Flash-Lite | Runs ten-plus times per project. Cheapest, fastest, highest allowance. |
| The final program, Build, Ask | Gemini 3.5 Flash | Runs once per project. Best of the Flash line at coding. |

Ten cheap calls plus one good call costs far less quota than eleven good ones,
and puts the quality where it actually matters. Both are changeable in Settings.

Available options:

| Model | ID | Allowance | Notes |
| --- | --- | --- | --- |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | highest | Fastest and cheapest, built for high volume |
| Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite` | high | Stronger reasoning than 3.5 Lite, still cheap |
| Gemma 4 31B | `gemma-4-31b-it` | own quota | Open weights, Apache 2.0, can be self-hosted |
| Gemini 3.5 Flash | `gemini-3.5-flash` | lower | Best at coding |
| Gemini Flash (latest) | `gemini-flash-latest` | lower | Rolling alias, moves without warning |
| Gemini 3.1 Flash Live | n/a | not usable | Live API model, see below |

### About those allowances

They are a **relative guide, not a promise**. Google stopped publishing a
per-model free-tier RPD figure in its rate limits documentation. The page now
says limits depend on your tier and account, that they can be viewed in AI
Studio, and that "specified rate limits are not guaranteed". Free tier quotas
were also cut sharply at the end of 2025, and third-party articles quoting exact
RPD numbers disagree with each other by a factor of six.

So the app does two honest things instead of printing a number it cannot verify:

- Links you to your own [AI Studio rate limit page](https://aistudio.google.com/rate-limit),
  which is the only authoritative source for your account.
- Counts the requests it has sent since midnight Pacific, which is when Google's
  daily quota resets, and shows the running total next to the model picker.
  That is measured, not guessed. It tells you what you have used, not what you
  have left.

Check your real numbers before a lesson.

### Why Gemini 3.1 Flash Live is listed but disabled

It is a **Live API** model, built for real-time voice dialogue over a websocket
session. This app sends a normal `generateContent` request over HTTPS. The two
are different transports, so selecting it would fail every time. It is left in
the list, greyed out with the reason, rather than quietly dropped.

### Changing the defaults

Near the top of the script:

```js
var GEMINI = {
  model: 'gemini-3.5-flash-lite',   // the ten questions
  codeModel: 'gemini-3.5-flash',    // the final program
  ...
```

Model IDs retire. Test key and model in Settings checks the key, and Check this
model works checks the code model, so you can confirm both before a lesson
rather than finding out mid-class.

## Accessibility

Keyboard navigation throughout, visible focus rings, ARIA labels on controls, a
live region on the chat. No status is carried by colour alone. Reduced motion is
respected from the OS setting and from a toggle in Settings. Text size is
adjustable.

## Privacy

- Chats, settings and the API key stay in the browser's localStorage.
- Prompts and any uploaded images go to Google's Gemini API. Nothing else leaves
  the machine.
- Export and import moves chats between machines as a JSON file.
- Clear all data in Settings deletes everything, including the key.
- Do not put personal information in prompts, and do not upload photos with
  identifiable students without consent and approval.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "That model name was not found" | The model ID retired. Change `GEMINI.model`. |
| "Rate limit reached" | Too many requests on one key. Give each student their own. |
| "That API key was rejected" | Re-copy the key, or make a new one in AI Studio. |
| "Gemini is overloaded" or a server error | Google's end, not yours. It retried twice already. Press Try again, or pick a lighter model. |
| Editor has no syntax colours | The rich editor loads from a CDN and could not reach it. The plain editor still works, and you can turn the rich one off in Settings. |
| Chats vanished | localStorage is per browser and per profile. Private windows clear on close. |
| Pushed a change but the site looks the same | Service worker cache. Bump `CACHE` in `sw.js`, or hard reload. |
| Pages shows a 404 | Wait a minute after enabling, and check branch `main` and folder `/ (root)`. |

## Licence

MIT.
