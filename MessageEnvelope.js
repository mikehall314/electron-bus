/**
 * Electron Bus
 * A message bus for Electron
 *
 * @package electron-bus
 */

"use strict";

/**
 * MessageEnvelope
 * A simple envelope to encapsulate messages moving across IPC
 *
 * @author Mike Hall
 * @copyright Mike Hall
 */
class MessageEnvelope {

    /**
     * constructor()
     * Set up a message envelope
     *
     * @param {string} channel - The name of the channel for this message
     * @param {object} payload - The data for this message
     * @param {string} returnChannel - The name of the channel for this message
     */
    constructor(channel, payload, returnChannel) {
        Object.defineProperty(this, "type", {writable: false, enumerable: true, value: MessageEnvelope.TYPE});
        Object.defineProperty(this, "channel", {writable: false, enumerable: true, value: channel});
        Object.defineProperty(this, "payload", {writable: false, enumerable: true, value: payload});
        Object.defineProperty(this, "returnChannel", {writable: false, enumerable: true, value: returnChannel});
    }

    /**
     * get TYPE()
     * Static getter for an identifier for this envelope
     *
     * @static
     * @return {string}
     */
    static get TYPE() {
        return "electron-bus--message-envelope";
    }

    /**
     * isEnvelope()
     * Duck-types an object as one of our envelopes
     *
     * @static
     * @param {object} o
     * @return {boolean}
     */
    static isEnvelope(o) {
        return Boolean(o && o.type && o.type === MessageEnvelope.TYPE);
    }
}

// Export public API
Object.assign(exports, {MessageEnvelope});
