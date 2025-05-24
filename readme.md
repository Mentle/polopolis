# Three.js ASCII Art GLTF Viewer

This project displays a 3D GLTF model rendered as rotating ASCII art in your web browser using Three.js.

## How to Use

1.  **Create Project Directory:**
    Create a folder named `threejs_ascii_viewer` in your desired location (e.g., `/Users/marcodietrich/Library/CloudStorage/GoogleDrive-marcodietrich23@gmail.com/My Drive/Windsurf Projects/Marco/threejs_ascii_viewer/`).

2.  **Create Files:**
    Inside the `threejs_ascii_viewer` directory, create the following files and paste the provided content into them:
    *   `index.html`
    *   `style.css`
    *   `script.js`
    *   `README.md` (this file)

3.  **Open `index.html`:**
    Simply open the `index.html` file in a modern web browser that supports ES6 modules (e.g., Chrome, Firefox, Safari, Edge).
    You might need to serve the files through a local web server if you encounter issues with CORS or module loading directly from the filesystem, though for this setup with CDN resources, it might work directly.

    *Quick local server (if needed):*
    If you have Python installed, navigate to the `threejs_ascii_viewer` directory in your terminal and run:
    ```bash
    python -m http.server
    ```
    Then open `http://localhost:8000` (or the port shown) in your browser.

4.  **Provide Your GLTF Model:**
    To display your own GLTF model, you need to change the `modelPath` variable in the `script.js` file.

    *   Open `script.js`.
    *   Find the line (around line 5):
        ```javascript
        const modelPath = '[https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf';](https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf';)
        ```
    *   Replace the URL string with the path or URL to your GLTF model file (e.g., `'models/my_model.gltf'` if you place it in a `models` subfolder, or another URL).

5.  **Interact:**
    *   **Drag** with your mouse to rotate the camera around the model.
    *   **Scroll** to zoom in and out.
    The model will also auto-rotate around its Y-axis.

## Customization (in `script.js`)

You can tweak the following parameters at the top of `script.js`:

*   `modelPath`: Path or URL to your GLTF model.
*   `asciiCharacters`: The string of characters used to render the ASCII art, from darkest to brightest.
*   `asciiResolution`: Controls the detail of the ASCII art. Lower values mean higher detail (more characters). Try values between `0.1` and `0.25`.
*   `asciiScale`: Scales the size of the individual ASCII characters. `1` is a good starting point.
*   `modelRotationSpeed`: Controls how fast the model rotates automatically.

## Dependencies

This project uses [Three.js](https://threejs.org/) and its associated modules (`GLTFLoader`, `OrbitControls`, `AsciiEffect`), loaded via CDN.