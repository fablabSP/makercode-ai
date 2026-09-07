/**
 * Board profiles and component library.
 *
 * Pin capability data here drives the pin validator in app.js, so keep it
 * accurate. `caps` values: digital, analog (ADC), pwm, touch, i2c, spi, serial,
 * inputOnly.
 */

const p = (name, caps, note = '') => ({ name, caps, note });

export const BOARDS = {
  'microbit-v2': {
    id: 'microbit-v2',
    family: 'microbit',
    name: 'micro:bit V2',
    logic: 3.3,
    pinCurrentMax: 5,
    boardCurrentMax: 90,
    languages: ['makecode-blocks', 'makecode-js', 'makecode-ts', 'micropython'],
    defaultLanguage: 'makecode-blocks',
    builtIn: [
      '5x5 LED display', 'Button A', 'Button B', 'Logo touch', 'Accelerometer',
      'Compass', 'Temperature', 'Light level', 'Microphone', 'Speaker',
      'Radio', 'Bluetooth'
    ],
    notes: [
      'Runs at 3.3 V. Never feed 5 V into a pin.',
      'Total current drawn from the 3V pad should stay under about 90 mA.',
      'Neopixels and servos usually need their own power supply plus a shared ground.'
    ],
    pins: [
      p('P0', ['digital', 'analog', 'pwm', 'touch'], 'Large pad. Also the default speaker pin on V2.'),
      p('P1', ['digital', 'analog', 'pwm', 'touch'], 'Large pad, free to use.'),
      p('P2', ['digital', 'analog', 'pwm', 'touch'], 'Large pad, free to use.'),
      p('P3', ['digital', 'analog', 'pwm'], 'Shared with the LED display. Turn the display off before using it.'),
      p('P4', ['digital', 'analog', 'pwm'], 'Shared with the LED display.'),
      p('P5', ['digital'], 'Shared with Button A.'),
      p('P6', ['digital'], 'Shared with the LED display.'),
      p('P7', ['digital'], 'Shared with the LED display.'),
      p('P8', ['digital', 'pwm'], 'Free general purpose pin.'),
      p('P9', ['digital'], 'Shared with the LED display.'),
      p('P10', ['digital', 'analog', 'pwm'], 'Shared with the LED display and light sensing.'),
      p('P11', ['digital'], 'Shared with Button B.'),
      p('P12', ['digital', 'pwm'], 'Reserved for accessibility, but usable.'),
      p('P13', ['digital', 'spi'], 'SPI SCK.'),
      p('P14', ['digital', 'spi'], 'SPI MISO.'),
      p('P15', ['digital', 'spi'], 'SPI MOSI.'),
      p('P16', ['digital', 'pwm'], 'Free general purpose pin.'),
      p('P19', ['i2c'], 'I2C SCL. Do not use for general input or output.'),
      p('P20', ['i2c'], 'I2C SDA. Do not use for general input or output.'),
      p('3V', [], 'Power out, 3.3 V.'),
      p('GND', [], 'Ground.')
    ]
  },

  'microbit-v1': {
    id: 'microbit-v1',
    family: 'microbit',
    name: 'micro:bit V1',
    logic: 3.3,
    pinCurrentMax: 5,
    boardCurrentMax: 90,
    languages: ['makecode-blocks', 'makecode-js', 'makecode-ts', 'micropython'],
    defaultLanguage: 'makecode-blocks',
    builtIn: [
      '5x5 LED display', 'Button A', 'Button B', 'Accelerometer', 'Compass',
      'Temperature', 'Light level', 'Radio', 'Bluetooth'
    ],
    notes: [
      'No microphone, speaker or logo touch. Those need V2.',
      'Less RAM than V2. Large Neopixel strips or long sound files may not fit.',
      'Runs at 3.3 V.'
    ],
    pins: [
      p('P0', ['digital', 'analog', 'pwm', 'touch'], 'Large pad.'),
      p('P1', ['digital', 'analog', 'pwm', 'touch'], 'Large pad.'),
      p('P2', ['digital', 'analog', 'pwm', 'touch'], 'Large pad.'),
      p('P3', ['digital', 'analog', 'pwm'], 'Shared with the LED display.'),
      p('P4', ['digital', 'analog', 'pwm'], 'Shared with the LED display.'),
      p('P5', ['digital'], 'Shared with Button A.'),
      p('P6', ['digital'], 'Shared with the LED display.'),
      p('P7', ['digital'], 'Shared with the LED display.'),
      p('P8', ['digital', 'pwm'], 'Free general purpose pin.'),
      p('P9', ['digital'], 'Shared with the LED display.'),
      p('P10', ['digital', 'analog', 'pwm'], 'Shared with the LED display and light sensing.'),
      p('P11', ['digital'], 'Shared with Button B.'),
      p('P12', ['digital', 'pwm'], 'Reserved for accessibility, but usable.'),
      p('P13', ['digital', 'spi'], 'SPI SCK.'),
      p('P14', ['digital', 'spi'], 'SPI MISO.'),
      p('P15', ['digital', 'spi'], 'SPI MOSI.'),
      p('P16', ['digital', 'pwm'], 'Free general purpose pin.'),
      p('P19', ['i2c'], 'I2C SCL.'),
      p('P20', ['i2c'], 'I2C SDA.'),
      p('3V', [], 'Power out, 3.3 V.'),
      p('GND', [], 'Ground.')
    ]
  },

  'arduino-uno': {
    id: 'arduino-uno',
    family: 'arduino',
    name: 'Arduino Uno',
    logic: 5,
    pinCurrentMax: 20,
    boardCurrentMax: 200,
    languages: ['arduino-cpp'],
    defaultLanguage: 'arduino-cpp',
    builtIn: ['Built-in LED on D13', 'Hardware serial on D0 and D1'],
    notes: [
      '5 V logic. A 3.3 V sensor may need a level shifter.',
      'Keep each pin under about 20 mA and the whole board under about 200 mA.',
      'D0 and D1 are the USB serial pins. Using them breaks uploading.'
    ],
    pins: [
      p('D0', ['digital', 'serial'], 'Serial RX. Avoid unless you know why.'),
      p('D1', ['digital', 'serial'], 'Serial TX. Avoid unless you know why.'),
      p('D2', ['digital'], 'Interrupt capable.'),
      p('D3', ['digital', 'pwm'], 'Interrupt capable.'),
      p('D4', ['digital'], ''),
      p('D5', ['digital', 'pwm'], ''),
      p('D6', ['digital', 'pwm'], ''),
      p('D7', ['digital'], ''),
      p('D8', ['digital'], ''),
      p('D9', ['digital', 'pwm'], 'Common servo pin.'),
      p('D10', ['digital', 'pwm', 'spi'], 'SPI SS.'),
      p('D11', ['digital', 'pwm', 'spi'], 'SPI MOSI.'),
      p('D12', ['digital', 'spi'], 'SPI MISO.'),
      p('D13', ['digital', 'spi'], 'SPI SCK and the built-in LED.'),
      p('A0', ['digital', 'analog'], ''),
      p('A1', ['digital', 'analog'], ''),
      p('A2', ['digital', 'analog'], ''),
      p('A3', ['digital', 'analog'], ''),
      p('A4', ['digital', 'analog', 'i2c'], 'I2C SDA.'),
      p('A5', ['digital', 'analog', 'i2c'], 'I2C SCL.'),
      p('5V', [], 'Power out.'),
      p('3V3', [], 'Power out, limited current.'),
      p('GND', [], 'Ground.'),
      p('VIN', [], 'Unregulated input.')
    ]
  },

  'arduino-nano': {
    id: 'arduino-nano',
    family: 'arduino',
    name: 'Arduino Nano',
    logic: 5,
    pinCurrentMax: 20,
    boardCurrentMax: 200,
    languages: ['arduino-cpp'],
    defaultLanguage: 'arduino-cpp',
    builtIn: ['Built-in LED on D13', 'Hardware serial on D0 and D1'],
    notes: [
      'Same chip as the Uno in a smaller board.',
      'A6 and A7 read analogue values only. They cannot be digital pins.'
    ],
    pins: [
      p('D0', ['digital', 'serial'], 'Serial RX.'),
      p('D1', ['digital', 'serial'], 'Serial TX.'),
      p('D2', ['digital'], 'Interrupt capable.'),
      p('D3', ['digital', 'pwm'], 'Interrupt capable.'),
      p('D4', ['digital'], ''),
      p('D5', ['digital', 'pwm'], ''),
      p('D6', ['digital', 'pwm'], ''),
      p('D7', ['digital'], ''),
      p('D8', ['digital'], ''),
      p('D9', ['digital', 'pwm'], ''),
      p('D10', ['digital', 'pwm', 'spi'], 'SPI SS.'),
      p('D11', ['digital', 'pwm', 'spi'], 'SPI MOSI.'),
      p('D12', ['digital', 'spi'], 'SPI MISO.'),
      p('D13', ['digital', 'spi'], 'SPI SCK and the built-in LED.'),
      p('A0', ['digital', 'analog'], ''),
      p('A1', ['digital', 'analog'], ''),
      p('A2', ['digital', 'analog'], ''),
      p('A3', ['digital', 'analog'], ''),
      p('A4', ['digital', 'analog', 'i2c'], 'I2C SDA.'),
      p('A5', ['digital', 'analog', 'i2c'], 'I2C SCL.'),
      p('A6', ['analog', 'inputOnly'], 'Analogue input only.'),
      p('A7', ['analog', 'inputOnly'], 'Analogue input only.'),
      p('5V', [], 'Power out.'),
      p('3V3', [], 'Power out, limited current.'),
      p('GND', [], 'Ground.'),
      p('VIN', [], 'Unregulated input.')
    ]
  },

  'arduino-mega': {
    id: 'arduino-mega',
    family: 'arduino',
    name: 'Arduino Mega 2560',
    logic: 5,
    pinCurrentMax: 20,
    boardCurrentMax: 200,
    languages: ['arduino-cpp'],
    defaultLanguage: 'arduino-cpp',
    builtIn: ['Built-in LED on D13', 'Four hardware serial ports'],
    notes: [
      'Lots of pins, same 5 V logic and current limits as the Uno.',
      'PWM is available on D2 to D13 and D44 to D46.'
    ],
    pins: [
      p('D0', ['digital', 'serial'], 'Serial RX.'),
      p('D1', ['digital', 'serial'], 'Serial TX.'),
      ...Array.from({ length: 12 }, (_, i) =>
        p(`D${i + 2}`, ['digital', 'pwm'], i + 2 <= 3 ? 'Interrupt capable.' : '')),
      p('D14', ['digital', 'serial'], 'Serial3 TX.'),
      p('D15', ['digital', 'serial'], 'Serial3 RX.'),
      p('D16', ['digital', 'serial'], 'Serial2 TX.'),
      p('D17', ['digital', 'serial'], 'Serial2 RX.'),
      p('D18', ['digital', 'serial'], 'Serial1 TX.'),
      p('D19', ['digital', 'serial'], 'Serial1 RX.'),
      p('D20', ['digital', 'i2c'], 'I2C SDA.'),
      p('D21', ['digital', 'i2c'], 'I2C SCL.'),
      ...Array.from({ length: 22 }, (_, i) => p(`D${i + 22}`, ['digital'], '')),
      p('D44', ['digital', 'pwm'], ''),
      p('D45', ['digital', 'pwm'], ''),
      p('D46', ['digital', 'pwm'], ''),
      ...Array.from({ length: 3 }, (_, i) => p(`D${i + 47}`, ['digital'], '')),
      p('D50', ['digital', 'spi'], 'SPI MISO.'),
      p('D51', ['digital', 'spi'], 'SPI MOSI.'),
      p('D52', ['digital', 'spi'], 'SPI SCK.'),
      p('D53', ['digital', 'spi'], 'SPI SS.'),
      ...Array.from({ length: 16 }, (_, i) => p(`A${i}`, ['digital', 'analog'], '')),
      p('5V', [], 'Power out.'),
      p('3V3', [], 'Power out.'),
      p('GND', [], 'Ground.'),
      p('VIN', [], 'Unregulated input.')
    ]
  },

  'esp32-dev': {
    id: 'esp32-dev',
    family: 'esp32',
    name: 'ESP32 dev board (generic)',
    logic: 3.3,
    pinCurrentMax: 12,
    boardCurrentMax: 200,
    languages: ['arduino-cpp', 'micropython'],
    defaultLanguage: 'arduino-cpp',
    builtIn: ['Wi-Fi', 'Bluetooth and BLE', 'Touch pins', 'Hall sensor', 'Deep sleep'],
    notes: [
      '3.3 V logic. A 5 V signal can damage a pin.',
      'GPIO 6 to 11 are wired to the flash chip. Never use them.',
      'GPIO 34 to 39 are input only and have no internal pull-up resistor.',
      'ADC2 pins stop reading analogue values while Wi-Fi is on. Use ADC1 (GPIO 32 to 39) for sensors in Wi-Fi projects.',
      'GPIO 0, 2, 12 and 15 affect boot. A sensor holding them at the wrong level stops the board starting.'
    ],
    pins: [
      p('GPIO0', ['digital', 'pwm', 'touch'], 'Strapping pin. Held low, the board enters flash mode.'),
      p('GPIO2', ['digital', 'pwm', 'analog', 'touch'], 'Strapping pin, often the on-board LED. ADC2.'),
      p('GPIO4', ['digital', 'pwm', 'analog', 'touch'], 'ADC2, unavailable with Wi-Fi on.'),
      p('GPIO5', ['digital', 'pwm', 'spi'], 'Strapping pin, SPI SS.'),
      p('GPIO12', ['digital', 'pwm', 'analog', 'touch'], 'Strapping pin. Must be low at boot. ADC2.'),
      p('GPIO13', ['digital', 'pwm', 'analog', 'touch'], 'ADC2.'),
      p('GPIO14', ['digital', 'pwm', 'analog', 'touch'], 'ADC2.'),
      p('GPIO15', ['digital', 'pwm', 'analog', 'touch'], 'Strapping pin. ADC2.'),
      p('GPIO16', ['digital', 'pwm'], 'Free.'),
      p('GPIO17', ['digital', 'pwm'], 'Free.'),
      p('GPIO18', ['digital', 'pwm', 'spi'], 'SPI SCK.'),
      p('GPIO19', ['digital', 'pwm', 'spi'], 'SPI MISO.'),
      p('GPIO21', ['digital', 'pwm', 'i2c'], 'I2C SDA by default.'),
      p('GPIO22', ['digital', 'pwm', 'i2c'], 'I2C SCL by default.'),
      p('GPIO23', ['digital', 'pwm', 'spi'], 'SPI MOSI.'),
      p('GPIO25', ['digital', 'pwm', 'analog'], 'ADC2 and DAC1.'),
      p('GPIO26', ['digital', 'pwm', 'analog'], 'ADC2 and DAC2.'),
      p('GPIO27', ['digital', 'pwm', 'analog', 'touch'], 'ADC2.'),
      p('GPIO32', ['digital', 'pwm', 'analog', 'touch'], 'ADC1. Safe with Wi-Fi.'),
      p('GPIO33', ['digital', 'pwm', 'analog', 'touch'], 'ADC1. Safe with Wi-Fi.'),
      p('GPIO34', ['analog', 'inputOnly'], 'Input only, ADC1, no pull-up.'),
      p('GPIO35', ['analog', 'inputOnly'], 'Input only, ADC1, no pull-up.'),
      p('GPIO36', ['analog', 'inputOnly'], 'Input only, ADC1, no pull-up.'),
      p('GPIO39', ['analog', 'inputOnly'], 'Input only, ADC1, no pull-up.'),
      p('3V3', [], 'Power out.'),
      p('5V', [], 'Power in or out from USB.'),
      p('GND', [], 'Ground.')
    ]
  }
};

export const BOARD_GROUPS = [
  { label: 'BBC micro:bit', ids: ['microbit-v2', 'microbit-v1'] },
  { label: 'Arduino', ids: ['arduino-uno', 'arduino-nano', 'arduino-mega'] },
  { label: 'ESP32', ids: ['esp32-dev'] }
];

/** Reusable component library. `needs` maps to pin capabilities. */
export const COMPONENTS = {
  led: {
    keywords: ['led', 'lamp', 'light emitting'],
    name: 'LED', needs: ['digital'], power: 'board',
    warnings: ['Always use a resistor in series, usually 220 to 330 ohm.',
      'The long leg is positive.']
  },
  'led-pwm': {
    keywords: ['fade', 'dimm', 'brightness'],
    name: 'LED (brightness controlled)', needs: ['pwm'], power: 'board',
    warnings: ['Needs a PWM capable pin to fade.']
  },
  button: {
    keywords: ['button', 'switch', 'push'],
    name: 'Push button', needs: ['digital'], power: 'board',
    warnings: ['Use a pull-up or pull-down resistor, or enable the internal pull-up in code.',
      'Expect bounce. Add a short delay or a debounce check.']
  },
  potentiometer: {
    keywords: ['potentiometer', 'pot', 'knob', 'dial', 'variable resistor'],
    name: 'Potentiometer', needs: ['analog'], power: 'board',
    warnings: ['Outer legs go to power and ground, the middle leg to the analogue pin.']
  },
  ldr: {
    keywords: ['ldr', 'photoresistor', 'photocell', 'light sensor', 'light level'],
    name: 'Light sensor (LDR)', needs: ['analog'], power: 'board',
    warnings: ['Needs a fixed resistor to form a voltage divider, usually 10k ohm.']
  },
  buzzer: {
    keywords: ['buzzer', 'piezo', 'speaker', 'sounder'],
    name: 'Buzzer', needs: ['pwm'], power: 'board',
    warnings: ['An active buzzer only needs a digital high or low. A passive buzzer needs a tone or PWM signal.']
  },
  servo: {
    keywords: ['servo'],
    name: 'Servo motor', needs: ['pwm'], power: 'external',
    warnings: ['A servo can pull far more current than a board pin can supply.',
      'Power the servo from its own supply and join the grounds.',
      'A stalled servo draws a large current and gets hot.']
  },
  neopixel: {
    keywords: ['neopixel', 'ws2812', 'sk6812', 'addressable', 'led strip', 'rgb strip', 'pixel'],
    name: 'Neopixel / WS2812 strip', needs: ['digital'], power: 'external',
    warnings: ['Each pixel at full white draws roughly 60 mA. Ten pixels can exceed what a board can give.',
      'Use a separate 5 V supply for anything longer than a few pixels and join the grounds.',
      'On a 3.3 V board the data line may need a level shifter for reliable colours.']
  },
  pir: {
    keywords: ['pir', 'motion sensor', 'movement sensor', 'occupancy'],
    name: 'PIR motion sensor', needs: ['digital'], power: 'board',
    warnings: ['Most PIR modules need 5 V to work properly. Check your module before wiring it to a 3.3 V board.',
      'A PIR needs 30 to 60 seconds to settle after power on.',
      'The two small trimmers set sensitivity and how long the output stays high.']
  },
  ultrasonic: {
    keywords: ['ultrasonic', 'hc-sr04', 'hcsr04', 'sonar', 'distance sensor', 'range finder'],
    name: 'Ultrasonic distance sensor (HC-SR04)', needs: ['digital', 'digital'], power: 'board',
    warnings: ['The standard HC-SR04 needs 5 V. Its echo output is 5 V, which can damage a 3.3 V board.',
      'Use an HC-SR04P or a voltage divider on the echo pin for micro:bit and ESP32.',
      'Trigger and echo need two separate pins unless you use a three-pin variant.']
  },
  'temp-analog': {
    keywords: ['lm35', 'tmp36', 'analogue temperature', 'analog temperature'],
    name: 'Analogue temperature sensor (LM35, TMP36)', needs: ['analog'], power: 'board',
    warnings: ['LM35 and TMP36 look identical but have different output formulas. Confirm the part number.']
  },
  'temp-digital': {
    keywords: ['dht11', 'dht22', 'dht', 'ds18b20', 'digital temperature', 'humidity'],
    name: 'Digital temperature sensor (DHT11, DHT22, DS18B20)', needs: ['digital'], power: 'board',
    warnings: ['DHT sensors need a 10k pull-up resistor on the data line.',
      'DHT11 and DHT22 use different libraries and have different accuracy.',
      'DS18B20 uses OneWire and also needs a 4.7k pull-up.']
  },
  oled: {
    keywords: ['oled', 'lcd', 'ssd1306', 'display module', 'screen'],
    name: 'OLED or LCD display (I2C)', needs: ['i2c'], power: 'board',
    warnings: ['Uses the shared I2C bus. Two devices with the same address will clash.',
      'Run an I2C scanner first to confirm the address, often 0x3C or 0x27.']
  },
  relay: {
    keywords: ['relay'],
    name: 'Relay module', needs: ['digital'], power: 'external',
    warnings: ['Do not switch mains voltage in a classroom project.',
      'Many relay modules are active low.',
      'Power the relay coil separately and join the grounds.']
  },
  'motor-driver': {
    keywords: ['motor driver', 'l298', 'tb6612', 'h-bridge', 'dc motor', 'stepper'],
    name: 'Motor driver (L298N, TB6612)', needs: ['pwm', 'digital', 'digital'], power: 'external',
    warnings: ['Never drive a motor straight from a board pin.',
      'Motors need their own supply and a shared ground.',
      'Motors create electrical noise that can reset a board.']
  }
};

export const STARTER_PROJECTS = [
  { id: 'led-button', title: 'LED and button', boards: ['microbit-v2', 'arduino-uno', 'esp32-dev'],
    prompt: 'Turn an LED on and off with a push button. Explain how the input controls the output.' },
  { id: 'dice', title: 'Digital dice', boards: ['microbit-v2', 'microbit-v1'],
    prompt: 'Shake the micro:bit to roll a dice and show the number on the LED display.' },
  { id: 'step-counter', title: 'Step counter', boards: ['microbit-v2', 'microbit-v1'],
    prompt: 'Count steps using the accelerometer and show the total when button A is pressed.' },
  { id: 'rps', title: 'Rock paper scissors', boards: ['microbit-v2', 'microbit-v1'],
    prompt: 'Shake to show rock, paper or scissors on the LED display.' },
  { id: 'reaction', title: 'Reaction timer', boards: ['microbit-v2', 'arduino-uno'],
    prompt: 'Wait a random time, light an LED, then measure how long the user takes to press the button.' },
  { id: 'temp-display', title: 'Temperature display', boards: ['microbit-v2', 'arduino-uno', 'esp32-dev'],
    prompt: 'Read the temperature and show it on the display, updating every few seconds.' },
  { id: 'fall-alert', title: 'Fall alert', boards: ['microbit-v2'],
    prompt: 'Detect a fall with the accelerometer, then play a sound and send a radio alert.' },
  { id: 'corridor-light', title: 'Automatic corridor light', boards: ['microbit-v2', 'esp32-dev'],
    prompt: 'A PIR sensor detects movement and switches on a Neopixel strip for 20 seconds, only when the room is dark.' },
  { id: 'distance-alarm', title: 'Ultrasonic distance alarm', boards: ['microbit-v2', 'arduino-uno'],
    prompt: 'Sound a buzzer faster as an object gets closer to an ultrasonic sensor.' },
  { id: 'servo-door', title: 'Servo controlled door', boards: ['microbit-v2', 'arduino-uno'],
    prompt: 'Open a small door with a servo when a button is pressed, then close it after five seconds.' },
  { id: 'mood-lamp', title: 'Neopixel mood lamp', boards: ['microbit-v2', 'esp32-dev'],
    prompt: 'Change the colour of a Neopixel strip using a potentiometer or the light sensor.' },
  { id: 'radio-remote', title: 'Radio remote control', boards: ['microbit-v2', 'microbit-v1'],
    prompt: 'Use one micro:bit to send radio commands that switch an output on another micro:bit.' },
  { id: 'ai-movement', title: 'AI movement classifier', boards: ['microbit-v2'],
    prompt: 'Collect accelerometer samples for two movements and classify which one is happening.' }
];

export function getBoard(id) {
  return BOARDS[id] || BOARDS['microbit-v2'];
}

export function findPin(boardId, pinName) {
  if (!pinName) return null;
  const board = getBoard(boardId);
  const target = String(pinName).trim().toUpperCase().replace(/\s+/g, '');
  return board.pins.find((pin) => {
    const n = pin.name.toUpperCase();
    return n === target ||
      n.replace('GPIO', '') === target.replace('GPIO', '').replace(/^IO/, '') ||
      n === target.replace(/^PIN/, '');
  }) || null;
}

/* ------------------------------------------------------- pin validation */

export function matchComponent(componentName) {
  const key = String(componentName || '').toLowerCase();
  if (!key.trim()) return null;

  let best = null;
  let bestScore = 0;
  for (const spec of Object.values(COMPONENTS)) {
    for (const word of spec.keywords) {
      if (key.includes(word) && word.length > bestScore) {
        best = spec;
        bestScore = word.length;
      }
    }
  }
  return best;
}

/**
 * Check the pin table the model produced against the real board profile.
 * Returns { level, title, detail }[] — level is err, warn or ok.
 */
const ELECTRICAL_RISK =
  /volt|current|\bmA\b|power|supply|ground|resistor|pull-?up|damage|heat|never|do not|level shift/i;

export function validatePins(pins, boardId) {
  const board = getBoard(boardId);
  const issues = [];
  const used = new Map();

  for (const row of pins) {
    const raw = String(row.boardPin || '').trim();
    if (!raw) continue;

    const isExternal = /external|supply|battery|psu|separate/i.test(raw);
    const isPower = /^(3v3?|5v|vin|vcc)$/i.test(raw);
    const isGround = /^gnd$|ground/i.test(raw);

    if (isExternal) {
      issues.push({
        level: 'warn',
        title: `${row.component} uses a separate supply`,
        detail: 'Join the supply ground to the board ground, or the signal will not work.'
      });
      continue;
    }
    if (isGround || isPower) continue;

    const pin = findPin(boardId, raw);
    if (!pin) {
      issues.push({
        level: 'err',
        title: `${raw} is not a pin on the ${board.name}`,
        detail: `Check the pin name for ${row.component}. Valid pins are listed in the Board panel.`
      });
      continue;
    }

    // duplicate use
    if (used.has(pin.name)) {
      issues.push({
        level: 'err',
        title: `${pin.name} is assigned twice`,
        detail: `${used.get(pin.name)} and ${row.component} are both on ${pin.name}. Move one of them.`
      });
    } else {
      used.set(pin.name, row.component);
    }

    // capability check
    const spec = matchComponent(row.component);
    if (spec) {
      const needsAnalog = spec.needs.includes('analog');
      const needsPwm = spec.needs.includes('pwm');
      const needsI2c = spec.needs.includes('i2c');

      if (needsAnalog && !pin.caps.includes('analog')) {
        issues.push({
          level: 'err',
          title: `${pin.name} cannot read analogue values`,
          detail: `${row.component} needs an analogue input pin. Pick one of: ${
            board.pins.filter((p) => p.caps.includes('analog')).map((p) => p.name).join(', ')}.`
        });
      }
      if (needsPwm && !pin.caps.includes('pwm')) {
        issues.push({
          level: 'err',
          title: `${pin.name} does not support PWM`,
          detail: `${row.component} needs a PWM pin. Pick one of: ${
            board.pins.filter((p) => p.caps.includes('pwm')).map((p) => p.name).join(', ')}.`
        });
      }
      if (needsI2c && !pin.caps.includes('i2c')) {
        issues.push({
          level: 'warn',
          title: `${row.component} normally uses the I2C bus`,
          detail: `On this board that is ${board.pins.filter((p) => p.caps.includes('i2c')).map((p) => p.name).join(' and ')}.`
        });
      }
      if (spec.power === 'external') {
        issues.push({
          level: 'warn',
          title: `${row.component} needs its own power`,
          detail: spec.warnings.find((w) => /power|supply|current/i.test(w)) || 'Do not power it from a board pin.'
        });
      }
    }

    if (pin.caps.includes('inputOnly')) {
      issues.push({
        level: 'warn',
        title: `${pin.name} is input only`,
        detail: 'It cannot drive an output and has no internal pull-up resistor.'
      });
    }
    if (pin.caps.includes('i2c') && !(spec && spec.needs.includes('i2c'))) {
      issues.push({
        level: 'warn',
        title: `${pin.name} is reserved for the I2C bus`,
        detail: 'Using it for something else will break any I2C display or sensor.'
      });
    }
    if (pin.caps.includes('serial')) {
      issues.push({
        level: 'warn',
        title: `${pin.name} is a serial pin`,
        detail: 'Using it can stop the board uploading or printing to the serial monitor.'
      });
    }
    if (/shared with|strapping|Reserved/i.test(pin.note || '')) {
      issues.push({ level: 'warn', title: `${pin.name}: read the note`, detail: pin.note });
    }
  }

  // voltage mismatch guesses
  const names = pins.map((p) => String(p.component).toLowerCase()).join(' ');
  if (board.logic === 3.3 && /(hc-?sr04|ultrasonic|sonar|pir|motion sensor|relay)/.test(names)) {
    issues.push({
      level: 'warn',
      title: 'Possible voltage mismatch',
      detail: `The ${board.name} runs at 3.3 V. Standard HC-SR04, PIR and relay modules expect 5 V and can output 5 V back into a pin.`
    });
  }
  if (/neopixel|ws2812|sk6812|led strip|pixel/.test(names)) {
    issues.push({
      level: 'warn',
      title: 'Check the current budget',
      detail: `Each pixel can draw about 60 mA at full white. The ${board.name} can supply roughly ${board.boardCurrentMax} mA in total.`
    });
  }

  // Component-specific notes, once per component rather than once per wire.
  const seen = new Set();
  for (const row of pins) {
    const spec = matchComponent(row.component);
    if (!spec || seen.has(spec.name)) continue;
    seen.add(spec.name);
    for (const warning of spec.warnings) {
      // Electrical risks belong in Checks. Build tips stay in the Parts tab.
      if (!ELECTRICAL_RISK.test(warning)) continue;
      if (issues.some((i) => i.detail === warning)) continue;
      issues.push({ level: 'warn', title: spec.name, detail: warning });
    }
  }

  if (pins.length && !issues.some((i) => i.level === 'err')) {
    issues.unshift({
      level: 'ok',
      title: 'No pin conflicts found',
      detail: 'Still check every wire against the table before powering up.'
    });
  }
  return issues;
}
