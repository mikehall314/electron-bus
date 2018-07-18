# electron-bus
A message bus for Electron applications, allowing simple communication between the background and renderer processes.

## What is a message bus?
A message bus is a method of loosely-coupled communication between different parts of an application. Messages can be published to the bus, and modules can  subscribe to receive messages from the bus. This can be useful for inter-process communication, logging, alerts, and other events which cut across a system.

## Why use a message bus pattern in Electron?
Messages published to the bus can be received by listener in the background, or on the renderer, which allows code dealing with those messages to be moved freely between those systems without having to do a major restructure.  It also abstracts Electron's strange heterogeneous IPC methods away, hopefully making your systems easier to reason about.

# Installation
```npm install electron-bus```

# Usage
```js
// From the background process
const {BrowserWindow} = require("electron");
const {ElectronBus} = require("electron-bus");

const win = new BrowserWindow({width: 800, height: 600});
const bus = new ElectronBus(win);

// Listen for logging events
bus.subscribe("log", data => console.log(new Date(), data));
```

```js
// From the renderer process
const {ElectronBus} = require("electron-bus");
const bus = new ElectronBus(); // Automatically connects to the background process

// This message will be received and logged by the background process
bus.dispatch("log", "Started Renderer Process");
```

# Message Responses
You can wait for a response to a particular message, by passing ```{waiting: true}``` when you dispatch a message. This will return a Promise which resolves when a response to your message is received. If no response is forthcoming, the Promise will reject automatically after 15 seconds. You can change the timeout by passing a ```timeout``` parameter along with ```waiting```, e.g. ```{waiting: true, timeout: 5000}``` would wait for 5 seconds before timeout.
```js
const {ElectronBus} = require("electron-bus");
const bus = new ElectronBus();

bus.subscribe("responding-channel", (data, returnChannel) => {
    const response = doSomethingWith(data);
    if (returnChannel) {
        bus.dispatch(returnChannel, response);
    }
});

try {
    const response = await bus.dispatch("responding-channel", {hello: "World!"}, {waiting: true});
    console.log(response); // The output of doSomethingWith()
} catch (e) {
    console.error(e);
}
```
## Gotchas
Execution order can mean that some messages distributed before all the subscribers are set up. It's probably best practice to set up your subscribers first, before starting to dispatch events.

# To Do
- Some automated testing, probably with Travis integration
- Rewrite these docs, as they're confused and unclear. Bah.
