const WebSocket = require("ws");
const fs = require("fs");
const crc32 = require("crc/lib/crc32");
const long = require("long");
const dgram = require("dgram");

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

const wss = new WebSocket.Server({
  port: config.localPort,
  server: "127.0.0.1",
});
const clients = new Set();
wss.on("connection", (client) => {
  clients.add(client);
  send(
    "hello",
    {
      pin,
      players: Object.keys(players),
    },
    client
  );
  client.on("close", () => {
    clients.delete(client);
  });
});
const ws = new WebSocket(config.server);
function broadcast(op, data) {
  for (const client of clients) {
    try {
      send(op, data, client);
    } catch (err) {
      console.warn("Issue broadcasting, termianting client");
      client.terminate();
    }
  }
}
function send(op, data, client) {
  (client || ws).send(
    JSON.stringify({
      op,
      d: data,
    })
  );
}

ws.on("open", () => {
  send("hello", {
    type: "dolphin",
  });
});
ws.on("message", (frame) => {
  const data = JSON.parse(frame);
  HANDLERS[data.op](data.d);
});

const players = {};
let seq = 0;

const reporting = new Map();

function generate(playerId) {
  const connection = reporting.get(playerId);
  if (!connection) {
    console.log("No connection for " + playerId);
    return;
  }
  // console.log("Generating packet for " + playerId + " port=" + connection.port);
  const packet = Buffer.alloc(80);
  packet[0] = playerId;
  packet[1] = 2;
  packet[2] = 2;
  packet[3] = 2;
  packet[10] = 0x05;
  // Outgoing packet
  packet[11] = 1;
  packet.writeUInt32LE(seq++, 12);
  const player = players[playerId];
  if (!player) {
    // console.log("No player", playerId);
    return;
  }
  const buttons = player.buttons;
  const axes = player.axes;
  packet[16] =
    buttons.start |
    (buttons.l3 << 1) |
    (buttons.r3 << 2) |
    (buttons.select << 3) |
    (buttons.up << 4) |
    (buttons.right << 5) |
    (buttons.down << 6) |
    (buttons.left << 7);
  packet[17] =
    buttons.l2 |
    (buttons.r2 << 1) |
    (buttons.l1 << 2) |
    (buttons.r1 << 3) |
    (buttons.one << 4) |
    (buttons.a << 5) |
    (buttons.b << 6) |
    (buttons.two << 7);

  // dpad
  packet[24] = buttons.left ? 255 : 0;
  packet[25] = buttons.down ? 255 : 0;
  packet[26] = buttons.right ? 255 : 0;
  packet[27] = buttons.up ? 255 : 0;
  // buttons
  packet[28] = buttons.one ? 255 : 0;
  packet[29] = buttons.b ? 255 : 0;
  packet[30] = buttons.a ? 255 : 0;
  packet[31] = buttons.two ? 255 : 0;

  // Motion timestamp
  if (player.timestamp) {
    packet.writeUInt32LE(player.timestamp.low, 48);
    packet.writeUInt32LE(player.timestamp.high, 52);
  }

  if (axes.accelerometer) {
    packet.writeFloatLE(axes.accelerometer.x, 56);
    packet.writeFloatLE(axes.accelerometer.y, 60);
    packet.writeFloatLE(axes.accelerometer.z, 64);
  }

  if (axes.gyroscope) {
    packet.writeFloatLE(axes.gyroscope.x, 68);
    packet.writeFloatLE(axes.gyroscope.y, 72);
    packet.writeFloatLE(axes.gyroscope.z, 76);
  }

  const packed = pack(0x100002, packet);
  // console.log(" T:PadInfo", playerId);
  // Send twice for crc reasons?
  server.send(packed, 0, packed.length, connection.port, connection.address);
  server.send(packed, 0, packed.length, connection.port, connection.address);
}

setInterval(() => {
  for (const playerId of reporting.keys()) {
    if (players[playerId]) {
      generate(playerId);
    }
  }
}, 250);

let pin = null;
const HANDLERS = {
  hello(data) {
    pin = data.pin;
    console.log("We have pin " + data.pin);
  },
  connect(data) {
    players[data.player] = {buttons: {}, axes: {}, timestamp: null};
    broadcast("connect", {player: data.player});
    console.log(
      `Controller ${data.player} is now connected by client ${data.clientId}`
    );
  },
  disconnect(data) {
    delete players[data.player];
    broadcast("disconnect", {player: data.player});
    console.log(
      `Controller ${data.player} has been removed by client ${data.clientId}`
    );
  },
  button(data) {
    players[data.player].buttons[data.button] = data.state;
    console.log(
      `Controller ${data.player}'s ${data.button} is now ${data.state}`
    );
    generate(data.player);
  },
  stick(data) {
    if (data.axis == "accelerometer") {
      players[data.player].timestamp = long.fromNumber(data.t, true);
    }
    players[data.player].axes[data.axis] = {x: data.x, y: data.y, z: data.z};
  },
};

const serverId = Math.floor(Math.random() * Math.pow(2, 32));

function pack(type, content) {
  const length = content.length;
  // Header
  const buffer = Buffer.alloc(20);
  // magic
  buffer.write("DSUS", 0, 4);
  // protocol version
  buffer.writeUInt16LE(1001, 4);
  // Length (+4 is event type)
  buffer.writeUInt16LE(length + 4, 6);
  // CRC32
  // (must be left blank because of CRC)
  // Server ID
  buffer.writeUInt32LE(serverId, 12);
  // event type
  buffer.writeUInt32LE(type, 16);

  const result = Buffer.concat([buffer, content], length + 20);
  // CRC
  const crc = crc32(result);
  result.writeUInt32LE(crc, 8);
  return result;
}

const server = dgram.createSocket("udp4");
server.bind(26760, "0.0.0.0");
server.on("message", (msg, rinfo) => {
  const type = msg.readUInt32LE(16, 16);
  // console.log("Got a message:", type.toString(16));
  switch (type) {
    case 0x100001: {
      // console.log("R :PortInfo");
      const count = msg.readInt32LE(20);
      // console.log("Got a request for info on device count:", count);
      let last = null;
      for (let i = 0; i < count; ++i) {
        const controllerData = Buffer.alloc(12);
        const controller = msg[24 + i];
        const player = players[controller];
        controllerData[0] = controller; // pad id
        controllerData[1] = player ? 2 : 0; // State (connected)

        controllerData[2] = 2; // Full gyro
        controllerData[3] = player ? 2 : 0; // connection = bluetooth
        // Battery
        controllerData[10] = 0x05;
        const packed = pack(0x100001, controllerData);
        // console.log(" T:PortInfo", controller);
        server.send(packed, 0, packed.length, rinfo.port, rinfo.address);
      }
      break;
    }
    case 0x100002: {
      // console.log("R :PadInfo");
      if (msg[21] == 0) {
        for (let i = 0; i < 4; ++i) {
          reporting.set(i, rinfo);
        }
      } else if (msg[21] == 1) {
        reporting.set(msg[22], rinfo);
      }

      for (const playerId of reporting.keys()) {
        generate(playerId);
      }
      break;
    }
  }
});

async function fifoSend(player, data) {
  console.log("Sending", data, "along fifo");
  await fs.promises.appendFile(config.socket + "-" + player, data + "\n");
}
