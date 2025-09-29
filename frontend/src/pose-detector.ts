import { PoseConfig, PoseResults, CameraConfig, Landmark } from './types.js';

export class PoseDetector {
  private pose: any;
  private camera: any;
  private onResultsCallback?: (results: PoseResults) => void;

  constructor(
    private videoElement: HTMLVideoElement,
    private config: PoseConfig
  ) {
    this.initializePose();
  }

  private initializePose(): void {
    // Initialize MediaPipe Pose
    this.pose = new window.Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this.pose.setOptions(this.config);

    this.pose.onResults((results: PoseResults) => {
      if (this.onResultsCallback) {
        this.onResultsCallback(results);
      }
    });
  }

  setOnResults(callback: (results: PoseResults) => void): void {
    this.onResultsCallback = callback;
  }

  startCamera(cameraConfig: CameraConfig): void {
    this.camera = new window.Camera(this.videoElement, {
      onFrame: async () => {
        await this.pose.send({ image: this.videoElement });
      },
      width: cameraConfig.width,
      height: cameraConfig.height
    });
    
    this.camera.start();
  }

  stopCamera(): void {
    if (this.camera) {
      this.camera.stop();
    }
  }

  updateConfig(newConfig: Partial<PoseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.pose.setOptions(this.config);
  }

  static getDefaultConfig(): PoseConfig {
    return {
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    };
  }

  static validateLandmarks(landmarks: Landmark[]): boolean {
    return landmarks && 
           landmarks.length === 33 &&
           landmarks.every(lm => 
             typeof lm.x === 'number' && 
             typeof lm.y === 'number' && 
             typeof lm.z === 'number'
           );
  }
}