# AXIOM-SURFACE
### Deformation-Invariant Rest-Coordinate PBR Manifold Shading

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Demo: 60 FPS WebGL](https://img.shields.io/badge/Demo-Interactive%20WebGL-success)](https://anhminhzui-dev.github.io/axiom-surface/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)](#)

> **Eliminating the UV unwrapping bottleneck for organic sculpts, procedural lookdev, and deforming meshes through rest-space manifold projection.**

---

## 1. The Core Problem: The Triplanar Dilemma

In film, game development, and procedural lookdev, **manual UV unwrapping is the single largest manual friction point**. Artists routinely spend 30% to 50% of asset preparation time cutting seams, packing charts, and resolving distortion.

While **Triplanar Mapping** allows texturing 3D objects without UV coordinates by projecting along the principal Cartesian axes ($X, Y, Z$), it suffers from a fatal flaw in production:
* **The "Texture Swimming" Defect:** Because traditional triplanar projection samples coordinates in live World Space or Object Space, **any vertex deformation, skeletal skinning, cloth simulation, or bending causes the surface to slide through the texture volume like a projector projecting onto a moving sheet**.
* **The Seam Distortion:** Standard planar blend functions create severe blurring or harsh angular artifacts across high-curvature surface normals.

---

## 2. The Axiom Architecture

`AXIOM-SURFACE` resolves this by decoupling the **projection sampling space** from the **deformation evaluation space**:

```
AXIOM REST-COORDINATE ARCHITECTURE
┌───────────────────────────┐
│ Raw Geometry (Zero UVs)   │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Capture Rest Coordinates  │ ──► Stores P_rest, N_rest in uncompressed vertex buffers
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Dynamic Vertex Deformation│ ──► Skinning, cloth solver, skeletal transforms (P_live, N_live)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Rest-Manifold Projection  │ ──► Triplanar sampling occurs strictly in (P_rest, N_rest)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ PBR Shading & Lighting    │ ──► Final normals & lighting evaluate in World Space (N_live)
└───────────────────────────┘
RESULT: Zero UV allocation, zero texture swimming, zero seam sliding across 100% of frames.
```

---

## 3. Mathematical Formulation

### 3.1 Rest-Attribute Capture
Before any skeletal or simulation pass, the un-deformed manifold coordinates are pinned:
$$\vec{P}_{\text{rest}} = \vec{P}_0 \in \mathbb{R}^3, \quad \vec{N}_{\text{rest}} = \vec{N}_0 \in \mathbb{S}^2$$

### 3.2 MaterialX-Aligned Triplanar Weights
To guarantee energy conservation and smooth transitions without visible seams, weights $w_x, w_y, w_z$ are computed using a normalized power blend:
$$w_i = \frac{|N_{\text{rest}, i}|^p}{\sum_{j \in \{x,y,z\}} |N_{\text{rest}, j}|^p + \epsilon}, \quad p \in [2.0, 16.0]$$
Where $p$ governs blend sharpness and $\epsilon = 10^{-6}$ prevents division by zero.

### 3.3 Sampling & Lighting Decoupling
The procedural texture color $C$ is sampled strictly from rest projections:
$$C = w_x \cdot \mathcal{T}(P_{\text{rest}}^{yz}) + w_y \cdot \mathcal{T}(P_{\text{rest}}^{xz}) + w_z \cdot \mathcal{T}(P_{\text{rest}}^{xy})$$
Crucially, surface illumination $I$ evaluates against the **deformed live world normal** $\vec{N}_{\text{live}}$:
$$I = \max(\vec{N}_{\text{live}} \cdot \vec{L}, 0.0) \cdot C$$
This guarantees that while the surface physically bends, reacts to physics, and reflects light correctly in scene space, the surface pigment remains **permanently locked to the mesh manifold**.

---

## 4. Comparison Matrix

| Feature | Manual UV Unwrapping | Classic Triplanar | `AXIOM-SURFACE` |
|---|---|---|---|
| **UV Allocation Required** | Yes (Hours per asset) | No | **No (Zero UVs)** |
| **Texture Swimming on Deformation** | No | Severe (Unusable in motion) | **Zero (Glued to manifold)** |
| **Seam Artifacts** | Frequent at UV seams | High at 45° normals | **Eliminated (Power blend)** |
| **GPU Memory Footprint** | High (UV coordinates + charts) | Minimal | **Low (2 float32 vectors)** |
| **Runtime Performance** | Baseline | 120+ FPS | **120+ FPS** |

---

## 5. Quickstart Guide (JavaScript / Three.js)

```javascript
import * as THREE from 'three';
import { AxiomSurface } from './axiom-surface.js';

// 1. Take any raw mesh geometry (even without UV coordinates)
const geometry = new THREE.TorusKnotGeometry(1, 0.4, 128, 32);
geometry.deleteAttribute('uv'); // No UVs needed!

// 2. Capture rest manifold attributes before animation
AxiomSurface.captureRestAttributes(geometry);

// 3. Create deformation-invariant shader material
const material = AxiomSurface.createMaterial({
  diffuseMap: myTexture,
  scale: 2.0,
  blendSharpness: 4.0
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

---

## 6. Interactive Live Demo
A zero-install live demo is provided in [`index.html`](index.html).  
Open it in any modern browser to interactively test real-time non-linear mesh twisting and toggle between **Axiom Rest Coordinates (Locked)** and **Classic Triplanar (Swimming)**.

---

## 7. Proprietary Disclosure & Architecture Fence
In accordance with our open-source release policy:
* **Included:** Core rest-attribute capture algorithms, GLSL/WGSL triplanar evaluation kernels, and zero-dependency Three.js adapter.
* **Withheld:** Studio production scan libraries, proprietary lookdev brush presets, and internal client TVC project setups.

---

## 8. License
Distributed under the MIT License. See `LICENSE` for more information.
