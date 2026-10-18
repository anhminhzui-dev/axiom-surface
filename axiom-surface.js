/**
 * AxiomSurface: Deformation-Invariant Rest-Coordinate Triplanar PBR Shading Kernel
 * Author: Vo Ba Hoang Minh (anhminhzui-dev)
 * License: MIT
 *
 * Description:
 * Evaluates triplanar procedural textures in pre-deformation object rest space (P_rest, N_rest),
 * eliminating the need for manual UV unwrapping while preventing texture sliding on deforming geometry.
 */

export class AxiomSurface {
  /**
   * Captures rest attributes (position, normal) from an un-deformed geometry.
   * @param {THREE.BufferGeometry} geometry 
   */
  static captureRestAttributes(geometry) {
    if (!geometry.attributes.position) {
      throw new Error("AxiomSurface: Geometry missing position attribute.");
    }
    
    // Clone rest position
    const pos = geometry.attributes.position;
    const restPos = new Float32Array(pos.array);
    geometry.setAttribute('restPosition', new THREE.BufferAttribute(restPos, 3));

    // Clone or compute rest normal
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    const norm = geometry.attributes.normal;
    const restNorm = new Float32Array(norm.array);
    geometry.setAttribute('restNormal', new THREE.BufferAttribute(restNorm, 3));
    
    return geometry;
  }

  /**
   * Constructs a deformation-invariant Triplanar ShaderMaterial.
   * @param {Object} options
   * @param {THREE.Texture} [options.diffuseMap]
   * @param {THREE.Texture} [options.normalMap]
   * @param {number} [options.scale=1.0]
   * @param {number} [options.blendSharpness=4.0]
   * @param {THREE.Color} [options.baseColor]
   */
  static createMaterial(options = {}) {
    const scale = options.scale || 1.0;
    const blendSharpness = options.blendSharpness || 4.0;
    const baseColor = options.baseColor || new THREE.Color(0xffffff);

    const vertexShader = `
      attribute vec3 restPosition;
      attribute vec3 restNormal;
      
      varying vec3 vRestPosition;
      varying vec3 vRestNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        #ifdef USE_REST_ATTRIBUTES
          vRestPosition = restPosition;
          vRestNormal = normalize(restNormal);
        #else
          vRestPosition = position;
          vRestNormal = normalize(normal);
        #endif

        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      precision highp float;
      
      uniform sampler2D tDiffuse;
      uniform bool uHasDiffuse;
      uniform float uScale;
      uniform float uSharpness;
      uniform vec3 uColor;
      uniform bool uUseRestCoordinates;

      varying vec3 vRestPosition;
      varying vec3 vRestNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      // MaterialX-aligned normalized blend weight calculation
      vec3 computeTriplanarWeights(vec3 normal, float sharpness) {
        vec3 n = abs(normal);
        vec3 w = pow(n, vec3(sharpness));
        return w / (w.x + w.y + w.z + 1e-6);
      }

      void main() {
        // Switch between Rest Coordinates (deformation invariant) and Live Coordinates (sliding)
        vec3 coords = uUseRestCoordinates ? vRestPosition : vWorldPosition;
        vec3 norm = uUseRestCoordinates ? vRestNormal : vWorldNormal;

        vec3 weights = computeTriplanarWeights(norm, uSharpness);

        // Triplanar procedural sampling
        vec2 uvX = coords.zy * uScale;
        vec2 uvY = coords.xz * uScale;
        vec2 uvZ = coords.xy * uScale;

        vec4 colX = uHasDiffuse ? texture2D(tDiffuse, uvX) : vec4(vec3(0.8, 0.2, 0.2), 1.0);
        vec4 colY = uHasDiffuse ? texture2D(tDiffuse, uvY) : vec4(vec3(0.2, 0.8, 0.2), 1.0);
        vec4 colZ = uHasDiffuse ? texture2D(tDiffuse, uvZ) : vec4(vec3(0.2, 0.2, 0.8), 1.0);

        vec4 finalColor = colX * weights.x + colY * weights.y + colZ * weights.z;
        finalColor.rgb *= uColor;

        // Simple directional lighting for instant depth verification
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.5));
        float diff = max(dot(vWorldNormal, lightDir), 0.15);
        
        // Renaissance warm key / cool fill shadow styling
        vec3 litColor = finalColor.rgb * diff;
        vec3 ambientCool = vec3(0.08, 0.10, 0.15) * (1.0 - diff);
        
        gl_FragColor = vec4(litColor + ambientCool, 1.0);
      }
    `;

    return new THREE.ShaderMaterial({
      defines: {
        USE_REST_ATTRIBUTES: true
      },
      uniforms: {
        tDiffuse: { value: options.diffuseMap || null },
        uHasDiffuse: { value: !!options.diffuseMap },
        uScale: { value: scale },
        uSharpness: { value: blendSharpness },
        uColor: { value: baseColor },
        uUseRestCoordinates: { value: true }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });
  }
}
