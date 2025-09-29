import { Landmark } from './types.js';
export declare class AvatarRenderer {
    private container;
    private scene;
    private camera;
    private renderer;
    private bones;
    private joints;
    private animationId;
    private readonly connections;
    constructor(container: HTMLElement);
    private initializeThreeJS;
    private setupContainer;
    private setupLighting;
    private createBones;
    private createJoints;
    playAnimation(landmarksData: Landmark[][], onProgress?: (progress: number) => void): Promise<void>;
    private updatePose;
    private landmarkToVector3;
    stopAnimation(): void;
    dispose(): void;
    resetCamera(): void;
    enableCameraControls(): void;
}
//# sourceMappingURL=avatar-renderer.d.ts.map