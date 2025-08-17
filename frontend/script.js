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

// Socket connection 
const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

socket.on("connect", () => console.log("Connected to Flask-SocketIO backend"));
socket.on("disconnect", () => console.log("Disconnected from backend"));
socket.on("message", (data) => console.log("Server message:", data));

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

// Utility: Get angle between 3 points (for posture checks)
function getAngle(A, B, C) {
  const AB = { x: A.x - B.x, y: A.y - B.y };
  const CB = { x: C.x - B.x, y: C.y - B.y };

  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
  const magCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y);

  const angle = Math.acos(dot / (magAB * magCB));
  return (angle * 180) / Math.PI;
}

// Posture check with detailed feedback
function checkPosture(landmarks) {
  let feedback = [];

  // 1. Back straight (shoulder–hip–knee)
  const backAngle = getAngle(landmarks[11], landmarks[23], landmarks[25]); // left side
  if (backAngle < 160) feedback.push("Back not straight");

  // 2. Arms straight (shoulder–elbow–wrist)
  const leftArm = getAngle(landmarks[11], landmarks[13], landmarks[15]);
  const rightArm = getAngle(landmarks[12], landmarks[14], landmarks[16]);
  if (leftArm < 160) feedback.push("Left arm bent");
  if (rightArm < 160) feedback.push("Right arm bent");

  // 3. Legs straight (hip–knee–ankle)
  const leftLeg = getAngle(landmarks[23], landmarks[25], landmarks[27]);
  const rightLeg = getAngle(landmarks[24], landmarks[26], landmarks[28]);
  if (leftLeg < 160) feedback.push("Left leg bent");
  if (rightLeg < 160) feedback.push("Right leg bent");

  return feedback;
}

function renderFrame() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (pose && video.readyState === 4) {
    const results = pose.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      poseData.push(landmarks);

      // Send data to backend
      socket.emit("landmark_update", { landmarks });

      // Posture check
      const feedback = checkPosture(landmarks);
      const isGood = feedback.length === 0;
      const skeletonColor = isGood ? "lime" : "red";

      // Draw landmarks
      landmarks.forEach((landmark) => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          5,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = skeletonColor;
        ctx.fill();
      });

      // Skeleton connections
      const connections = [
        [11, 13], [13, 15],
        [12, 14], [14, 16],
        [11, 12],
        [23, 24],
        [11, 23], [12, 24],
        [23, 25], [25, 27], [27, 29],
        [24, 26], [26, 28], [28, 30]
      ];

      ctx.strokeStyle = skeletonColor;
      ctx.lineWidth = 3;
      connections.forEach(([start, end]) => {
        const s = landmarks[start];
        const e = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
        ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
        ctx.stroke();
      });

      // Show feedback text
      ctx.font = "18px Arial";
      ctx.fillStyle = isGood ? "lime" : "red";
      ctx.fillText(isGood ? "Good Posture" : "Issues detected:", 10, 25);

      if (!isGood) {
        feedback.forEach((msg, i) => {
          ctx.fillText("- " + msg, 10, 50 + i * 25);
        });
      }
    }
  }

  requestAnimationFrame(renderFrame);
}

// Download JSON button
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
