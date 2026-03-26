import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import TWEEN from '@tweenjs/tween.js';
import {
  getResponsiveCameraSettings,
  initialZoomStartPositions,
  initialModelRotations,
  targetAnimationNameMap,
  asciiCharacters,
  asciiResolution,
  asciiScale,
  modelRotationSpeed
} from '../config/cameraConfig';

const modelPaths = {
  coder: '/allrounder.glb',
  about: '/allrounder.glb',
  contact: '/allrounder.glb',
  portfolio: '/allrounder.glb'
};

const computerModelPath = '/computer.glb';

export default function ThreeScene({
  currentSection,
  onLoadProgress,
  onModelsLoaded,
  onSceneReady,
  onSectionChange,
  onModelBoundsUpdate,
  startZoom
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const effectRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(null);
  const loaderRef = useRef(null);
  const computerModelRef = useRef(null);
  const animationClipsStoreRef = useRef({});
  
  const currentModelKeyRef = useRef('coder');
  const isAnimatingCameraRef = useRef(false);
  const targetOfCurrentAnimationRef = useRef(null);
  const justCompletedTweenRef = useRef(false);
  const homeFillLightRef = useRef(null);
  const homeRimLightRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const animationFrameRef = useRef(null);

  // Store callback props in refs to avoid stale closures
  const onLoadProgressRef = useRef(onLoadProgress);
  const onModelsLoadedRef = useRef(onModelsLoaded);
  const onSceneReadyRef = useRef(onSceneReady);
  const onSectionChangeRef = useRef(onSectionChange);
  const onModelBoundsUpdateRef = useRef(onModelBoundsUpdate);
  onLoadProgressRef.current = onLoadProgress;
  onModelsLoadedRef.current = onModelsLoaded;
  onSceneReadyRef.current = onSceneReady;
  onSectionChangeRef.current = onSectionChange;
  onModelBoundsUpdateRef.current = onModelBoundsUpdate;

  const cleanMaterial = useCallback((material) => {
    if (!material) return;
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    material.dispose();
  }, []);

  const updateHomeSpecificLighting = useCallback((isHomeScreen) => {
    if (homeFillLightRef.current) {
      homeFillLightRef.current.visible = isHomeScreen;
    }
    if (homeRimLightRef.current) {
      homeRimLightRef.current.visible = isHomeScreen;
    }
  }, []);

  const loadNewModel = useCallback((modelKeyToLoad, onLoadedCallback) => {
    if (!modelKeyToLoad || !modelPaths[modelKeyToLoad]) {
      console.error(`Invalid modelKeyToLoad or path not found: ${modelKeyToLoad}`);
      if (onLoadedCallback) onLoadedCallback(false);
      return;
    }

    const path = modelPaths[modelKeyToLoad];
    const scene = sceneRef.current;
    const loader = loaderRef.current;

    // Clean up old model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material.isMaterial) {
            cleanMaterial(child.material);
          } else if (Array.isArray(child.material)) {
            child.material.forEach(cleanMaterial);
          }
        }
      });
    }

    loader.load(path, (gltf) => {
      modelRef.current = gltf.scene;
      scene.add(modelRef.current);
      currentModelKeyRef.current = modelKeyToLoad;

      updateHomeSpecificLighting(modelKeyToLoad === 'coder');

      if (computerModelRef.current) {
        computerModelRef.current.visible = (modelKeyToLoad === 'coder');
      }

      // Store animations
      const modelFileKey = path;
      if (!animationClipsStoreRef.current[modelFileKey]) {
        animationClipsStoreRef.current[modelFileKey] = {};
      }
      gltf.animations.forEach(clip => {
        animationClipsStoreRef.current[modelFileKey][clip.name] = clip;
      });

      // Setup animation
      if (gltf.animations && gltf.animations.length) {
        mixerRef.current = new THREE.AnimationMixer(modelRef.current);
        let animationClipToPlay = null;

        if (path === '/allrounder.glb') {
          const animationNameToPlay = targetAnimationNameMap[modelKeyToLoad];
          if (animationNameToPlay) {
            animationClipToPlay = gltf.animations.find(clip => clip.name === animationNameToPlay);
            if (!animationClipToPlay) {
              animationClipToPlay = gltf.animations[0];
            }
          } else {
            animationClipToPlay = gltf.animations[0];
          }
        } else {
          animationClipToPlay = gltf.animations[0];
        }

        if (animationClipToPlay) {
          const action = mixerRef.current.clipAction(animationClipToPlay);
          action.reset().play();
        }
      }

      // Scale and center model
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      modelRef.current.scale.set(scale, scale, scale);
      modelRef.current.position.sub(center.multiplyScalar(scale));

      if (onLoadedCallback) onLoadedCallback(true);
    }, undefined, (error) => {
      console.error(`Error loading model ${modelKeyToLoad}:`, error);
      if (onLoadedCallback) onLoadedCallback(false);
    });
  }, [cleanMaterial, updateHomeSpecificLighting]);

  const performInitialZoomOutAnimation = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    console.log('[Zoom] performInitialZoomOutAnimation called');
    console.log('[Zoom] camera pos:', camera?.position?.toArray());
    
    const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
    const startConfig = initialZoomStartPositions[deviceType];

    if (controls) {
      controls.target.set(startConfig.target.x, startConfig.target.y, startConfig.target.z);
      controls.update();
    }

    const finalPerspectiveSettings = getResponsiveCameraSettings('coder');
    if (!finalPerspectiveSettings) {
      console.error('[Zoom] No final perspective settings found!');
      if (controls) controls.enabled = true;
      isAnimatingCameraRef.current = false;
      return;
    }

    const currentCamPos = camera.position.clone();
    const currentTargetPos = controls ? controls.target.clone() : new THREE.Vector3(startConfig.target.x, startConfig.target.y, startConfig.target.z);

    const finalPos = new THREE.Vector3(finalPerspectiveSettings.position.x, finalPerspectiveSettings.position.y, finalPerspectiveSettings.position.z);
    const finalTarget = new THREE.Vector3(finalPerspectiveSettings.target.x, finalPerspectiveSettings.target.y, finalPerspectiveSettings.target.z);

    console.log('[Zoom] From:', currentCamPos.toArray(), '-> To:', finalPos.toArray());
    console.log('[Zoom] Active tweens before start:', TWEEN.getAll().length);

    isAnimatingCameraRef.current = true;
    if (controls) controls.enabled = false;

    const tween = new TWEEN.Tween({
      camX: currentCamPos.x,
      camY: currentCamPos.y,
      camZ: currentCamPos.z,
      targetX: currentTargetPos.x,
      targetY: currentTargetPos.y,
      targetZ: currentTargetPos.z
    }, true)
      .to({
        camX: finalPos.x,
        camY: finalPos.y,
        camZ: finalPos.z,
        targetX: finalTarget.x,
        targetY: finalTarget.y,
        targetZ: finalTarget.z
      }, 3000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        console.log('[Zoom] Tween started!');
      })
      .onUpdate((obj) => {
        camera.position.set(obj.camX, obj.camY, obj.camZ);
        if (controls) controls.target.set(obj.targetX, obj.targetY, obj.targetZ);
        camera.lookAt(controls ? controls.target : new THREE.Vector3(obj.targetX, obj.targetY, obj.targetZ));
      })
      .onComplete(() => {
        console.log('[Zoom] Tween complete!');
        isAnimatingCameraRef.current = false;
        if (controls) controls.enabled = true;
        
        camera.position.copy(finalPos);
        if (controls) {
          controls.target.copy(finalTarget);
          controls.update();
        }
        camera.lookAt(finalTarget);
        justCompletedTweenRef.current = true;
        isInitialLoadRef.current = false;
        
        if (onSceneReadyRef.current) onSceneReadyRef.current();
      })
      .start();
    
    console.log('[Zoom] Active tweens after start:', TWEEN.getAll().length);
  }, []);

  const switchModelAndAnimateCamera = useCallback((newModelKeyFromLink) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (isAnimatingCameraRef.current) {
      if (targetOfCurrentAnimationRef.current === newModelKeyFromLink) {
        return;
      }
      TWEEN.removeAll();
    }

    targetOfCurrentAnimationRef.current = newModelKeyFromLink;
    isAnimatingCameraRef.current = true;
    if (controls) controls.enabled = false;

    const targetPerspective = getResponsiveCameraSettings(newModelKeyFromLink);
    if (!targetPerspective) {
      targetOfCurrentAnimationRef.current = null;
      isAnimatingCameraRef.current = false;
      return;
    }

    // Calculate end state
    const endPos = new THREE.Vector3(targetPerspective.position.x, targetPerspective.position.y, targetPerspective.position.z);
    const endTarget = new THREE.Vector3(targetPerspective.target.x, targetPerspective.target.y, targetPerspective.target.z);
    const endVec = endPos.clone().sub(endTarget);
    const endRadius = endVec.length();
    const endYOverR = endRadius > 0.001 ? Math.max(-1, Math.min(1, endVec.y / endRadius)) : 1;
    const endPhi = Math.acos(endYOverR);
    const endTheta = endRadius > 0.001 ? Math.atan2(endVec.x, endVec.z) : 0;

    // Calculate start state
    let startPosForTween = camera.position.clone();
    let startTargetForTween = controls ? controls.target.clone() : new THREE.Vector3();

    if (currentModelKeyRef.current === 'coder' && newModelKeyFromLink !== 'coder') {
      const homePerspective = getResponsiveCameraSettings('coder');
      if (homePerspective) {
        startPosForTween.set(homePerspective.position.x, homePerspective.position.y, homePerspective.position.z);
        startTargetForTween.set(homePerspective.target.x, homePerspective.target.y, homePerspective.target.z);
        camera.position.copy(startPosForTween);
        camera.up.set(0, 1, 0);
        if (controls) {
          controls.target.copy(startTargetForTween);
          controls.update();
        }
        camera.lookAt(startTargetForTween);
      }
    }

    const startVecForTween = startPosForTween.clone().sub(startTargetForTween);
    const startRadiusForTween = startVecForTween.length();
    const startYOverRForTween = startRadiusForTween > 0.001 ? Math.max(-1, Math.min(1, startVecForTween.y / startRadiusForTween)) : 1;
    const startPhiForTween = Math.acos(startYOverRForTween);
    const initialThetaForSpin = startRadiusForTween > 0.001 ? Math.atan2(startVecForTween.x, startVecForTween.z) : 0;

    const duration = 2000;
    const currentOrbitCenter = new THREE.Vector3();

    let targetAnimatedTheta = endTheta + Math.PI * 2;
    if (targetAnimatedTheta < initialThetaForSpin + Math.PI) {
      targetAnimatedTheta += Math.PI * 2;
    }

    let modelSwappedInTween = false;

    new TWEEN.Tween({
      alpha: 0,
      animatedTheta: initialThetaForSpin
    }, true)
      .to({ alpha: 1, animatedTheta: targetAnimatedTheta }, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(({ alpha, animatedTheta }) => {
        currentOrbitCenter.lerpVectors(startTargetForTween, endTarget, alpha);
        const currentRadius = startRadiusForTween + (endRadius - startRadiusForTween) * alpha;
        const currentPhi = startPhiForTween + (endPhi - startPhiForTween) * alpha;

        camera.position.x = currentOrbitCenter.x + currentRadius * Math.sin(currentPhi) * Math.sin(animatedTheta);
        camera.position.y = currentOrbitCenter.y + currentRadius * Math.cos(currentPhi);
        camera.position.z = currentOrbitCenter.z + currentRadius * Math.sin(currentPhi) * Math.cos(animatedTheta);

        camera.lookAt(currentOrbitCenter);
        if (controls) controls.target.copy(currentOrbitCenter);

        const totalAngularTravel = targetAnimatedTheta - initialThetaForSpin;
        const halfwayAngularPoint = initialThetaForSpin + totalAngularTravel * 0.5;

        if (!modelSwappedInTween && animatedTheta >= halfwayAngularPoint) {
          const currentModelFile = modelPaths[currentModelKeyRef.current];
          const targetModelFile = modelPaths[newModelKeyFromLink];
          const animationNameForTargetKey = targetAnimationNameMap[newModelKeyFromLink];

          if (targetModelFile === '/allrounder.glb' && currentModelFile === '/allrounder.glb') {
            if (mixerRef.current && animationClipsStoreRef.current[targetModelFile] && animationClipsStoreRef.current[targetModelFile][animationNameForTargetKey]) {
              mixerRef.current.stopAllAction();
              const actionToPlay = mixerRef.current.clipAction(animationClipsStoreRef.current[targetModelFile][animationNameForTargetKey]);
              actionToPlay.reset().play();
            } else {
              loadNewModel(newModelKeyFromLink, () => {});
            }
          } else {
            loadNewModel(newModelKeyFromLink, () => {});
          }

          currentModelKeyRef.current = newModelKeyFromLink;

          if (modelRef.current && initialModelRotations[currentModelKeyRef.current]) {
            const rot = initialModelRotations[currentModelKeyRef.current];
            modelRef.current.rotation.set(rot.x, rot.y, rot.z);
          }

          modelSwappedInTween = true;

          if (computerModelRef.current) {
            computerModelRef.current.visible = (currentModelKeyRef.current === 'coder');
            if (currentModelKeyRef.current === 'coder') {
              computerModelRef.current.rotation.set(0, 0, 0);
            }
          }

          updateHomeSpecificLighting(currentModelKeyRef.current === 'coder');

          if (onSectionChangeRef.current) {
            onSectionChangeRef.current(currentModelKeyRef.current);
          }
        }
      })
      .onComplete(() => {
        const perspective = getResponsiveCameraSettings(newModelKeyFromLink);

        if (perspective) {
          const finalEndPos = new THREE.Vector3(perspective.position.x, perspective.position.y, perspective.position.z);
          const finalEndTarget = new THREE.Vector3(perspective.target.x, perspective.target.y, perspective.target.z);

          camera.position.copy(finalEndPos);
          if (controls) controls.target.copy(finalEndTarget);
          camera.lookAt(finalEndTarget);
        }

        targetOfCurrentAnimationRef.current = null;
        isAnimatingCameraRef.current = false;
        if (controls) {
          controls.enabled = true;
          const oldDamping = controls.enableDamping;
          controls.enableDamping = false;
          controls.update();
          controls.enableDamping = oldDamping;
        }
        justCompletedTweenRef.current = true;
      })
      .start();
  }, [loadNewModel, updateHomeSpecificLighting]);

  // Handle section changes from parent
  useEffect(() => {
    if (currentSection && currentSection !== currentModelKeyRef.current && !isInitialLoadRef.current) {
      switchModelAndAnimateCamera(currentSection);
    }
  }, [currentSection, switchModelAndAnimateCamera]);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const initialSettings = getResponsiveCameraSettings('coder');
    camera.position.set(initialSettings.position.x, initialSettings.position.y, initialSettings.position.z);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    // ASCII Effect
    const effect = new AsciiEffect(renderer, asciiCharacters, { invert: true, resolution: asciiResolution, scale: asciiScale, resolutionMatch: false });
    effect.setSize(window.innerWidth, window.innerHeight);
    effect.domElement.style.color = '#FFFFFF';
    effect.domElement.style.backgroundColor = 'transparent';
    effect.domElement.style.paddingLeft = '0';
    containerRef.current.appendChild(effect.domElement);
    effectRef.current = effect;

    // Clock
    clockRef.current = new THREE.Clock();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const homeFillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    homeFillLight.position.set(-1, 0.75, -1);
    scene.add(homeFillLight);
    homeFillLightRef.current = homeFillLight;

    const homeRimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    homeRimLight.position.set(0.5, 1, 0.5);
    scene.add(homeRimLight);
    homeRimLightRef.current = homeRimLight;

    updateHomeSpecificLighting(true);

    // Loaders
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/');
    loader.setDRACOLoader(dracoLoader);
    loaderRef.current = loader;

    // Loading manager
    const loadingManager = new THREE.LoadingManager();
    
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.round((itemsLoaded / itemsTotal) * 100);
      if (onLoadProgressRef.current) onLoadProgressRef.current(progress);
    };

    loadingManager.onLoad = () => {
      console.log('[ThreeScene] loadingManager.onLoad fired');
      const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
      const startConfig = initialZoomStartPositions[deviceType];
      camera.position.set(startConfig.position.x, startConfig.position.y, startConfig.position.z);
      camera.lookAt(new THREE.Vector3(startConfig.target.x, startConfig.target.y, startConfig.target.z));
      console.log('[ThreeScene] Camera snapped to zoom start:', camera.position.toArray());
      
      loader.manager = THREE.DefaultLoadingManager;
      
      // Signal models are loaded — triggers overlay fade-out
      console.log('[ThreeScene] Calling onModelsLoaded');
      if (onModelsLoadedRef.current) onModelsLoadedRef.current();
    };

    loader.manager = loadingManager;

    // Controls
    const controls = new OrbitControls(camera, effect.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(initialSettings.target.x, initialSettings.target.y, initialSettings.target.z);
    controls.enablePan = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controls.update();
    controlsRef.current = controls;

    // Load initial model
    loadNewModel('coder', () => {});

    // Load computer model
    loader.load(computerModelPath, (gltf) => {
      computerModelRef.current = gltf.scene;
      computerModelRef.current.scale.set(10, 10, 10);
      computerModelRef.current.position.set(0, -0.2, 0.5);
      scene.add(computerModelRef.current);
      computerModelRef.current.visible = false;
    });

    // Project model bounding box to screen space
    const boundsBox = new THREE.Box3();
    const screenCorners = [];
    for (let i = 0; i < 8; i++) screenCorners.push(new THREE.Vector3());
    let boundsFrameCount = 0;

    const projectModelBounds = () => {
      // Only compute every 3 frames for perf
      boundsFrameCount++;
      if (boundsFrameCount % 3 !== 0) return;
      if (!modelRef.current || !onModelBoundsUpdateRef.current) return;

      boundsBox.setFromObject(modelRef.current);
      const min = boundsBox.min;
      const max = boundsBox.max;

      // 8 corners of the bounding box
      screenCorners[0].set(min.x, min.y, min.z);
      screenCorners[1].set(min.x, min.y, max.z);
      screenCorners[2].set(min.x, max.y, min.z);
      screenCorners[3].set(min.x, max.y, max.z);
      screenCorners[4].set(max.x, min.y, min.z);
      screenCorners[5].set(max.x, min.y, max.z);
      screenCorners[6].set(max.x, max.y, min.z);
      screenCorners[7].set(max.x, max.y, max.z);

      let sxMin = Infinity, syMin = Infinity, sxMax = -Infinity, syMax = -Infinity;
      const w = window.innerWidth;
      const h = window.innerHeight;

      for (let i = 0; i < 8; i++) {
        const v = screenCorners[i].project(camera);
        const sx = (v.x * 0.5 + 0.5) * w;
        const sy = (-v.y * 0.5 + 0.5) * h;
        if (sx < sxMin) sxMin = sx;
        if (sy < syMin) syMin = sy;
        if (sx > sxMax) sxMax = sx;
        if (sy > syMax) syMax = sy;
      }

      // Clamp to viewport and add a small padding
      const pad = 20;
      onModelBoundsUpdateRef.current({
        left: Math.max(0, sxMin - pad),
        top: Math.max(0, syMin - pad),
        right: Math.min(w, sxMax + pad),
        bottom: Math.min(h, syMax + pad),
        width: w,
        height: h
      });
    };

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      TWEEN.update();

      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (!isAnimatingCameraRef.current && controls.enabled) {
        if (justCompletedTweenRef.current) {
          justCompletedTweenRef.current = false;
        } else {
          controls.update();
        }
      }

      // Auto-rotation for coder view
      if (!isAnimatingCameraRef.current) {
        if (currentModelKeyRef.current === 'coder') {
          if (modelRef.current) {
            modelRef.current.rotation.y += modelRotationSpeed;
          }
          if (computerModelRef.current && computerModelRef.current.visible) {
            computerModelRef.current.rotation.y += modelRotationSpeed;
          }
        }
      }

      renderer.render(scene, camera);
      effect.render(scene, camera);

      projectModelBounds();
    };

    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      effect.setSize(window.innerWidth, window.innerHeight);

      const settings = getResponsiveCameraSettings(currentModelKeyRef.current);
      if (!isAnimatingCameraRef.current && !justCompletedTweenRef.current && settings) {
        camera.position.set(settings.position.x, settings.position.y, settings.position.z);
        controls.target.set(settings.target.x, settings.target.y, settings.target.z);
        controls.update();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && effect.domElement) {
        containerRef.current.removeChild(effect.domElement);
      }
      renderer.dispose();
      TWEEN.removeAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start zoom animation when overlay fade completes
  useEffect(() => {
    if (startZoom) {
      console.log('[ThreeScene] startZoom=true, calling performInitialZoomOutAnimation');
      console.log('[ThreeScene] cameraRef:', !!cameraRef.current, 'controlsRef:', !!controlsRef.current);
      performInitialZoomOutAnimation();
    }
  }, [startZoom, performInitialZoomOutAnimation]);

  return <div ref={containerRef} className="three-scene-container" />;
}
