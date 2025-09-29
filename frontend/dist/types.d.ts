declare global {
    interface Window {
        Pose: any;
        Camera: any;
        THREE: any;
    }
}
export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}
export interface PoseResults {
    image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
    poseLandmarks: Landmark[];
}
export interface PoseConfig {
    modelComplexity: number;
    smoothLandmarks: boolean;
    enableSegmentation: boolean;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
}
export interface CameraConfig {
    onFrame: () => Promise<void>;
    width: number;
    height: number;
}
export interface RecordingState {
    isRecording: boolean;
    landmarksData: Landmark[][];
    startTime: number | null;
}
export interface UIElements {
    videoElement: HTMLVideoElement;
    poseCanvas: HTMLCanvasElement;
    poseCanvasCtx: CanvasRenderingContext2D;
    avatarContainer: HTMLElement;
    startBtn: HTMLButtonElement;
    stopBtn: HTMLButtonElement;
    playBtn: HTMLButtonElement;
    clearBtn: HTMLButtonElement;
    cameraStatus: HTMLElement;
    statusDisplay: HTMLElement;
}
export interface UIState {
    isInitialized: boolean;
    isRecording: boolean;
    status: string;
}
export interface BackendResponse {
    success: boolean;
    message?: string;
    data?: Landmark[][];
}
export interface Connection {
    start: number;
    end: number;
}
export interface ThreeJSComponents {
    scene: any;
    camera: any;
    renderer: any;
    bones: any[];
    joints: any[];
}
export type AppState = 'idle' | 'recording' | 'processing' | 'playing';
//# sourceMappingURL=types.d.ts.map