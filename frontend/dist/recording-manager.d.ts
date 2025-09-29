import { Landmark } from './types.js';
export declare class RecordingManager {
    private state;
    constructor();
    isRecording(): boolean;
    getLandmarksData(): Landmark[][];
    getRecordingTime(): number;
    addLandmarks(landmarks: Landmark[]): void;
    startRecording(): void;
    stopRecording(): Landmark[][];
    cancelRecording(): void;
    clear(): void;
    getStats(): {
        frameCount: number;
        averageFps: number;
        duration: number;
    };
    validateRecording(): {
        isValid: boolean;
        errors: string[];
    };
    exportData(): {
        landmarks: Landmark[][];
        metadata: {
            recordedAt: number;
            duration: number;
            frameCount: number;
            averageFps: number;
            version: string;
        };
    };
}
//# sourceMappingURL=recording-manager.d.ts.map