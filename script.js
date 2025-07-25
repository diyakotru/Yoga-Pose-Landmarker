const videoInput = document.getElementById("videoInput");
const videoPlayer = document.getElementById("videoPlayer");
const analyzeBtn = document.getElementById("analyzeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const landmarkOutput = document.getElementById("landmarkOutput");

videoInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const url = URL.createObjectURL(file);
  videoPlayer.src = url;
  videoPlayer.load(); 
});


let landmarkData = [];

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onPoseResults);


videoInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const url = URL.createObjectURL(file);
  videoPlayer.src = url;
  downloadBtn.disabled = true;
  landmarkData = [];
  landmarkOutput.textContent = "No data yet...";
});


analyzeBtn.addEventListener("click", async () => {
  if (!videoPlayer.src) return alert("Upload a video first!");

  videoPlayer.pause();
  videoPlayer.currentTime = 0;
  landmarkData = [];
  landmarkOutput.textContent = "Processing...";

  canvas.width = videoPlayer.videoWidth;
  canvas.height = videoPlayer.videoHeight;

  await extractLandmarksFromVideo();
});

function onPoseResults(results) {
  if (results.poseLandmarks) {
    landmarkData.push(results.poseLandmarks);
  }
}

// Extract landmarks frame-by-frame
async function extractLandmarksFromVideo() {
  const fps = 10; 
  const duration = videoPlayer.duration;

  for (let t = 0; t < duration; t += 1 / fps) {
    await new Promise((resolve) => {
      videoPlayer.currentTime = t;
      videoPlayer.onseeked = async () => {
        ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        await pose.send({ image: canvas });
        resolve();
      };
    });
  }

  landmarkOutput.textContent = JSON.stringify(landmarkData, null, 2);
  downloadBtn.disabled = false;
}

// Download as JSON
downloadBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(landmarkData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pose_landmarks.json";
  a.click();
});


