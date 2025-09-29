export class PoseDetector {
    constructor(videoElement, config) {
        this.videoElement = videoElement;
        this.config = config;
        this.initializePose();
    }
    initializePose() {
        // Initialize MediaPipe Pose
        this.pose = new window.Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        this.pose.setOptions(this.config);
        this.pose.onResults((results) => {
            if (this.onResultsCallback) {
                this.onResultsCallback(results);
            }
        });
    }
    setOnResults(callback) {
        this.onResultsCallback = callback;
    }
    startCamera(cameraConfig) {
        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                await this.pose.send({ image: this.videoElement });
            },
            width: cameraConfig.width,
            height: cameraConfig.height
        });
        this.camera.start();
    }
    stopCamera() {
        if (this.camera) {
            this.camera.stop();
        }
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.pose.setOptions(this.config);
    }
    static getDefaultConfig() {
        return {
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        };
    }
    static validateLandmarks(landmarks) {
        return landmarks &&
            landmarks.length === 33 &&
            landmarks.every(lm => typeof lm.x === 'number' &&
                typeof lm.y === 'number' &&
                typeof lm.z === 'number');
    }
}
//# sourceMappingURL=pose-detector.js.map