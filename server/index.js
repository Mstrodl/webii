const fs = require("fs");
const WebSocket = require("ws");

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

const wss = new WebSocket.Server({port: config.port, host: "0.0.0.0"});
const sessions = new Map();

const CLOSE_CODES = {
  BAD_PIN: 4001,
  KICKED: 4002,
  ROOM_FULL: 4003,
  BAD_FORMAT: 4004,
  DOLPHIN_DIED: 4005,
};

wss.on("connection", (ws) => {
  console.log("Client");
  ws.once("message", (frame) => {
    const data = JSON.parse(frame);
    if (data.op != "hello") {
      ws.close(CLOSE_CODES.BAD_OP);
    } else {
      if (!data.d) {
        console.log(data, "Bad format");
        return ws.close(CLOSE_CODES.BAD_FORMAT);
      }
      const type = data.d.type;
      if (type == "dolphin") {
        const dolphin = new Dolphin(ws);
        sessions.set(dolphin.pin, dolphin);
        console.log("Created session", dolphin.pin);
      } else if (type == "client") {
        console.log("Connection with", data.d.pin);
        const dolphin = sessions.get(data.d.pin);
        if (!dolphin) {
          return ws.close(CLOSE_CODES.BAD_PIN);
        }
        const client = new Client(dolphin, ws);
        console.log("Created client");
      }
    }
  });
});

const CHARACTERS = "abcdefghijklmnopqrstuvwxyz";
function generatePin() {
  while (true) {
    let pin = "";
    for (let i = 0; i < 5; ++i) {
      pin += CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    }
    if (!sessions.has(pin)) {
      return pin;
    }
  }
}

class Dolphin {
  constructor(ws) {
    this.ws = ws;
    this.ws.on("message", (frame) => {
      const data = JSON.parse(frame);
      this["on" + data.op[0].toUpperCase() + data.op.substring(1)](data.d);
    });

    this.ws.on("pong", () => {
      this.ws.isAlive = true;
    });
    this.interval = setInterval(() => {
      if (this.ws.isAlive === false) {
        this.ws.terminate();
      }
      this.ws.isAlive = false;
      this.ws.ping(() => {});
    }, 30000);

    this.players = new Array(4);
    this.pin = generatePin();
    this.CLIENT_COUNT = 0;
    this.send("hello", {
      pin: this.pin,
    });
    this.ws.on("close", () => {
      this.sessions.delete(this.pin);
      clearInterval(this.interval);
    });
  }

  send(op, data) {
    this.ws.send(
      JSON.stringify({
        op,
        d: data,
      })
    );
  }

  attachPlayer(client) {
    for (let index = 0; index < this.players.length; ++index) {
      console.log("Checking", index, this.players[index]);
      if (!this.players[index]) {
        this.players[index] = client;
        console.log("All good");
        return index;
      }
    }
    return null;
  }

  onDisconnect(data) {
    for (const index in this.players) {
      if (
        this.players[index] &&
        this.players[index].clientId == data.clientId
      ) {
        this.players[index].close(CLOSE_CODES.KICKED);
        this.players[index] = null;
      }
    }
  }
}

class Client {
  constructor(server, ws) {
    this.server = server;
    this.ws = ws;
    this.ws.on("pong", () => {
      this.ws.isAlive = true;
    });
    this.interval = setInterval(() => {
      if (this.ws.isAlive === false) {
        this.ws.terminate();
      }
      this.ws.isAlive = false;
      this.ws.ping(() => {});
    }, 30000);
    this.clientId = ++this.server.CLIENT_COUNT;
    this.ws.on("message", (frame) => {
      // console.log(this.server.pin, "<-", frame);
      const data = JSON.parse(frame);
      this["on" + data.op[0].toUpperCase() + data.op.substring(1)](data.d);
    });
    this.ws.once("close", (code) => {
      clearInterval(this.interval);
      delete this.server.players[this.player];
      this.server.send("disconnect", {
        player: this.player,
      });
    });
    this.server.ws.once("close", () => {
      this.close(CLOSE_CODES.DOLPHIN_DIED);
    });

    this.player = this.server.attachPlayer(this);
    if (this.player === null) {
      this.close(CLOSE_CODES.ROOM_FULL);
    } else {
      this.send("hello", {
        player: this.player,
        clientId: this.clientId,
      });
      this.server.send("connect", {
        player: this.player,
        clientId: this.clientId,
      });
    }
  }

  send(op, data) {
    this.ws.send(
      JSON.stringify({
        op,
        d: data,
      })
    );
  }

  close(code) {
    this.ws.close(code);
  }

  onButton(data) {
    if (this.player !== null) {
      this.server.send("button", {
        player: this.player,
        button: data.button,
        state: data.state,
      });
    }
  }

  onStick(data) {
    if (this.player !== null) {
      if (data.axis == "accelerometer") {
        //console.log(data);
      }
      this.server.send("stick", {
        player: this.player,
        axis: data.axis,
        x: data.x,
        y: data.y,
        z: data.z,
        t: data.t,
      });
    }
  }
}
