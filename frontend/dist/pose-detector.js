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
        // Prefer MediaPipe Camera helper if available
        if (window.Camera) {
            try {
                this.camera = new window.Camera(this.videoElement, {
                    onFrame: async () => {
                        await this.pose.send({ image: this.videoElement });
                    },
                    width: cameraConfig.width,
                    height: cameraConfig.height
                });
                // Ensure video element allows autoplay in browsers
                try {
                    this.videoElement.muted = true;
                }
                catch (e) { }
                try {
                    this.videoElement.autoplay = true;
                }
                catch (e) { }
                try {
                    this.videoElement.playsInline = true;
                }
                catch (e) { }
                this.camera.start();
                return;
            }
            catch (err) {
                console.warn('MediaPipe Camera failed to start, falling back to getUserMedia:', err);
                this.camera = null;
            }
        }
        // Fallback: use navigator.mediaDevices.getUserMedia and drive pose with requestAnimationFrame
        const constraints = {
            audio: false,
            video: {
                width: cameraConfig.width || 640,
                height: cameraConfig.height || 480,
                facingMode: 'user'
            }
        };
        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
            this.videoElement.srcObject = stream;
            // Allow autoplay without user gesture in many browsers
            try {
                this.videoElement.muted = true;
            }
            catch (e) { }
            try {
                this.videoElement.autoplay = true;
            }
            catch (e) { }
            try {
                this.videoElement.playsInline = true;
            }
            catch (e) { }
            return this.videoElement.play();
        })
            .then(() => {
            let rafId = null;
            const tick = async () => {
                try {
                    await this.pose.send({ image: this.videoElement });
                }
                catch (e) {
                    // swallow per-frame errors to avoid spamming the console
                    // if pose model isn't ready yet
                }
                rafId = requestAnimationFrame(tick);
            };
            // start loop
            rafId = requestAnimationFrame(tick);
            // store a stop handle on this.camera for cleanup
            this.camera = {
                stop: () => {
                    if (rafId)
                        cancelAnimationFrame(rafId);
                    const stream = this.videoElement.srcObject;
                    if (stream) {
                        stream.getTracks().forEach(t => t.stop());
                    }
                    this.videoElement.srcObject = null;
                }
            };
        })
            .catch((err) => {
            console.error('getUserMedia failed:', err);
            throw err;
        });
    }
    stopCamera() {
        if (this.camera) {
            try {
                this.camera.stop();
            }
            catch (err) {
                // ignore
            }
            this.camera = null;
        }
        // Additional cleanup if we stored fallback camera on this.camera
        const c = this.camera;
        if (c && typeof c.stop === 'function') {
            try {
                c.stop();
            }
            catch (e) { /* ignore */ }
            this.camera = null;
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