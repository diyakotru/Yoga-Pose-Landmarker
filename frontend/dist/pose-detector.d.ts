import { PoseConfig, PoseResults, CameraConfig, Landmark } from './types.js';
export declare class PoseDetector {
    private videoElement;
    private config;
    private pose;
    private camera;
    private onResultsCallback?;
    constructor(videoElement: HTMLVideoElement, config: PoseConfig);
    private initializePose;
    setOnResults(callback: (results: PoseResults) => void): void;
    startCamera(cameraConfig: CameraConfig): void;
    stopCamera(): void;
    updateConfig(newConfig: Partial<PoseConfig>): void;
    static getDefaultConfig(): PoseConfig;
    static validateLandmarks(landmarks: Landmark[]): boolean;
}
//# sourceMappingURL=pose-detector.d.ts.map