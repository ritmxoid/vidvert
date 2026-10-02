import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  MousePointer,
  ZoomIn,
  Square,
  Download,
  CheckCircle2,
  Sliders,
  Layers,
  ChevronRight,
  Upload,
  Gamepad2,
  Hand
} from 'lucide-react';
import { translations, LanguageCode } from '../i18n/translations';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
  lang: LanguageCode;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onUploadClick,
  lang,
}) => {
  const t = translations[lang] || translations.ru;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Timeline and State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [time, setTime] = useState<number>(0); // 0 to 30 seconds
  const [isInteractiveMode, setIsInteractiveMode] = useState<boolean>(false);
  const [interactiveCropPos, setInteractiveCropPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [interactiveZoom, setInteractiveZoom] = useState<number>(1.2);
  const [interactiveRec, setInteractiveRec] = useState<boolean>(false);

  const duration = 30; // 30 seconds tutorial

  // Determine current active step (1 to 4)
  const getCurrentStep = (currentTime: number) => {
    if (currentTime < 7.5) return 1;
    if (currentTime < 15.0) return 2;
    if (currentTime < 22.5) return 3;
    return 4;
  };

  const currentStep = getCurrentStep(time);

  // Auto-play timeline loop
  useEffect(() => {
    if (!isOpen) return;

    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying && !isInteractiveMode) {
        setTime((prev) => {
          const next = prev + delta;
          if (next >= duration) {
            return 0; // loop tutorial
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, isInteractiveMode]);

  // Main Canvas Rendering Engine (Simulates 16:9 Dynamic Scene with 9:16 Viewfinder & Animated Pointer)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. CLEAR & BACKGROUND HORIZON
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#131b2e');
      bgGrad.addColorStop(1, '#05070d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant mountains / cyber skyline
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      for (let x = 0; x <= w; x += 40) {
        const peak = Math.sin(x * 0.015) * 35 + Math.cos(x * 0.04) * 20;
        ctx.lineTo(x, h * 0.65 - peak);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Cyber Grid Ground
      const groundY = h * 0.68;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      // Horizon line
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();

      // Perspective grid lines
      const vpX = w / 2;
      const vpY = groundY - 40;
      for (let x = -w * 0.5; x <= w * 1.5; x += 40) {
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Horizontal moving grid speed
      const gridOffset = (Date.now() * 0.08) % 30;
      for (let gy = groundY; gy < h; gy += 18) {
        const currentY = gy + gridOffset * ((gy - groundY) / (h - groundY));
        if (currentY <= h) {
          ctx.beginPath();
          ctx.moveTo(0, currentY);
          ctx.lineTo(w, currentY);
          ctx.stroke();
        }
      }

      // Floating particles / stars
      const now = Date.now() * 0.001;
      for (let i = 0; i < 20; i++) {
        const px = (Math.sin(i * 99 + now * 0.2) * 0.5 + 0.5) * w;
        const py = (Math.cos(i * 33 + now * 0.15) * 0.5 + 0.5) * (h * 0.6);
        const pSize = (Math.sin(now * 2 + i) + 1.5) * 1.5;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(236, 72, 153, 0.8)';
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. DYNAMIC MOVING OBJECT (Cyber Skater / Futuristic Drone Hero)
      // Skater moves along a smooth sine wave across horizontal axis
      const heroSpeed = now * 1.2;
      const heroX = ((Math.sin(heroSpeed) * 0.38 + 0.5) * w);
      const heroY = groundY - 20 + Math.sin(heroSpeed * 2) * 12;

      // Glow behind hero
      const heroGlow = ctx.createRadialGradient(heroX, heroY, 5, heroX, heroY, 45);
      heroGlow.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
      heroGlow.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
      heroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = heroGlow;
      ctx.beginPath();
      ctx.arc(heroX, heroY, 45, 0, Math.PI * 2);
      ctx.fill();

      // Draw Hero Figure (Cool stylized skater / drone)
      ctx.save();
      ctx.translate(heroX, heroY);
      const isMovingRight = Math.cos(heroSpeed) > 0;
      if (!isMovingRight) {
        ctx.scale(-1, 1);
      }

      // Skateboard
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(-24, 18, 48, 6, 3);
      ctx.fill();
      // Wheels
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-16, 26, 4, 0, Math.PI * 2);
      ctx.arc(16, 26, 4, 0, Math.PI * 2);
      ctx.fill();

      // Skater Body (Stylized neon runner)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Legs
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(-4, 4);
      ctx.lineTo(8, 4);
      ctx.lineTo(12, 18);
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(2, 4);
      ctx.lineTo(-2, -18);
      ctx.stroke();

      // Head with glowing visor
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, -26, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(0, -28, 6, 4);

      // Arms
      ctx.beginPath();
      ctx.moveTo(-2, -14);
      ctx.lineTo(14, -8);
      ctx.moveTo(-2, -14);
      ctx.lineTo(-14, -4);
      ctx.stroke();

      ctx.restore();

      // Secondary floating glowing companion drone
      const droneX = heroX + (isMovingRight ? -50 : 50);
      const droneY = heroY - 45 + Math.sin(now * 4) * 8;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(droneX, droneY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(droneX, droneY, 12, 0, Math.PI * 2);
      ctx.stroke();

      // 3. TUTORIAL 9:16 CROP VIEWFINDER BOX POSITION & ZOOM
      let cropX = 0.5;
      let cropY = 0.5;
      let activeZoom = 1.0;
      let isRecActive = false;

      if (isInteractiveMode) {
        cropX = interactiveCropPos.x;
        cropY = interactiveCropPos.y;
        activeZoom = interactiveZoom;
        isRecActive = interactiveRec;
      } else {
        // Timeline driven animation
        if (time < 7.5) {
          // Step 1: Tracking hero smoothly
          const targetNormX = heroX / w;
          cropX = targetNormX * 0.9 + 0.05;
          cropY = 0.5;
          activeZoom = 1.0;
          isRecActive = false;
        } else if (time < 15.0) {
          // Step 2: Zooming in and out
          cropX = heroX / w;
          cropY = 0.5;
          const zoomCycle = (time - 7.5) / 7.5; // 0 to 1
          activeZoom = 1.0 + Math.sin(zoomCycle * Math.PI) * 0.85; // 1.0 -> 1.85 -> 1.0
          isRecActive = false;
        } else if (time < 22.5) {
          // Step 3: Recording active!
          cropX = heroX / w;
          cropY = 0.5;
          activeZoom = 1.25;
          isRecActive = true;
        } else {
          // Step 4: Finishing and exporting
          cropX = heroX / w;
          cropY = 0.5;
          activeZoom = 1.2;
          isRecActive = false;
        }
      }

      // Calculate 9:16 crop rectangle in canvas pixels
      const baseCropH = h / activeZoom;
      const baseCropW = (baseCropH * 9) / 16;
      let boxW = Math.min(w, baseCropW);
      let boxH = Math.min(h, baseCropH);

      const centerX = cropX * w;
      const centerY = cropY * h;

      const boxX = Math.max(0, Math.min(w - boxW, centerX - boxW / 2));
      const boxY = Math.max(0, Math.min(h - boxH, centerY - boxH / 2));

      // Dim background outside 9:16 viewfinder
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      // Top
      ctx.fillRect(0, 0, w, boxY);
      // Bottom
      ctx.fillRect(0, boxY + boxH, w, h - (boxY + boxH));
      // Left
      ctx.fillRect(0, boxY, boxX, boxH);
      // Right
      ctx.fillRect(boxX + boxW, boxY, w - (boxX + boxW), boxH);
      ctx.restore();

      // Draw 9:16 Viewfinder Frame
      ctx.save();
      const borderColor = isRecActive ? '#ef4444' : activeZoom > 1.1 ? '#818cf8' : '#22c55e';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 12;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Corner markers
      const cLen = 14;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cLen, boxY);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cLen);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - cLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + cLen, boxY + boxH);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
      ctx.stroke();

      // Rule of Thirds subtle lines inside crop
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      // Vertical grid lines
      ctx.beginPath();
      ctx.moveTo(boxX + boxW / 3, boxY);
      ctx.lineTo(boxX + boxW / 3, boxY + boxH);
      ctx.moveTo(boxX + (boxW * 2) / 3, boxY);
      ctx.lineTo(boxX + (boxW * 2) / 3, boxY + boxH);
      // Horizontal grid lines
      ctx.moveTo(boxX, boxY + boxH / 3);
      ctx.lineTo(boxX + boxW, boxY + boxH / 3);
      ctx.moveTo(boxX, boxY + (boxH * 2) / 3);
      ctx.lineTo(boxX + boxW, boxY + (boxH * 2) / 3);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center crosshair button
      const cBtnX = boxX + boxW / 2;
      const cBtnY = boxY + boxH / 2;
      const cBtnRadius = 18;
      ctx.fillStyle = isRecActive ? '#ef4444' : '#10b981';
      ctx.shadowColor = isRecActive ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cBtnX, cBtnY, cBtnRadius, 0, Math.PI * 2);
      ctx.fill();

      // Center button icon (+)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cBtnX - 8, cBtnY);
      ctx.lineTo(cBtnX + 8, cBtnY);
      ctx.moveTo(cBtnX, cBtnY - 8);
      ctx.lineTo(cBtnX, cBtnY + 8);
      ctx.stroke();

      // Viewfinder Top Badges
      // Left badge: Status
      ctx.fillStyle = isRecActive ? '#dc2626' : '#059669';
      ctx.roundRect(boxX + 6, boxY + 6, isRecActive ? 80 : 54, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        isRecActive ? `● REC 00:${Math.floor((time - 15) % 60).toString().padStart(2, '0')}` : '● ГОТОВ',
        boxX + 11,
        boxY + 20
      );

      // Top right badge: 9:16
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect(boxX + boxW - 38, boxY + 6, 32, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('9:16', boxX + boxW - 32, boxY + 18);

      // Zoom HUD badge if zoomed
      if (activeZoom > 1.05) {
        const hudW = 60;
        const hudH = 22;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.roundRect(cBtnX - hudW / 2, cBtnY - 42, hudW, hudH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`🔍 ${activeZoom.toFixed(2)}x`, cBtnX - 22, cBtnY - 27);
      }

      ctx.restore();

      // 4. ANIMATED GESTURE / POINTER DEMONSTRATION (When in Auto Tour Mode)
      if (!isInteractiveMode) {
        let pointerTargetX = cBtnX;
        let pointerTargetY = cBtnY + 30;
        let pointerActionText = '';
        let isTap = false;

        if (currentStep === 1) {
          // Finger guiding the frame
          pointerTargetX = cBtnX + Math.sin(now * 3) * 15;
          pointerTargetY = cBtnY + 25;
          pointerActionText = t.actionFingerMove;
        } else if (currentStep === 2) {
          // Wheel / Pinch zoom
          pointerTargetX = cBtnX;
          pointerTargetY = cBtnY + 20;
          pointerActionText = t.actionZoomIn;
        } else if (currentStep === 3) {
          // Click center button
          pointerTargetX = cBtnX;
          pointerTargetY = cBtnY;
          isTap = true;
          pointerActionText = t.actionRecord;
        } else if (currentStep === 4) {
          // Click Save button
          pointerTargetX = boxX + boxW - 20;
          pointerTargetY = boxY + 16;
          isTap = true;
          pointerActionText = t.actionSave;
        }

        // Draw animated finger / cursor icon
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;

        // Tap ripple effect
        if (isTap && Math.floor(now * 3) % 2 === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pointerTargetX, pointerTargetY, 20 + ((now * 20) % 15), 0, Math.PI * 2);
          ctx.stroke();
        }

        // Pointer Arrow / Finger
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pointerTargetX, pointerTargetY);
        ctx.lineTo(pointerTargetX + 16, pointerTargetY + 12);
        ctx.lineTo(pointerTargetX + 8, pointerTargetY + 14);
        ctx.lineTo(pointerTargetX + 13, pointerTargetY + 24);
        ctx.lineTo(pointerTargetX + 8, pointerTargetY + 26);
        ctx.lineTo(pointerTargetX + 3, pointerTargetY + 16);
        ctx.lineTo(pointerTargetX - 4, pointerTargetY + 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Action Subtitle Tooltip next to pointer
        if (pointerActionText) {
          ctx.font = 'bold 11px sans-serif';
          const textMetrics = ctx.measureText(pointerActionText);
          const ttW = textMetrics.width + 16;
          const ttH = 22;
          const ttX = Math.max(10, Math.min(w - ttW - 10, pointerTargetX - ttW / 2));
          const ttY = pointerTargetY + 32;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1;
          ctx.roundRect(ttX, ttY, ttW, ttH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(pointerActionText, ttX + 8, ttY + 15);
        }

        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isOpen, time, isInteractiveMode, interactiveCropPos, interactiveZoom, interactiveRec, currentStep, lang]);

  // Handle Interactive Mouse / Touch on the canvas
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractiveMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height));
    setInteractiveCropPos({ x: nx, y: ny });
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isInteractiveMode) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setInteractiveZoom((prev) => Math.max(0.8, Math.min(3.0, Number((prev + delta).toFixed(2)))));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInteractiveMode) return;
    // Toggle simulated recording
    setInteractiveRec((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 shadow-[0_0_60px_rgba(79,70,229,0.25)] flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {t.modalTitle}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  30s Turbo Tour
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {t.modalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer shrink-0"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-3.5">
          
          {/* 16:9 Dynamic Interactive Simulated Video Canvas */}
          <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl group flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={720}
              height={405}
              onPointerMove={handleCanvasPointerMove}
              onWheel={handleCanvasWheel}
              onClick={handleCanvasClick}
              className={`w-full h-full object-contain ${
                isInteractiveMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />

            {/* Mode Switcher Floating Badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
              <button
                type="button"
                onClick={() => {
                  setIsInteractiveMode(!isInteractiveMode);
                  if (!isInteractiveMode) {
                    setIsPlaying(false);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur transition active:scale-95 cursor-pointer border ${
                  isInteractiveMode
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:text-white'
                }`}
              >
                {isInteractiveMode ? (
                  <>
                    <Gamepad2 className="w-3.5 h-3.5 text-pink-300" />
                    <span>🎮 Интерактивный режим: ВКЛ (водите мышкой/зумьте)</span>
                  </>
                ) : (
                  <>
                    <Hand className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.tryInteractiveBtn}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Play/Pause & Reset for Simulation */}
            <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs shadow-md transition active:scale-95"
                title={isPlaying ? t.pause : t.play}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setTime(0);
                  setIsPlaying(true);
                  setIsInteractiveMode(false);
                }}
                className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs shadow-md transition active:scale-95"
                title={t.restartTour}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom 30-sec Timeline Progress Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-2.5 flex flex-col gap-1 z-20">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 px-0.5">
                <span className="font-bold text-indigo-300">
                  {t.stepLabel} {currentStep}/4
                </span>
                <span>
                  {time.toFixed(1)} / {duration} {t.secondsLeft}
                </span>
              </div>
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setTime(fraction * duration);
                  setIsInteractiveMode(false);
                }}
                className="w-full h-2 rounded-full bg-slate-800/90 border border-slate-700/60 overflow-hidden cursor-pointer relative"
              >
                <div
                  style={{ width: `${(time / duration) * 100}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-400 transition-all duration-100"
                />
              </div>
            </div>
          </div>

          {/* 4 Steps Interactive Tabs / Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                step: 1,
                timeStart: 0,
                icon: MousePointer,
                title: t.step1Title,
                color: 'indigo',
              },
              {
                step: 2,
                timeStart: 7.5,
                icon: ZoomIn,
                title: t.step2Title,
                color: 'sky',
              },
              {
                step: 3,
                timeStart: 15.0,
                icon: Square,
                title: t.step3Title,
                color: 'rose',
              },
              {
                step: 4,
                timeStart: 22.5,
                icon: Download,
                title: t.step4Title,
                color: 'emerald',
              },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const Icon = item.icon;
              return (
                <button
                  key={item.step}
                  onClick={() => {
                    setTime(item.timeStart);
                    setIsPlaying(true);
                    setIsInteractiveMode(false);
                  }}
                  className={`p-2 rounded-xl text-left transition-all border flex flex-col gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/20 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-400">
                      0{item.step}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-[11px] font-bold leading-tight line-clamp-1">
                    {item.title.split('. ')[1] || item.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detailed Explanatory Card for Current Step */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="font-bold text-white text-xs">
                {currentStep === 1 && t.step1Title}
                {currentStep === 2 && t.step2Title}
                {currentStep === 3 && t.step3Title}
                {currentStep === 4 && t.step4Title}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {currentStep === 1 && t.step1Desc}
                {currentStep === 2 && t.step2Desc}
                {currentStep === 3 && t.step3Desc}
                {currentStep === 4 && t.step4Desc}
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer Buttons */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition active:scale-95"
          >
            {t.skipTourBtn}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onUploadClick();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.uploadNowBtn}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
