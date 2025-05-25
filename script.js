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

// --- Camera Perspectives Configuration ---
// User will update these values after finding them via console logs
const cameraPerspectives = {
    desktop: {
        coder:     { position: { x: 0.533, y: 0.361, z: 2.011 }, target: { x: 0.026, y: -0.273, z: 0.143 } },
        about:     { position: { x: 0.001, y: 1.036, z: 0.568 }, target: { x: -0.537, y: 0.579, z: 0.071 } },
        contact:   { position: { x: -0.242, y: 0.532, z: 0.684 }, target: { x: 0.274, y: 0.790, z: -0.265 } },
        portfolio: { position: { x: 1.246, y: -0.726, z: 0.061 }, target: {  x: 0.217, y: -0.300, z: 0.080 } }
    },
    mobile: {
        coder:     { position: { x: -1.933, y: 0.773, z: 1.673 }, target: { x: 0.216, y: -0.140, z: 0.389 } },
        about:     { position: { x: 0.941, y: 1.283, z: 1.160 }, target: { x: -0.329, y: 0.391, z: 0.389 } },
        contact:   { position: { x: 0.783, y: 0.875, z: 0.604}, target: { x: -0.115, y: 0.678, z: 0.108 } },
        portfolio: { position: { x: 1.590, y: -0.687, z: 1.348 }, target: { x: -0.148, y: 0.214, z: 0.225 } }
    }
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

// Home-specific lights
let homeFillLight, homeRimLight;

// Global store for animation clips from loaded models

// --- Typing Effect and Connection Info ---
const typingSpeed = 50;

function typeWriter(elementId, text, callback) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID ${elementId} not found for typewriter.`);
        return;
    }
    element.innerHTML = "";
    let i = 0;
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, typingSpeed);
        } else if (callback) {
            callback();
        }
    }
    type();
}

async function displayConnectionInfo() {
    const infoElementId = 'connection-info';
    let locationString = "Location: N/A";
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            locationString = `Connecting from: ${data.city || 'Unknown City'}, ${data.region || 'Unknown Region'}, ${data.country_name || 'Unknown Country'}`;
        } else {
            locationString = `Location: Error fetching (status ${response.status})`;
        }
    } catch (error) {
        console.error("Error fetching location:", error);
        locationString = "Location: Error fetching (network issue)";
    }
    const now = new Date();
    const timeString = `Time: ${now.toLocaleString()}`;
    const fullText = `${locationString}\n${timeString}`;
    typeWriter(infoElementId, fullText);
}

// --- End Typing Effect and Connection Info ---

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
    const finalPerspective = cameraPerspectives[deviceType][newModelKeyFromLink];

    if (!finalPerspective) {
        console.error(`[switchModelAndAnimateCamera] Critical: Final perspective for ${newModelKeyFromLink} not found. Aborting animation.`);
        isAnimatingCamera = false;
        targetOfCurrentAnimation = null;
        controls.enabled = true;
        return;
    }

    // Actual current camera state for smooth departure of position/radius/phi
    const actualStartPos = camera.position.clone();
    const actualStartTarget = controls.target.clone();
    const actualStartVec = actualStartPos.clone().sub(actualStartTarget);
    const actualStartRadius = actualStartVec.length();
    const actualStartYOverR = actualStartRadius > 0.001 ? Math.max(-1, Math.min(1, actualStartVec.y / actualStartRadius)) : 1;
    const actualStartPhi = Math.acos(actualStartYOverR);

    // Determine start parameters for initialThetaForSpin for consistency if leaving an auto-rotating scene
    let canonicalStartPosForThetaCalc = actualStartPos;
    let canonicalStartTargetForThetaCalc = actualStartTarget;

    // If leaving 'coder' (which auto-rotates), use its defined perspective for theta calculation
    if (currentModelKey === 'coder') { 
        const departingPerspective = cameraPerspectives[deviceType][currentModelKey];
        if (departingPerspective) {
            canonicalStartPosForThetaCalc = new THREE.Vector3(departingPerspective.position.x, departingPerspective.position.y, departingPerspective.position.z);
            canonicalStartTargetForThetaCalc = new THREE.Vector3(departingPerspective.target.x, departingPerspective.target.y, departingPerspective.target.z);
        } else {
            console.warn(`[switchModelAndAnimateCamera] Departing perspective for '${currentModelKey}' not found. Using actuals for theta calc.`);
        }
    }
    
    const canonicalStartVecForTheta = canonicalStartPosForThetaCalc.clone().sub(canonicalStartTargetForThetaCalc);
    const canonicalStartRadiusForTheta = canonicalStartVecForTheta.length(); // Used for safety in atan2
    const initialThetaForSpin = canonicalStartRadiusForTheta > 0.001 ? Math.atan2(canonicalStartVecForTheta.x, canonicalStartVecForTheta.z) : (actualStartRadius > 0.001 ? Math.atan2(actualStartVec.x, actualStartVec.z) : 0);

    // Target state (from cameraPerspectives for newModelKeyFromLink)
    const endPos = new THREE.Vector3(finalPerspective.position.x, finalPerspective.position.y, finalPerspective.position.z);
    const endTarget = new THREE.Vector3(finalPerspective.target.x, finalPerspective.target.y, finalPerspective.target.z);
    const endVec = endPos.clone().sub(endTarget);
    const endRadius = endVec.length();
    const endYOverR = endRadius > 0.001 ? Math.max(-1, Math.min(1, endVec.y / endRadius)) : 1;
    const endPhi = Math.acos(endYOverR);

    // Calculate the final azimuthal angle for the camera's orientation around its target
    const finalAzimuth = endRadius > 0.001 ? Math.atan2(endVec.x, endVec.z) : initialThetaForSpin;

    const duration = 2000; // Main animation duration
    const currentOrbitCenter = new THREE.Vector3(); // To be reused in onUpdate

    // The target theta for the tween includes a full spin and ends at the finalAzimuth
    let targetAnimatedTheta = finalAzimuth + Math.PI * 2;
    // Ensure the spin is in a somewhat predictable direction (e.g., mostly positive)
    // If finalAzimuth is far behind initialThetaForSpin, adding just 2PI might result in a very short spin or reverse.
    // This ensures at least a full spin towards the finalAzimuth direction.
    if (targetAnimatedTheta < initialThetaForSpin + Math.PI) { // Heuristic: if target is less than a half-spin away + 2PI
        targetAnimatedTheta += Math.PI * 2; // Add another full spin to ensure it goes 'forward'
    }

    new TWEEN.Tween({ alpha: 0, animatedTheta: initialThetaForSpin })
        .to({ alpha: 1, animatedTheta: targetAnimatedTheta }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ alpha, animatedTheta }) => {
            // Interpolate orbit center from actualStartTarget to endTarget
            currentOrbitCenter.lerpVectors(actualStartTarget, endTarget, alpha);
            // Interpolate radius from actualStartRadius to endRadius
            const currentRadius = actualStartRadius + (endRadius - actualStartRadius) * alpha;
            // Interpolate phi from actualStartPhi to endPhi
            const currentPhi = actualStartPhi + (endPhi - actualStartPhi) * alpha;

            // Use the animatedTheta (which starts from the potentially canonical initialThetaForSpin) for positioning
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

            if (!modelSwapped && animatedTheta >= halfwayAngularPoint) { // Or use alpha >= 0.5 for simpler halfway point
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
                modelSwapped = true;
                console.log(`[TWEEN onUpdate] Model/Animation swap block. currentModelKey is NOW: ${currentModelKey}`);

                // Manage computerModel visibility based on the final currentModelKey for this state
                if (computerModel) {
                    computerModel.visible = (currentModelKey === 'coder');
                    console.log(`[TWEEN onUpdate] Computer model visibility set to ${computerModel.visible} for currentModelKey ${currentModelKey}`);
                }
                // Update home-specific lighting based on the new currentModelKey
                updateHomeSpecificLighting(currentModelKey === 'coder');
            }
        })
        .onComplete(() => {
            console.log(`[TWEEN onComplete] Combined spin/transition for ${newModelKeyFromLink} complete.`);
            // Ensure final state is precise
            camera.position.copy(endPos);
            controls.target.copy(endTarget);
            camera.lookAt(endTarget);

            isAnimatingCamera = false;
            targetOfCurrentAnimation = null; 
            controls.enabled = true;     
        })
        .start();
}

init();
animate();

function init() {
    displayConnectionInfo();

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
            console.clear();
            console.log('--- Manual Camera State ---');
            console.log(`Current Model: ${currentModelKey}`);
            console.log(`Position: x: ${camera.position.x.toFixed(3)}, y: ${camera.position.y.toFixed(3)}, z: ${camera.position.z.toFixed(3)}`);
            console.log(`Target:   x: ${controls.target.x.toFixed(3)}, y: ${controls.target.y.toFixed(3)}, z: ${controls.target.z.toFixed(3)}`);
            console.log('---------------------------');
        }
    });

    // Event listeners for navigation links
    document.getElementById('nav-about').addEventListener('click', (event) => {
        event.preventDefault();
        switchModelAndAnimateCamera('about');
    });
    document.getElementById('nav-contact').addEventListener('click', (event) => {
        event.preventDefault();
        switchModelAndAnimateCamera('contact');
    });
    document.getElementById('nav-portfolio').addEventListener('click', (event) => {
        event.preventDefault();
        switchModelAndAnimateCamera('portfolio');
    });
    // Optional: Add a way to go back to the 'coder' model, e.g., clicking the connection info or a logo
    document.getElementById('connection-info').addEventListener('click', (event) => {
        event.preventDefault();
        switchModelAndAnimateCamera('coder');
    });

    window.addEventListener('resize', onWindowResize, false);
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

    if (!isAnimatingCamera) {
        if (currentModelKey === 'coder') { // User changed this: only 'coder' for main model auto-rotation
            if (model) { 
                model.rotation.y += modelRotationSpeed; 
            }
        }
        if (currentModelKey === 'coder' && computerModel && computerModel.visible) { 
            computerModel.rotation.y += modelRotationSpeed; 
        }
        controls.update(); // Only call controls.update when not animating camera
    }
    // If isAnimatingCamera is true, TWEEN is handling camera, so OrbitControls should not interfere.

    renderer.render(scene, camera);
    effect.render(scene, camera);
}

// Helper function to control visibility of Home-specific lights
function updateHomeSpecificLighting(isHomeScreen) {
    if (homeFillLight) {
        homeFillLight.visible = isHomeScreen;
    }
    if (homeRimLight) {
        homeRimLight.visible = isHomeScreen;
    }
    console.log(`Home specific lighting visibility: Fill=${homeFillLight?.visible}, Rim=${homeRimLight?.visible}`);
}