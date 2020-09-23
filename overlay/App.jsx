import React, {useEffect, useState} from "react";
import wiimoteSvg from "url:./controller.svg";
import QRCode from "qrcode.react";

export function App() {
  const [players, setPlayers] = useState({});
  const [pin, setPin] = useState(null);

  useEffect(() => {
    let ws;
    function connect() {
      console.log("Connecting...");
      setPlayers({});
      setPin(null);
      ws = new WebSocket("ws://localhost:9999");
      ws.addEventListener("message", (frame) => {
        const msg = JSON.parse(frame.data);
        if (msg.op == "hello") {
          const players = {};
          for (const key of msg.d.players) {
            players[key] = true;
          }
          setPlayers(players);
          setPin(msg.d.pin);
        } else if (msg.op == "connect") {
          setPlayers((players) =>
            Object.assign({}, players, {[msg.d.player]: true})
          );
        } else if (msg.op == "disconnect") {
          setPlayers((players) =>
            Object.assign({}, players, {[msg.d.player]: false})
          );
        }
      });

      ws.addEventListener("close", () => {
        if (ws) {
          ws = null;
          setTimeout(() => {
            console.log("Timeout hit");
            connect();
          }, 500);
        }
      });
      ws.addEventListener("error", () => {
        if (ws) {
          ws = null;
          setTimeout(() => {
            console.log("Timeout hit on error");
            connect();
          }, 500);
        }
      });
    }
    connect();

    return () => {
      if (ws) {
        ws = null;
        const old = ws;
        old.close();
      }
    };
  }, []);

  return (
    <div className="overlay">
      <svg
        width="1280"
        height="720"
        version="1.1"
        viewBox="0 0 338.67 190.5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="338.67" height="190.5" fill="#34beec" />
        {/*<rect x="56.802" y="31.951" width="281.86" height="158.55" />*/}
        <image
          x="9.972"
          y="65.248"
          width="14.052"
          height="57.813"
          opacity={players[0] ? undefined : 0.4}
          preserveAspectRatio="none"
          href={wiimoteSvg}
        />
        <image
          x="32.585"
          y="65.248"
          width="14.052"
          height="57.813"
          opacity={players[1] ? undefined : 0.4}
          preserveAspectRatio="none"
          href={wiimoteSvg}
        />
        <image
          x="9.972"
          y="128.56"
          width="14.052"
          height="57.813"
          opacity={players[2] ? undefined : 0.4}
          preserveAspectRatio="none"
          href={wiimoteSvg}
        />
        <image
          x="32.585"
          y="128.56"
          width="14.052"
          height="57.813"
          opacity={players[3] ? undefined : 0.4}
          preserveAspectRatio="none"
          href={wiimoteSvg}
        />
        <text
          transform="translate(63.143 -1.5875)"
          fill="#ffffff"
          fontFamily="sans-serif"
          fontSize="19.756px"
          letterSpacing="0px"
          wordSpacing="0px"
          style={{
            lineHeight: 1.25,
            shapeInside: "url(#rect2192)",
            whiteSpace: "pre",
          }}
        >
          <tspan x="46.863281" y="25.745758">
            <tspan fill="#ffffff" fontFamily="Roboto" fontWeight="500">
              The Contactless Wii
            </tspan>
          </tspan>
        </text>
        <g
          x="4.9531"
          y="13.328"
          width="46.702"
          height="46.702"
          className="qr"
          transform="translate(4.9531, 13.328)"
        >
          {pin && (
            <QRCode
              value={`https://w.c7.pm/${pin}`}
              renderAs="svg"
              size={46.702}
              imageSettings={{x: 4.9531, y: 13.328}}
              includeMargin={true}
            />
          )}
        </g>
        <text
          transform="translate(-3.2455 .99487)"
          fill="#000000"
          fontFamily="sans-serif"
          fontSize="9.8778px"
          letterSpacing="0px"
          wordSpacing="0px"
          style={{
            lineHeight: 1.25,
            shapeInside: "url(#rect2638)",
            whiteSpace: "pre",
          }}
        >
          <tspan x="6.671875" y="10.283994">
            <tspan
              fill="#ffffff"
              fontFamily="Roboto"
              fontSize="9.8778px"
              fontWeight="500"
            >
              Join Game:
            </tspan>
          </tspan>
        </text>
      </svg>
    </div>
  );
}
