import { Landmark } from './types.js';
export interface LandmarkMetadata {
    total_recordings: number;
    avg_frame_count: number;
    avg_duration_ms: number;
    latest_recording: string;
    first_recording: string;
}
export interface UploadResponse {
    success: boolean;
    message: string;
    id?: number;
    frame_count?: number;
    duration_ms?: number;
}
export declare class BackendService {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    uploadLandmarks(data: Landmark[][]): Promise<UploadResponse>;
    fetchLandmarks(limit?: number, offset?: number): Promise<Landmark[][]>;
    fetchLandmarkMetadata(): Promise<LandmarkMetadata | null>;
    deleteLandmarkRecording(id: number): Promise<boolean>;
    clearAllLandmarks(): Promise<boolean>;
    checkConnection(): Promise<boolean>;
    getHealthStatus(): Promise<{
        status: string;
        message: string;
        timestamp: string;
    } | null>;
}
//# sourceMappingURL=backend-service.d.ts.map