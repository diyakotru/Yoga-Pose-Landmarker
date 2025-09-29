import { BackendResponse, Landmark } from './types.js';

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

export class BackendService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:5000') {
    this.baseUrl = baseUrl;
  }

  async uploadLandmarks(data: Landmark[][]): Promise<UploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/upload_landmarks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
      });

      const result: UploadResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to upload landmarks:', error);
      throw error;
    }
  }

  async fetchLandmarks(limit?: number, offset?: number): Promise<Landmark[][]> {
    try {
      let url = `${this.baseUrl}/get_landmarks`;
      const params = new URLSearchParams();
      
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch landmarks:', error);
      return [];
    }
  }

  async fetchLandmarkMetadata(): Promise<LandmarkMetadata | null> {
    try {
      const response = await fetch(`${this.baseUrl}/get_landmarks_metadata`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.metadata : null;
    } catch (error) {
      console.error('Failed to fetch landmarks metadata:', error);
      return null;
    }
  }

  async deleteLandmarkRecording(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/delete_landmarks/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to delete landmark recording:', error);
      return false;
    }
  }

  async clearAllLandmarks(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/clear_all_landmarks`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to clear all landmarks:', error);
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.status === 'healthy';
      }
      
      return false;
    } catch (error) {
      console.warn('Backend connection check failed:', error);
      return false;
    }
  }

  async getHealthStatus(): Promise<{ status: string; message: string; timestamp: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to get health status:', error);
      return null;
    }
  }
}