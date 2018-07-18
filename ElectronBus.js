/**
 * Electron Bus
 * A message bus for Electron
 *
 * @package electron-bus
 */

"use strict";

const clone = require("lodash.clonedeep");
const {ipcMain, ipcRenderer, BrowserWindow} = require("electron");
const {MessageEnvelope} = require("./MessageEnvelope.js");

/**
 * ElectronBus
 * The message bus class handles distributing messages locally and to remote endpoints
 *
 * @author Mike Hall
 * @copyright Mike Hall
 */
class ElectronBus {

    /**
     * constructor()
     * Set up the message bus
     */
    constructor(remote) {

        // Channels is a map, keyed by channel name, containing the Set of subscribers for that channel
        Object.defineProperty(this, "channels", {value: new Map()});

        // Remotes is a list of remote endpoints we should relay messages to
        Object.defineProperty(this, "remotes", {value: new Set()});

        // If we are a worker, attach the global object as a remote now.
        // This is how we will communicate with the main thread.
        if (this.isRenderer) {
            this.remotes.add(ipcRenderer);
            ipcRenderer.on(ElectronBus.CHANNEL, this.onRemoteMessage.bind(this));
        } else if (remote) {
            this.attach(remote);
        }
    }

    /**
     * get CHANNEL()
     * Static getter for the internal channel name
     *
     * @static
     * @return {string}
     */
    static get CHANNEL() {
        return "electron-bus--message";
    }

    /**
     * get isRenderer()
     * Getter to test if this process is a renderer process
     *
     * @return {boolean}
     */
    get isRenderer() {
        return Boolean(process && process.type && process.type === "renderer");
    }

    /**
     * isBrowserWindow()
     * Detects if the supplied argument is an electron BrowserWindow
     *
     * @param {object} w
     * @return {boolean} true if w is a BrowserWindow
     */
    isBrowserWindow(w) {
        return Boolean(BrowserWindow && w instanceof BrowserWindow);
    }

    /**
     * subscribe()
     * Attach a callback function to a message channel
     *
     * @param {string} channel
     * @param {function} callback
     * @return {object} subscription
     */
    subscribe(channel, callback) {

        // Create a channel on the fly it none exists
        if (this.channels.has(channel) === false) {
            this.channels.set(channel, new Set());
        }

        // Add a new subscriber to this channel
        const subscribers = this.channels.get(channel);
        subscribers.add(callback);

        // Return a subscription object, including an unsubscribe method
        return {unsubscribe: _ => this.unsubscribe(channel, callback)};
    }

    /**
     * unsubscribe()
     * Remove a callback function from a message channel
     *
     * @param {string} channel
     * @param {function} callback
     */
    unsubscribe(channel, callback) {

        // If this channel doesn't exist, there is nothing to do
        if (this.channels.has(channel) === false) {
            return;
        }

        // Load the channel and remove the subscriber
        const subscribers = this.channels.get(channel);
        subscribers.delete(callback);

        // If there are no subscribers left, remove the channel
        if (subscribers.size === 0) {
            this.channels.delete(channel);
        }
    }

    /**
     * onRemoteMessage()
     * Called when a message is received from a remote source
     *
     * @param {EventEmitter} ignore
     * @param {object} data
     */
    onRemoteMessage(ignore, data) {

        // Ignore messages which are not intended for us
        if (MessageEnvelope.isEnvelope(data) === false) {
            return;
        }

        // Unpack the payload and dispatch locally only
        const {channel, payload, returnChannel} = data;
        this.localDispatch(channel, payload, returnChannel);
    }

    /**
     * localDispatch()
     * Dispatch a message to local subscribers only
     *
     * @async
     * @param {string} channel
     * @param {*} payload
     */
    async localDispatch(channel, payload, returnChannel) {

        // Cannot send a message to a channel which doesn't exist
        if (this.channels.has(channel) === false) {
            return;
        }

        // Send a message to each subscriber in this channel
        for (const callback of this.channels.get(channel)) {
            callback(clone(payload), returnChannel);
        }
    }

    /**
     * dispatch()
     * Put a message on the bus
     *
     * @async
     * @param {string} channel
     * @param {*} payload
     * @param {object} options
     * @param {boolean} options.waiting - Is the dispatcher waiting for a reply?
     * @param {boolean} options.timeout - How long is the dispatcher prepared to wait?
     */
    dispatch(channel, payload, options = {}) {
        return new Promise((resolve, reject) => {

            let returnChannel;

            // Unpack known options
            const {waiting, timeout} = Object(options);

            if (waiting) {

                // The dispatcher has indicated that they're going to wait for a reply
                // So we are going to generate a one-time return channel and wait for a response
                // on that channel before resolving this Promise and letting dispatcher know the result

                // We have to declare the timer here so it is visible within the responder closure
                // We have to init to a value, otherwise the linter complains we should use a const.
                let timer = 0;

                // Generate a random channel for the return path
                returnChannel = `${channel}-${parseInt(Number.MAX_SAFE_INTEGER * Math.random(), 10).toString(36)}`;

                // Listen for messages on the return path
                const returnPath = this.subscribe(returnChannel, response => {
                    clearTimeout(timer);
                    returnPath.unsubscribe();
                    resolve(response);
                });

                // If no message appears on the return path within `timeout` milliseconds (default to 15000)
                // then reject this Promise with time out error
                timer = setTimeout(_ => {
                    returnPath.unsubscribe();
                    reject(new Error("Time out"));
                }, timeout || 15000);

            } else {
                resolve();
            }

            // Dispatch the message locally first
            this.localDispatch(channel, payload, returnChannel);

            // Then relay to any remotes we know about
            for (const remote of this.remotes) {
                const message = new MessageEnvelope(channel, payload, returnChannel);
                remote.send(ElectronBus.CHANNEL, message);
            }
        });
    }

    /**
     * attach()
     * Add a browser window as a remote
     *
     * @param {BrowserWindow} remote
     * @throws Error
     */
    attach(remote) {

        if (this.isBrowserWindow(remote) === false) {
            throw new Error("Remote must be an instance of BrowserWindow");
        }

        this.remotes.add(remote.webContents);
        ipcMain.on(ElectronBus.CHANNEL, this.onRemoteMessage.bind(this));
    }
}

// Export public API
Object.assign(exports, {ElectronBus});
