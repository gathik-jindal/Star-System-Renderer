# 3D Star System Generator (WebGL)

This project is a 3D interactive star system generator built with raw WebGL and JavaScript for the CS606 Programming Assignment 2. It renders a star and a set of orbiting planets, with full camera controls, object picking, and dynamic transformations.

## ✨ Features

### 3D Scene & Rendering

  * **Star System:** Renders a central, emissive (glowing) star and 3+ planets.
  * **Elliptical Orbits:** Planets revolve around the star in unique, concentric, and non-colliding elliptical orbits.
  * **Orbit Paths:** The elliptical path for each planet is rendered as a colored line.
  * **Model Loading:** Loads all 3D models (`.ply` format) on startup.

## ScreenShots

![](readme-assets/home.png)
![](readme-assets/top.png)

### Camera & View

  * **Dual-Mode Camera:** Toggle between a "Top View" (orthographic) and a "3D View" (perspective) with one key.
  * **3D Trackball:** The 3D view uses a quaternion-based arcball/trackball camera, allowing for smooth, arbitrary rotations around the origin.
  * **Orientation Gizmo:** A 3D axis gizmo (like in Blender) is rendered in the top-right corner and mirrors the main camera's orientation.

### Interactivity & Controls

  * **Object Picking:** In "Top View," you can click on any planet to select it. This is implemented using a pixel-perfect, off-screen framebuffer (FBO) technique.
  * **Highlighting:** The selected planet is highlighted with a distinct white color.
  * **Add/Delete Planets:**
      * **Add:** Click on a model in the right-hand sidebar to add a new planet with a unique, randomly-generated orbit.
      * **Delete:** Press `Delete` or `Backspace` to remove the selected planet (a minimum of 3 planets is enforced).
  * **Animation Control:**
      * `Spacebar`: Toggles the automatic revolution (orbiting) of all planets.
      * `T`: Toggles "Manual Rotation Mode" for the selected planet.
  * **Planet Transformations (for selected planet):**
      * **Revolution Speed:** `[` (slower) and `]` (faster).
      * **Manual Rotation:** (When `T` is on) Use `x/X`, `y/Y`, and `z/Z` keys.
      * **Scaling:** (When `Spacebar` is off) Use `PageUp` and `PageDown` to scale a stationary planet. It resumes its original size when revolution is turned back on.

## 🗂️ Project Structure

```
.
├── Objects/
│   ├── cone.ply
│   ├── cube.ply
│   ├── cylinder.ply
│   ├── icosphere.ply
│   ├── monkey.ply
│   ├── sphere.ply
│   └── torus.ply
├── gizmoRenderer.js     # Manages the 3D axis gizmo
├── GameObject.js        # Class for a single renderable 3D object
├── index.html           # Main HTML file (contains all CSS)
├── index.js             # Main script: initializes GL, loads models, starts loop
├── InputHandler.js      # Module for all keyboard/mouse event listeners
├── ObjectPicker.js      # Manages the FBO for object picking
├── OrbitRenderer.js     # Manages drawing the elliptical orbit lines
├── OrbitShaders.js      # GLSL shaders for the orbit lines
├── PlanetSelection.js   # Manages the right-hand sidebar UI
├── PLYLoader.js         # Utility for parsing .ply model files
├── Shaders.js           # GLSL shaders for the main 3D objects (phong-style)
└── ShaderUtil.js        # Utility for compiling/linking all shader programs
```

## 🚀 How to Run

This project must be run from a local web server because it uses `fetch()` to load 3D models, which is blocked by browser CORS policies if you open `index.html` directly from the filesystem.

Open a terminal in the project's root directory.

If you have Python 3, run:

```bash
python -m http.server
```

Open your browser and navigate to http://localhost:8000.
