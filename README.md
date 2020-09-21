# Webii
A system allowing anyone to enjoy zero-contact Wii with their friends!

## Setup

### Build the web interface

1. Install dependencies:

```
cd web
pnpm i --shamefully-hoist
```

2. Create `config.json` with your server URL:

```json
{
  "server": "ws://localhost:5454"
}
```

3. Build the project

```bash
node_modules/.bin/parcel build index.html
```

### Run the dispatch server

1. Install dependencies:

```bash
cd server
pnpm i
```

2. Create `config.json` with the server port:

```json
{
  "port": 5454
}
```

3. Run the server:

```
node index.js
```

### Run the Dolphin server

1. Install dependencies:

```bash
cd dolphin
pnpm i
```

2. Create `config.json` with your server URL:

```json
{
  "server": "ws://localhost:5454"
}
```

3. Run the server:

```bash
node index.js
```

## Setting up Dolphin
1. With Dolphin, connect to the DSU server in Dolphin in `Controls` > `Alternate Input Sources`. Tick the `Enable` box and add the server (should be `127.0.0.1:26760`).
2. For every Wii remote in the list, select `Emulated Wii Remote`
3. Click `Configure` on `Wii Remote 1`
4. Select controller 0 of the DSU server in the dropdown in the top-left
5. Click every button in the list and bind it by pushing the corresponding button on your mobile device
6. Make sure you have `None` selected for `Extension`
7. Open the `Motion Input` tab
8. Right click every empty button and select the corresponding input from the list. This is a long manual process.
9. At the top right, type a name on the `Profile` dropdown and click `Save`
10. Close the configuration window
11. Open Wii Remotes 2-4, select your saved profile, click `Load`, and select the correct numbered DSUClient input device in the top-left

## Using
Once you have the Dolphin server running, users can open the web interface and type the pin that was shown to gain control of a Wii remote.

## Future ideas
At some point, I'd like to explore having the client use WebRTC for message passing instead of WebSockets for reduced latency, but the current WebSocket approach was chosen due to WebRTC sometimes being blocked by some corporate firewalls.
