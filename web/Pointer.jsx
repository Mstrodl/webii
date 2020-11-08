import {AR} from "js-aruco";
import React, {useState, useRef, useCallback, useEffect} from "react";

export function Pointer({client}) {
  const [detector] = useState(() => new AR.Detector());
  const [context, setContext] = useState(null);
  const [stream, setStream] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const canvas = useRef(null);
  const video = useRef(null);

  const setVideo = useCallback(
    (element) => {
      video.current = element;
      attachVideo(stream);
      console.log("Stream", stream, video.current);
    },
    [stream]
  );

  const attachVideo = useCallback(
    (stream) => {
      console.log("Attach video", video.current, stream);
      if (video.current && stream) {
        console.log("setting", stream);
        if ("srcObject" in video.current) {
          video.current.srcObject = stream;
        } else {
          url = URL.createObjectURL(stream);
          video.current.src = url;
        }

        console.log("context", context);
        requestAnimationFrame(tick);
      }
    },
    [context]
  );

  const tick = useCallback(() => {
    /* console.log("Tick", context); */
    if (context) {
      context.drawImage(
        video.current,
        0,
        0,
        canvas.current.width,
        canvas.current.height
      );
      const imageData = context.getImageData(
        0,
        0,
        canvas.current.width,
        canvas.current.height
      );
      const markers = detector.detect(imageData);
      console.log(markers);
      let located = false;
      for (const marker of markers) {
        console.log("Marker", marker);
        if (marker.id == 1001) {
          console.log("We did it!");
          located = true;
          const avgX =
            marker.corners.map((corner) => corner.x).reduce((a, b) => a + b) /
            marker.corners.length;
          const x = (avgX / canvas.current.width - 0.5) * -2;
          const avgY =
            marker.corners.map((corner) => corner.y).reduce((a, b) => a + b) /
            marker.corners.length;
          const y = (avgY / canvas.current.height - 0.5) * 2;
          // Average "radius"
          const radius =
            marker.corners
              .map((corner) => {
                return Math.sqrt(
                  Math.pow(corner.x - avgX, 2),
                  Math.pow(corner.y - avgY, 2)
                );
              })
              .reduce((a, b) => a + b) /
            marker.corners.length /
            Math.max(canvas.current.width, canvas.current.height);
          client.ir(x, y, radius);
        }
      }
      if (!located) {
        client.ir();
      }
    }
    setTimeout(tick, 15);
  }, [detector, context]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
        },
      })
      .then((stream) => {
        setStream(stream);
        attachVideo(stream);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div className="pointer">
      <video
        autoPlay={true}
        ref={setVideo}
        onLoadedMetadata={() =>
          setDimensions({
            width: video.current.videoWidth,
            height: video.current.videoHeight,
          })
        }
      />
      <canvas
        width={dimensions && dimensions.width}
        height={dimensions && dimensions.height}
        ref={(element) => {
          if (element) {
            console.log("Set context");
            setContext(element.getContext("2d"));
          }
          canvas.current = element;
        }}
      />
    </div>
  );
}
