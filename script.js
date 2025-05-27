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

// Flag for initial page load sequence
let isInitialPageLoadSequence = true;

// --- Camera Perspectives Configuration ---
// User will update these values after finding them via console logs
const cameraPerspectives = {
    desktop: {
        coder:     { position: { x: -0.172, y: 0.212, z: 0.667 }, target: { x: 0.276, y: -0.194, z: 0.409 } },
        about:     { position: { x: -0.022, y: 0.981, z: 0.489}, target: { x: -0.356, y: 0.497, z: -0.143 } },
        contact:   { position: { x: -0.149, y: 0.477, z: 0.679 }, target: { x: 0.655, y: 0.665, z: -0.064 } },
        portfolio: { position: { x: 1.760, y: -0.764, z: 0.337}, target: { x: 0.603, y: -0.166, z: -0.290} }
    },
    mobile: {
        coder:     { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
        about:     { position: { x: -0.031, y: 1.064, z: 0.431 }, target: { x: -0.025, y: 0.995, z: 0.006 } },
        contact:   { position: { x: 0.056, y: 0.628, z: 1.119}, target: { x: 0.083, y: 0.761, z: 0.083 } },
        portfolio: { position: { x: 2.354, y: -0.486, z: 1.339 }, target: { x: 0.135, y: 0.490, z: -0.030 } }
    }
};

// Specific overrides for exact resolutions - converted to an array for closest match logic
const definedResolutionSettings = [
    {
        width: 432, height: 874,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
            about: { position: { x: 0.068, y: 0.839, z: 1.593 }, target: { x: -0.289, y: 0.235, z: 0.166 } },
            portfolio: { position: { x: 3.053, y: -0.199, z: 1.418 }, target: { x: 0.301, y: 0.927, z: 0.013 } },
            contact: { position: { x: 0.121, y: 0.576, z: 0.898 }, target: { x: 0.142, y: 0.681, z: 0.074 } }
        }
    },
    {
        width: 394, height: 794,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
            about: { position: { x: -0.072, y: 0.771, z: 1.579 }, target: { x: -0.353, y: 0.258, z: 0.072 } },
            portfolio: { position: { x: 2.623, y: -0.319, z: 1.518 }, target: { x: 0.210, y: 0.743, z: 0.029 } },
            contact: { position: { x: 0.068, y: 0.635, z: 0.926 }, target: {  x: 0.184, y: 0.754, z: 0.192 } }
        }
    },
    {
        width: 360, height: 776,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
            about: { position: { x: -0.236, y: 0.514, z: 1.837 }, target: { x: -0.343, y: 0.230, z: 0.110 } },
            portfolio: { position: { x: 2.816, y: -0.285, z: 1.627 }, target: { x: 0.247, y: 0.845, z: 0.042 } },
            contact: { position: { x: 0.497, y: 0.491, z: 0.960 }, target: { x: 0.133, y: 0.684, z: 0.098 } }
        }
    },
    {
        width: 412, height: 891,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
            about: { position: { x: 0.389, y: 0.396, z: 1.408 }, target: { x: -0.214, y: 0.258, z: 0.054 } },
            portfolio: { position: { x: 2.710, y: -0.267, z: 1.636 }, target: { x: 0.210, y: 0.833, z: 0.093 } },
            contact: { position: { x: 0.450, y: 0.523, z: 0.850 }, target: { x: 0.116, y: 0.610, z: 0.022 } }
        }
    },
    {
        width: 915, height: 1792,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } },
            about: { position: { x: 0.433, y: 1.010, z: 0.890 }, target: { x: -0.134, y: 0.263, z: -0.087 } },
            portfolio: { position: { x: 2.694, y: -0.445, z: 1.355 }, target: { x: 0.691, y: 0.591, z: 0.269 } },
            contact: { position: { x: 0.433, y: 0.406, z: 1.269 }, target: { x: 0.137, y: 0.196, z: -0.443 } }
        }
    },
    {
        width: 1024, height: 1342,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } }, // Assuming mobile coder for consistency, adjust if desktop coder is preferred for larger tablets
            about: { position: { x: -0.062, y: 0.855, z: 0.431 }, target: { x: -0.088, y: 0.704, z: -0.024 } },
            portfolio: { position: { x: 2.093, y: -0.621, z: 0.696 }, target: { x: 0.540, y: 0.152, z: 0.099 } },
            contact: { position: { x: 0.047, y: 0.413, z: 0.805 }, target: { x: 0.091, y: 0.493, z: -0.108 } }
        }
    },
    {
        width: 800, height: 1236,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } }, // Assuming mobile coder
            about: { position: { x: -0.084, y: 0.794, z: 0.524 }, target: { x: -0.073, y: 0.681, z: -0.274 } },
            portfolio: { position: { x: 2.096, y: -0.615, z: 1.088 }, target: { x: 0.513, y: 0.204, z: 0.230 } },
            contact: { position: { x: -0.403, y: -0.134, z: 1.743 }, target: { x: 0.591, y: 0.056, z: -0.320 } }
        }
    },
    {
        width: 900, height: 1156,
        settings: {
            coder: { position: { x: -0.178, y: 0.122, z: 0.869 }, target: { x: 0.066, y: -0.282, z: 0.400 } }, // Assuming mobile coder
            about: { position: { x: -0.160, y: 0.821, z: 0.390 }, target: { x: -0.136, y: 0.731, z: -0.291 } },
            portfolio: { position: { x: 2.091, y: -0.697, z: 0.371 }, target: { x: 0.493, y: 0.120, z: -0.023 } },
            contact: { position: { x: 0.145, y: 0.294, z: 1.692 }, target: { x: 0.423, y: 0.042, z: -0.210 } }
        }
    }
];

const initialModelRotations = {
    coder:     { x: 0, y: 0, z: 0 },
    about:     { x: 0, y: 0, z: 0 },
    contact:   { x: 0, y: 0, z: 0 },
    portfolio: { x: 0, y: 0, z: 0 }
};

const asciiCharacters = ' .:-=+*#%@░';
const asciiResolution =0.20;
const asciiScale =1;
const modelRotationSpeed = 0.004; // Will be handled by animation or OrbitControls

const initialZoomStartPositions = {
    desktop: {
        position: new THREE.Vector3(-10, 5, 15), // Example: Further out for desktop
        target: new THREE.Vector3(0, 0, 0)      // Example: Looking towards origin
    },
    mobile: {
        position: new THREE.Vector3(-15, 8, 20), // Example: Even further out for mobile
        target: new THREE.Vector3(0, 0, 0)       // Example: Looking towards origin
    }
};

// ASCII Loader variables
const asciiSpinnerFrames = ['/', '-', '\\', '|']; // Spinner characters (note: backslash needs to be escaped)
let asciiSpinnerIndex = 0;
let asciiLoaderContentElement = null;

// Function to get responsive camera settings
function getResponsiveCameraSettings(modelKey) {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    // 1. Try for an exact match first
    for (const config of definedResolutionSettings) {
        if (config.width === currentWidth && config.height === currentHeight) {
            if (config.settings && config.settings[modelKey]) {
                console.log(`[Camera] Using exact match for ${currentWidth}x${currentHeight} - ${modelKey}`);
                return config.settings[modelKey];
            }
        }
    }

    // Determine the maximum width from definedResolutionSettings
    let maxWidthFromDefined = 0;
    const validWidths = definedResolutionSettings
        .filter(config => typeof config.width === 'number')
        .map(config => config.width);

    if (validWidths.length > 0) {
        maxWidthFromDefined = Math.max(...validWidths);
    }

    // 2. If there are defined resolutions AND current width is greater than the maximum width among them,
    //    use general desktop settings.
    if (maxWidthFromDefined > 0 && currentWidth > maxWidthFromDefined) {
        console.log(`[Camera] Current width (${currentWidth}) > max defined width (${maxWidthFromDefined}). Using general desktop for ${modelKey}.`);
        return cameraPerspectives.desktop[modelKey] || cameraPerspectives.desktop.coder; // Fallback to coder if specific modelKey not in desktop
    }

    // 3. If no exact match and not wider than max defined (or definedResolutionSettings is empty, or no valid widths found),
    //    find the closest one among defined resolutions.
    let closestConfig = null;
    let minDifference = Infinity;

    if (definedResolutionSettings.length > 0) {
        for (const config of definedResolutionSettings) {
            // Ensure config.width and config.height are numbers before calculating diff
            if (typeof config.width === 'number' && typeof config.height === 'number') {
                const diff = Math.abs(currentWidth - config.width) + Math.abs(currentHeight - config.height);
                if (diff < minDifference) {
                    minDifference = diff;
                    closestConfig = config;
                }
            }
        }

        if (closestConfig && closestConfig.settings && closestConfig.settings[modelKey]) {
            console.log(`[Camera] No exact match. Using closest match (${closestConfig.width}x${closestConfig.height}) for ${currentWidth}x${currentHeight} - ${modelKey}`);
            return closestConfig.settings[modelKey];
        }
    }

    // 4. Ultimate fallback to general mobile/desktop if no specific settings found through above logic
    console.warn(`[Camera] No specific or closest setting found for ${modelKey} at ${currentWidth}x${currentHeight}. Falling back to general perspectives.`);
    if (window.innerWidth <= 768) { // Standard mobile breakpoint
        return cameraPerspectives.mobile[modelKey] || cameraPerspectives.desktop[modelKey] || cameraPerspectives.desktop.coder;
    }
    return cameraPerspectives.desktop[modelKey] || cameraPerspectives.desktop.coder;
}

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

let originalAboutBodyHTML = '';
let processedAboutBodyHTML = ''; // To store HTML with chars wrapped
let aboutBodyAnimationInterval = null; // Dedicated interval for about body text
let isAboutBodyVisible = false;

let homeFillLight, homeRimLight; // Declare Home-specific lights

// --- Loader Elements and Manager ---
let loadingOverlay, loaderCircle, loaderPercentageText;
let initialAssetsLoadingManager;
// --- End Loader ---

function processOriginalHTMLForCharHighlight(htmlString) {
    let resultHTML = '';
    let inTag = false;
    for (let i = 0; i < htmlString.length; i++) {
        const char = htmlString[i];
        if (char === '<') {
            inTag = true;
            resultHTML += char;
        } else if (char === '>') {
            inTag = false;
            resultHTML += char;
        } else if (inTag) {
            resultHTML += char;
        } else { // Character is text content
            if (char === '\n' || char === '\r') {
                resultHTML += char; // Preserve newlines and carriage returns
            } else {
                // Wrap all other characters (including spaces) in a span
                resultHTML += `<span class="body-char-bg">${char}</span>`;
            }
        }
    }
    return resultHTML;
}

function initAboutBodyTextAnimationState() {
    const aboutBodyElement = document.querySelector('#about-overlay .about-body-text');
    console.log(`[Debug] initAboutBodyTextAnimationState: aboutBodyElement is `, aboutBodyElement);

    if (aboutBodyElement) {
        if (!originalAboutBodyHTML) { // Capture only once
            originalAboutBodyHTML = aboutBodyElement.innerHTML; 
            console.log(`[Debug] initAboutBodyTextAnimationState: Captured originalAboutBodyHTML: ${originalAboutBodyHTML}`);
        }
        
        aboutBodyElement.innerHTML = ''; // Clear for animation, will be repopulated by animateAboutBodyText
        // aboutBodyElement.style.display = 'none'; // Hide initially - REMOVED, let parent overlay control visibility

        // Pre-process the HTML to wrap characters for animation
        if (originalAboutBodyHTML) {
            if (!originalAboutBodyHTML.includes('body-char-bg')) {
                processedAboutBodyHTML = processOriginalHTMLForCharHighlight(originalAboutBodyHTML);
            } else {
                processedAboutBodyHTML = originalAboutBodyHTML;
            }
            console.log(`[Debug] initAboutBodyTextAnimationState: Processed processedAboutBodyHTML: ${processedAboutBodyHTML}`);
        }
    } else {
        console.error('[Debug] initAboutBodyTextAnimationState: About body element NOT FOUND!');
    }
}

function animateAboutBodyText(typeIn, callback) {
    console.log(`[Debug] animateAboutBodyText: Called with typeIn = ${typeIn}`);
    const aboutBodyElement = document.querySelector('#about-overlay .about-body-text');
    if (!aboutBodyElement) {
        console.error('[Debug] animateAboutBodyText: About body element not found!');
        if (callback) callback();
        return;
    }

    // Clear any existing animation interval for the about body text
    if (aboutBodyAnimationInterval) {
        clearInterval(aboutBodyAnimationInterval);
        aboutBodyAnimationInterval = null;
        console.log(`[Debug] animateAboutBodyText: Cleared existing aboutBodyAnimationInterval.`);
    }

    // Ensure the global interval is cleared if one was running (e.g. from header text)
    // This might be redundant if aboutBodyAnimationInterval is the one we care about
    // but keeping for safety if currentTextAnimationInterval is used elsewhere for this overlay.
    if (currentTextAnimationInterval) {
        clearInterval(currentTextAnimationInterval);
        currentTextAnimationInterval = null;
        console.log(`[Debug] animateAboutBodyText: Cleared an existing currentTextAnimationInterval.`);
    }

    if ((typeIn && isAboutBodyVisible) || (!typeIn && !isAboutBodyVisible && aboutBodyElement.innerHTML === '')) {
        console.log('[Debug] animateAboutBodyText: Condition met to return early. typeIn:', typeIn, 'isAboutBodyVisible:', isAboutBodyVisible, 'innerHTML:', aboutBodyElement.innerHTML);
        if (callback) callback();
        return;
    }

    aboutBodyElement.style.display = 'block';

    const textToAnimate = processedAboutBodyHTML;
    console.log('[Debug] animateAboutBodyText: textToAnimate (processedAboutBodyHTML):', textToAnimate);
    if (!textToAnimate && typeIn) {
        console.warn('[Debug] animateAboutBodyText: textToAnimate is empty, nothing to type in.');
        if (callback) callback();
        return;
    }

    let charIndex = 0;

    if (typeIn) { // Type in the whole processed text with spans, then reveal char by char
        const textToAnimate = processedAboutBodyHTML;
        console.log(`[Debug] animateAboutBodyText (typeIn): textToAnimate is: ${textToAnimate.substring(0, 100)}...`);
        console.log(`[Debug] animateAboutBodyText (typeIn): aboutBodyElement display BEFORE: ${window.getComputedStyle(aboutBodyElement).display}`);
        console.log(`[Debug] animateAboutBodyText (typeIn): Parent #about-overlay display BEFORE: ${window.getComputedStyle(aboutBodyElement.parentElement).display}`);
        console.log(`[Debug] animateAboutBodyText (typeIn): aboutBodyElement.innerHTML BEFORE: ${aboutBodyElement.innerHTML.substring(0,100)}...`);

        aboutBodyElement.innerHTML = textToAnimate; // Populate with all spans
        console.log(`[Debug] animateAboutBodyText (typeIn): aboutBodyElement.innerHTML AFTER setting: ${aboutBodyElement.innerHTML.substring(0,100)}...`);
        
        aboutBodyElement.style.display = 'block'; // Ensure container is block (its default for a div)
        const computedStyle = window.getComputedStyle(aboutBodyElement);
        console.log(`[Debug] animateAboutBodyText (typeIn): aboutBodyElement display AFTER set to 'block'. Computed: display='${computedStyle.display}', opacity='${computedStyle.opacity}', visibility='${computedStyle.visibility}', color='${computedStyle.color}', height='${computedStyle.height}', width='${computedStyle.width}'`);
        console.log(`[Debug] animateAboutBodyText (typeIn): Parent #about-overlay display AFTER: ${window.getComputedStyle(aboutBodyElement.parentElement).display}`);

        const pElement = aboutBodyElement.querySelector('p');
        if (pElement) {
            const computedPStyle = window.getComputedStyle(pElement);
            console.log(`[Debug] animateAboutBodyText (typeIn): Inner P element computed: display='${computedPStyle.display}', opacity='${computedPStyle.opacity}', visibility='${computedPStyle.visibility}', color='${computedPStyle.color}', height='${computedPStyle.height}'`);
        }

        const chars = Array.from(aboutBodyElement.querySelectorAll('.body-char-bg'));
        console.log(`[Debug] animateAboutBodyText: Found ${chars.length} '.body-char-bg' elements.`);

        if (chars.length === 0 && textToAnimate.length > 0 && !textToAnimate.includes('<span')) {
            console.warn("[Debug] animateAboutBodyText: No spans found, but textToAnimate is present and not pre-spanned. Text will appear at once.");
        }

        console.log(`[Debug] animateAboutBodyText: Starting animation interval. typeIn: ${typeIn}`);
        // Ensure we use the globally declared aboutBodyAnimationInterval
        aboutBodyAnimationInterval = setInterval(() => {
            if (charIndex < chars.length) {
                const char = chars[charIndex];
                if (char) {
                    char.style.opacity = '1';
                    if (charIndex < 5 || charIndex === chars.length -1 ) { // Log first 5 and last char
                        const computedCharStyle = window.getComputedStyle(char);
                        console.log(`[Debug] animateAboutBodyText: Char ${charIndex} ('${char.textContent}') opacity set to 1. Computed: opacity='${computedCharStyle.opacity}', display='${computedCharStyle.display}', color='${computedCharStyle.color}'`);
                    }
                }
                charIndex++;
            } else {
                clearInterval(aboutBodyAnimationInterval);
                aboutBodyAnimationInterval = null;
                console.log(`[Debug] animateAboutBodyText: Animation finished. typeIn: ${typeIn}`);
                if (typeIn) {
                    isAboutBodyVisible = true;
                } else {
                    aboutBodyElement.innerHTML = '';
                    aboutBodyElement.style.display = 'none';
                    isAboutBodyVisible = false;
                }
                if (callback) {
                    console.log(`[Debug] animateAboutBodyText: Calling callback. typeIn: ${typeIn}`);
                    callback();
                }
            }
        }, 3); // Animation speed
    } else {
        aboutBodyElement.innerHTML = '';
        aboutBodyElement.style.display = 'none';
        isAboutBodyVisible = false;
        if (callback) callback();
    }
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

    const targetPerspective = getResponsiveCameraSettings(newModelKeyFromLink);

    if (!targetPerspective) {
        console.error(`Camera perspective for ${newModelKeyFromLink} not found.`);
        targetOfCurrentAnimation = null; // Reset as we can't animate
        return;
    }

    currentInitialCameraSettings = targetPerspective; // Update the global settings for potential resize/reset

    // Disable OrbitControls during camera animation
    controls.enabled = false;

    // Determine initial camera perspective based on screen width
    const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';

    // --- Define Target State (for the destination view) ---
    const finalPerspective = targetPerspective;
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
        const canonicalCoderPerspective = getResponsiveCameraSettings('coder');
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
        const homePerspective = getResponsiveCameraSettings('coder');
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
            const perspective = getResponsiveCameraSettings(newModelKeyFromLink);

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

function applyCharBackgrounds(originalText) {
    if (!originalText) {
        return '';
    }

    const lines = originalText.split('\n');
    const numRows = lines.length;
    if (numRows === 0) {
        return '';
    }

    // Ensure all lines have a consistent representation for hasBg, even if empty
    const hasBg = lines.map(line => Array(line.length).fill(false));
    const queue = [];

    // Pass 1: Mark non-spaces (and non-underscores) as having background
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < lines[r].length; c++) {
            if (lines[r][c] !== ' ' && lines[r][c] !== '_') {
                hasBg[r][c] = true;
            }
        }
    }

    // Pass 1.5: Mark characters directly under an underscore as having background
    for (let r = 0; r < numRows - 1; r++) { // Iterate up to the second to last row
        for (let c = 0; c < lines[r].length; c++) {
            if (lines[r][c] === '_') {
                // Check if the column c exists in the row below and that row exists
                if (r + 1 < numRows && c < lines[r + 1].length) {
                    hasBg[r + 1][c] = true;
                }
            }
        }
    }

    // Pass 2: Seed the queue with spaces that are initially fillable
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < lines[r].length; c++) {
            if (lines[r][c] === ' ' && !hasBg[r][c]) {
                const isLeftBg = (c > 0 && hasBg[r][c - 1]);
                const isRightBg = (c < lines[r].length - 1 && hasBg[r][c + 1]);
                const isUpBg = (r > 0 && c < lines[r - 1].length && hasBg[r - 1][c]);
                const isDownBg = (r < numRows - 1 && c < lines[r + 1].length && hasBg[r + 1][c]);

                if ((isLeftBg && isRightBg) || (isUpBg && isDownBg)) {
                    hasBg[r][c] = true;
                    queue.push([r, c]);
                }
            }
        }
    }

    // Pass 3: BFS-like expansion
    let head = 0;
    while (head < queue.length) {
        const [r, c] = queue[head++];
        const neighbors = [
            [r - 1, c], // Up
            [r + 1, c], // Down
            [r, c - 1], // Left
            [r, c + 1]  // Right
        ];

        for (const [nr, nc] of neighbors) {
            // Check bounds for neighbor
            if (nr >= 0 && nr < numRows && nc >= 0 && nc < lines[nr].length) {
                // If it's an unfilled space
                if (lines[nr][nc] === ' ' && !hasBg[nr][nc]) {
                    const n_isLeftBg = (nc > 0 && hasBg[nr][nc - 1]);
                    const n_isRightBg = (nc < lines[nr].length - 1 && hasBg[nr][nc + 1]);
                    const n_isUpBg = (nr > 0 && nc < lines[nr - 1].length && hasBg[nr - 1][nc]);
                    const n_isDownBg = (nr < numRows - 1 && nc < lines[nr + 1].length && hasBg[nr + 1][nc]);

                    if ((n_isLeftBg && n_isRightBg) || (n_isUpBg && n_isDownBg)) {
                        hasBg[nr][nc] = true;
                        queue.push([nr, nc]);
                    }
                }
            }
        }
    }

    // Pass 4: Reconstruct the text with spans
    let processedText = '';
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < lines[r].length; c++) {
            if (hasBg[r][c]) {
                processedText += `<span class="char-bg">${lines[r][c]}</span>`;
            } else {
                processedText += lines[r][c];
            }
        }
        if (r < numRows - 1) {
            processedText += '\n';
        }
    }
    return processedText;
}

function animateOverlayText(overlayId, typeIn, callback, charMode = false) { // charMode is actually useLineTyping (false for charMode)
    const overlayElement = document.getElementById(overlayId);
    if (!overlayElement) {
        console.warn(`[animateOverlayText] Overlay element with ID '${overlayId}' not found.`);
        if (callback) callback();
        return;
    }

    if (currentTextAnimationInterval) {
        clearInterval(currentTextAnimationInterval);
        currentTextAnimationInterval = null;
    }
    if (activeTypingOverlayId === 'about-overlay' && isAboutBodyVisible) {
        animateAboutBodyText(false);
    }

    const preElement = overlayElement.querySelector('pre');
    const subheaderElement = overlayElement.querySelector('.subheader-text');
    const calendlyContainer = overlayId === 'contact-overlay' ? overlayElement.querySelector('.calendly-widget-container') : null;

    if (overlayId === 'about-overlay' && !typeIn) {
        animateAboutBodyText(false);
    }

    const fullTextWithSpans = overlayOriginalTexts[overlayId] || '';
    let currentText = ''; // Will be built with HTML

    preElement.innerHTML = typeIn ? '' : fullTextWithSpans; // Use innerHTML
    overlayElement.style.display = 'block';

    if (!typeIn && subheaderElement) subheaderElement.style.display = 'none';
    if (!typeIn && calendlyContainer) calendlyContainer.style.display = 'none';

    activeTypingOverlayId = overlayId;

    if (useLineTyping) { // Line-by-line typing
        const lines = fullTextWithSpans.split('\n');
        let currentLineIndex = typeIn ? 0 : lines.length;

        currentTextAnimationInterval = setInterval(() => {
            if (typeIn) {
                if (currentLineIndex < lines.length) {
                    currentText = lines.slice(0, currentLineIndex + 1).join('\n');
                    preElement.innerHTML = currentText; // Use innerHTML
                    currentLineIndex++;
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    activeTypingOverlayId = null;
                    if (subheaderElement) subheaderElement.style.display = 'block';
                    if (calendlyContainer) calendlyContainer.style.display = 'block';
                    if (overlayId === 'about-overlay') { // ADDED: Trigger for about body text
                        animateAboutBodyText(true);
                    }
                    if (callback) {
                        console.log(`[animateOverlayText] Calling callback. typeIn: ${typeIn}`);
                        callback();
                    }
                }
            } else { // Typing out lines
                if (currentLineIndex > 0) {
                    currentLineIndex--;
                    currentText = lines.slice(0, currentLineIndex).join('\n');
                    preElement.innerHTML = currentText; // Use innerHTML
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    overlayElement.style.display = 'none';
                    activeTypingOverlayId = null;
                    if (callback) callback();
                }
            }
        }, typingSpeedMs);
    } else { // Character-by-character typing (handles spans)
        // Create an array of renderable units (spans, spaces, newlines)
        const renderableUnits = [];
        let i = 0;
        while (i < fullTextWithSpans.length) {
            if (fullTextWithSpans.substring(i).startsWith('<span class="char-bg">')) {
                const endSpanIndex = fullTextWithSpans.indexOf('</span>', i) + 7;
                renderableUnits.push(fullTextWithSpans.substring(i, endSpanIndex));
                i = endSpanIndex;
            } else if (fullTextWithSpans[i] === '\n') {
                renderableUnits.push('\n');
                i++;
            } else {
                renderableUnits.push(fullTextWithSpans[i]); // Usually a space
                i++;
            }
        }

        let currentUnitIndex = typeIn ? 0 : renderableUnits.length;

        currentTextAnimationInterval = setInterval(() => {
            if (typeIn) {
                if (currentUnitIndex < renderableUnits.length) {
                    currentText = renderableUnits.slice(0, currentUnitIndex + 1).join('');
                    preElement.innerHTML = currentText; // Use innerHTML
                    currentUnitIndex++;
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    activeTypingOverlayId = null;
                    if (subheaderElement) subheaderElement.style.display = 'block';
                    if (calendlyContainer) calendlyContainer.style.display = 'block';
                    if (overlayId === 'about-overlay') { // ADDED: Trigger for about body text
                        animateAboutBodyText(true);
                    }
                    if (callback) {
                        console.log(`[animateOverlayText] Calling callback. typeIn: ${typeIn}`);
                        callback();
                    }
                }
            } else { // Typing out units
                if (currentUnitIndex > 0) {
                    currentUnitIndex--;
                    currentText = renderableUnits.slice(0, currentUnitIndex).join('');
                    preElement.innerHTML = currentText; // Use innerHTML
                } else {
                    clearInterval(currentTextAnimationInterval);
                    currentTextAnimationInterval = null;
                    overlayElement.style.display = 'none';
                    activeTypingOverlayId = null;
                    if (callback) callback();
                }
            }
        }, typingSpeedMs);
    }
}

function updateActiveOverlay(newModelKey, onNewOverlayTypedInCallback = null) {
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
        if (activeTypingOverlayId === 'about-overlay' && isAboutBodyVisible) {
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

    if (previousOverlayId && document.getElementById(previousOverlayId)) {
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
                if (isInitialPageLoadSequence && newModelKey === 'coder') {
                    console.log(`[updateActiveOverlay] Initial page load for '${newModelKey}'. Text animation will be triggered after camera zoom.`);
                    isInitialPageLoadSequence = false; // Consume the flag
                    // initTextOverlays already hides it, but this ensures it if logic changes
                    if (newOverlayElement) {
                        newOverlayElement.style.display = 'none'; 
                    }
                    return; // Don't animate text yet
                }

                animateOverlayText(newOverlayId, true, onNewOverlayTypedInCallback); // Pass the callback
            } else {
                console.error(`New overlay element not found for typing in: ${newOverlayId}`);
            }
        });
    } else {
        // No previous overlay to type out. Just type in the new one.
        const newOverlayElement = document.getElementById(newOverlayId);
        if (newOverlayElement) {
            // Check if it's the initial page load sequence for the 'coder' (Home) overlay
            if (isInitialPageLoadSequence && newModelKey === 'coder') {
                console.log(`[updateActiveOverlay] Initial page load (direct) for '${newModelKey}'. Text animation will be triggered after camera zoom.`);
                isInitialPageLoadSequence = false; // Consume the flag, so this only happens once
                newOverlayElement.style.display = 'none'; 
                return; // Don't animate text yet
            }
            // If it's the same overlay and it's already fully visible, re-typing might be desired or not.
            // For now, we proceed to animate.
            animateOverlayText(newOverlayId, true, onNewOverlayTypedInCallback); // Pass the callback
        } else {
            console.error(`New overlay element not found for typing in: ${newOverlayId}`);
        }
    }
}

function init() {
    // --- Get Loader DOM Elements ---
    loadingOverlay = document.getElementById('loading-overlay');
    loaderCircle = document.getElementById('loader-circle');
    loaderPercentageText = document.getElementById('loader-percentage');
    // --- End Loader DOM Elements ---

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Determine initial camera settings based on currentModelKey (coder) and device type
    currentInitialCameraSettings = getResponsiveCameraSettings(currentModelKey);

    if (!currentInitialCameraSettings || !currentInitialCameraSettings.position || !currentInitialCameraSettings.target) {
        console.warn(`[Init] Initial settings for ${currentModelKey} were invalid, falling back to desktop.coder`);
        currentInitialCameraSettings = cameraPerspectives.desktop.coder;
    }

    camera.position.set(currentInitialCameraSettings.position.x, currentInitialCameraSettings.position.y, currentInitialCameraSettings.position.z);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    effect = new AsciiEffect(renderer, asciiCharacters, { invert: true, resolution: asciiResolution, scale: asciiScale });
    effect.setSize(window.innerWidth, window.innerHeight);
    effect.domElement.style.color = '#FFFFFF';
    effect.domElement.style.backgroundColor = 'transparent';
    effect.domElement.style.paddingLeft = '0';
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

    // --- Initialize Loaders and LoadingManager ---
    initialAssetsLoadingManager = new THREE.LoadingManager();

    initialAssetsLoadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
        console.log('Initial loading sequence started.');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = 1;
            loadingOverlay.style.display = 'flex'; // Ensure it's visible and flex for centering
        }

        // Get reference to ASCII loader element if not already set
        if (!asciiLoaderContentElement) {
            asciiLoaderContentElement = document.getElementById('ascii-loader-content');
        }

        // Initialize ASCII loader
        if (asciiLoaderContentElement) {
            asciiSpinnerIndex = 0; // Reset spinner index
            asciiLoaderContentElement.textContent = `${asciiSpinnerFrames[asciiSpinnerIndex]} Loading... 0%`;
        }
    };

    initialAssetsLoadingManager.onLoad = function () {
        console.log('All initial assets loaded!');

        // Update ASCII loader to 100%
        if (asciiLoaderContentElement) {
            asciiLoaderContentElement.textContent = `[OK] Loaded! 100%`;
        }

        if (loadingOverlay) {
            // --- PREPARE CAMERA FOR ZOOM START ---
            // This happens BEFORE the loader fully disappears and a new frame can be rendered
            // with the model at its final 'coder' position.
            if (currentModelKey === 'coder') { // Only if we are on the initial 'coder' screen
                const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
                const startConfig = initialZoomStartPositions[deviceType]; // Contains .position and .target Vector3s
                
                camera.position.copy(startConfig.position);
                camera.lookAt(startConfig.target); // Look at the target defined in startConfig
                console.log("[onLoad] Camera position snapped to initial zoom start. Looking at startConfig.target.");
            }
            // --- END PREPARE CAMERA ---

            loadingOverlay.style.opacity = 0; // Start fade out
            loadingOverlay.addEventListener('transitionend', function handleTransitionEnd() {
                loadingOverlay.removeEventListener('transitionend', handleTransitionEnd); // Clean up
                loadingOverlay.style.display = 'none';
                
                console.log("Loading overlay faded out. Starting initial zoom.");
                isInitialPageLoadSequence = false; // Mark initial sequence as done
                if (currentModelKey === 'coder') { // Ensure we are on the coder model
                   performInitialZoomOutAnimation();
                }
                loader.manager = THREE.DefaultLoadingManager; // Reset manager for subsequent loads
                isInitialLoad = false; // General initial load flag
            }, { once: true });
        } else {
            // Fallback if overlay somehow doesn't exist
            console.log("Loading overlay not found. Starting initial zoom directly.");
            // Also prepare camera here if needed for fallback
            if (currentModelKey === 'coder') {
                const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
                const startConfig = initialZoomStartPositions[deviceType];
                camera.position.copy(startConfig.position);
                camera.lookAt(startConfig.target);
                performInitialZoomOutAnimation(); // Call directly as there's no transition
            }
            loader.manager = THREE.DefaultLoadingManager;
            isInitialLoad = false;
        }
    };

    initialAssetsLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
        const progress = Math.round((itemsLoaded / itemsTotal) * 100);
        
        // Update ASCII loader
        if (asciiLoaderContentElement) {
            asciiSpinnerIndex = (asciiSpinnerIndex + 1) % asciiSpinnerFrames.length;
            asciiLoaderContentElement.textContent = `${asciiSpinnerFrames[asciiSpinnerIndex]} Loading... ${progress}%`;
        }
    };

    initialAssetsLoadingManager.onError = function (url) {
        console.error('There was an error loading ' + url + ' during initial load.');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = 0;
            loadingOverlay.style.display = 'none'; 
        }
        // Allow app to proceed if possible, or show a more permanent error message
        isInitialPageLoadSequence = false; 
        loader.manager = THREE.DefaultLoadingManager; // Reset manager
        isInitialLoad = false;
        // Optionally, still try to start the rest of the app
        // if (currentModelKey === 'coder') performInitialZoomOutAnimation(); 
    };

    // Assign the custom manager for the initial asset loading phase
    loader.manager = initialAssetsLoadingManager;

    // Load the main model (allrounder.glb)
    // currentModelKey is 'coder' by default from its declaration
    loadNewModel(currentModelKey, (success) => {
        if (success) {
            console.log(`Initial model ${currentModelKey} loaded successfully (managed by LoadingManager).`);
            // The performInitialZoomOutAnimation() and isInitialLoad = false logic
            // is now handled by initialAssetsLoadingManager.onLoad callback.
        } else {
            console.error(`Initial model ${currentModelKey} failed to load.`);
            // Handle failure: maybe hide loader and show error message
            if (loadingOverlay) {
                loadingOverlay.style.opacity = 0;
                loadingOverlay.style.display = 'none';
            }
        }
    });

    // Load the computer model - this will also be tracked by initialAssetsLoadingManager
    loader.load(computerModelPath, (gltf) => {
        computerModel = gltf.scene;
        // Apply the same transformations as allrounder.glb
        computerModel.scale.set(10, 10, 10); 
        computerModel.position.set(0, -0.2, 0.5); // Centered at X=0, Z=0, and Y=-1
        scene.add(computerModel);
        // Set initial visibility based on the currentModelKey (which should be 'coder' at init)
        computerModel.visible = false; // Set to false initially to prevent flash
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

    // Capture original texts and prepare them with character backgrounds
    allOverlays.forEach(overlay => {
        const preElement = overlay.querySelector('pre');
        if (preElement) {
            const rawText = preElement.textContent; // Assuming initial text is plain
            overlayOriginalTexts[overlay.id] = applyCharBackgrounds(rawText);
            preElement.innerHTML = ''; // Clear for animation, will be filled with HTML spans
        }
        overlay.style.display = 'none'; // Hide all overlays initially
    });

    // Initialize the state for the "About" body text animation.
    // This function handles capturing its original HTML, processing it for char highlighting,
    // and preparing the element for animation.
    initAboutBodyTextAnimationState();

    // Initialize subheader visibility (they should be hidden initially by CSS or here)
    document.querySelectorAll('.subheader-text').forEach(sh => sh.style.display = 'none');
    document.querySelectorAll('.calendly-widget-container').forEach(cw => cw.style.display = 'none');
    // About body text's initial display state is handled by initAboutBodyTextAnimationState.

    // Setup navigation links
    setupNavigationLinks();

    // The call to initOverlaysAndText(); was removed as its relevant functionality 
    // for the about body text is now directly handled by initAboutBodyTextAnimationState(),
    // and header text is handled by the allOverlays.forEach loop above.

    window.addEventListener('resize', onWindowResize, false);

    // Show initial overlay (home/coder), pass true for isInitialLoad
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (effect) {
        effect.setSize(window.innerWidth, window.innerHeight);
    }

    // Update camera position and target based on new screen size
    currentInitialCameraSettings = getResponsiveCameraSettings(currentModelKey);
    if (!currentInitialCameraSettings || !currentInitialCameraSettings.position || !currentInitialCameraSettings.target) {
        console.warn(`[Resize] Settings for ${currentModelKey} were invalid, falling back to desktop.coder`);
        currentInitialCameraSettings = cameraPerspectives.desktop.coder;
    }

    // Don't abruptly change camera if an animation is in progress or just completed
    if (!isAnimatingCamera && !justCompletedTween) {
        camera.position.set(currentInitialCameraSettings.position.x, currentInitialCameraSettings.position.y, currentInitialCameraSettings.position.z);
        if (controls && currentInitialCameraSettings.target) {
            controls.target.set(currentInitialCameraSettings.target.x, currentInitialCameraSettings.target.y, currentInitialCameraSettings.target.z);
            controls.update(); // Make sure controls internal state is updated
        } else if (currentInitialCameraSettings.target) {
            camera.lookAt(new THREE.Vector3(currentInitialCameraSettings.target.x, currentInitialCameraSettings.target.y, currentInitialCameraSettings.target.z));
        }
    } else if (justCompletedTween) {
        // If a tween just completed, OrbitControls might take over. We need to ensure its target is correct.
        // This might already be handled by the tween's onComplete setting controls.target
        if (controls && currentInitialCameraSettings.target) {
             controls.target.set(currentInitialCameraSettings.target.x, currentInitialCameraSettings.target.y, currentInitialCameraSettings.target.z);
             controls.update();
        }
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
    console.log("Preparing initial zoom-out animation. Camera should be at start position.");

    const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
    const startConfig = initialZoomStartPositions[deviceType]; // Contains .position and .target

    // Camera position should already be at startConfig.position due to onLoad logic.
    // Now, ensure controls.target is also set to startConfig.target.
    // This is safe because performInitialZoomOutAnimation is called after controls are initialized.
    if (controls) {
        controls.target.copy(startConfig.target);
        // camera.lookAt(controls.target); // Camera should already be looking here from onLoad's camera.lookAt(startConfig.target)
        controls.update(); 
        console.log("[ZoomInit] Controls target set to zoom start target.");
    } else {
        console.warn("[ZoomInit] Controls not initialized. Cannot set initial controls target.");
    }
    
    // Determine the final destination for the camera and target (the 'coder' perspective)
    const finalPerspectiveSettings = getResponsiveCameraSettings('coder'); 
    if (!finalPerspectiveSettings || !finalPerspectiveSettings.position || !finalPerspectiveSettings.target) {
        console.error("[ZoomInit] Could not get final 'coder' perspective settings. Aborting zoom.");
        if(controls) controls.enabled = true; // Re-enable controls if something went wrong
        isAnimatingCamera = false; // Ensure this is reset
        return;
    }
    
    const currentCamPos = camera.position.clone(); // This is startConfig.position
    const currentTargetPos = controls ? controls.target.clone() : startConfig.target.clone(); // This is startConfig.target

    const finalPos = new THREE.Vector3(finalPerspectiveSettings.position.x, finalPerspectiveSettings.position.y, finalPerspectiveSettings.position.z);
    const finalTarget = new THREE.Vector3(finalPerspectiveSettings.target.x, finalPerspectiveSettings.target.y, finalPerspectiveSettings.target.z);

    isAnimatingCamera = true;
    if(controls) controls.enabled = false;

    // Animate from the current (startConfig) position/target to finalPos/finalTarget
    // And from startConfig.target to finalTarget for controls.target
    new TWEEN.Tween({ 
        camX: currentCamPos.x, // Should be startConfig.position.x
        camY: currentCamPos.y,
        camZ: currentCamPos.z,
        targetX: currentTargetPos.x, // Should be startConfig.target.x
        targetY: currentTargetPos.y,
        targetZ: currentTargetPos.z
    })
    .to({ 
        camX: finalPos.x,
        camY: finalPos.y,
        camZ: finalPos.z,
        targetX: finalTarget.x,
        targetY: finalTarget.y,
        targetZ: finalTarget.z
    }, 3000) // Animate over 3 seconds
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate((obj) => {
        camera.position.set(obj.camX, obj.camY, obj.camZ);
        if (controls) controls.target.set(obj.targetX, obj.targetY, obj.targetZ);
        camera.lookAt(controls ? controls.target : new THREE.Vector3(obj.targetX, obj.targetY, obj.targetZ));
    })
    .onStart(() => {
        console.log("Starting initial zoom-out animation from pre-set start position.");
    })
    .onComplete(() => {
        console.log("Initial zoom-out animation complete.");
        isAnimatingCamera = false;
        if(controls) controls.enabled = true;
        
        // Ensure camera and target are exactly at the final state
        camera.position.copy(finalPos);
        if (controls) {
            controls.target.copy(finalTarget);
            controls.update(); // Ensure controls internal state is synced
        }
        camera.lookAt(finalTarget); // Final lookAt

        justCompletedTween = true; // For OrbitControls immediate update logic

        // After initial zoom, trigger the 'coder' overlay text animation
        // And pass the callback to fade in navigation links
        updateActiveOverlay('coder', () => {
            const navLinks = document.getElementById('navigation-links');
            if (navLinks) {
                navLinks.style.visibility = 'visible';
                navLinks.style.opacity = '1';
                console.log("Navigation links faded in after coder overlay typed in.");
            }
        });
        isAnimatingCamera = false;
        isInitialLoad = false; 
        if(controls) controls.enabled = true;
        console.log("[InitialZoom] Fallback path completed. OrbitControls enabled.");
    })
    .start();
}

init();
animate();