import { Landmark, Connection } from './types.js';

export class AvatarRenderer {
  private scene!: any;
  private camera!: any;
  private renderer!: any;
  private bones: any[] = [];
  private joints: any[] = [];
  private animationId: number | null = null;

  private readonly connections: Connection[] = [
    { start: 11, end: 13 }, { start: 13, end: 15 }, // Left arm
    { start: 12, end: 14 }, { start: 14, end: 16 }, // Right arm
    { start: 11, end: 12 }, // Shoulders
    { start: 23, end: 24 }, // Hips
    { start: 11, end: 23 }, { start: 12, end: 24 }, // Torso
    { start: 23, end: 25 }, { start: 25, end: 27 }, { start: 27, end: 29 }, { start: 29, end: 31 }, // Left leg
    { start: 24, end: 26 }, { start: 26, end: 28 }, { start: 28, end: 30 }, { start: 30, end: 32 }  // Right leg
  ];

  constructor(private container: HTMLElement) {
    this.initializeThreeJS();
  }

  private initializeThreeJS(): void {
    // Clear container
    this.container.innerHTML = '';
    
    // Setup container styles
    this.setupContainer();

    // Initialize Three.js scene
    this.scene = new window.THREE.Scene();
    this.scene.background = new window.THREE.Color(0x1a1a2e);

    // Setup camera
    this.camera = new window.THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
    this.camera.position.set(0, 0, 2);

    // Setup renderer
    this.renderer = new window.THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(640, 480);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = window.THREE.PCFSoftShadowMap;
    
    this.container.appendChild(this.renderer.domElement);

    // Setup lighting
    this.setupLighting();

    // Create avatar components
    this.createBones();
    this.createJoints();
  }

  private setupContainer(): void {
    this.container.style.border = "2px solid #00e699";
    this.container.style.borderRadius = "12px";
    this.container.style.width = "660px";
    this.container.style.height = "500px";
    this.container.style.backgroundColor = "#1a1a2e";
    this.container.style.display = "flex";
    this.container.style.justifyContent = "center";
    this.container.style.alignItems = "center";
    this.container.style.boxShadow = "0 0 30px rgba(0, 230, 153, 0.3)";
  }

  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new window.THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new window.THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 4, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Fill light
    const fillLight = new window.THREE.DirectionalLight(0x00e699, 0.3);
    fillLight.position.set(-2, 2, 1);
    this.scene.add(fillLight);

    // Rim light
    const rimLight = new window.THREE.DirectionalLight(0x6a4c93, 0.2);
    rimLight.position.set(0, -2, -3);
    this.scene.add(rimLight);
  }

  private createBones(): void {
    const boneMaterial = new window.THREE.LineBasicMaterial({ 
      color: 0x00e699, 
      linewidth: 6,
      transparent: true,
      opacity: 0.9
    });

    this.bones = this.connections.map(() => {
      const geometry = new window.THREE.BufferGeometry().setFromPoints([
        new window.THREE.Vector3(0, 0, 0),
        new window.THREE.Vector3(0, 0, 0)
      ]);
      const line = new window.THREE.Line(geometry, boneMaterial);
      this.scene.add(line);
      return line;
    });
  }

  private createJoints(): void {
    const jointGeometry = new window.THREE.SphereGeometry(0.025, 16, 16);
    const jointMaterial = new window.THREE.MeshStandardMaterial({ 
      color: 0xff6b6b,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x330000,
      emissiveIntensity: 0.1
    });

    this.joints = Array(33).fill(null).map(() => {
      const sphere = new window.THREE.Mesh(jointGeometry, jointMaterial);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      this.scene.add(sphere);
      return sphere;
    });
  }

  async playAnimation(landmarksData: Landmark[][], onProgress?: (progress: number) => void): Promise<void> {
    if (!landmarksData.length) {
      console.warn("No landmarks data provided for animation");
      return;
    }

    return new Promise((resolve) => {
      let frame = 0;
      const totalFrames = landmarksData.length;

      const animate = () => {
        if (frame >= totalFrames) {
          if (onProgress) onProgress(100);
          resolve();
          return;
        }

        const landmarks = landmarksData[frame];
        
        if (landmarks && landmarks.length >= 33) {
          this.updatePose(landmarks);
          
          if (onProgress) {
            const progress = (frame / totalFrames) * 100;
            onProgress(progress);
          }
        }

        this.renderer.render(this.scene, this.camera);
        frame++;

        this.animationId = requestAnimationFrame(() => {
          setTimeout(animate, 33); // ~30fps
        });
      };

      frame = 0;
      animate();
    });
  }

  private updatePose(landmarks: Landmark[]): void {
    // Update bone connections
    this.connections.forEach((connection, index) => {
      const pointA = this.landmarkToVector3(landmarks[connection.start]);
      const pointB = this.landmarkToVector3(landmarks[connection.end]);
      
      if (pointA && pointB && this.bones[index]) {
        this.bones[index].geometry.setFromPoints([pointA, pointB]);
      }
    });

    // Update joint positions
    landmarks.forEach((landmark, index) => {
      if (this.joints[index] && landmark) {
        const position = this.landmarkToVector3(landmark);
        if (position) {
          this.joints[index].position.copy(position);
        }
      }
    });
  }

  private landmarkToVector3(landmark: Landmark): any | null {
    if (!landmark || typeof landmark.x !== 'number' || typeof landmark.y !== 'number' || typeof landmark.z !== 'number') {
      return null;
    }

    return new window.THREE.Vector3(
      landmark.x - 0.5,
      -landmark.y + 0.5,
      landmark.z
    );
  }

  stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose(): void {
    this.stopAnimation();
    
    // Dispose of Three.js objects properly to prevent memory leaks
    this.bones.forEach(bone => {
      if (bone.geometry) {
        bone.geometry.dispose();
      }
      if (bone.material) {
        if (Array.isArray(bone.material)) {
          bone.material.forEach((material: any) => material.dispose());
        } else {
          bone.material.dispose();
        }
      }
      this.scene.remove(bone);
    });
    
    this.joints.forEach(joint => {
      if (joint.geometry) {
        joint.geometry.dispose();
      }
      if (joint.material) {
        if (Array.isArray(joint.material)) {
          joint.material.forEach((material: any) => material.dispose());
        } else {
          joint.material.dispose();
        }
      }
      this.scene.remove(joint);
    });

    // Clear arrays
    this.bones = [];
    this.joints = [];

    // Dispose of renderer and remove from DOM
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = null;
    }

    // Clear scene
    if (this.scene) {
      while(this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null;
    }

    // Clear camera
    this.camera = null;

    // Clear the container
    this.container.innerHTML = '';
    
    console.log('[AvatarRenderer] Disposed and cleaned up resources');
  }

  resetCamera(): void {
    if (this.camera) {
      this.camera.position.set(0, 0, 2);
      this.camera.lookAt(0, 0, 0);
    }
  }

  enableCameraControls(): void {
    // Add mouse controls for camera (if OrbitControls is available)
    if ((window as any).THREE.OrbitControls && this.camera && this.renderer) {
      const controls = new (window as any).THREE.OrbitControls(this.camera, this.renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = false;
    }
  }
}