declare class PoseLandmarkApp {
    private uiManager;
    private backendService;
    private poseDetector;
    private avatarRenderer;
    private recordingManager;
    private elements;
    constructor();
    private initializeApp;
    private initializeElements;
    private initializeServices;
    private setupEventListeners;
    private initializePoseDetection;
    private handlePoseResults;
    private handleStartRecording;
    private handleStopRecording;
    private processRecording;
    private handlePlayAvatar;
    private handleClearRecordings;
    private updatePlayButtonState;
    private checkBackendConnection;
    private handleWindowResize;
    restartApp(): Promise<void>;
    getStats(): any;
    dispose(): void;
}
export default PoseLandmarkApp;
//# sourceMappingURL=app.d.ts.map