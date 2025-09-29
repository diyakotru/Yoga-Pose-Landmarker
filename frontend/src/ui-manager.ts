import { UIElements, UIState } from './types.js';

export class UIManager {
  private state: UIState = {
    isInitialized: false,
    isRecording: false,
    status: 'Camera not ready'
  };

  constructor(private elements: UIElements) {
    this.validateElements();
    this.setupInitialState();
  }

  private validateElements(): void {
    const requiredElements = ['startBtn', 'stopBtn', 'statusDisplay', 'poseCanvas'];
    
    for (const elementName of requiredElements) {
      const element = this.elements[elementName as keyof UIElements];
      if (!element) {
        throw new Error(`Required UI element not found: ${elementName}`);
      }
    }
  }

  private setupInitialState(): void {
    console.log('[UI] Setting up initial state...');
    
    // Initialize button states explicitly
    this.elements.startBtn.style.display = 'inline-flex';
    this.elements.startBtn.style.visibility = 'visible';
    this.elements.startBtn.disabled = true; // Disabled until camera is ready
    
    // Make sure stop button is properly hidden initially
    this.elements.stopBtn.style.display = 'none';
    this.elements.stopBtn.style.visibility = 'hidden';
    this.elements.stopBtn.classList.add('hidden');
    
    // Status display styling
    this.elements.statusDisplay.className = 'status-display waiting';
    
    // Canvas setup
    if (this.elements.poseCanvas) {
      this.elements.poseCanvas.style.border = '2px solid #e0e0e0';
      this.elements.poseCanvas.style.borderRadius = '8px';
    }

    this.state.isInitialized = true;
    this.updateStatus('Loading camera...');
    
    console.log('[UI] Initial state setup complete');
  }

  updateStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    this.state.status = message;
    this.elements.statusDisplay.textContent = message;
    
    // Update status display styling
    this.elements.statusDisplay.className = `status-display ${type}`;
    
    console.log(`[UI] Status: ${message} (${type})`);
  }

  setCameraReady(): void {
    this.elements.startBtn.disabled = false;
    this.updateStatus('Camera ready - Click Start to begin recording', 'success');
    
    if (this.elements.poseCanvas) {
      this.elements.poseCanvas.style.border = '2px solid #10b981';
    }
  }

  setCameraError(error: string): void {
    this.elements.startBtn.disabled = true;
    this.updateStatus(`Camera error: ${error}`, 'error');
    
    if (this.elements.poseCanvas) {
      this.elements.poseCanvas.style.border = '2px solid #ef4444';
    }
  }

  setRecordingState(isRecording: boolean): void {
    console.log('[UI] Setting recording state:', isRecording);
    this.state.isRecording = isRecording;

    if (isRecording) {
      // Recording state - Show stop button, hide start button
      console.log('[UI] Showing stop button, hiding start button');
      this.elements.startBtn.style.display = 'none';
      this.elements.startBtn.style.visibility = 'hidden';
      
      // Show stop button explicitly
      this.elements.stopBtn.style.display = 'inline-flex';
      this.elements.stopBtn.style.visibility = 'visible';
      this.elements.stopBtn.disabled = false;
      this.elements.stopBtn.classList.remove('hidden');
      
      console.log('[UI] Stop button styles:', {
        display: this.elements.stopBtn.style.display,
        visibility: this.elements.stopBtn.style.visibility,
        classList: this.elements.stopBtn.className,
        disabled: this.elements.stopBtn.disabled
      });

      this.updateStatus('Recording... Click Stop when finished', 'warning');

      // Update camera status badge
      if (this.elements.cameraStatus) {
        this.elements.cameraStatus.textContent = 'Recording';
        this.elements.cameraStatus.className = 'info-badge recording';
      }

      if (this.elements.poseCanvas) {
        this.elements.poseCanvas.style.border = '2px solid #f59e0b';
      }
    } else {
      // Stopped state - Show start button, hide stop button
      console.log('[UI] Showing start button, hiding stop button');
      this.elements.startBtn.style.display = 'inline-flex';
      this.elements.startBtn.style.visibility = 'visible';
      this.elements.startBtn.disabled = false;
      
      // Hide stop button explicitly
      this.elements.stopBtn.style.display = 'none';
      this.elements.stopBtn.style.visibility = 'hidden';
      this.elements.stopBtn.classList.add('hidden');

      // Reset camera status badge
      if (this.elements.cameraStatus) {
        this.elements.cameraStatus.textContent = 'Live Detection';
        this.elements.cameraStatus.className = 'info-badge';
      }

      if (this.elements.poseCanvas) {
        this.elements.poseCanvas.style.border = '2px solid #10b981';
      }
    }
  }  showRecordingComplete(frameCount: number, duration: number): void {
    const durationSeconds = Math.round(duration / 1000 * 100) / 100;
    this.updateStatus(
      `Recording complete: ${frameCount} frames, ${durationSeconds}s`, 
      'success'
    );
  }

  showSaving(): void {
    this.updateStatus('Saving recording...', 'info');
    this.elements.startBtn.disabled = true;
    this.elements.stopBtn.disabled = true;
  }

  showSaveComplete(): void {
    this.updateStatus('Recording saved successfully!', 'success');
    this.elements.startBtn.disabled = false;
    this.elements.stopBtn.disabled = false;
  }

  showSaveError(error: string): void {
    this.updateStatus(`Save failed: ${error}`, 'error');
    this.elements.startBtn.disabled = false;
    this.elements.stopBtn.disabled = false;
  }

  showPoseDetected(): void {
    // Visual feedback when pose is detected
    if (this.elements.poseCanvas) {
      this.elements.poseCanvas.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
    }
  }

  hidePoseDetected(): void {
    // Remove visual feedback
    if (this.elements.poseCanvas) {
      this.elements.poseCanvas.style.boxShadow = 'none';
    }
  }

  updateRecordingTime(timeMs: number): void {
    const seconds = Math.round(timeMs / 1000 * 10) / 10;
    this.updateStatus(`Recording: ${seconds}s - Click Stop when finished`, 'warning');
  }

  setCanvasSize(width: number, height: number): void {
    if (this.elements.poseCanvas) {
      this.elements.poseCanvas.width = width;
      this.elements.poseCanvas.height = height;
    }
  }

  getCanvasContext(): CanvasRenderingContext2D | null {
    if (!this.elements.poseCanvas) {
      console.error('[UI] Canvas element not found');
      return null;
    }
    
    const ctx = this.elements.poseCanvas.getContext('2d');
    if (!ctx) {
      console.error('[UI] Could not get 2D context from canvas');
      return null;
    }
    
    return ctx;
  }

  clearCanvas(): void {
    const ctx = this.getCanvasContext();
    if (ctx && this.elements.poseCanvas) {
      ctx.clearRect(0, 0, this.elements.poseCanvas.width, this.elements.poseCanvas.height);
    }
  }

  drawPoseLandmarks(landmarks: any[], canvasWidth: number, canvasHeight: number): void {
    const ctx = this.getCanvasContext();
    if (!ctx || !landmarks || landmarks.length === 0) {
      return;
    }

    // Clear previous drawings
    this.clearCanvas();

    // Set drawing styles
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;

    // Draw landmarks as circles
    landmarks.forEach((landmark, index) => {
      if (landmark.visibility && landmark.visibility > 0.5) {
        const x = landmark.x * canvasWidth;
        const y = landmark.y * canvasHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw pose connections (simplified)
    this.drawPoseConnections(ctx, landmarks, canvasWidth, canvasHeight);
  }

  private drawPoseConnections(
    ctx: CanvasRenderingContext2D, 
    landmarks: any[], 
    canvasWidth: number, 
    canvasHeight: number
  ): void {
    // Define basic pose connections (simplified set)
    const connections = [
      [11, 12], // shoulders
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // torso
      [23, 24], // hips
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28], // right leg
    ];

    ctx.beginPath();
    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end] && 
          landmarks[start].visibility > 0.5 && landmarks[end].visibility > 0.5) {
        const startX = landmarks[start].x * canvasWidth;
        const startY = landmarks[start].y * canvasHeight;
        const endX = landmarks[end].x * canvasWidth;
        const endY = landmarks[end].y * canvasHeight;
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
      }
    });
    ctx.stroke();
  }

  // Getters for state
  isRecording(): boolean {
    return this.state.isRecording;
  }

  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  getStatus(): string {
    return this.state.status;
  }

  // Cleanup method
  cleanup(): void {
    this.clearCanvas();
    this.updateStatus('Application closed', 'info');
  }

  // Error handling
  handleError(error: Error | string, context: string = 'UI'): void {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(`[${context}] Error:`, errorMessage);
    this.updateStatus(`Error: ${errorMessage}`, 'error');
  }

  // Utility method to get element safely
  getElement<K extends keyof UIElements>(elementName: K): UIElements[K] {
    const element = this.elements[elementName];
    if (!element) {
      throw new Error(`UI element not found: ${elementName}`);
    }
    return element;
  }
}