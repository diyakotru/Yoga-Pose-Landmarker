export class RecordingManager {
    constructor() {
        this.state = {
            isRecording: false,
            landmarksData: [],
            startTime: null
        };
        // No fixed duration
    }
    isRecording() {
        return this.state.isRecording;
    }
    getLandmarksData() {
        return [...this.state.landmarksData];
    }
    getRecordingTime() {
        if (!this.state.startTime)
            return 0;
        return Date.now() - this.state.startTime;
    }
    addLandmarks(landmarks) {
        if (this.state.isRecording && landmarks && landmarks.length > 0) {
            // Validate landmarks before adding
            const validLandmarks = landmarks.filter(lm => typeof lm.x === 'number' &&
                typeof lm.y === 'number' &&
                typeof lm.z === 'number');
            if (validLandmarks.length > 0) {
                this.state.landmarksData.push(validLandmarks);
            }
        }
    }
    startRecording() {
        if (this.state.isRecording) {
            return; // Already recording
        }
        this.state.isRecording = true;
        this.state.landmarksData = [];
        this.state.startTime = Date.now();
    }
    stopRecording() {
        this.state.isRecording = false;
        const data = this.getLandmarksData();
        this.state.startTime = null;
        return data;
    }
    cancelRecording() {
        this.state.isRecording = false;
        this.state.landmarksData = [];
        this.state.startTime = null;
    }
    clear() {
        this.state.isRecording = false;
        this.state.landmarksData = [];
        this.state.startTime = null;
    }
    getStats() {
        const frameCount = this.state.landmarksData.length;
        const recordingDuration = this.state.startTime ? this.getRecordingTime() : 0;
        const averageFps = recordingDuration > 0 ?
            (frameCount / (recordingDuration / 1000)) : 0;
        return {
            frameCount,
            averageFps: Math.round(averageFps * 100) / 100,
            duration: recordingDuration
        };
    }
    // Utility methods for data validation and processing
    validateRecording() {
        const errors = [];
        if (this.state.landmarksData.length === 0) {
            errors.push('No landmarks data recorded');
        }
        if (this.state.landmarksData.length < 5) {
            errors.push('Recording too short (minimum 5 frames required)');
        }
        // Check for consistent landmark counts
        const landmarkCounts = this.state.landmarksData.map(frame => frame.length);
        const uniqueCounts = [...new Set(landmarkCounts)];
        if (uniqueCounts.length > 1) {
            errors.push('Inconsistent number of landmarks across frames');
        }
        // Check for missing critical landmarks
        const hasValidPose = this.state.landmarksData.some(frame => frame.length >= 25 // Minimum landmarks for basic pose
        );
        if (!hasValidPose) {
            errors.push('No valid pose detected in recording');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    // Export recording data with metadata
    exportData() {
        const stats = this.getStats();
        return {
            landmarks: this.getLandmarksData(),
            metadata: {
                recordedAt: this.state.startTime || Date.now(),
                duration: stats.duration,
                frameCount: stats.frameCount,
                averageFps: stats.averageFps,
                version: '1.0.0'
            }
        };
    }
}
//# sourceMappingURL=recording-manager.js.map