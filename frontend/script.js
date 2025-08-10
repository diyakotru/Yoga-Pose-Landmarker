import {
  FilesetResolver,
  PoseLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const downloadBtn = document.getElementById("downloadBtn");

const poseData = [];
let pose;

const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("Connected to Flask-SocketIO backend");
});

socket.on("disconnect", () => {
  console.log("Disconnected from backend");
});

socket.on("message", (data) => {
  console.log("Server message:", data);
});

async function init() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  pose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numPoses: 1
  });

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  renderFrame();
}

function renderFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (pose && video.readyState === 4) {
    const results = pose.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      poseData.push(landmarks);

      // ✅ Send data to backend via Socket.IO
      socket.emit("landmark_update", { landmarks });

      landmarks.forEach((landmark, i) => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          5,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = "lime";
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(
          i,
          landmark.x * canvas.width + 5,
          landmark.y * canvas.height - 5
        );
      });

      const connections = [
        [11, 13], [13, 15],
        [12, 14], [14, 16],
        [11, 12],
        [23, 24],
        [11, 23], [12, 24],
        [23, 25], [25, 27], [27, 29],
        [24, 26], [26, 28], [28, 30]
      ];

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        const s = landmarks[start];
        const e = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
        ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
        ctx.stroke();
      });
    }
  }

  requestAnimationFrame(renderFrame);
}

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(poseData, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pose_landmarks.json";
  a.click();
  URL.revokeObjectURL(url);
});

init();
