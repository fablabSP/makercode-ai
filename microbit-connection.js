/**
 * microbit-connection.js — Web Serial link to a micro:bit.
 *
 * This reads and writes the serial port only. It does NOT flash the board.
 * Nothing in this file may ever report that code has been flashed or compiled.
 */

const MICROBIT_USB_VENDOR_ID = 0x0d28;
const BAUD_RATE = 115200;
const MAX_BUFFER_LINES = 500;

export const STATES = {
  unsupported: 'unsupported',
  disconnected: 'disconnected',
  connecting: 'connecting',
  connected: 'connected',
  error: 'error'
};

export class MicrobitConnection extends EventTarget {
  constructor() {
    super();
    this.state = this.isSupported() ? STATES.disconnected : STATES.unsupported;
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.lines = [];
    this._partial = '';
    this._keepReading = false;
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  browserAdvice() {
    const ua = navigator.userAgent || '';
    if (this.isSupported()) return '';
    if (/Firefox/i.test(ua)) {
      return 'Firefox does not support Web Serial. Use Chrome, Edge or Opera on a desktop, or download the file and use the MakeCode editor.';
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return 'iOS browsers cannot open a serial port. Download the file and transfer it to the micro:bit from a desktop computer.';
    }
    if (/Safari/i.test(ua)) {
      return 'Safari does not support Web Serial. Use Chrome or Edge on a desktop, or download the file and use the MakeCode editor.';
    }
    return 'This browser does not support Web Serial. Use Chrome or Edge on a desktop computer.';
  }

  _set(state, detail = {}) {
    this.state = state;
    this.dispatchEvent(new CustomEvent('state', { detail: { state, ...detail } }));
  }

  _emitLine(line) {
    this.lines.push({ text: line, at: Date.now() });
    if (this.lines.length > MAX_BUFFER_LINES) this.lines.splice(0, this.lines.length - MAX_BUFFER_LINES);
    this.dispatchEvent(new CustomEvent('line', { detail: { text: line } }));
  }

  /** Must be called from a user gesture — the browser requires it. */
  async connect() {
    if (!this.isSupported()) {
      this._set(STATES.unsupported, { message: this.browserAdvice() });
      return false;
    }

    this._set(STATES.connecting);
    try {
      this.port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: MICROBIT_USB_VENDOR_ID }]
      });
      await this.port.open({ baudRate: BAUD_RATE });

      const info = this.port.getInfo ? this.port.getInfo() : {};
      this._set(STATES.connected, { info });

      this._keepReading = true;
      this._readLoop();

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }
      return true;
    } catch (err) {
      if (err && err.name === 'NotFoundError') {
        // The user closed the picker without choosing anything.
        this._set(STATES.disconnected, { message: 'No device was selected.' });
        return false;
      }
      this._set(STATES.error, {
        message: this._friendlyError(err)
      });
      return false;
    }
  }

  _friendlyError(err) {
    const msg = String(err && err.message ? err.message : err);
    if (/already open|in use|Failed to open/i.test(msg)) {
      return 'The port is already in use. Close the MakeCode editor tab or any other serial monitor and try again.';
    }
    if (/denied|SecurityError/i.test(msg)) {
      return 'Permission to open the port was denied. Click Connect again and pick the micro:bit in the list.';
    }
    return `Could not open the port. ${msg}`;
  }

  async _readLoop() {
    const decoder = new TextDecoderStream();
    const closed = this.port.readable.pipeTo(decoder.writable).catch(() => {});
    this.reader = decoder.readable.getReader();

    try {
      while (this._keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value) continue;

        this._partial += value;
        const parts = this._partial.split(/\r?\n/);
        this._partial = parts.pop();
        parts.forEach((line) => this._emitLine(line));
      }
    } catch (err) {
      if (this._keepReading) {
        this._set(STATES.error, { message: 'The connection dropped. Check the USB cable.' });
      }
    } finally {
      try { this.reader.releaseLock(); } catch { /* ignore */ }
      await closed;
    }
  }

  async send(text) {
    if (this.state !== STATES.connected || !this.writer) return false;
    try {
      await this.writer.write(new TextEncoder().encode(text.endsWith('\n') ? text : text + '\n'));
      return true;
    } catch {
      this._set(STATES.error, { message: 'Could not send data to the board.' });
      return false;
    }
  }

  async disconnect() {
    this._keepReading = false;
    try { if (this.reader) await this.reader.cancel(); } catch { /* ignore */ }
    try { if (this.writer) { this.writer.releaseLock(); this.writer = null; } } catch { /* ignore */ }
    try { if (this.port) await this.port.close(); } catch { /* ignore */ }
    this.port = null;
    this._set(STATES.disconnected);
  }

  clearBuffer() {
    this.lines = [];
    this._partial = '';
    this.dispatchEvent(new CustomEvent('cleared'));
  }

  /** Recent serial text, for pasting into the chat when debugging. */
  recentText(limit = 40) {
    return this.lines.slice(-limit).map((l) => l.text).join('\n');
  }
}

export const connection = new MicrobitConnection();
