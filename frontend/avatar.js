function playAvatar(landmarksData) {
  const container = document.getElementById("avatar-container");
  container.innerHTML = "";
  container.style.border = "2px solid #ccc";
  container.style.borderRadius = "12px";
  container.style.width = "660px";
  container.style.height = "500px";
  container.style.backgroundColor = "#1e1e1e";
  container.style.display = "flex";
  container.style.justifyContent = "center";
  container.style.alignItems = "center";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e1e);

  const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
  camera.position.z = 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(640, 480);
  container.appendChild(renderer.domElement);

  // Add ambient & directional light for better visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(1, 2, 3);
  scene.add(directionalLight);

  // Skeleton connections (MediaPipe Pose)
  const connections = [
    [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 12], [23, 24], [11, 23], [12, 24],
    [23, 25], [25, 27], [27, 29], [29, 31],
    [24, 26], [26, 28], [28, 30], [30, 32]
  ];

  // Material for bones
  const boneMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 4 });
  const bones = connections.map(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    return new THREE.Line(geometry, boneMaterial);
  });
  bones.forEach(bone => scene.add(bone));

  // Material for joints
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const joints = Array(33).fill().map(() => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 16), jointMaterial);
    scene.add(sphere);
    return sphere;
  });

  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);

    if (frame < landmarksData.length) {
      const lm = landmarksData[frame];

      // Update bones
      connections.forEach((conn, i) => {
        const [a, b] = conn;
        const pointA = new THREE.Vector3(lm[a].x - 0.5, -lm[a].y + 0.5, lm[a].z);
        const pointB = new THREE.Vector3(lm[b].x - 0.5, -lm[b].y + 0.5, lm[b].z);
        bones[i].geometry.setFromPoints([pointA, pointB]);
      });

      // Update joints
      lm.forEach((point, i) => {
        joints[i].position.set(point.x - 0.5, -point.y + 0.5, point.z);
      });

      frame++;
    }

    renderer.render(scene, camera);
  }

  animate();
}
