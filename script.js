import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';

// --- Configuration ---
const modelPath = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf'; // Replace with your GLTF model path
const asciiCharacters = ' .:-=+*#%@░'; // Characters used for ASCII art, from dark to light
const asciiResolution = 0.25; // Lower for higher detail (more characters)
const asciiScale = 1; // Scale of the ASCII output characters
const modelRotationSpeed = 0.005;
// ---------------------

let camera, scene, renderer, effect, controls;
let model;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Changed to white

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 3);

    // Renderer (WebGL for AsciiEffect input)
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // AsciiEffect
    effect = new AsciiEffect(renderer, asciiCharacters, { invert: true, resolution: asciiResolution, scale: asciiScale });
    effect.setSize(window.innerWidth, window.innerHeight);
    effect.domElement.style.color = '#FFFFFF'; // Changed to white
    effect.domElement.style.backgroundColor = 'transparent'; 
    effect.domElement.style.paddingLeft = '5vw'; // Added left padding
    document.body.appendChild(effect.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // GLTF Loader
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
        model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; 

        model.scale.set(scale, scale, scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);
        console.log('Model loaded successfully');
    }, undefined, (error) => {
        console.error('An error happened while loading the model:', error);
        const errorMsg = document.createElement('p');
        errorMsg.textContent = `Failed to load model from: ${modelPath}. Check console for details.`;
        errorMsg.style.color = 'red';
        errorMsg.style.position = 'absolute';
        errorMsg.style.top = '50%';
        errorMsg.style.left = '50%';
        errorMsg.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(errorMsg);
    });

    // Controls
    controls = new OrbitControls(camera, effect.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 500;

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (model) {
        model.rotation.y += modelRotationSpeed;
    }

    controls.update();
    effect.render(scene, camera);
}