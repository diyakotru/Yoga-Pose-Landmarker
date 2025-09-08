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
canvasElement.style.display = "block"; 
playBtn.disabled = true;

// --- Backend Fetch Functions ---
async function sendDataToBackend(data) {
  try {
    await fetch("http://127.0.0.1:5000/upload_landmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Failed to send landmarks:", err);
  }
}

async function fetchLandmarksFromBackend() {
  try {
    const response = await fetch("http://127.0.0.1:5000/get_landmarks");
    return await response.json();
  } catch (err) {
    console.error("Failed to fetch landmarks:", err);
    return [];
  }
}

// --- Mediapipe Pose Setup ---
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
  if (videoElement.style.display !== "none") {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  }
  if (recording && results.poseLandmarks) {
    landmarksData.push(results.poseLandmarks);
  }
});

// --- Camera Setup ---
const camera = new Camera(videoElement, {
  onFrame: async () => await pose.send({ image: videoElement }),
  width: 640,
  height: 480
});
camera.start();

// --- Update Play Button ---
async function updatePlayButtonState() {
  const data = await fetchLandmarksFromBackend();
  playBtn.disabled = data.length === 0;
}

// --- Start Recording ---
startBtn.addEventListener("click", () => {
  recording = true;
  landmarksData = [];
  startTime = Date.now();
  startBtn.disabled = true;
  playBtn.disabled = true;

  let countdown = 30;
  startBtn.textContent = `Recording... ${countdown}s`;
  const interval = setInterval(() => {
    countdown--;
    if (countdown >= 0) startBtn.textContent = `Recording... ${countdown}s`;
  }, 1000);

  setTimeout(async () => {
    clearInterval(interval);
    recording = false;
    await sendDataToBackend(landmarksData);
    startBtn.textContent = "Start Recording (30s)";
    startBtn.disabled = false;
    await updatePlayButtonState();
  }, 30000);
});

// --- Play Avatar ---
playBtn.addEventListener("click", async () => {
  videoElement.style.display = "none";
  canvasElement.style.display = "none";
  recordingSection.style.display = "none";
  avatarContainer.style.display = "block";
  await playAvatar();
});

// --- Avatar Playback ---
async function playAvatar() {
  avatarContainer.innerHTML = "";
  avatarContainer.style.border = "2px solid #ccc";
  avatarContainer.style.borderRadius = "12px";
  avatarContainer.style.width = "660px";
  avatarContainer.style.height = "500px";
  avatarContainer.style.backgroundColor = "#1e1e1e";
  avatarContainer.style.display = "flex";
  avatarContainer.style.justifyContent = "center";
  avatarContainer.style.alignItems = "center";

  const landmarksData = await fetchLandmarksFromBackend();
  if (!landmarksData.length) return console.warn("No landmarks found");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e1e);

  const camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
  camera.position.z = 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(640, 480);
  avatarContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(1,2,3);
  scene.add(directionalLight);

  const connections = [
    [11, 13],[13, 15],[12, 14],[14, 16],
    [11, 12],[23, 24],[11, 23],[12, 24],
    [23, 25],[25, 27],[27, 29],[29, 31],
    [24, 26],[26, 28],[28, 30],[30, 32]
  ];

  const boneMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 4 });
  const bones = connections.map(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,0)
    ]);
    const line = new THREE.Line(geometry, boneMaterial);
    scene.add(line);
    return line;
  });

  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const joints = Array(33).fill().map(() => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.02,16,16), jointMaterial);
    scene.add(sphere);
    return sphere;
  });

  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (frame < landmarksData.length) {
      const lm = landmarksData[frame];
      connections.forEach((conn,i)=>{
        const [a,b] = conn;
        const pointA = new THREE.Vector3(lm[a].x-0.5, -lm[a].y+0.5, lm[a].z);
        const pointB = new THREE.Vector3(lm[b].x-0.5, -lm[b].y+0.5, lm[b].z);
        bones[i].geometry.setFromPoints([pointA,pointB]);
      });
      lm.forEach((point,i)=>joints[i].position.set(point.x-0.5, -point.y+0.5, point.z));
      frame++;
    }
    renderer.render(scene,camera);
  }
  animate();
}

// --- Initialize ---
updatePlayButtonState();
