import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import TWEEN from '@tweenjs/tween.js';

// --- Configuration ---
const modelPaths = {
    coder: './allrounder.glb',
    about: './allrounder.glb', // Changed to use the same model as 'coder'
    contact: './allrounder.glb', // Changed to use allrounder.glb
    portfolio: './allrounder.glb' // Changed to use allrounder.glb
};
let currentModelKey = 'coder'; // Start with the coder model
let isAnimatingCamera = false;
let modelSwapped = false; // Flag to ensure model/animation swaps only once per spin
let currentInitialCameraSettings = {}; // Holds the current camera perspective settings
let animationClipsStore = {}; // Global store for animation clips { modelPath: { animationName: clip } }
let targetOfCurrentAnimation = null; // Stores the key of the state the camera is currently tweening towards

// Flag for initial load animation
let isInitialLoad = true;

// Flag to manage OrbitControls update immediately after tween completion
let justCompletedTween = false;

// --- Camera Perspectives Configuration ---
// User will update these values after finding them via console logs
const cameraPerspectives = {
    desktop: {
        coder:     { position: { x:  -1.933, y: 0.773, z: 1.673 }, target: { x: 0.026, y: -0.273, z: 0.143 } },
        about:     { position: { x: -0.022, y: 0.981, z: 0.489}, target: { x: -0.356, y: 0.497, z: -0.143 } },
        contact:   { position: { x: -0.149, y: 0.477, z: 0.679 }, target: { x: 0.655, y: 0.665, z: -0.064 } },
        portfolio: { position: { x: 1.760, y: -0.764, z: 0.337}, target: { x: 0.603, y: -0.166, z: -0.290} }
    },
    mobile: {
        coder:     { position: { x: -1.933, y: 0.773, z: 1.673 }, target: { x: 0.216, y: -0.140, z: 0.389 } },
        about:     { position: { x: -0.031, y: 1.064, z: 0.431 }, target: { x: -0.025, y: 0.995, z: 0.006 } },
        contact:   { position: { x: 0.056, y: 0.628, z: 1.119}, target: { x: 0.083, y: 0.761, z: 0.083 } },
        portfolio: { position: { x: 2.354, y: -0.486, z: 1.339 }, target: { x: 0.135, y: 0.490, z: -0.030 } }
    }
};

const initialModelRotations = {
    coder:     { x: 0, y: 0, z: 0 },
    about:     { x: 0, y: 0, z: 0 },
    contact:   { x: 0, y: 0, z: 0 },
    portfolio: { x: 0, y: 0, z: 0 }
};

const asciiCharacters = ' .:-=+*#%@░';
const asciiResolution = 0.25;
const asciiScale = 1;
const modelRotationSpeed = 0.004; // Will be handled by animation or OrbitControls
// ---------------------

let camera, scene, renderer, effect, controls;
let model, mixer, clock;
let loader, dracoLoader; // Make loaders global
let computerModel = null; // To store the computer model
const computerModelPath = './computer.glb'; // Path to the computer model

// HTML Overlay Elements
let homeOverlay, aboutOverlay, contactOverlay, portfolioOverlay;
let allOverlays = [];

// Typing animation variables
const overlayOriginalTexts = {};
let currentTextAnimationInterval = null;
const typingSpeedMs = 50; // ms per character or line step
const useLineTyping = true; // true for line-by-line, false for char-by-char
let activeTypingOverlayId = null;

let aboutBodyOriginalHTML = ''; // To store the original HTML of the about body text
let currentAboutBodyAnimationInterval = null;
let activeAboutBodyTyping = false;

const typingAnimSpeed = 50; // General speed for ASCII art

// Home-specific lights
let homeFillLight, homeRimLight;

// Global store for animation clips from loaded models

// --- Typing Effect and Connection Info ---
// Removed the typingSpeed constant

function loadNewModel(modelKeyToLoad, onLoadedCallback) {
    if (!modelKeyToLoad || !modelPaths[modelKeyToLoad]) {
        console.error(`Invalid modelKeyToLoad or path not found: ${modelKeyToLoad}`);
        if (onLoadedCallback) onLoadedCallback(false);
        return;
    }
    console.log(`[loadNewModel] Called with modelKeyToLoad: ${modelKeyToLoad}. Current currentModelKey: ${currentModelKey}`);

    const path = modelPaths[modelKeyToLoad];
    console.log(`[loadNewModel] Loading model from path: ${path}`);

    // Clean up old model if it exists
    let oldModel = model;
    if (oldModel) {
        scene.remove(oldModel);
        // Dispose of old model's assets
        oldModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material.isMaterial) {
                    cleanMaterial(child.material);
                } else if (Array.isArray(child.material)) {
                    child.material.forEach(cleanMaterial);
                }
            }
        });
        console.log(`Disposed of old model: ${currentModelKey}`);
    }

    loader.load(modelPaths[modelKeyToLoad], (gltf) => {
        model = gltf.scene;
        scene.add(model);
        console.log(`[loadNewModel] Loaded new model: ${modelKeyToLoad} from ${modelPaths[modelKeyToLoad]}`);
        
        // IMPORTANT: Update currentModelKey after successful load and before animation setup for this key
        console.log(`[loadNewModel] About to set currentModelKey from '${currentModelKey}' to '${modelKeyToLoad}'`);
        currentModelKey = modelKeyToLoad;
        console.log(`[loadNewModel] currentModelKey is NOW: ${currentModelKey}`);

        updateHomeSpecificLighting(currentModelKey === 'coder');

        // Manage computerModel visibility based on the newly set currentModelKey
        if (computerModel) {
            computerModel.visible = (currentModelKey === 'coder');
            console.log(`[loadNewModel] Computer model visibility set to ${computerModel.visible} for key ${currentModelKey}`);
        }

        // Store all animations from this model in the global store
        const modelFileKey = modelPaths[modelKeyToLoad]; // e.g., './allrounder.glb'
        if (!animationClipsStore[modelFileKey]) {
            animationClipsStore[modelFileKey] = {};
        }
        gltf.animations.forEach(clip => {
            animationClipsStore[modelFileKey][clip.name] = clip;
            // console.log(`Stored clip: ${clip.name} for ${modelFileKey}`);
        });

        // Log available animations from the loaded model
        if (gltf.animations && gltf.animations.length > 0) {
            console.log(`Available animations in ${modelKeyToLoad}:`);
            gltf.animations.forEach((clip, index) => {
                console.log(`  [${index}]: ${clip.name}`);
            });
        } else {
            console.log(`No animations found in ${modelKeyToLoad}.`);
        }

        // Animation setup (if any animations exist in the new model)
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(model);
            let animationClipToPlay = null;

            // Determine the correct animation to play based on modelKeyToLoad for allrounder.glb
            const targetAnimationNameMap = { 
                coder: 'Home', 
                about: 'About', 
                contact: 'Contact', 
                portfolio: 'Portfolio' 
            };

            if (modelPaths[modelKeyToLoad] === './allrounder.glb') {
                const animationNameToPlay = targetAnimationNameMap[modelKeyToLoad];
                if (animationNameToPlay) {
                    animationClipToPlay = gltf.animations.find(clip => clip.name === animationNameToPlay);
                    if (!animationClipToPlay) {
                        console.warn(`Animation '${animationNameToPlay}' not found in ${modelKeyToLoad} (${modelPaths[modelKeyToLoad]}). Playing first available.`);
                        animationClipToPlay = gltf.animations[0]; // Fallback
                    }
                } else {
                    console.warn(`No specific animation defined for ${modelKeyToLoad} in targetAnimationNameMap. Playing first available.`);
                    animationClipToPlay = gltf.animations[0]; // Fallback
                }
            } else {
                // Fallback for any other model files (not allrounder.glb)
                animationClipToPlay = gltf.animations[0]; 
            }

            if (animationClipToPlay) {
                const action = mixer.clipAction(animationClipToPlay);
                action.reset().play();
                console.log(`Playing animation: ${animationClipToPlay.name} for model ${modelKeyToLoad}`);
            } else {
                console.log(`No suitable animation found or no animations present in ${modelKeyToLoad}.`);
            }
        } else {
            console.log(`No animations found in ${modelKeyToLoad}.`);
        }

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.set(scale, scale, scale);
        model.position.sub(center.multiplyScalar(scale));

        if (onLoadedCallback) onLoadedCallback(true);

    }, undefined, (error) => {
        console.error(`An error happened while loading model ${modelKeyToLoad}:`, error);
        if (onLoadedCallback) onLoadedCallback(false);
    });
}

function switchModelAndAnimateCamera(newModelKeyFromLink) {
    console.log(`[switchModelAndAnimateCamera] Called with newModelKeyFromLink: ${newModelKeyFromLink}. Current currentModelKey before tween: ${currentModelKey}`);

    if (isAnimatingCamera) {
        if (targetOfCurrentAnimation === newModelKeyFromLink) {
            console.log(`[switchModelAndAnimateCamera] Already animating to ${newModelKeyFromLink}. Ignoring call.`);
            return;
        }
        console.log(`[switchModelAndAnimateCamera] Camera is already animating (to ${targetOfCurrentAnimation}). Stopping existing tween(s) and starting new one for ${newModelKeyFromLink}.`);
        TWEEN.removeAll(); // Stop ALL active tweens to ensure a clean slate.
        // isAnimatingCamera will be set to false by the onComplete of the *stopped* tween if it fires quickly,
        // or by the new tween's onComplete. We'll set it to true again below.
    }

    // Update the target for the new animation we are about to start
    targetOfCurrentAnimation = newModelKeyFromLink;

    isAnimatingCamera = true;
    controls.enabled = false; // Disable controls during animation
    modelSwapped = false; // Reset model swap flag

    const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';

    // --- Define Target State (for the destination view) ---
    const finalPerspective = cameraPerspectives[deviceType][newModelKeyFromLink];
    if (!finalPerspective) {
        console.error(`[switchModelAndAnimateCamera] Critical: Final perspective for ${newModelKeyFromLink} on ${deviceType} not found! Cannot set final state.`);
        targetOfCurrentAnimation = null;
        isAnimatingCamera = false;
        return;
    }
    const endPos = new THREE.Vector3(finalPerspective.position.x, finalPerspective.position.y, finalPerspective.position.z);
    const endTarget = new THREE.Vector3(finalPerspective.target.x, finalPerspective.target.y, finalPerspective.target.z);
    const endVec = endPos.clone().sub(endTarget);
    const endRadius = endVec.length();
    const endYOverR = endRadius > 0.001 ? Math.max(-1, Math.min(1, endVec.y / endRadius)) : 1;
    const endPhi = Math.acos(endYOverR); // Polar angle from +Y
    const endTheta = endRadius > 0.001 ? Math.atan2(endVec.x, endVec.z) : 0; // Azimuthal angle in XZ plane

    // --- Define Starting State for the Tween ---
    let startPosForTween;
    let startTargetForTween;

    if (currentModelKey === 'coder') {
        const canonicalCoderPerspective = cameraPerspectives[deviceType]['coder'];
        if (canonicalCoderPerspective) {
            // FORCE SNAP to canonical 'coder' perspective before starting tween
            startPosForTween = new THREE.Vector3(canonicalCoderPerspective.position.x, canonicalCoderPerspective.position.y, canonicalCoderPerspective.position.z);
            startTargetForTween = new THREE.Vector3(canonicalCoderPerspective.target.x, canonicalCoderPerspective.target.y, canonicalCoderPerspective.target.z);
            
            // Update live camera and controls to this snapped position *before* tween starts
            camera.position.copy(startPosForTween);
            controls.target.copy(startTargetForTween);
            camera.lookAt(startTargetForTween); // Ensure camera is looking at the new target
            controls.update(); // IMPORTANT: Update controls to reflect the snap, so OrbitControls doesn't fight it
        } else {
            console.warn("[switchModelAndAnimateCamera] Canonical 'coder' perspective not found. Using live values.");
            startPosForTween = camera.position.clone();
            startTargetForTween = controls.target.clone();
        }
    } else {
        // For other views, use live values (smoother departure)
        startPosForTween = camera.position.clone();
        startTargetForTween = controls.target.clone();
    }

    let startTarget = controls.target.clone();

    // --- SNAP TO CANONICAL 'CODER' IF DEPARTING FROM 'CODER' --- 
    if (currentModelKey === 'coder' && newModelKeyFromLink !== 'coder') {
        console.log(`[Snapping Home] Departing 'coder' for '${newModelKeyFromLink}'. Snapping start of tween to canonical 'coder' perspective.`);
        const deviceTypeForSnap = window.innerWidth < 768 ? 'mobile' : 'desktop'; // Ensure correct device type
        const homePerspective = cameraPerspectives[deviceTypeForSnap]['coder'];
        if (homePerspective) {
            startPosForTween.set(homePerspective.position.x, homePerspective.position.y, homePerspective.position.z);
            startTargetForTween.set(homePerspective.target.x, homePerspective.target.y, homePerspective.target.z);
            
            // Immediately update camera and controls to this snapped state BEFORE tween calculation uses them
            // This ensures the visual starting point of the tween is the snapped canonical 'coder' view.
            camera.position.copy(startPosForTween);
            camera.up.set(0, 1, 0); // Explicitly reset camera up vector
            controls.target.copy(startTargetForTween);
            camera.lookAt(startTargetForTween);
            // It's important to call controls.update() here if controls might have been disabled
            // or to ensure OrbitControls internal state matches this forced position.
            controls.update(); 

            console.log(`[Snapping Home] Snapped startPosForTween to: Px=${startPosForTween.x.toFixed(3)}, Py=${startPosForTween.y.toFixed(3)}, Pz=${startPosForTween.z.toFixed(3)}`);
            console.log(`[Snapping Home] Snapped startTargetForTween for tween to: Tx=${startTargetForTween.x.toFixed(3)}, Ty=${startTargetForTween.y.toFixed(3)}, Tz=${startTargetForTween.z.toFixed(3)}`);
        } else {
            console.warn(`[Snapping Home] Canonical 'coder' perspective for '${deviceTypeForSnap}' not found for snapping. Tween will start from current camera state.`);
        }
    }
    // --- END SNAP LOGIC ---

    // Calculate initial radius, phi, and theta based on the determined startPosForTween and startTargetForTween
    const startVecForTween = startPosForTween.clone().sub(startTargetForTween);
    const startRadiusForTween = startVecForTween.length();
    const startYOverRForTween = startRadiusForTween > 0.001 ? Math.max(-1, Math.min(1, startVecForTween.y / startRadiusForTween)) : 1;
    const startPhiForTween = Math.acos(startYOverRForTween);
    const initialThetaForSpin = startRadiusForTween > 0.001 ? Math.atan2(startVecForTween.x, startVecForTween.z) : 0;

    // --- Tween Setup ---
    isAnimatingCamera = true;
    controls.enabled = false; // Disable controls during animation
    modelSwapped = false; // Reset model swap flag

    const duration = 2000; // Main animation duration
    const currentOrbitCenter = new THREE.Vector3(); // To be reused in onUpdate

    // The target theta for the tween includes a full spin and ends at the finalAzimuth
    let targetAnimatedTheta = endTheta + Math.PI * 2;
    // Ensure the spin is in a somewhat predictable direction (e.g., mostly positive)
    // If finalAzimuth is far behind initialThetaForSpin, adding just 2PI might result in a very short spin or reverse.
    // This ensures at least a full spin towards the finalAzimuth direction.
    if (targetAnimatedTheta < initialThetaForSpin + Math.PI) { // Heuristic: if target is less than a half-spin away + 2PI
        targetAnimatedTheta += Math.PI * 2; // Add another full spin to ensure it goes 'forward'
    }

    let modelSwappedInTween = false; // Renamed from modelSwapped to avoid conflict with global

    const tween = new TWEEN.Tween({
        alpha: 0, // Interpolation factor
        animatedTheta: initialThetaForSpin // Start theta for the spin
    })
        .to({ alpha: 1, animatedTheta: targetAnimatedTheta }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ alpha, animatedTheta }) => {
            // Interpolate orbit center from startTargetForTween to endTarget
            currentOrbitCenter.lerpVectors(startTargetForTween, endTarget, alpha);
            // Interpolate radius from startRadiusForTween to endRadius
            const currentRadius = startRadiusForTween + (endRadius - startRadiusForTween) * alpha;
            // Interpolate phi from startPhiForTween to endPhi
            const currentPhi = startPhiForTween + (endPhi - startPhiForTween) * alpha;

            camera.position.x = currentOrbitCenter.x + currentRadius * Math.sin(currentPhi) * Math.sin(animatedTheta);
            camera.position.y = currentOrbitCenter.y + currentRadius * Math.cos(currentPhi);
            camera.position.z = currentOrbitCenter.z + currentRadius * Math.sin(currentPhi) * Math.cos(animatedTheta);
            
            camera.lookAt(currentOrbitCenter);
            controls.target.copy(currentOrbitCenter);

            // Model/Animation Swap Logic - based on progress of the overall tween (alpha)
            // or progress of angular travel if preferred.
            // Using alpha is simpler here as angular travel might not be exactly 2*PI.
            const totalAngularTravel = targetAnimatedTheta - initialThetaForSpin;
            const halfwayAngularPoint = initialThetaForSpin + totalAngularTravel * 0.5;

            if (!modelSwappedInTween && animatedTheta >= halfwayAngularPoint) { // Or use alpha >= 0.5 for simpler halfway point
                const previousModelKey = currentModelKey; 
                const currentModelFile = modelPaths[previousModelKey]; 
                const targetModelFile = modelPaths[newModelKeyFromLink]; 
                const targetAnimationNameMap = { coder: 'Home', about: 'About', contact: 'Contact', portfolio: 'Portfolio' };
                const animationNameForTargetKey = targetAnimationNameMap[newModelKeyFromLink];
                let modelWasReloadedByLoadNewModel = false;

                if (targetModelFile === './allrounder.glb' && currentModelFile === './allrounder.glb') {
                    if (mixer && animationClipsStore[targetModelFile] && animationClipsStore[targetModelFile][animationNameForTargetKey]) {
                        mixer.stopAllAction();
                        const actionToPlay = mixer.clipAction(animationClipsStore[targetModelFile][animationNameForTargetKey]);
                        actionToPlay.reset().play();
                        console.log(`[TWEEN onUpdate] Switched to '${animationNameForTargetKey}' animation.`);
                    } else {
                        console.warn(`[TWEEN onUpdate] Animation '${animationNameForTargetKey}' not found or mixer issue. Reloading.`);
                        loadNewModel(newModelKeyFromLink, (success) => { /* log */ });
                        modelWasReloadedByLoadNewModel = true;
                    }
                } else {
                    loadNewModel(newModelKeyFromLink, (success) => { /* log */ });
                    modelWasReloadedByLoadNewModel = true;
                }
                
                if (!modelWasReloadedByLoadNewModel) {
                    currentModelKey = newModelKeyFromLink;
                }
                // AT THIS POINT, currentModelKey IS newModelKeyFromLink, and model is the correct one.
                // Apply initial rotation for the newModelKeyFromLink (which is now currentModelKey)
                if (model && initialModelRotations[currentModelKey]) { 
                    const rot = initialModelRotations[currentModelKey];
                    model.rotation.set(rot.x, rot.y, rot.z);
                    console.log(`[TWEEN onUpdate] Model rotation reset for ${currentModelKey} to x:${rot.x.toFixed(3)}, y:${rot.y.toFixed(3)}, z:${rot.z.toFixed(3)}`);
                } else {
                    if (!model) console.warn("[TWEEN onUpdate] Cannot set model rotation: model is undefined.");
                    if (!initialModelRotations[currentModelKey]) console.warn(`[TWEEN onUpdate] Cannot set model rotation: initialModelRotations for ${currentModelKey} is undefined.`);
                }

                modelSwappedInTween = true;
                console.log(`[TWEEN onUpdate] Model/Animation swap block. currentModelKey is NOW: ${currentModelKey}`);

                // Manage computerModel visibility and rotation based on the final currentModelKey for this state
                if (computerModel) {
                    computerModel.visible = (currentModelKey === 'coder');
                    if (currentModelKey === 'coder') {
                        // Reset computer model's rotation to default (0,0,0) when 'coder' view is active
                        computerModel.rotation.set(0, 0, 0);
                    }
                    console.log(`[TWEEN onUpdate] Computer model visibility set to ${computerModel.visible} for key ${currentModelKey}`);
                }
                // Update home-specific lighting based on the new currentModelKey
                updateHomeSpecificLighting(currentModelKey === 'coder');

                // --- Manage Text Overlays ---
                updateActiveOverlay(currentModelKey);
            }
        })
        .onComplete(() => {
            const finalDeviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
            const perspective = cameraPerspectives[finalDeviceType][newModelKeyFromLink];

            console.log(`[TWEEN onComplete] START for ${newModelKeyFromLink}. Target perspective:`, perspective ? JSON.stringify(perspective) : 'NOT FOUND');
            console.log(`[TWEEN onComplete] Camera BEFORE: Px=${camera.position.x.toFixed(3)}, Py=${camera.position.y.toFixed(3)}, Pz=${camera.position.z.toFixed(3)}`);
            console.log(`[TWEEN onComplete] Target BEFORE: Tx=${controls.target.x.toFixed(3)}, Ty=${controls.target.y.toFixed(3)}, Tz=${controls.target.z.toFixed(3)}`);

            if (perspective) {
                const finalEndPos = new THREE.Vector3(perspective.position.x, perspective.position.y, perspective.position.z);
                const finalEndTarget = new THREE.Vector3(perspective.target.x, perspective.target.y, perspective.target.z);

                camera.position.copy(finalEndPos);
                controls.target.copy(finalEndTarget); // This is THE most important line for the lookAt point
                camera.lookAt(finalEndTarget);        // This orients the camera based on its new position and the target
            } else {
                console.error(`[TWEEN onComplete] CRITICAL: Perspective for ${newModelKeyFromLink} on ${finalDeviceType} not found! Cannot set final state.`);
                // Fallback logic from previous version (if endPos/endTarget are in scope and defined)
                if (typeof endPos !== 'undefined' && typeof endTarget !== 'undefined') {
                    camera.position.copy(endPos);
                    controls.target.copy(endTarget);
                    camera.lookAt(endTarget);
                    console.warn('[TWEEN onComplete] Used fallback endPos/endTarget from outer scope.');
                } else {
                    console.error('[TWEEN onComplete] Fallback endPos/endTarget also undefined. Final camera state may be incorrect.');
                }
            }
            
            console.log(`[TWEEN onComplete] Camera AFTER: Px=${camera.position.x.toFixed(3)}, Py=${camera.position.y.toFixed(3)}, Pz=${camera.position.z.toFixed(3)}`);
            console.log(`[TWEEN onComplete] Target AFTER: Tx=${controls.target.x.toFixed(3)}, Ty=${controls.target.y.toFixed(3)}, Tz=${controls.target.z.toFixed(3)}`);

            targetOfCurrentAnimation = null; 
            isAnimatingCamera = false;       
            controls.enabled = true;         
            // Force OrbitControls to accept the new state and clear old momentum
            const oldDamping = controls.enableDamping;
            controls.enableDamping = false; // Temporarily disable damping
            console.log("[TWEEN onComplete] Temporarily disabled damping. Calling controls.update() to clear momentum.");
            controls.update(); // Call update. With damping off, it should just sync internal state.
            controls.enableDamping = oldDamping; // Restore damping
            console.log("[TWEEN onComplete] Restored damping. Damping is now:", controls.enableDamping);
            justCompletedTween = true; // Set flag to delay next animate() loop's controls.update()

            console.log(`[TWEEN onComplete] END for ${newModelKeyFromLink}. Controls enabled. isAnimatingCamera = false. justCompletedTween = true.`);
            // if (onCompleteCallback) onCompleteCallback(true); // Assuming onCompleteCallback is defined if used
        })
        .start();
}

function animateAboutBodyText(typeIn, callback) {
    const aboutOverlay = document.getElementById('about-overlay');
    if (!aboutOverlay) return;
    const aboutBodyElem = aboutOverlay.querySelector('.about-body-text');
    if (!aboutBodyElem) {
        if (callback) callback();
        return;
    }

    if (currentAboutBodyAnimationInterval) {
        clearInterval(currentAboutBodyAnimationInterval);
        currentAboutBodyAnimationInterval = null;
    }
    activeAboutBodyTyping = false;

    if (!typeIn) {
        aboutBodyElem.innerHTML = '';
        aboutBodyElem.style.display = 'none';
        if (callback) callback();
        return;
    }

    // Type In logic
    aboutBodyElem.innerHTML = ''; // Clear previous content
    aboutBodyElem.style.display = 'block';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aboutBodyOriginalHTML;
    const originalParagraphs = Array.from(tempDiv.querySelectorAll('p'));

    let pIndex = 0;
    let charIndex = 0;
    const bodyTypingSpeed = 20; // ms, adjust for desired speed
    activeAboutBodyTyping = true;

    currentAboutBodyAnimationInterval = setInterval(() => {
        if (pIndex >= originalParagraphs.length) {
            clearInterval(currentAboutBodyAnimationInterval);
            currentAboutBodyAnimationInterval = null;
            activeAboutBodyTyping = false;
            if (callback) callback();
            return;
        }

        let targetP;
        if (aboutBodyElem.children.length <= pIndex) {
            targetP = document.createElement('p');
            aboutBodyElem.appendChild(targetP);
        } else {
            targetP = aboutBodyElem.children[pIndex];
        }

        const sourceText = originalParagraphs[pIndex].textContent || '';

        if (charIndex < sourceText.length) {
            targetP.textContent += sourceText[charIndex];
            charIndex++;
        } else {
            // Current paragraph finished, move to the next
            pIndex++;
            charIndex = 0;
            // If there are more paragraphs, ensure the next one starts on a new iteration
            // This also handles empty paragraphs correctly by skipping them quickly.
            if (pIndex < originalParagraphs.length && (originalParagraphs[pIndex].textContent || '').length === 0) {
                 // If next paragraph is empty, create it and move on
                if (aboutBodyElem.children.length <= pIndex) {
                    aboutBodyElem.appendChild(document.createElement('p'));
                }
                pIndex++; // Skip to the one after empty one
            }
        }
    }, bodyTypingSpeed);
}

function animateOverlayText(overlayId, typeIn, callback, charMode = false) {
    const overlayElement = document.getElementById(overlayId);
    if (!overlayElement) {
        console.warn(`[animateOverlayText] Overlay element with ID '${overlayId}' not found.`);
        if (callback) callback();
        return;
    }

    if (currentTextAnimationInterval) { // If an animation is already running for ASCII/subheader
        clearInterval(currentTextAnimationInterval);
        currentTextAnimationInterval = null;
    }
    // If switching, ensure previous about body animation is stopped if it was for 'about'
    if (activeTypingOverlayId === 'about-overlay' && activeAboutBodyTyping) {
        animateAboutBodyText(false); // Stop and clear about body text
    }

    const preElement = overlayElement.querySelector('pre');
    const subheaderElement = overlayElement.querySelector('.subheader-text');
    const calendlyContainer = overlayId === 'contact-overlay' ? overlayElement.querySelector('.calendly-widget-container') : null;
    // const aboutBodyText = overlayId === 'about-overlay' ? overlayElement.querySelector('.about-body-text') : null;
    // About body text is handled by animateAboutBodyText, called separately.

    // If typing out 'about-overlay', also ensure its body text is cleared/hidden immediately.
    if (overlayId === 'about-overlay' && !typeIn) {
        animateAboutBodyText(false); 
    }

    const fullText = overlayOriginalTexts[overlayId] || '';
    let currentText = typeIn ? '' : fullText;

    preElement.textContent = currentText;
    overlayElement.style.display = 'block'; // Make sure overlay container is visible for animation

    if (!typeIn && subheaderElement) {
        subheaderElement.style.display = 'none'; // Hide subheader immediately when typing out
    }
    if (!typeIn && calendlyContainer) {
        calendlyContainer.style.display = 'none'; // Hide Calendly immediately when typing out contact
    }

    activeTypingOverlayId = overlayId; // Mark this overlay as the one being animated

    if (useLineTyping) {
        const lines = fullText.split('\n');
        let currentLineIndex = typeIn ? 0 : lines.length;

        currentTextAnimationInterval = setInterval(() => {
            if (typeIn) {
                if (currentLineIndex < lines.length) {
                    currentText = lines.slice(0, currentLineIndex + 1).join('\n');
                    preElement.textContent = currentText;
                    currentLineIndex++;
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    activeTypingOverlayId = null; // Animation complete
                    if (subheaderElement) subheaderElement.style.display = 'block'; // Show subheader
                    if (calendlyContainer) calendlyContainer.style.display = 'block'; // Show Calendly for contact
                    if (callback) callback();
                }
            } else { // Typing out
                if (currentLineIndex > 0) {
                    currentLineIndex--;
                    currentText = lines.slice(0, currentLineIndex).join('\n');
                    preElement.textContent = currentText;
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    overlayElement.style.display = 'none'; // Hide after typing out
                    // Subheader, Calendly, About body text are already hidden at the start of type-out
                    activeTypingOverlayId = null; // Animation complete
                    if (callback) callback();
                }
            }
        }, typingSpeedMs);
    } else { // Character-by-character typing
        let currentCharIndex = typeIn ? 0 : fullText.length;

        currentTextAnimationInterval = setInterval(() => {
            if (typeIn) {
                if (currentCharIndex < fullText.length) {
                    currentText = fullText.substring(0, currentCharIndex + 1);
                    preElement.textContent = currentText;
                    currentCharIndex++;
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    activeTypingOverlayId = null; // Animation complete
                    if (subheaderElement) subheaderElement.style.display = 'block'; // Show subheader
                    if (calendlyContainer) calendlyContainer.style.display = 'block'; // Show Calendly for contact
                    if (callback) callback();
                }
            } else { // Typing out
                if (currentCharIndex > 0) {
                    currentCharIndex--;
                    currentText = fullText.substring(0, currentCharIndex);
                    preElement.textContent = currentText;
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    overlayElement.style.display = 'none'; // Hide after typing out
                    // Subheader, Calendly, About body text are already hidden at the start of type-out
                    activeTypingOverlayId = null; // Animation complete
                    if (callback) callback();
                }
            }
        }, typingSpeedMs);
    }

    if (overlayId === 'about-overlay' && typeIn) {
        animateAboutBodyText(true, callback); // Chain to body text animation
    }
}

function updateActiveOverlay(newModelKey) {
    const newOverlayId = `${newModelKey}-overlay`;
    let previousOverlayId = null;

    // Find a currently visible overlay that is not the new one
    for (const overlay of allOverlays) {
        if (overlay && overlay.style.display === 'block' && overlay.id !== newOverlayId) {
            previousOverlayId = overlay.id;
            break;
        }
    }
    // If an animation was active on another overlay, that's our previous one.
    if (activeTypingOverlayId && activeTypingOverlayId !== newOverlayId) {
        previousOverlayId = activeTypingOverlayId;
    }

    // Clear any ongoing text animation immediately if we're switching
    if (currentTextAnimationInterval) {
        clearInterval(currentTextAnimationInterval);
        currentTextAnimationInterval = null;
        // If an animation was active on 'about', also stop its body text animation
        if (activeTypingOverlayId === 'about-overlay' && activeAboutBodyTyping) {
            animateAboutBodyText(false); // Stop and clear about body text
        }
    }
    activeTypingOverlayId = null;

    // Hide the previous overlay and its components fully
    if (previousOverlayId) {
        const prevOverlayElem = document.getElementById(previousOverlayId);
        if (prevOverlayElem) {
            const prevPreElement = prevOverlayElem.querySelector('pre');
            const prevSubheaderElement = prevOverlayElem.querySelector('.subheader-text');
            const prevCalendlyContainer = prevOverlayElem.id === 'contact-overlay' ? prevOverlayElem.querySelector('.calendly-widget-container') : null;
            // const prevAboutBodyText = prevOverlayElem.id === 'about-overlay' ? prevOverlayElem.querySelector('.about-body-text') : null;
            
            if(prevPreElement) prevPreElement.textContent = '';
            if(prevSubheaderElement) prevSubheaderElement.style.display = 'none';
            if(prevCalendlyContainer) prevCalendlyContainer.style.display = 'none';
            // If previous was 'about', ensure its body text is cleared by animateAboutBodyText(false) or direct manipulation
            if (prevOverlayElem.id === 'about-overlay') {
                const aboutBodyToHide = prevOverlayElem.querySelector('.about-body-text');
                if (aboutBodyToHide) {
                    aboutBodyToHide.innerHTML = '';
                    aboutBodyToHide.style.display = 'none';
                }
            }
            prevOverlayElem.style.display = 'none';
        }
    }

    if (previousOverlayId && previousOverlayId !== newOverlayId) {
        // Type out the previous overlay, then type in the new one
        animateOverlayText(previousOverlayId, false, () => {
            // Ensure the previous one is fully hidden if not handled by animation
            const prevElem = document.getElementById(previousOverlayId);
            if (prevElem) {
                prevElem.style.display = 'none'; 
                const prevSubheader = prevElem.querySelector('.subheader-text');
                if (prevSubheader) prevSubheader.style.display = 'none';
                if (prevElem.id === 'contact-overlay') {
                    const prevCalendly = prevElem.querySelector('.calendly-widget-container');
                    if (prevCalendly) prevCalendly.style.display = 'none';
                }
                if (prevElem.id === 'about-overlay') {
                    const prevAboutBody = prevElem.querySelector('.about-body-text');
                    if (prevAboutBody) {
                        prevAboutBody.innerHTML = '';
                        prevAboutBody.style.display = 'none';
                    }
                }
            }
            
            const newOverlayElement = document.getElementById(newOverlayId);
            if (newOverlayElement) {
                animateOverlayText(newOverlayId, true);
            } else {
                console.error(`New overlay element not found for typing in: ${newOverlayId}`);
            }
        });
    } else {
        // No previous overlay to type out, or it's the same, just type in the new one
        // (or re-type if it was interrupted)
        const newOverlayElement = document.getElementById(newOverlayId);
        if (newOverlayElement) {
            // If it's the same overlay and it's already fully visible, do nothing further.
            // This check is a bit tricky with animations. For now, let's assume re-typing is fine.
            animateOverlayText(newOverlayId, true);
        } else {
            console.error(`New overlay element not found for typing in: ${newOverlayId}`);
        }
    }
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Determine initial camera settings based on currentModelKey (coder) and device type
    const initialDeviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
    currentInitialCameraSettings = cameraPerspectives[initialDeviceType][currentModelKey]; 
    if (!currentInitialCameraSettings) { // Fallback if somehow undefined
        console.error(`Initial camera settings not found for ${currentModelKey} on ${initialDeviceType}. Using coder desktop.`);
        currentInitialCameraSettings = cameraPerspectives.desktop.coder;
    }
    camera.position.set(currentInitialCameraSettings.position.x, currentInitialCameraSettings.position.y, currentInitialCameraSettings.position.z);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    effect = new AsciiEffect(renderer, asciiCharacters, { invert: true, resolution: asciiResolution, scale: asciiScale });
    effect.setSize(window.innerWidth, window.innerHeight);
    effect.domElement.style.color = '#FFFFFF';
    effect.domElement.style.backgroundColor = 'transparent';
    effect.domElement.style.paddingLeft = '5vw';
    document.body.appendChild(effect.domElement);

    clock = new THREE.Clock();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Main directional light for all scenes
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create Home-specific lights
    homeFillLight = new THREE.DirectionalLight(0xffffff, 0.5); // Intensity can be adjusted
    homeFillLight.position.set(-1, 0.75, -1); // Position for fill
    scene.add(homeFillLight);

    homeRimLight = new THREE.DirectionalLight(0xffffff, 0.4); // Intensity can be adjusted
    homeRimLight.position.set(0.5, 1, 0.5); // Position for rim/top
    scene.add(homeRimLight);

    // Set initial visibility for Home-specific lights
    updateHomeSpecificLighting(currentModelKey === 'coder');

    loader = new GLTFLoader();
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/');
    loader.setDRACOLoader(dracoLoader);

    // Load the main model (allrounder.glb)
    // currentModelKey is 'coder' by default from its declaration
    loadNewModel(currentModelKey, (success) => {
        if (success) {
            console.log(`Initial model ${currentModelKey} loaded successfully.`);
            
            if (isInitialLoad && currentModelKey === 'coder') {
                performInitialZoomOutAnimation();
                isInitialLoad = false;
            } else {
                // For non-coder initial load or subsequent loads, ensure controls are enabled if no animation is running
                if (!isAnimatingCamera) controls.enabled = true;
            }
            // Initial visibility for computer model is handled after it loads, based on currentModelKey
        } else {
            console.error(`Initial model ${currentModelKey} failed to load.`);
        }
    });

    // Load the computer model
    loader.load(computerModelPath, (gltf) => {
        computerModel = gltf.scene;
        // Apply the same transformations as allrounder.glb
        computerModel.scale.set(10, 10, 10); 
        computerModel.position.set(0, -0.2, 0.5); // Centered at X=0, Z=0, and Y=-1
        scene.add(computerModel);
        // Set initial visibility based on the currentModelKey (which should be 'coder' at init)
        computerModel.visible = (currentModelKey === 'coder'); 
        console.log(`Computer model loaded and transformed. Initial visibility: ${computerModel.visible}`);
    }, undefined, (error) => {
        console.error('An error happened loading the computer model:', error);
    });

    controls = new OrbitControls(camera, effect.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(currentInitialCameraSettings.target.x, currentInitialCameraSettings.target.y, currentInitialCameraSettings.target.z);

    // --- Explicitly enable panning and set default mouse buttons ---
    controls.enablePan = true; 
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,   // Rotate with left mouse button
        MIDDLE: THREE.MOUSE.DOLLY,  // Zoom with middle mouse button (scroll wheel click)
        RIGHT: THREE.MOUSE.PAN     // Pan with right mouse button
    };
    // For trackpads or mice without a middle button, you might want to enable two-finger pan if supported by the browser/OS
    // or rely on right-click pan.

    // You can also try setting screenSpacePanning explicitly if the default isn't working as expected
    // controls.screenSpacePanning = true; // Default is usually true and good for up/down
    // controls.screenSpacePanning = false; // Alternative panning mode

    console.log('OrbitControls Panning Enabled:', controls.enablePan);
    console.log('OrbitControls Screen Space Panning:', controls.screenSpacePanning);
    console.log('OrbitControls Mouse Buttons:', controls.mouseButtons);
    // --- End panning configuration ---

    controls.update();

    // Re-add event listener for camera changes (for debugging/finding positions)
    controls.addEventListener('change', () => {
        if (!isAnimatingCamera) { // Only log if not during our programmed animation
            //console.clear();
            console.log('--- Manual Camera State ---');
            console.log(`Current Model: ${currentModelKey}`);
            console.log(`Position: x: ${camera.position.x.toFixed(3)}, y: ${camera.position.y.toFixed(3)}, z: ${camera.position.z.toFixed(3)}`);
            console.log(`Target:   x: ${controls.target.x.toFixed(3)}, y: ${controls.target.y.toFixed(3)}, z: ${controls.target.z.toFixed(3)}`);
            console.log('---------------------------');
        }
    });

    // Get overlay elements
    homeOverlay = document.getElementById('coder-overlay'); // Changed from 'home-overlay'
    aboutOverlay = document.getElementById('about-overlay');
    contactOverlay = document.getElementById('contact-overlay');
    portfolioOverlay = document.getElementById('portfolio-overlay');
    allOverlays = [homeOverlay, aboutOverlay, contactOverlay, portfolioOverlay];

    // Store original text and clear overlays for typing animation
    allOverlays.forEach(overlay => {
        if (overlay) {
            const preElement = overlay.querySelector('pre');
            if (preElement) {
                overlayOriginalTexts[overlay.id] = preElement.textContent;
                preElement.textContent = ''; // Start empty
            } else {
                overlayOriginalTexts[overlay.id] = ''; // No pre tag, store empty
            }

            const aboutBodyElement = overlay.id === 'about-overlay' ? overlay.querySelector('.about-body-text') : null;
            if (aboutBodyElement) {
                aboutBodyOriginalHTML = aboutBodyElement.innerHTML; // Store original HTML
                aboutBodyElement.innerHTML = ''; // Clear for animation
                aboutBodyElement.style.display = 'none'; // Hide initially
            }

            const subheaderElement = overlay.querySelector('.subheader-text');
            if (subheaderElement) {
                subheaderElement.style.display = 'none'; // Hide subheader initially
            }
            const calendlyContainer = overlay.id === 'contact-overlay' ? overlay.querySelector('.calendly-widget-container') : null;
            if (calendlyContainer) {
                calendlyContainer.style.display = 'none'; // Hide Calendly initially
            }

            overlay.style.display = 'none'; // Initially hide all overlay containers
        }
    });

    // Setup navigation links after everything is initialized
    setupNavigationLinks();

    window.addEventListener('resize', onWindowResize, false);

    // Show initial overlay (home/coder)
    updateActiveOverlay(currentModelKey);
}

function setupNavigationLinks() {
    // Logo click (Home)
    const logoElement = document.getElementById('logo');
    if (logoElement) {
        logoElement.addEventListener('click', (event) => {
            event.preventDefault();
            switchModelAndAnimateCamera('coder');
        });
    }

    // New Home link
    const navHome = document.getElementById('nav-home');
    if (navHome) {
        navHome.addEventListener('click', (event) => {
            event.preventDefault();
            switchModelAndAnimateCamera('coder');
        });
    }

    // About link
    const navLinks = {
        'nav-about': 'about',
        'nav-contact': 'contact',
        'nav-portfolio': 'portfolio',
        // Assuming 'connection-info' or a similar element acts as 'Home'
        'connection-info': 'coder' 
    };

    for (const id in navLinks) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                switchModelAndAnimateCamera(navLinks[id]);
            });
        }
    }
}

function onWindowResize() {
    const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
    currentInitialCameraSettings = cameraPerspectives[deviceType][currentModelKey];
    if (!currentInitialCameraSettings) { // Fallback
        console.error(`Resize: Camera settings not found for ${currentModelKey} on ${deviceType}. Using coder desktop.`);
        currentInitialCameraSettings = cameraPerspectives.desktop.coder;
    }

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
    // Re-apply initial camera settings for the current model on resize if not animating
    if (!isAnimatingCamera) {
        camera.position.set(currentInitialCameraSettings.position.x, currentInitialCameraSettings.position.y, currentInitialCameraSettings.position.z);
        controls.target.set(currentInitialCameraSettings.target.x, currentInitialCameraSettings.target.y, currentInitialCameraSettings.target.z);
        controls.update();
    }
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update(); // Update TWEEN animations

    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }

    if (!isAnimatingCamera && controls.enabled) {
        if (justCompletedTween) {
            // console.log("[Animate] Skipping controls.update() for one frame post-tween.");
            justCompletedTween = false; // Consume the flag
        } else {
            controls.update(); // Apply OrbitControls changes like damping or user input
        }
    }

    // Auto-rotation for 'coder' and 'portfolio' screens when camera is not animating
    if (!isAnimatingCamera) {
        if (currentModelKey === 'coder') { // User changed this: only 'coder' for main model auto-rotation
            if (model) { 
                model.rotation.y += modelRotationSpeed; 
            }
        }
        if (currentModelKey === 'coder' && computerModel && computerModel.visible) { 
            computerModel.rotation.y += modelRotationSpeed; 
        }
    }
    // If isAnimatingCamera is true, TWEEN is handling camera, so OrbitControls should not interfere.

    renderer.render(scene, camera);
    effect.render(scene, camera);
}

// Helper function to dispose of materials and their textures
function cleanMaterial(material) {
    if (!material) return;
    // console.log('Cleaning material:', material.name);
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    material.dispose();
}

// Helper function to control visibility of Home-specific lights
function updateHomeSpecificLighting(isHomeScreen) {
    if (homeFillLight) {
        homeFillLight.visible = isHomeScreen;
    }
    if (homeRimLight) {
        homeRimLight.visible = isHomeScreen;
    }
    // console.log(`Home specific lighting visibility: Fill=${homeFillLight?.visible}, Rim=${homeRimLight?.visible}`); // Less verbose
}

function performInitialZoomOutAnimation() {
    console.log("Preparing initial zoom-out animation.");
    // Camera is assumed to be at its final desired "Home" position and target
    // due to the setup in init() before this function is called.
    const finalPos = camera.position.clone();
    const finalTarget = controls.target.clone();

    const finalVec = finalPos.clone().sub(finalTarget);
    const finalRadius = finalVec.length();

    if (finalRadius < 0.01) { // If already very close or at target, skip animation
        console.warn("Initial zoom-out: Final radius too small or camera at target, skipping animation.");
        controls.enabled = true; // Ensure controls are enabled
        return;
    }

    const finalYOverR = Math.max(-1, Math.min(1, finalVec.y / finalRadius));
    const finalPhi = Math.acos(finalYOverR); // Polar angle
    const finalTheta = Math.atan2(finalVec.x, finalVec.z); // Azimuthal angle

    // Zoom in to 5% of final radius or 0.05, whichever is smaller, but not less than a tiny epsilon
    const initialZoomedInRadius = Math.max(0.01, Math.min(0.05 * finalRadius, 0.05)); 

    // Snap camera to initial zoomed-in position, looking at the final target
    camera.position.x = finalTarget.x + initialZoomedInRadius * Math.sin(finalPhi) * Math.sin(finalTheta);
    camera.position.y = finalTarget.y + initialZoomedInRadius * Math.cos(finalPhi);
    camera.position.z = finalTarget.z + initialZoomedInRadius * Math.sin(finalPhi) * Math.cos(finalTheta);
    // controls.target is already finalTarget from init()
    camera.lookAt(finalTarget);
    controls.update(); // Reflect immediate change in camera position

    isAnimatingCamera = true;
    controls.enabled = false;

    new TWEEN.Tween({ radius: initialZoomedInRadius })
        .to({ radius: finalRadius }, 3000) // Animate over 1.5 seconds
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(({ radius: currentRadius }) => {
            camera.position.x = finalTarget.x + currentRadius * Math.sin(finalPhi) * Math.sin(finalTheta);
            camera.position.y = finalTarget.y + currentRadius * Math.cos(finalPhi);
            camera.position.z = finalTarget.z + currentRadius * Math.sin(finalPhi) * Math.cos(finalTheta);
            camera.lookAt(finalTarget);
        })
        .onStart(() => {
            console.log("Starting initial zoom-out animation.");
        })
        .onComplete(() => {
            console.log("Initial zoom-out animation complete.");
            isAnimatingCamera = false;
            controls.enabled = true;
            // Ensure camera is exactly at the final position
            camera.position.copy(finalPos); 
            // controls.target is already correct
            camera.lookAt(finalTarget);
            controls.update();
        })
        .start();
}

init();
animate();