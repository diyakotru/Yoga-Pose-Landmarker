import { UIElements } from './types.js';
export declare class UIManager {
    private elements;
    private state;
    constructor(elements: UIElements);
    private validateElements;
    private setupInitialState;
    updateStatus(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void;
    setCameraReady(): void;
    setCameraError(error: string): void;
    setRecordingState(isRecording: boolean): void;
    showRecordingComplete(frameCount: number, duration: number): void;
    showSaving(): void;
    showSaveComplete(): void;
    showSaveError(error: string): void;
    showPoseDetected(): void;
    hidePoseDetected(): void;
    updateRecordingTime(timeMs: number): void;
    setCanvasSize(width: number, height: number): void;
    getCanvasContext(): CanvasRenderingContext2D | null;
    clearCanvas(): void;
    drawPoseLandmarks(landmarks: any[], canvasWidth: number, canvasHeight: number): void;
    private drawPoseConnections;
    isRecording(): boolean;
    isInitialized(): boolean;
    getStatus(): string;
    cleanup(): void;
    handleError(error: Error | string, context?: string): void;
    getElement<K extends keyof UIElements>(elementName: K): UIElements[K];
}
//# sourceMappingURL=ui-manager.d.ts.map