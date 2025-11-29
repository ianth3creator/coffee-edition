import React, { useRef, useState, useEffect, Suspense, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Html, Line } from "@react-three/drei";
// Import postprocessing helpers from the @react-three/postprocessing wrapper
import { EffectComposer, DepthOfField, Bloom } from "@react-three/postprocessing";
import { CircleDollarSign } from 'lucide-react';
import * as THREE from "three";

// --- Global Setup (Tailwind, Fonts, Base Styles) ---
// Note: In a production environment, load these fonts and configure Tailwind in separate files.
// Here, we define custom classes for the required aesthetic: font-display (Anton/Bebas Neue style)
// and font-script (Caveat style) and include the Google Fonts import.

const GlobalStyles = () => (
    <style jsx="true">{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@400;700&display=swap');
        
        /* Custom Fonts */
        .font-display { font-family: 'Anton', sans-serif; }
        .font-script { font-family: 'Caveat', cursive; }
        
        /* Base Canvas Container Style */
        .canvas-container {
            width: 100%;
            height: 100vh;
            overflow: hidden;
            background-color: #3b2f2f; /* Deep Mocha Background */
        }

        /* Glitch Popup Animation Classes (Placeholder for Framer Motion integration) */
        .snapshot-box {
            transition: transform 0.2s, opacity 0.2s;
        }
    `}</style>
);


// ---------------- CameraRig (Subtle Cinematic Movement) ----------------
const CameraRig = ({ modelRef, autoRotate = true, autoSpeed = 0.35 }) => {
    useFrame((state, delta) => {
        const t = state.clock.getElapsedTime();
        
        // 1. Model Auto-Rotation
        if (modelRef.current && autoRotate) {
            modelRef.current.rotation.y += delta * autoSpeed;
        }
        
        // 2. Subtle Camera Drift
        const xDrift = Math.sin(t * 0.3) * 0.05;
        const yDrift = Math.cos(t * 0.4) * 0.05;
        state.camera.position.x = xDrift;
        state.camera.position.y = 0.5 + yDrift;
        state.camera.lookAt(0, 1.7, 0);
    });
    return null;
};

// ---------------- InertiaUpdater (Drag/Release Momentum) ----------------
function InertiaUpdater({ modelRef, inertiaRef, draggingRef, inertiaDecay = 4.0 }) {
    useFrame((_, delta) => {
        if (!modelRef.current) return;
        if (!draggingRef.current && Math.abs(inertiaRef.current) > 0) {
            modelRef.current.rotation.y += inertiaRef.current * delta;
            inertiaRef.current *= Math.exp(-inertiaDecay * delta);
            if (Math.abs(inertiaRef.current) < 1e-3) inertiaRef.current = 0;
        }
    });
    return null;
}

// ---------------- Marker anchor points (model-local space) ----------------
const MARKER_POINTS = {
    jacket: new THREE.Vector3(0, 1.35, 0.15), // JKT-01
    pants: new THREE.Vector3(0.08, 0.05, 0.18), // TRS-02
    shoes: new THREE.Vector3(0.32, 0.02, 0.32), // SHS-03 (lowered toward feet)
    watch: new THREE.Vector3(0.32, 1.05, 0.12), // WCH-04
};

/// ---------------- SnapshotBox (HTML overlay - Technical Editorial Style) ----------------
function SnapshotBox({ image, label, id, leftPx = 0, topPx = 0 }) {
  return (
    <div
      className="snapshot-box pointer-events-auto absolute z-40"
      style={{
        left: leftPx,
        top: topPx,
        transform: 'translate(-50%, -50%)',
        willChange: 'transform, opacity',
      }}
    >
      {/* Outer glass container with glow — all inline */}
      <div
        style={{
          width: '160px',
          height: '160px',
          position: 'relative',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          // Glass base
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          // Glow
          boxShadow: '0 0 15px rgba(224, 185, 148, 0.3), 0 8px 30px rgba(0,0,0,0.45)',
          // Backdrop blur (note: may not work in all contexts, but we include it)
          backdropFilter: 'blur(8px) saturate(120%)',
          WebkitBackdropFilter: 'blur(8px) saturate(120%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Glossy highlight (top shine) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }}
        ></div>

        {/* Angled reflective sweep */}
        <div
          style={{
            position: 'absolute',
            top: '-40%',
            left: '-30%',
            width: '160%',
            height: '120%',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0) 30%)',
            transform: 'rotate(-22deg)',
            filter: 'blur(6px)',
            opacity: 0.55,
            pointerEvents: 'none',
          }}
        ></div>

        {/* Image */}
        <img
          src={image}
          alt={label}
          style={{
            width: '100%',
            height: 'calc(100% - 28px)',
            objectFit: 'cover',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://placehold.co/160x160/3b2f2f/c4a484?text=${label.replace(/\s+/g, '+')}`;
          }}
        />

        {/* Glowing ID label */}
        <div
          style={{
            color: '#e0b994',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '4px 8px',
            textAlign: 'left',
            textShadow: '0 0 2px rgba(224, 185, 148, 0.4)',
            fontWeight: 500,
          }}
        >
          {id}
        </div>
      </div>

      {/* Interaction hotspot */}
      <div
        className="absolute top-1/2 left-1/2 -mt-1 -ml-1 w-2 h-2 rounded-full bg-white ring-2 ring-white/50"
      ></div>
    </div>
  );
}

// ---------------- LoadedModel (centers model and attaches ref) ----------------
function LoadedModel({ url, scale = 3.5, modelRef }) {
    const { scene } = useGLTF(url);
    useEffect(() => {
        if (!scene) return;
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        // Adjust center to put model's feet near the origin (Y=0) instead of geometric center
        scene.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
        scene.updateMatrixWorld(true);
    }, [scene]);

    // attach the scene to the passed ref so parent can use modelRef.current
    return <primitive ref={modelRef} object={scene} scale={scale} />;
}

// ---------------- OutfitLines (curved, animated, camera-facing) ----------------
function OutfitLines({ markers, modelRef }) {
    const { camera } = useThree();
    const clockRef = useRef({ t: 0 });
    useFrame((state, delta) => (clockRef.current.t += delta));

    return (
        <>
            {Object.entries(markers).map(([key, localVec]) => {
                // compute world start point (model-local -> world)
                const start = localVec.clone();
                if (modelRef.current) modelRef.current.localToWorld(start);

                // endpoint: pulled slightly outward towards the camera
                const dirToCamera = camera.position.clone().sub(start).normalize();
                const end = start.clone().add(dirToCamera.clone().multiplyScalar(1.2));

                // control point: mid + upward offset + subtle animation
                const mid = start.clone().lerp(end, 0.5);
                const upOffset = new THREE.Vector3(0, 0.4, 0); 
                const wobble = Math.sin(clockRef.current.t * 1.8 + Object.keys(markers).indexOf(key)) * 0.02;
                mid.add(upOffset).add(dirToCamera.clone().multiplyScalar(-0.15)).add(new THREE.Vector3(wobble, wobble, wobble));

                // make smooth curve points (Quadratic Bezier in 3D)
                const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
                const points = curve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, p.z));

                return (
                    <group key={`outfitline-${key}`}>
                        {/* glowing thicker line (faint) */}
                        <Line points={points} color={"#e0b994"} lineWidth={8} transparent opacity={0.1} />
                        {/* inner bright line (Earth Gold Accent) */}
                        <Line points={points} color={"#e0b994"} lineWidth={1.6} />
                    </group>
                );
            })}
        </>
    );
}

// ---------------- PositionUpdater (projects world positions to 2D overlay) ----------------
function PositionUpdater({ markers, modelRef, containerRef, setPositions2D }) {
    const { camera, size } = useThree();

    useFrame(() => {
        if (!containerRef.current || !camera || !size.width || !size.height) return;

        const result = {};
        const tempV = new THREE.Vector3(); // Re-use vector for projection

        Object.entries(markers).forEach(([k, localVec]) => {
            // compute world pos
            const worldPos = localVec.clone();
            if (modelRef.current) modelRef.current.localToWorld(worldPos);

            // Project world pos to screen coordinates
            const proj = worldPos.clone().project(camera);
            
            // Convert normalized device coordinates (-1 to 1) to pixel coordinates (0 to width/height)
            result[k] = {
                x: ((proj.x + 1) / 2) * size.width,
                y: ((-proj.y + 1) / 2) * size.height,
                z: proj.z,
            };
        });

        // Set state only if positions have changed significantly to avoid constant re-renders
        setPositions2D((prev) => {
             const same = Object.keys(result).every((k) => {
                const a = prev[k] || {};
                const b = result[k];
                // Check if position change is less than 0.5 pixels
                return a && b && Math.hypot((a.x || 0) - b.x, (a.y || 0) - b.y) < 0.5;
            });
            if (same) return prev;
            return result;
        });
    });

    return null;
}

// ---------------- MAIN APP COMPONENT ----------------
export default function App({ modelScale = 3.5 }) {
    // model loader
    const [modelUrl, setModelUrl] = useState(null);
    const modelRef = useRef(null);
    
    // drag / inertia
    const dragging = useRef(false);
    const lastX = useRef(0);
    const inertia = useRef(0);
    const lastMoveTime = useRef(0);
    const dragSensitivity = 0.012;
    const inertiaDecay = 4.0;

    // overlay / projection
    const containerRef = useRef(null);
    const [positions2D, setPositions2D] = useState({});
    // anchorFixed stores the initial screen anchor (based on marker projections)
    // Panel will be placed relative to this and remain stagnant afterwards
    const anchorFixed = useRef(null);

    // Model path logic (retained from original code)
    useEffect(() => {
        const tryHead = async (url) => {
            try {
                const res = await fetch(url, { method: "HEAD" });
                return res.ok;
            } catch {
                return false;
            }
        };
        (async () => {
            const primary = "/models/ian_coffee.glb";
            const fallback = "/models/fashion+model+3d+model.glb"; // Assuming this is a viable generic model
            if (await tryHead(primary)) setModelUrl(primary);
            else if (await tryHead(fallback)) setModelUrl(fallback);
        })();
    }, []);

    // pointer handlers
    const onPointerDown = useCallback((e) => {
        e.stopPropagation();
        dragging.current = true;
        lastX.current = e.clientX || e.nativeEvent?.clientX || 0;
        lastMoveTime.current = performance.now();
        inertia.current = 0;
    }, []);
    const onPointerMove = useCallback((e) => {
        if (!dragging.current || !modelRef.current) return;
        const clientX = e.clientX || e.nativeEvent?.clientX || 0;
        const now = performance.now();
        const dt = Math.max(1e-3, (now - lastMoveTime.current) / 1000);
        const delta = clientX - lastX.current;
        modelRef.current.rotation.y += delta * dragSensitivity;
        inertia.current = (delta / dt) * dragSensitivity;
        lastX.current = clientX;
        lastMoveTime.current = now;
    }, [dragSensitivity]);
    const stopDrag = useCallback(() => (dragging.current = false), []);


    // Image paths and technical IDs
    const ITEM_DETAILS = {
        jacket: { 
    id: "JKT-01", 
    label: "COFFEE JACKET", 
    image: "/assets/images/jacket.jpg",
    url: "https://www.overland.com/product/mens-leather-jackets?srsltid=AfmBOorzK8sgkDIoioaYiQ_dwoXhoP_jxCllvUri5GqVPBHE4-bHf_45"
  },
        pants: { id: "TRS-02", label: "WIDE TROUSERS", image: "/assets/images/pants.jpg" , url: "https://www.uniqlo.com/us/en/search?q=wide%20leg%20pleated%20pants&queryRelaxationFlag=true" },
        shoes: { id: "SHS-03", label: "PREMIUM MOCS", image: "/assets/images/shoes.jpg" , url:"https://www.skechers.com/?srsltid=AfmBOoq-7uZc1uRMTFMRv1B_7HwoOmahf5CN0uqG64y2g27a1KVASvWn" },
        watch: { id: "WCH-04", label: "AURORA TIMEPIECE", image: "/assets/images/watch.jpg" ,url: "https://www.armani.com/en-wx/emporio-armani/man/accessories/watches/" },
    };


    return (
        <div className="canvas-container relative" ref={containerRef} 
             onPointerMove={onPointerMove} 
             onPointerUp={stopDrag}
             onPointerLeave={stopDrag}
             onPointerCancel={stopDrag}>
             
            <GlobalStyles />

          {/* UI OVERLAY - Matches UI Concept Image Aesthetic */}
<div className="absolute top-[10%] left-[2%] md:top-[12%] md:left-[10%] z-50 text-left pointer-events-none w-5/6 md:w-1/3 max-w-lg">
    {/* Replace "I" with CircleDollarSign icon */}
    <div className="flex items-center gap-1">
        <CircleDollarSign 
            size={20} // Adjust size as needed
            color="#c4a48c" // Match the text color
            style={{
                filter: 'drop-shadow(0 0 2px rgba(224, 185, 148, 0.5))' // Add glow to the icon
            }}
        />
        <p 
            className="text-sm md:text-xl font-mono tracking-widest uppercase"
            style={{
                color: '#c4a48c',
                textShadow: '0 0 2px rgba(224, 185, 148, 0.5)' // Add glow to the text
            }}
        >
            OWNERS' CLUB
        </p>
    </div>
    
    <h1 
        className="text-[12vw] md:text-[8vw] font-display leading-[0.85] tracking-tight mt-1"
        style={{
            color: 'white',
            textShadow: '0 0 3px rgba(255, 255, 255, 0.7), 0 0 6px rgba(224, 185, 148, 0.5)' // Add glow to the title
        }}
    >
        COFFEE <br /> EDITION
    </h1>

    {/* Dedicated Container for the Text Block */}
    <div 
        className="absolute top-[calc(100%+0.5rem)] left-0 z-10" // Position below the "COFFEE EDITION" heading
        style={{
            // Reduce the size of the container
            width: '140px',  // Reduced from 180px
            height: '90px',  // Reduced from 120px
            overflowY: 'hidden', // Clip any content that overflows vertically
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between', // Distribute space between text lines
            alignItems: 'flex-start',
            // Apply the frosted glass styling directly
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.5rem',
            padding: '0.5rem', // Reduced padding for smaller container
            color: '#e0b994',
            // Add a subtle glow effect with a larger box-shadow
            boxShadow: '0 0 15px rgba(224, 185, 148, 0.3), 0 8px 30px rgba(0,0,0,0.45)', // Added glow
            backdropFilter: 'blur(8px) saturate(120%)',
            WebkitBackdropFilter: 'blur(8px) saturate(120%)',
            // Add the glossy highlight and reflective sweep from your CSS
            position: 'relative'
        }}
    >
        {/* Glossy Highlight */}
        <div 
            style={{
                content: "",
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0) 100%)',
                pointerEvents: 'none',
                mixBlendMode: 'overlay'
            }}
        />
        
        {/* Angled Reflective Sweep */}
        <div 
            style={{
                content: "",
                position: 'absolute',
                left: '-30%',
                top: '-40%',
                width: '160%',
                height: '120%',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 20%, rgba(255,255,255,0) 30%)',
                transform: 'rotate(-22deg)',
                filter: 'blur(6px)',
                opacity: 0.55,
                pointerEvents: 'none'
            }}
        />

        {/* Text Content */}
        <p 
            className="text-[10px] md:text-[11px] font-light italic leading-tight" // Reduced font size
            style={{
                // Force text to wrap and stay within the container's height
                wordWrap: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: '3', // Limit to 3 lines of text
                WebkitBoxOrient: 'vertical',
                maxHeight: 'calc(100% - 15px)' // Reserve space for the "powered by" line
            }}
        >
            Introducing the Owners' Club , a realm for fashion-Art-tech creatives
        </p>
        <p 
            className="text-[9px] md:text-[10px] font-script tracking-wide opacity-95" // Reduced font size
            style={{
                // Ensure the bottom line stays visible
                marginTop: 'auto', // Pushes this line to the bottom
                whiteSpace: 'nowrap', // Prevents wrapping for this short line
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}
        >
            powered by enthusiasts
        </p>
    </div>
</div>


            {/* R3F CANVAS */}
            <Canvas 
                gl={{ antialias: true }} 
                camera={{ position: [0, 1.8, 6], fov: 45 }}
                // Capture pointer down on the canvas to start drag logic
                onPointerDown={onPointerDown} 
            >
                {/* background + fog (Coffee Tones) */}
                <color attach="background" args={["#3b2f2f"]} />
                <fog attach="fog" args={["#3b2f2f", 5, 20]} />

                {/* lighting (Warm Cinematic Tones) */}
                <ambientLight intensity={0.6} color="#e8cfae" />
                <pointLight color="#e0b994" intensity={1.3} position={[3, 3, 3]} /> {/* Key Warm Light */}
                <pointLight color="#5c4033" intensity={0.8} position={[-2, 2, -2]} /> {/* Fill Mocha Light */}
                <directionalLight position={[0, 5, 2]} intensity={0.9} color="#f6e6c8" /> {/* Top/Rim Light */}

                {/* model group (lowered slightly for improved composition) */}
                <group position={[0, -1.4, 0]}>
                    <Suspense
                        fallback={
                            <Html center className="select-none">
                                <div className="text-[#d2b48c] font-script text-lg animate-pulse">Brewing the look...</div>
                            </Html>
                        }
                    >
                        {modelUrl ? (
                            <LoadedModel url={modelUrl} scale={modelScale} modelRef={modelRef} />
                        ) : (
                            <mesh ref={modelRef}>
                                <boxGeometry args={[modelScale, modelScale * 2, modelScale]} />
                                <meshStandardMaterial color="#d2b48c" />
                            </mesh>
                        )}
                    </Suspense>
                </group>

                {/* Camera rig & inertia */}
                <CameraRig modelRef={modelRef} autoRotate={true} autoSpeed={0.08} /> {/* Reduced speed for more stillness */}
                <InertiaUpdater modelRef={modelRef} inertiaRef={inertia} draggingRef={dragging} inertiaDecay={inertiaDecay} />

                <Environment preset="studio" background={false} />

                {/* postprocessing (Cinematic Softness and Depth) */}
                <EffectComposer>
                    <DepthOfField focusDistance={0.02} focalLength={0.04} bokehScale={2} height={480} />
                    <Bloom intensity={0.06} luminanceThreshold={0.78} luminanceSmoothing={0.12} height={256} />
                </EffectComposer>

                {/* position updater to compute 2D overlay coords */}
                <PositionUpdater markers={MARKER_POINTS} modelRef={modelRef} containerRef={containerRef} setPositions2D={setPositions2D} />
            </Canvas>

        {/* Fixed panel placed next to the model (anchored from initial projection) */}
{(() => {
    const keys = Object.keys(ITEM_DETAILS);
    // compute anchor once from available projected positions
    if (!anchorFixed.current && containerRef.current) {
        const visible = Object.keys(positions2D);
        if (visible.length > 0) {
            const pts = visible.map((k) => positions2D[k]);
            const anchorX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const anchorY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
            anchorFixed.current = { x: anchorX, y: anchorY };
        }
    }

    const containerW = containerRef.current?.clientWidth || window.innerWidth;
    const containerH = containerRef.current?.clientHeight || window.innerHeight;
    const fallback = { x: containerW * 0.66, y: containerH * 0.5 };
    const anchor = anchorFixed.current || fallback;

    const sideOffset = 120; // always place to the right of the anchor

    const boxSizeW = 80;
    const boxSizeH = 64;
    const spacing = 12;
    const totalHeight = keys.length * boxSizeH + Math.max(0, keys.length - 1) * spacing;
    const firstCenterY = anchor.y - totalHeight / 2 + boxSizeH / 2;

    let leftPx = anchor.x + sideOffset;
    leftPx = Math.min(Math.max(8, leftPx), containerW - boxSizeW - 8);

    const clampedTop = Math.min(Math.max(8, firstCenterY), containerH - totalHeight - 8);

    return (
        <div style={{ position: 'absolute', left: leftPx, top: clampedTop, zIndex: 50, pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: `${spacing}px` }}>
                {keys.map((key, i) => {
                    const item = ITEM_DETAILS[key];
                    return (
                        <div 
                            key={key} 
                            style={{ 
                                width: boxSizeW, 
                                height: boxSizeH, 
                                background: 'rgba(0,0,0,0.46)', 
                                border: '1px solid rgba(255,255,255,0.08)', 
                                borderRadius: 6, 
                                overflow: 'hidden', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center' 
                            }}
                        >
                            {item.url ? (
                                <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ width: '100%', height: boxSizeH - 20, display: 'block' }}
                                >
                                    <img
                                        src={item.image}
                                        alt={item.label}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://placehold.co/${boxSizeW}x${boxSizeH - 20}/3b2f2f/c4a484?text=${item.id}`;
                                        }}
                                    />
                                </a>
                            ) : (
                                <img
                                    src={item.image}
                                    alt={item.label}
                                    style={{ width: '100%', height: boxSizeH - 20, objectFit: 'cover' }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://placehold.co/${boxSizeW}x${boxSizeH - 20}/3b2f2f/c4a484?text=${item.id}`;
                                    }}
                                />
                            )}
                            <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 11, padding: 4 }}>{item.id}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
})()}


        </div>
    );
}
