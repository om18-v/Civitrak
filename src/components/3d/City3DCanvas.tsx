import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Scan, MapPin, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';

export const City3DCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF4F8FA); // Soft daylight sky
    scene.fog = new THREE.FogExp2(0xF4F8FA, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(38, 32, 42);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting (Daytime soft sun)
    const ambientLight = new THREE.AmbientLight(0xE2EDF5, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
    dirLight.position.set(40, 60, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x087EA4, 0.4);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // Ground plane (Urban landscape)
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xEEF3F6 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Roads layout (Main Highway + Cross Arterials)
    const roadGroup = new THREE.Group();
    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x2A3842 });
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B });

    // Main Avenue (X-axis)
    const mainAvenueGeo = new THREE.PlaneGeometry(140, 14);
    const mainAvenue = new THREE.Mesh(mainAvenueGeo, asphaltMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.position.y = 0.02;
    mainAvenue.receiveShadow = true;
    roadGroup.add(mainAvenue);

    // Cross Road (Z-axis)
    const crossRoadGeo = new THREE.PlaneGeometry(12, 140);
    const crossRoad = new THREE.Mesh(crossRoadGeo, asphaltMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.03;
    crossRoad.receiveShadow = true;
    roadGroup.add(crossRoad);

    // Secondary Avenue
    const secAvenueGeo = new THREE.PlaneGeometry(140, 9);
    const secAvenue = new THREE.Mesh(secAvenueGeo, asphaltMat);
    secAvenue.rotation.x = -Math.PI / 2;
    secAvenue.position.set(0, 0.02, 28);
    secAvenue.receiveShadow = true;
    roadGroup.add(secAvenue);

    // Road markings
    for (let x = -60; x <= 60; x += 6) {
      if (Math.abs(x) < 8) continue; // Skip intersection
      // Main avenue center dashes
      const dashGeo = new THREE.PlaneGeometry(3, 0.35);
      const dash = new THREE.Mesh(dashGeo, markingMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.05, 0);
      roadGroup.add(dash);

      // Yellow lane dividers
      const yellowDash = new THREE.Mesh(dashGeo, yellowLineMat);
      yellowDash.rotation.x = -Math.PI / 2;
      yellowDash.position.set(x, 0.05, 3.5);
      roadGroup.add(yellowDash);
    }

    scene.add(roadGroup);

    // Low-poly City Buildings
    const buildingGroup = new THREE.Group();
    const bldColors = [0xDFEBF1, 0xCEE0EA, 0xD4E4EE, 0xEBF3F7, 0xC3D7E3];
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x0EA5C6 });

    const buildingDefs = [
      // Quadrant 1 (Top-Left)
      { x: -22, z: -18, w: 10, h: 22, d: 10 },
      { x: -36, z: -16, w: 12, h: 14, d: 8 },
      { x: -20, z: -32, w: 9, h: 28, d: 12 },
      { x: -35, z: -30, w: 14, h: 18, d: 11 },
      // Quadrant 2 (Top-Right)
      { x: 20, z: -18, w: 11, h: 26, d: 11 },
      { x: 34, z: -16, w: 10, h: 16, d: 9 },
      { x: 22, z: -32, w: 12, h: 20, d: 12 },
      { x: 36, z: -30, w: 12, h: 32, d: 10 },
      // Quadrant 3 (Bottom-Left)
      { x: -22, z: 16, w: 10, h: 18, d: 7 },
      { x: -36, z: 16, w: 11, h: 12, d: 7 },
      { x: -24, z: 42, w: 12, h: 16, d: 10 },
      // Quadrant 4 (Bottom-Right)
      { x: 22, z: 16, w: 9, h: 24, d: 8 },
      { x: 36, z: 16, w: 12, h: 15, d: 8 },
      { x: 25, z: 42, w: 13, h: 20, d: 11 },
    ];

    buildingDefs.forEach((def, i) => {
      const bldMat = new THREE.MeshLambertMaterial({
        color: bldColors[i % bldColors.length],
      });
      const bldGeo = new THREE.BoxGeometry(def.w, def.h, def.d);
      const bld = new THREE.Mesh(bldGeo, bldMat);
      bld.position.set(def.x, def.h / 2, def.z);
      bld.castShadow = true;
      bld.receiveShadow = true;
      buildingGroup.add(bld);

      // Roof accent
      const roofGeo = new THREE.BoxGeometry(def.w * 0.7, 1.2, def.d * 0.7);
      const roof = new THREE.Mesh(roofGeo, glassMat);
      roof.position.set(def.x, def.h + 0.6, def.z);
      buildingGroup.add(roof);
    });

    scene.add(buildingGroup);

    // Vehicles (Buses & Cars)
    interface Vehicle {
      mesh: THREE.Group;
      speed: number;
      type: 'bus' | 'car';
      direction: number; // 1 or -1
      roadAxis: 'x' | 'z';
      minPos: number;
      maxPos: number;
    }

    const vehicles: Vehicle[] = [];

    // Helper: Create a Bus
    const createBus = (colorHex: number): THREE.Group => {
      const bus = new THREE.Group();
      // Body
      const bodyGeo = new THREE.BoxGeometry(5.2, 2.2, 2.1);
      const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.3;
      body.castShadow = true;
      bus.add(body);

      // Windows
      const winGeo = new THREE.BoxGeometry(4.4, 0.7, 2.16);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x07131D });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.y = 1.6;
      bus.add(win);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
      [-1.6, 1.6].forEach(x => {
        [-1, 1].forEach(z => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(x, 0.4, z * 1.05);
          bus.add(wheel);
        });
      });

      return bus;
    };

    // Helper: Create a Car
    const createCar = (colorHex: number): THREE.Group => {
      const car = new THREE.Group();
      // Lower body
      const bodyGeo = new THREE.BoxGeometry(3.0, 0.9, 1.6);
      const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.65;
      body.castShadow = true;
      car.add(body);

      // Cabin
      const cabGeo = new THREE.BoxGeometry(1.6, 0.6, 1.4);
      const cabMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(-0.2, 1.25, 0);
      car.add(cab);

      // Headlights
      const headMat = new THREE.MeshBasicMaterial({ color: 0xFFFBEB });
      const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.3), headMat);
      hl1.position.set(1.5, 0.65, 0.5);
      const hl2 = hl1.clone();
      hl2.position.set(1.5, 0.65, -0.5);
      car.add(hl1, hl2);

      return car;
    };

    // Instantiate Bus 1 (City Transit)
    const bus1 = createBus(0x087EA4);
    bus1.position.set(-25, 0, -2.5);
    scene.add(bus1);
    vehicles.push({
      mesh: bus1,
      speed: 0.08,
      type: 'bus',
      direction: 1,
      roadAxis: 'x',
      minPos: -65,
      maxPos: 65,
    });

    // Instantiate Bus 2 (Urban Link)
    const bus2 = createBus(0xF59E0B);
    bus2.position.set(20, 0, 2.5);
    bus2.rotation.y = Math.PI;
    scene.add(bus2);
    vehicles.push({
      mesh: bus2,
      speed: 0.07,
      type: 'bus',
      direction: -1,
      roadAxis: 'x',
      minPos: -65,
      maxPos: 65,
    });

    // Instantiate Car 1 (White Sedan)
    const car1 = createCar(0xFFFFFF);
    car1.position.set(-10, 0, -4.2);
    scene.add(car1);
    vehicles.push({
      mesh: car1,
      speed: 0.14,
      type: 'car',
      direction: 1,
      roadAxis: 'x',
      minPos: -65,
      maxPos: 65,
    });

    // Instantiate Car 2 (Cyan Hatchback)
    const car2 = createCar(0x16C7D9);
    car2.position.set(35, 0, 4.2);
    car2.rotation.y = Math.PI;
    scene.add(car2);
    vehicles.push({
      mesh: car2,
      speed: 0.16,
      type: 'car',
      direction: -1,
      roadAxis: 'x',
      minPos: -65,
      maxPos: 65,
    });

    // Instantiate Car 3 (Cross road North-bound)
    const car3 = createCar(0x3B82F6);
    car3.position.set(2.8, 0, -30);
    car3.rotation.y = -Math.PI / 2;
    scene.add(car3);
    vehicles.push({
      mesh: car3,
      speed: 0.12,
      type: 'car',
      direction: 1,
      roadAxis: 'z',
      minPos: -55,
      maxPos: 55,
    });

    // GIS Detection Nodes (Pulsing holographic pins)
    const pinGroup = new THREE.Group();
    const pinGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const pinBeaconMat = new THREE.MeshBasicMaterial({ color: 0x16C7D9 });
    const ringGeo = new THREE.RingGeometry(0.9, 1.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0EA5C6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });

    const pinCoords = [
      { x: -14, z: -1.5, type: 'pothole', color: 0xDC2626 },
      { x: 12, z: 2.5, type: 'manhole', color: 0xF59E0B },
      { x: 3, z: 18, type: 'traffic', color: 0x087EA4 },
    ];

    const pulsingRings: THREE.Mesh[] = [];

    pinCoords.forEach(c => {
      const pinSubGroup = new THREE.Group();
      pinSubGroup.position.set(c.x, 2.5, c.z);

      const sphere = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: c.color }));
      pinSubGroup.add(sphere);

      // Pin stem
      const stemGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5);
      const stem = new THREE.Mesh(stemGeo, pinBeaconMat);
      stem.position.y = -1.25;
      pinSubGroup.add(stem);

      // Ground pulse ring
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.x, 0.08, c.z);
      pinGroup.add(ring);
      pulsingRings.push(ring);

      pinGroup.add(pinSubGroup);
    });

    scene.add(pinGroup);

    // AI Route telemetry line
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-55, 0.1, -2.5),
      new THREE.Vector3(-20, 0.1, -2.5),
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(25, 0.1, 2.5),
      new THREE.Vector3(55, 0.1, 2.5),
    ]);
    const routePoints = curve.getPoints(60);
    const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
    const routeMat = new THREE.LineDashedMaterial({
      color: 0x0EA5C6,
      dashSize: 2,
      gapSize: 1,
      linewidth: 2,
    });
    const routeLine = new THREE.Line(routeGeo, routeMat);
    routeLine.computeLineDistances();
    scene.add(routeLine);

    // Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Vehicle continuous movement
      vehicles.forEach(v => {
        if (v.roadAxis === 'x') {
          v.mesh.position.x += v.speed * v.direction;
          if (v.direction === 1 && v.mesh.position.x > v.maxPos) {
            v.mesh.position.x = v.minPos;
          } else if (v.direction === -1 && v.mesh.position.x < v.minPos) {
            v.mesh.position.x = v.maxPos;
          }
        } else {
          v.mesh.position.z += v.speed * v.direction;
          if (v.direction === 1 && v.mesh.position.z > v.maxPos) {
            v.mesh.position.z = v.minPos;
          } else if (v.direction === -1 && v.mesh.position.z < v.minPos) {
            v.mesh.position.z = v.maxPos;
          }
        }
      });

      // Ring pulse animation
      pulsingRings.forEach((ring, idx) => {
        const scale = 1 + ((elapsedTime * 1.5 + idx * 0.7) % 2.5);
        ring.scale.set(scale, scale, 1);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.8 - (scale - 1) / 2.5);
      });

      // Very subtle calm camera drift
      camera.position.x = 38 + Math.sin(elapsedTime * 0.2) * 2;
      camera.position.z = 42 + Math.cos(elapsedTime * 0.2) * 2;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Resize handling via ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width && height) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[540px] md:h-[620px] lg:h-[680px] rounded-3xl overflow-hidden border border-slate-200/80 bg-gradient-to-b from-[#F4F8FA] to-[#E9F1F6] shadow-xl">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Info Labels around visualization (Requested: AI DETECTION, GIS LOCATION, TRAFFIC DENSITY, ROAD INSPECTION, WORK ORDER) */}
      <div className="absolute top-6 left-6 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-xs font-semibold text-slate-800 animate-fade-in">
          <Scan className="w-3.5 h-3.5 text-[#087EA4]" />
          <span className="font-mono tracking-wide uppercase text-[11px]">AI DETECTION</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      <div className="absolute top-6 right-6 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-xs font-semibold text-slate-800 animate-fade-in">
          <MapPin className="w-3.5 h-3.5 text-[#16C7D9]" />
          <span className="font-mono tracking-wide uppercase text-[11px]">GIS LOCATION</span>
        </div>
      </div>

      <div className="absolute bottom-20 left-8 z-20 pointer-events-none hidden sm:block">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#07131D]/90 backdrop-blur-md border border-[#132A35] shadow-lg text-xs font-semibold text-white">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono tracking-wide uppercase text-[11px]">TRAFFIC DENSITY</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-8 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-xs font-semibold text-slate-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#087EA4]" />
          <span className="font-mono tracking-wide uppercase text-[11px]">ROAD INSPECTION</span>
        </div>
      </div>

      <div className="absolute bottom-6 right-8 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#07131D]/90 backdrop-blur-md border border-[#132A35] shadow-lg text-xs font-semibold text-white">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono tracking-wide uppercase text-[11px]">WORK ORDER</span>
        </div>
      </div>

      {/* Model Transparency Note */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="text-[10px] text-slate-400 font-mono bg-white/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
          Simulation: Procedural Smart-City Road Network
        </span>
      </div>
    </div>
  );
};
