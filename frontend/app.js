let recording = false;
let landmarksData = [];
let startTime;

const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");

const recordingSection = document.getElementById("recording-section");
const avatarContainer = document.getElementById("avatar-container");
const startBtn = document.getElementById("start");
const playBtn = document.getElementById("play");

// Initial UI state
recordingSection.style.display = "block";
avatarContainer.style.display = "none";
canvasElement.style.display = "block"; // Ensure canvas is visible initially

// Send landmarks data to backend
async function sendDataToBackend(data) {
  await fetch("http://127.0.0.1:5000/save_landmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Setup Mediapipe Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults((results) => {
  if (videoElement.style.display !== "none") { // Only draw if video is visible
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.poseLandmarks) {
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
      drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
    }
  }

  if (recording && results.poseLandmarks) {
    let timestamp = Date.now() - startTime;
    landmarksData.push(results.poseLandmarks);
  }
});

// Camera setup
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();

// Start Recording
startBtn.addEventListener("click", () => {
  recording = true;
  landmarksData = [];
  startTime = Date.now();
  startBtn.textContent = "Recording...";
  startBtn.disabled = true;
  playBtn.disabled = true;

  setTimeout(() => {
    recording = false;
    sendDataToBackend(landmarksData);
    startBtn.textContent = "Start Recording (30s)";
    startBtn.disabled = false;
    playBtn.disabled = false;
  }, 30000);
});

// Play Avatar
playBtn.addEventListener("click", () => {
  // Hide the live video and canvas
  videoElement.style.display = "none";
  canvasElement.style.display = "none";

  // Hide the recording section and show the avatar container
  recordingSection.style.display = "none";
  avatarContainer.style.display = "block";

  // Play avatar using recorded landmarks
  playAvatar(landmarksData);
});