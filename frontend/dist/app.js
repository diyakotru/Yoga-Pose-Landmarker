import { BackendService } from './backend-service.js';
import { UIManager } from './ui-manager.js';
import { PoseDetector } from './pose-detector.js';
import { AvatarRenderer } from './avatar-renderer.js';
import { RecordingManager } from './recording-manager.js';
class PoseLandmarkApp {
    constructor() {
        this.initializeApp();
    }
    async initializeApp() {
        try {
            // Initialize DOM elements
            this.initializeElements();
            // Initialize services
            this.initializeServices();
            // Setup event listeners
            this.setupEventListeners();
            // Initialize pose detection
            await this.initializePoseDetection();
            // Check initial state
            await this.updatePlayButtonState();
            // Check backend connection
            await this.checkBackendConnection();
            console.log('Pose Landmark App initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize app:', error);
            this.uiManager?.handleError('Failed to initialize application. Please refresh the page.');
        }
    }
    initializeElements() {
        const videoElement = document.getElementById("video");
        const poseCanvas = document.getElementById("pose-canvas");
        const avatarContainer = document.getElementById("avatar-container");
        const startBtn = document.getElementById("start-btn");
        const stopBtn = document.getElementById("stop-btn");
        const statusDisplay = document.getElementById("status-display");
        if (!videoElement || !poseCanvas || !avatarContainer ||
            !startBtn || !stopBtn || !statusDisplay) {
            throw new Error('Required DOM elements not found');
        }
        const poseCanvasCtx = poseCanvas.getContext("2d");
        if (!poseCanvasCtx) {
            throw new Error('Could not get canvas 2D context');
        }
        this.elements = {
            videoElement,
            poseCanvas,
            poseCanvasCtx,
            avatarContainer,
            startBtn,
            stopBtn,
            playBtn: document.getElementById("play-btn"),
            clearBtn: document.getElementById("clear-btn"),
            cameraStatus: document.getElementById("camera-status"),
            statusDisplay
        };
    }
    initializeServices() {
        this.uiManager = new UIManager(this.elements);
        this.backendService = new BackendService();
        this.recordingManager = new RecordingManager(); // No duration parameter
        this.avatarRenderer = new AvatarRenderer(this.elements.avatarContainer);
    }
    setupEventListeners() {
        this.elements.startBtn.addEventListener("click", () => this.handleStartRecording());
        this.elements.stopBtn.addEventListener("click", () => this.handleStopRecording());
        // Add play button for avatar
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener("click", () => this.handlePlayAvatar());
        }
        // Add clear button functionality
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener("click", () => this.handleClearRecordings());
        }
        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && !this.recordingManager.isRecording()) {
                event.preventDefault();
                if (!this.elements.startBtn.disabled) {
                    this.handleStartRecording();
                }
            }
            else if (event.code === 'Escape' && this.recordingManager.isRecording()) {
                event.preventDefault();
                this.handleStopRecording();
            }
        });
        // Add window resize handler
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        // Add visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.recordingManager.isRecording()) {
                console.warn('Tab became hidden during recording');
            }
        });
    }
    async initializePoseDetection() {
        const config = PoseDetector.getDefaultConfig();
        this.poseDetector = new PoseDetector(this.elements.videoElement, config);
        this.poseDetector.setOnResults((results) => {
            this.handlePoseResults(results);
        });
        try {
            this.poseDetector.startCamera({
                onFrame: async () => { },
                width: 640,
                height: 480
            });
            // Set canvas size to match video
            this.uiManager.setCanvasSize(640, 480);
            this.uiManager.setCameraReady();
        }
        catch (error) {
            console.error('Camera initialization failed:', error);
            this.uiManager.setCameraError(error instanceof Error ? error.message : 'Camera failed');
        }
    }
    handlePoseResults(results) {
        // Draw pose on canvas
        if (this.elements.poseCanvas && results.poseLandmarks) {
            this.uiManager.drawPoseLandmarks(results.poseLandmarks, this.elements.poseCanvas.width, this.elements.poseCanvas.height);
            // Show visual feedback when pose is detected
            this.uiManager.showPoseDetected();
        }
        // Add landmarks to recording if recording is active
        if (this.recordingManager.isRecording() && results.poseLandmarks) {
            this.recordingManager.addLandmarks(results.poseLandmarks);
            // Update recording time display
            const recordingTime = this.recordingManager.getRecordingTime();
            this.uiManager.updateRecordingTime(recordingTime);
        }
    }
    async handleStartRecording() {
        try {
            this.uiManager.setRecordingState(true);
            this.recordingManager.startRecording();
            console.log('Recording started');
        }
        catch (error) {
            console.error('Recording failed:', error);
            this.uiManager.handleError('Recording failed. Please try again.');
            this.uiManager.setRecordingState(false);
        }
    }
    async handleStopRecording() {
        try {
            const landmarksData = this.recordingManager.stopRecording();
            this.uiManager.setRecordingState(false);
            // Show recording complete info
            const stats = this.recordingManager.getStats();
            this.uiManager.showRecordingComplete(stats.frameCount, stats.duration);
            // Process the recording
            await this.processRecording(landmarksData);
            console.log(`Recording completed: ${landmarksData.length} frames captured`);
        }
        catch (error) {
            console.error('Stop recording failed:', error);
            this.uiManager.handleError('Failed to stop recording properly.');
            this.uiManager.setRecordingState(false);
        }
    }
    async processRecording(landmarksData) {
        try {
            const dataToProcess = landmarksData || this.recordingManager.getLandmarksData();
            // Show saving state
            this.uiManager.showSaving();
            // Validate recording
            const validation = this.recordingManager.validateRecording();
            if (!validation.isValid) {
                throw new Error(`Invalid recording: ${validation.errors.join(', ')}`);
            }
            // Upload to backend with enhanced response handling
            const uploadResponse = await this.backendService.uploadLandmarks(dataToProcess);
            if (uploadResponse.success) {
                const frameCount = uploadResponse.frame_count || dataToProcess.length;
                const duration = uploadResponse.duration_ms ? `${(uploadResponse.duration_ms / 1000).toFixed(1)}s` : '';
                this.uiManager.showSaveComplete();
                // Log recording stats
                console.log('Recording uploaded:', {
                    id: uploadResponse.id,
                    frames: frameCount,
                    duration: duration
                });
            }
            else {
                throw new Error(uploadResponse.message || 'Failed to upload recording to backend');
            }
            // Update UI state
            await this.updatePlayButtonState();
        }
        catch (error) {
            console.error('Failed to process recording:', error);
            this.uiManager.showSaveError(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async handlePlayAvatar() {
        // Avatar playing functionality removed for simplified single-view layout
        this.uiManager.updateStatus('Avatar rendering in the avatar section', 'info');
        try {
            // Fetch the latest recordings
            const recordings = await this.backendService.fetchLandmarks();
            if (!recordings.length) {
                throw new Error('No recordings found');
            }
            // Play the most recent recording
            const latestRecording = recordings[recordings.length - 1];
            // Setup avatar renderer
            this.avatarRenderer.resetCamera();
            // Play animation - wrap single recording in array if needed
            const animationData = Array.isArray(latestRecording[0]) ? latestRecording : [latestRecording];
            await this.avatarRenderer.playAnimation(animationData);
            this.uiManager.updateStatus('Avatar playback completed!', 'success');
        }
        catch (error) {
            console.error('Failed to play avatar:', error);
            this.uiManager.handleError('Failed to play avatar. Please try again.');
        }
    }
    async handleClearRecordings() {
        try {
            const confirmed = confirm('Are you sure you want to clear all recordings? This action cannot be undone.');
            if (!confirmed)
                return;
            this.uiManager.updateStatus('Clearing recordings...', 'info');
            // Clear from backend
            const response = await fetch('http://127.0.0.1:5000/clear_all_landmarks', {
                method: 'DELETE'
            });
            if (response.ok) {
                this.uiManager.updateStatus('All recordings cleared successfully!', 'success');
                await this.updatePlayButtonState();
            }
            else {
                throw new Error('Failed to clear recordings from server');
            }
        }
        catch (error) {
            console.error('Failed to clear recordings:', error);
            this.uiManager.handleError('Failed to clear recordings. Please try again.');
        }
    }
    async updatePlayButtonState() {
        // Simplified - always enable play button since we have a single view
        if (this.elements.playBtn) {
            this.elements.playBtn.disabled = false;
        }
    }
    async checkBackendConnection() {
        try {
            const healthStatus = await this.backendService.getHealthStatus();
            if (healthStatus && healthStatus.status === 'healthy') {
                console.log('Backend connection established:', healthStatus.message);
                this.uiManager.updateStatus('Connected to backend - Ready to record');
                // Fetch and display metadata if available
                const metadata = await this.backendService.fetchLandmarkMetadata();
                if (metadata && metadata.total_recordings > 0) {
                    console.log('Backend metadata:', metadata);
                }
            }
            else {
                throw new Error(healthStatus?.message || 'Backend health check failed');
            }
        }
        catch (error) {
            console.warn('Backend connection failed:', error);
            this.uiManager.handleError('Warning: Cannot connect to backend server. Please ensure the backend is running on http://127.0.0.1:5000', 'Backend');
        }
    }
    handleWindowResize() {
        // Adjust canvas size if needed
        const rect = this.elements.poseCanvas.getBoundingClientRect();
        if (rect.width !== this.elements.poseCanvas.width ||
            rect.height !== this.elements.poseCanvas.height) {
            console.log('Window resized, maintaining canvas dimensions');
        }
    }
    // Public methods for external control
    async restartApp() {
        this.recordingManager.cancelRecording();
        this.avatarRenderer.stopAnimation();
        this.uiManager.setRecordingState(false);
        await this.updatePlayButtonState();
    }
    getStats() {
        return {
            recording: this.recordingManager.getStats(),
            backend: {
                baseUrl: this.backendService.baseUrl
            }
        };
    }
    dispose() {
        this.recordingManager.cancelRecording();
        this.avatarRenderer.dispose();
        this.poseDetector.stopCamera();
    }
}
// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for required dependencies
    if (!window.Pose) {
        console.error('MediaPipe Pose not loaded');
        return;
    }
    if (!window.Camera) {
        console.error('MediaPipe Camera not loaded');
        return;
    }
    if (!window.THREE) {
        console.error('Three.js not loaded');
        return;
    }
    // Create and start the application
    const app = new PoseLandmarkApp();
    // Make app globally accessible for debugging
    window.poseApp = app;
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        app.dispose();
    });
});
export default PoseLandmarkApp;
//# sourceMappingURL=app.js.map