import * as icons from "./icons.jsx";
import config from "./config.json";
import React, {useState, useEffect} from "react";
import GyroNorm from "gyronorm/dist/gyronorm.complete.min.js";

export function App() {
  const [pin, setPin] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Pin can be included in link for QR codes
    if (location.hash.length > 1) {
      setPin(location.hash.substring(1));
    }
  }, []);

  let child = null;
  if (!pin) {
    return <PinPicker setPin={(pin) => setPin(pin)} error={error} />;
  } else {
    return (
      <Controller
        pin={pin}
        setError={(error) => {
          setError(error);
          setPin(null);
        }}
      />
    );
  }

  return <div className="app">{child}</div>;
}

function PinPicker({setPin, error}) {
  const [tempPin, setTempPin] = useState("");
  return (
    <div className="pin-picker">
      {error && <div className="error">{error}</div>}
      <input
        type="text"
        className="pin"
        onChange={(event) => setTempPin(event.currentTarget.value)}
        value={tempPin}
        placeholder="Game Pin"
      />
      <button
        type="button"
        className="join-btn"
        onClick={() => setPin(tempPin)}
      >
        Join Game
      </button>
    </div>
  );
}

class Client {
  constructor(pin, ready) {
    this.ws = new WebSocket(config.server);
    this.ws.addEventListener("open", () => {
      this.send("hello", {
        type: "client",
        pin: pin,
      });
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      console.log(msg, this);
      if (msg.op == "hello") {
        this.player = msg.d.player;
        ready();
      }
    });
  }

  send(op, data) {
    this.ws.send(JSON.stringify({op, d: data}));
  }

  button(button, state) {
    this.send("button", {
      button,
      state,
    });
  }

  axis(axis, {x, y, z}) {
    this.send("stick", {
      axis,
      x,
      y,
      z,
    });
  }
}

function Button({type, client, children}) {
  const Icon = icons[type];
  return (
    <g
      className={`button button-${type}`}
      onMouseDown={(event) => {
        event.preventDefault();
        client.button(type, true);
      }}
      onMouseUp={(event) => {
        event.preventDefault();
        client.button(type, false);
      }}
      onTouchStart={(event) => {
        event.preventDefault();
        client.button(type, true);
      }}
      onTouchEnd={() => {
        event.preventDefault();
        client.button(type, false);
      }}
    >
      {children}
    </g>
  );
}

const errors = {
  4001: "Bad Pin Provided",
  4002: "You were kicked",
  4003: "Room is full",
  4004: "Internal error: bad format",
  4005: "Session was closed",
};

function Controller({setError, pin}) {
  const [connected, setConnected] = useState(false);
  const [client, setClient] = useState(null);
  const [granted, setGranted] = useState(
    typeof DeviceOrientationEvent == "undefined" ||
      typeof DeviceOrientationEvent.requestPermission != "function"
  );
  const [prompting, setPrompting] = useState(false);
  useEffect(() => {
    const client = new Client(pin, () => {
      setConnected(true);
    });
    setClient(client);
    const closeListener = (event) => {
      setError(
        errors[event.code] ||
          "You may have had a network error. Try reconnecting. Error code: " +
            event.code
      );
    };
    client.ws.addEventListener("close", closeListener);
    return () => {
      client.ws.removeEventListener("close", closeListener);
      client.ws.close();
    };
  }, [pin]);
  useEffect(() => {
    if (connected && granted) {
      let running = true;
      const gn = new GyroNorm();
      gn.init()
        .then(() => {
          gn.start((data) => {
            if (running) {
              client.axis("accelerometer", {
                // 1g = 9.8m/s²
                x: data.dm.gx / 9.8,
                y: data.dm.gz / 9.8,
                z: -data.dm.gy / 9.8,
                t: Date.now(),
              });
              client.axis("gyroscope", {
                // (Degrees / sec)
                x: data.dm.alpha, // Pitch
                y: data.dm.beta, // Yaw
                z: data.dm.gamma, // Roll
              });
            }
          });
        })
        .catch((err) => {
          alert(
            "It seems like your hardware might not have an accelerometer! You can still play, but won't have tilt controls. Error: " +
              (err.message || err)
          );
          console.error("No gyro support?", err);
        });
      return () => {
        running = false;
        gn.stop();
      };
    } else if (!granted && connected) {
      setPrompting(true);
    }
  }, [connected, granted]);

  if (!connected) {
    return "Connecting...";
  }
  console.log(client.player);
  return (
    <div className="controller">
      {prompting && (
        <div className="modal-contain">
          <div className="modal">
            <div className="text">
              Before we can get you playing, we need permission to get motion
              data from your device so we can tell the game how the controller
              is moving!
            </div>
            <div className="contain">
              <button
                type="button"
                onClick={() =>
                  DeviceOrientationEvent.requestPermission().then((state) => {
                    setPrompting(false);
                    setGranted(state == "granted");
                  })
                }
              >
                Okay!
              </button>
            </div>
          </div>
        </div>
      )}
      <svg
        width="36.113mm"
        height="148.58mm"
        version="1.1"
        viewBox="0 0 36.113 148.58"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(-62.997 -97.765)">
          <rect
            x="63.272"
            y="98.04"
            width="35.562"
            height="148.03"
            ry="6.3718"
            fill="#f2f2f4"
            stroke="#000"
            strokeLinecap="round"
            strokeLinejoin="bevel"
            strokeWidth=".551"
          />
          <Button client={client} type="one">
            <g id="button-one">
              <circle
                cx="81.923"
                cy="206.99"
                r="4.2259"
                fill="#eee"
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="bevel"
                strokeWidth=".551"
              />
              <text
                transform="translate(7.1623 6.1117)"
                fill="#000000"
                fontFamily="sans-serif"
                fontSize="4.2333px"
                letterSpacing="0px"
                wordSpacing="0px"
                style={{
                  lineHeight: 1.25,
                  shapeInside: "url(#rect110)",
                  whiteSpace: "pre",
                }}
              >
                <tspan x="73.376953" y="202.42129">
                  <tspan style={{shapeInside: "url(#rect110)"}}>1</tspan>
                </tspan>
              </text>
            </g>
          </Button>
          <Button client={client} type="b">
            <g id="button-b">
              <rect
                fill="#eee"
                x="76.602"
                y="181.95"
                width="10.642"
                height="12.522"
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="bevel"
                strokeWidth=".48353"
              />

              <text
                transform="translate(7.0362 -12.668)"
                fill="#000000"
                fontFamily="sans-serif"
                fontSize="4.2333px"
                letterSpacing="0px"
                wordSpacing="0px"
                style={{
                  lineHeight: 1.25,
                  shapeInside: "url(#rect1208)",
                  whiteSpace: "pre",
                }}
              >
                <tspan x="73.376953" y="202.42129">
                  <tspan style={{shapeInside: "url(#rect1208)"}}>B</tspan>
                </tspan>
              </text>
            </g>
          </Button>
          <Button client={client} type="power">
            <circle
              id="button-power"
              cx="72.7"
              cy="104.95"
              r="2.7422"
              fill="#a00"
            />
          </Button>
          <Button client={client} type="up">
            <g
              id="button-up"
              transform="translate(-.058556)"
              fill="none"
              stroke="#000"
              strokeWidth=".551"
            >
              <path
                fill="#eee"
                d="m79.073 113.48v2.8781l2.8936 3.7522 2.9458-3.4997v-3.1165z"
              />
              <path d="m81.993 114.34v3.5106" />
            </g>
          </Button>
          <Button client={client} type="down">
            <g
              id="button-down"
              transform="translate(-.058556)"
              fill="none"
              stroke="#000"
              strokeWidth=".551"
            >
              <path
                fill="#eee"
                d="m79.073 130.85v-2.8781l2.8936-4.0916 2.9458 3.8392v3.1165z"
              />
              <path d="m81.993 125.98v3.5106" />
            </g>
          </Button>
          <Button client={client} type="left">
            <g
              id="button-left"
              transform="translate(-.058556)"
              fill="none"
              stroke="#000"
              strokeWidth=".551"
            >
              <path
                fill="#eee"
                d="m73.045 118.98h3.0626l4.1329 2.8936-4.0649 2.9458h-3.1165z"
              />
              <path d="m77.928 121.9h-3.5106" />
            </g>
          </Button>
          <Button client={client} type="right">
            <g
              id="button-right"
              transform="translate(-.058556)"
              fill="none"
              stroke="#000"
              strokeWidth=".551"
            >
              <path
                fill="#eee"
                d="m90.919 118.98h-3.0626l-4.1329 2.8936 4.0649 2.9458h3.1165z"
              />
              <path d="m89.57 121.9h-3.5106" />
            </g>
          </Button>
          <Button client={client} type="two">
            <g transform="translate(-.03899)" id="button-two">
              <circle
                fill="#eee"
                cx="81.962"
                cy="220.22"
                r="4.2259"
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="bevel"
                strokeWidth=".551"
              />
              <text
                transform="translate(7.2954 19.369)"
                fill="#000000"
                fontFamily="sans-serif"
                fontSize="4.2333px"
                letterSpacing="0px"
                wordSpacing="0px"
                style={{
                  lineHeight: 1.25,
                  shapeInside: "url(#rect120)",
                  whiteSpace: "pre",
                }}
              >
                <tspan x="73.376953" y="202.42129">
                  <tspan style={{shapeInside: "url(#rect120)"}}>2</tspan>
                </tspan>
              </text>
            </g>
          </Button>
          <Button client={client} type="a">
            <g id="button-a" transform="translate(-.32894)">
              <circle
                fill="#eee"
                cx="82.252"
                cy="144.22"
                r="5.7947"
                stroke="#000"
                strokeLinecap="round"
                strokeLinejoin="bevel"
                strokeWidth=".551"
              />
              <text
                transform="translate(8.0708 6.5068)"
                fill="#000000"
                fontFamily="sans-serif"
                fontSize="4.2333px"
                letterSpacing="0px"
                wordSpacing="0px"
                style={{
                  lineHeight: 1.25,
                  shapeInside: "url(#rect124)",
                  whiteSpace: "pre",
                }}
              >
                <tspan x="72.734375" y="139.25527">
                  <tspan style={{shapeInside: "url(#rect124)"}}>A</tspan>
                </tspan>
              </text>
            </g>
          </Button>
          <Button client={client} type="start">
            <g
              id="button-start"
              transform="translate(-.072498)"
              fill="none"
              stroke="#000"
            >
              <circle
                cx="91.988"
                cy="168.68"
                r="3.0358"
                fill="#eee"
                strokeLinecap="round"
                strokeLinejoin="bevel"
                strokeWidth=".551"
              />
              <path d="m91.988 166.65v4.0554" strokeWidth=".26458px" />
              <path d="m94.015 168.68h-4.0554" strokeWidth=".26458px" />
            </g>
          </Button>
          <Button client={client} type="select">
            <g id="button-select" fill="none" stroke="#000">
              <circle
                cx="71.98"
                cy="168.79"
                r="3.0848"
                fill="#eee"
                strokeLinecap="round"
                strokeLinejoin="bevel"
                strokeWidth=".551"
              />
              <path d="m74.008 168.79h-4.0554" strokeWidth=".26458px" />
            </g>
          </Button>
          <Button client={client} type="home">
            <circle
              id="button-home"
              cx="81.923"
              cy="168.79"
              r="3.0848"
              fill="none"
              stroke="#000"
              strokeLinecap="round"
              strokeLinejoin="bevel"
              strokeWidth=".551"
            />
          </Button>
          <g id="player-lights">
            <rect
              x="69.725"
              y="236.02"
              width="3.2643"
              height="3.3562"
              fill={client.player >= 0 ? LED_ON : LED_OFF}
            />
            <rect
              x="75.924"
              y="236.02"
              width="3.2643"
              height="3.3562"
              fill={client.player >= 1 ? LED_ON : LED_OFF}
            />
            <rect
              x="82.919"
              y="236.02"
              width="3.2643"
              height="3.3562"
              fill={client.player >= 2 ? LED_ON : LED_OFF}
            />
            <rect
              x="89.118"
              y="236.02"
              width="3.2643"
              height="3.3562"
              fill={client.player >= 3 ? LED_ON : LED_OFF}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

const LED_ON = "#37abc8";
const LED_OFF = "#ccc";
/* 


      
      <div className="header">
        <div className="top">
          <Button client={client} type="power" client={client} />
        </div>
        <div className="mid">
          <div className="dpad">
            <Button client={client} type="up" client={client} />
            <div className="middle-dpad-wrap">
              <div className="middle-dpad">
                <Button client={client} type="left" client={client} />
                <div className="dpad-pad" />
                <Button client={client} type="right" client={client} />
              </div>
            </div>
            <Button client={client} type="down" client={client} />
          </div>
          <Button client={client} type="a" client={client} />
          <Button client={client} type="b" client={client} />
        </div>
        <div className="details">
          <Button client={client} type="start" client={client} />
          <Button client={client} type="select" client={client} />
        </div>
      </div>

      <div className="bottom">
        <Button client={client} type="one" client={client} />
        <Button client={client} type="two" client={client} />
      </div>

 */
