/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Video,
  Play,
  Pause,
  Square,
  Download,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sliders,
  Crosshair,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Film
} from 'lucide-react';
import { PWAInstallButton, OfflineBanner } from './PWAInstallButton';
import { VidVertLogo, VidVertIcon } from './components/VidVertLogo';

interface RecordedClip {
  id: string;
  url: string;
  blob: Blob;
  size: string;
  duration: number;
  timestamp: string;
}

export default function App() {
  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });

  // Tracking and Framing State
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1.0);
  const [displayZoom, setDisplayZoom] = useState<number>(1.0);
  const targetZoomRef = useRef<number>(1.0);
  const currentZoomRef = useRef<number>(1.0);
  const displayZoomRef = useRef<number>(1.0);
  const lastUiSyncRef = useRef<number>(0);
  const viewfinderBoxRef = useRef<HTMLDivElement | null>(null);

  const [lerpFactor, setLerpFactor] = useState<number>(0.1);
  const [wheelDirection, setWheelDirection] = useState<'forward-plus' | 'forward-minus'>(() => {
    try {
      return (localStorage.getItem('vcr_wheel_direction') as 'forward-plus' | 'forward-minus') || 'forward-plus';
    } catch {
      return 'forward-plus';
    }
  });
  const wheelDirectionRef = useRef(wheelDirection);
  useEffect(() => {
    wheelDirectionRef.current = wheelDirection;
    try {
      localStorage.setItem('vcr_wheel_direction', wheelDirection);
    } catch {}
  }, [wheelDirection]);

  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<number>(60);
  const [showGuides, setShowGuides] = useState<boolean>(false);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'dual' | 'canvas-only' | 'source-only'>('dual');

  // Coordinates (Normalized [0, 1])
  const targetPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const currentPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [uiTargetPos, setUiTargetPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Touch & Pinch State
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedClips, setRecordedClips] = useState<RecordedClip[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Zoom HUD temporary indicator
  const [zoomHudVisible, setZoomHudVisible] = useState<boolean>(false);
  const zoomHudTimerRef = useRef<number | null>(null);

  // Canvas dimensions based on target resolution (9:16)
  const canvasWidth = resolution === '1080p' ? 1080 : 720;
  const canvasHeight = resolution === '1080p' ? 1920 : 1280;

  // Show transient toast
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (!isRecording) {
          startRecording();
        } else {
          stopRecordingAndDownload();
        }
      } else if (e.code === 'KeyP' && isRecording) {
        e.preventDefault();
        togglePauseRecording();
      } else if (e.code === 'Escape' && isRecording) {
        e.preventDefault();
        stopRecordingAndDownload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isPlaying]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
      recordedClips.forEach((clip) => URL.revokeObjectURL(clip.url));
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Handle Video File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Пожалуйста, выберите корректный видеофайл (MP4, WebM, MOV и т.д.)');
      return;
    }

    setErrorMessage(null);
    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    setIsVideoLoaded(false);
    showToast(`Загружено видео: ${file.name}`);
  };

  // Generate built-in Demo Video with Audio for instant testing
  const generateDemoVideo = () => {
    setErrorMessage(null);
    showToast('Создание демонстрационного ролика 16:9 с анимацией и звуком...');

    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 1280;
    demoCanvas.height = 720;
    const ctx = demoCanvas.getContext('2d');
    if (!ctx) return;

    // Create synthetic audio using Web Audio API
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const synthAudioCtx = new AudioCtx();
    const synthDest = synthAudioCtx.createMediaStreamDestination();

    // Oscillator chord
    const osc = synthAudioCtx.createOscillator();
    const gain = synthAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, synthAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, synthAudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(synthDest);
    osc.start();

    // Secondary pulsing bass
    const lfo = synthAudioCtx.createOscillator();
    const lfoGain = synthAudioCtx.createGain();
    lfo.frequency.setValueAtTime(2, synthAudioCtx.currentTime);
    lfoGain.gain.setValueAtTime(50, synthAudioCtx.currentTime);
    lfo.connect(osc.frequency);
    lfo.start();

    const canvasStream = demoCanvas.captureStream(30);
    const combinedDemoStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...synthDest.stream.getAudioTracks()
    ]);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    }

    const recorder = new MediaRecorder(combinedDemoStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    recorder.onstop = () => {
      osc.stop();
      lfo.stop();
      synthAudioCtx.close().catch(() => {});

      const demoBlob = new Blob(chunks, { type: mimeType });
      const demoUrl = URL.createObjectURL(demoBlob);
      setVideoSrc(demoUrl);
      setVideoName('Demo_Landscape_Action_16x9.webm');
      setIsVideoLoaded(false);
      showToast('Демо-видео успешно создано и загружено!');
    };

    recorder.start(100);

    // Draw dynamic landscape action animation for 10 seconds
    let frame = 0;
    const maxFrames = 300; // 10 seconds at 30fps

    const renderDemoFrame = () => {
      if (frame >= maxFrames) {
        recorder.stop();
        return;
      }

      const t = frame / 30;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // Grid landscape
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // Moving Subject 1: High speed neon sports ball
      const ballX = 640 + Math.sin(t * 1.5) * 450;
      const ballY = 360 + Math.cos(t * 2.2) * 180;
      const ballGrad = ctx.createRadialGradient(ballX, ballY, 5, ballX, ballY, 45);
      ballGrad.addColorStop(0, '#38bdf8');
      ballGrad.addColorStop(0.7, '#6366f1');
      ballGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 45, 0, Math.PI * 2);
      ctx.fill();

      // Subject 1 Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballX, ballY, 15, 0, Math.PI * 2);
      ctx.fill();

      // Moving Subject 2: Runner / Character Silhouette on the ground
      const runnerX = ((t * 120) % 1400) - 60;
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(runnerX, 480, 60, 120, 12);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(runnerX + 30, 450, 24, 0, Math.PI * 2);
      ctx.fill();

      // Moving Subject 3: Floating drone / orb
      const droneX = 640 + Math.cos(t * 1.1) * 380;
      const droneY = 180 + Math.sin(t * 1.8) * 80;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(droneX, droneY, 20, 0, Math.PI * 2);
      ctx.fill();

      // HUD Labels
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('16:9 ГОРИЗОНТАЛЬНЫЙ ИСТОЧНИК', 60, 80);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(`TIME: ${t.toFixed(2)}s | SPEED: 30 FPS | ДВИЖЕНИЕ ОБЪЕКТОВ ДЛЯ КРОПА`, 60, 115);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '18px monospace';
      ctx.fillText('⚡ ОБЪЕКТ АЛЬФА', ballX - 60, ballY - 55);

      ctx.fillStyle = '#ec4899';
      ctx.font = '18px monospace';
      ctx.fillText('🏃 ОБЪЕКТ БЕТА', runnerX - 40, 410);

      ctx.fillStyle = '#10b981';
      ctx.font = '18px monospace';
      ctx.fillText('🛸 ДРОН', droneX - 30, droneY - 30);

      frame++;
      requestAnimationFrame(renderDemoFrame);
    };

    renderDemoFrame();
  };

  // Video metadata loaded
  const handleVideoLoadedMetadata = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    setDuration(v.duration || 0);
    setVideoDimensions({
      width: v.videoWidth || 1920,
      height: v.videoHeight || 1080
    });
    setIsVideoLoaded(true);

    // Initialize Web Audio graph for cross-browser audio capture
    setupAudioGraph(v);

    // Auto start play
    v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  // Cross-browser Web Audio graph initialization
  const setupAudioGraph = (videoEl: HTMLVideoElement) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (!audioSourceNodeRef.current) {
        try {
          const source = ctx.createMediaElementSource(videoEl);
          const dest = ctx.createMediaStreamDestination();
          // Connect to destination stream for MediaRecorder
          source.connect(dest);
          // Connect to speaker output so user can listen
          source.connect(ctx.destination);

          audioSourceNodeRef.current = source;
          audioDestNodeRef.current = dest;
        } catch (err) {
          // If already connected or CORS blocked
          console.warn('Audio node connection notice:', err);
        }
      }
    } catch (e) {
      console.warn('Audio setup error:', e);
    }
  };

  // Toggle Video Playback
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Update position on pointer move (mouse or single touch)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, source: 'source' | 'canvas') => {
    if (!isTrackingActive) return;

    const targetRect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - targetRect.left) / targetRect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - targetRect.top) / targetRect.height));

    if (source === 'source') {
      // Direct mapping to source coordinates
      targetPosRef.current = { x: relX, y: relY };
      setUiTargetPos({ x: relX, y: relY });
    } else {
      // On canvas, pointer movement gives fine camera target control
      const newX = Math.max(0, Math.min(1, currentPosRef.current.x + (relX - 0.5) * 0.15));
      const newY = Math.max(0, Math.min(1, currentPosRef.current.y + (relY - 0.5) * 0.15));
      targetPosRef.current = { x: newX, y: newY };
      setUiTargetPos({ x: newX, y: newY });
    }
  };

  // Click handler for 16:9 Source area:
  // LMB: Start / Pause recording (no locking!)
  const handleSourceClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!isRecording) {
      startRecording();
    } else {
      togglePauseRecording();
    }
  };

  // Right-click on 16:9 Source area:
  // ПКМ: Play / Pause source video
  const handleSourceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    togglePlay();
    const willBePlaying = videoRef.current?.paused;
    showToast(willBePlaying ? '▶ Воспроизведение (ПКМ)' : '⏸ Пауза (ПКМ)');
  };

  // Click handler for 9:16 Canvas area:
  // LMB: Start / Pause recording
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (!isRecording) {
      startRecording();
    } else {
      togglePauseRecording();
    }
  };

  // Right-click on 9:16 Canvas area:
  // ПКМ: Stop recording & Download if recording, else toggle playback
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecordingAndDownload();
      showToast('🛑 Запись остановлена и скачана (ПКМ)');
    } else {
      togglePlay();
      const willBePlaying = videoRef.current?.paused;
      showToast(willBePlaying ? '▶ Воспроизведение (ПКМ)' : '⏸ Пауза (ПКМ)');
    }
  };

  // Speed controls via mouse side buttons (Button 3 = Back/Slower, Button 4 = Forward/Faster)
  useEffect(() => {
    const speeds = [0.5, 1, 1.5, 2];

    const handleSideButtons = (e: MouseEvent) => {
      if (e.button === 3) {
        // Back side button
        e.preventDefault();
        e.stopPropagation();
        setPlaybackRate((prev) => {
          const idx = speeds.indexOf(prev);
          const nextIdx = idx > 0 ? idx - 1 : 0;
          const nextRate = speeds[nextIdx];
          if (videoRef.current) videoRef.current.playbackRate = nextRate;
          showToast(`⏪ Скорость: ${nextRate}x (боковая кнопка мыши)`);
          return nextRate;
        });
      } else if (e.button === 4) {
        // Forward side button
        e.preventDefault();
        e.stopPropagation();
        setPlaybackRate((prev) => {
          const idx = speeds.indexOf(prev);
          const nextIdx = idx < speeds.length - 1 ? idx + 1 : speeds.length - 1;
          const nextRate = speeds[nextIdx];
          if (videoRef.current) videoRef.current.playbackRate = nextRate;
          showToast(`⏩ Скорость: ${nextRate}x (боковая кнопка мыши)`);
          return nextRate;
        });
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('mousedown', handleSideButtons);
    window.addEventListener('mouseup', handleAuxClick);

    return () => {
      window.removeEventListener('mousedown', handleSideButtons);
      window.removeEventListener('mouseup', handleAuxClick);
    };
  }, []);

  // Helper to change zoom smoothly or immediately
  const handleZoomChange = (newZoom: number, snap = false) => {
    const clamped = Math.max(0.8, Math.min(3.0, newZoom));
    targetZoomRef.current = clamped;
    if (snap) {
      currentZoomRef.current = clamped;
    }
    setZoom(clamped);
    setDisplayZoom(clamped);
  };

  // Native non-passive Wheel listener to reliably preventDefault and stop page scrolling with smooth inertia
  useEffect(() => {
    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent browser from scrolling the window
      e.preventDefault();
      e.stopPropagation();

      const isForward = e.deltaY < 0; // wheel rolled forward / away from user
      // forward-plus: от себя [+] (приближение), к себе [-] (отдаление)
      // forward-minus: от себя [-] (отдаление), к себе [+] (приближение)
      const isZoomIn = wheelDirectionRef.current === 'forward-plus' ? isForward : !isForward;

      // Smooth momentum calculation:
      // High-precision touchpads / free wheels produce smaller deltaY, notch wheels ~ 100
      const rawDelta = Math.abs(e.deltaY);
      const momentumStep = Math.min(0.25, Math.max(0.08, rawDelta * 0.0013));
      const step = isZoomIn ? momentumStep : -momentumStep;

      // Accumulate into targetZoomRef with high inertia (clamped between 0.8x and 3.0x)
      const nextTarget = Math.max(0.8, Math.min(3.0, Number((targetZoomRef.current + step).toFixed(3))));
      targetZoomRef.current = nextTarget;

      // Show temporary Zoom HUD badge
      setZoomHudVisible(true);
      if (zoomHudTimerRef.current) clearTimeout(zoomHudTimerRef.current);
      zoomHudTimerRef.current = window.setTimeout(() => {
        setZoomHudVisible(false);
      }, 1200);
    };

    const sourceEl = sourceContainerRef.current;
    const canvasEl = containerRef.current;

    // Must be { passive: false } to allow e.preventDefault()
    if (sourceEl) {
      sourceEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    }
    if (canvasEl) {
      canvasEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    }

    return () => {
      if (zoomHudTimerRef.current) clearTimeout(zoomHudTimerRef.current);
      if (sourceEl) {
        sourceEl.removeEventListener('wheel', handleNativeWheel);
      }
      if (canvasEl) {
        canvasEl.removeEventListener('wheel', handleNativeWheel);
      }
    };
  }, []);

  // Mobile Touch Gestures: Single touch move + Pinch to zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialPinchDistRef.current = dist;
      initialZoomRef.current = currentZoomRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // 2-finger Pinch-to-zoom
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const scaleFactor = currentDist / initialPinchDistRef.current;
      const newZoom = Math.max(0.8, Math.min(3.0, Number((initialZoomRef.current * scaleFactor).toFixed(2))));
      handleZoomChange(newZoom, true);
      return;
    }

    // 1-finger Move Tracking
    if (e.touches.length === 1 && isTrackingActive) {
      const touch = e.touches[0];
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
      targetPosRef.current = { x: relX, y: relY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
  };

  // Right Click handler for Desktop: Stop recording & trigger download
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecordingAndDownload();
      showToast('🛑 Запись остановлена по правому клику мыши');
    }
  };

  // Main Canvas Render Loop with LERP interpolation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const sw = video.videoWidth || 1920;
        const sh = video.videoHeight || 1080;

        // Apply LERP (Linear Interpolation) for smooth cinema-grade camera movement
        // current = current + (target - current) * factor
        currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * lerpFactor;
        currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * lerpFactor;

        // Apply LERP with high inertia for smooth camera zoom (factor 0.06 gives heavy, cinematic glide)
        const zoomDelta = targetZoomRef.current - currentZoomRef.current;
        if (Math.abs(zoomDelta) > 0.0001) {
          currentZoomRef.current += zoomDelta * 0.06;
        } else {
          currentZoomRef.current = targetZoomRef.current;
        }

        const activeZoom = currentZoomRef.current;

        // Target aspect ratio is 9:16
        // Base vertical frame fits height of source video
        // cropWidth / cropHeight = 9 / 16
        const baseCropHeight = sh / activeZoom;
        const baseCropWidth = (baseCropHeight * 9) / 16;

        // Clamp crop dimensions to source boundaries
        let cropW = baseCropWidth;
        let cropH = baseCropHeight;

        if (cropW > sw) {
          cropW = sw;
          cropH = (cropW * 16) / 9;
        }
        if (cropH > sh) {
          cropH = sh;
          cropW = (cropH * 9) / 16;
        }

        // Center coordinates in source pixels
        const centerX = currentPosRef.current.x * sw;
        const centerY = currentPosRef.current.y * sh;

        // Clamp crop frame within source boundaries
        const sx = Math.max(0, Math.min(sw - cropW, centerX - cropW / 2));
        const sy = Math.max(0, Math.min(sh - cropH, centerY - cropH / 2));

        // Draw cropped 9:16 region to output canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);

        // Direct 60fps DOM sync for 16:9 Viewfinder Overlay Box (eliminates any React re-render lag)
        if (viewfinderBoxRef.current) {
          const leftPercent = (sx / sw) * 100;
          const topPercent = (sy / sh) * 100;
          const widthPercent = (cropW / sw) * 100;
          const heightPercent = (cropH / sh) * 100;
          viewfinderBoxRef.current.style.left = `${leftPercent}%`;
          viewfinderBoxRef.current.style.top = `${topPercent}%`;
          viewfinderBoxRef.current.style.width = `${widthPercent}%`;
          viewfinderBoxRef.current.style.height = `${heightPercent}%`;
        }

        // Throttled UI sync for displayed zoom numbers and sliders
        const now = performance.now();
        if (now - lastUiSyncRef.current > 50) {
          lastUiSyncRef.current = now;
          if (Math.abs(currentZoomRef.current - displayZoomRef.current) > 0.01) {
            displayZoomRef.current = currentZoomRef.current;
            setDisplayZoom(Number(currentZoomRef.current.toFixed(2)));
            setZoom(Number(currentZoomRef.current.toFixed(2)));
          }
        }
      } else {
        // Placeholder display when no video is playing
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Загрузите горизонтальное видео (16:9)', canvas.width / 2, canvas.height / 2);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [lerpFactor, resolution]);

  // Start MediaRecorder with combined Canvas Stream + Video Audio
  const startRecording = async () => {
    if (!canvasRef.current || !videoRef.current) {
      setErrorMessage('Видео или Canvas не инициализированы');
      return;
    }

    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // 1. Capture 60fps or 30fps stream from Canvas
      const canvasStream = canvasRef.current.captureStream(fps);

      // 2. Cross-browser Audio Extraction from source video
      const audioTracks: MediaStreamTrack[] = [];

      // Check Web Audio API destination first (most reliable across browsers)
      if (audioDestNodeRef.current) {
        const destTracks = audioDestNodeRef.current.stream.getAudioTracks();
        if (destTracks.length > 0) {
          audioTracks.push(destTracks[0]);
        }
      }

      // Fallback: Check native captureStream on HTMLVideoElement
      if (audioTracks.length === 0) {
        const videoEl = videoRef.current as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        };
        const vidStream = videoEl.captureStream ? videoEl.captureStream() : videoEl.mozCaptureStream ? videoEl.mozCaptureStream() : null;
        if (vidStream) {
          const vAudioTracks = vidStream.getAudioTracks();
          if (vAudioTracks.length > 0) {
            audioTracks.push(vAudioTracks[0]);
          }
        }
      }

      // 3. Combine Canvas Video Track + Source Audio Track
      const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks];
      const combinedStream = new MediaStream(combinedTracks);

      // 4. Select best supported codec
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4'
      ];

      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      if (!selectedMimeType) {
        setErrorMessage('Ваш браузер не поддерживает доступные кодеки MediaRecorder');
        return;
      }

      const options: MediaRecorderOptions = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: resolution === '1080p' ? 8_000_000 : 4_500_000
      };

      const recorder = new MediaRecorder(combinedStream, options);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
        const finalBlob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
        const url = URL.createObjectURL(finalBlob);
        const clipDuration = recordingTime;

        const newClip: RecordedClip = {
          id: Date.now().toString(),
          url,
          blob: finalBlob,
          size: `${(finalBlob.size / (1024 * 1024)).toFixed(2)} MB`,
          duration: clipDuration,
          timestamp: new Date().toLocaleTimeString()
        };

        setRecordedClips((prev) => [newClip, ...prev]);

        // Trigger immediate download
        downloadBlob(finalBlob, `vertical-crop-${Date.now()}.${extension}`);
        showToast(`✅ Запись сохранена и скачана! Размер: ${newClip.size}`);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingTime(0);

      // Start recording timer
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      // Ensure video is playing when recording starts
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }

      showToast('🔴 Запись вертикального 9:16 видео НАЧАТА!');
    } catch (err: unknown) {
      console.error('Recording initialization error:', err);
      setErrorMessage(`Ошибка старта записи: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Pause / Resume Recording
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      showToast('⏸️ Запись приостановлена');
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      showToast('▶️ Запись возобновлена');
    }
  };

  // Stop Recording and Download File
  const stopRecordingAndDownload = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  // Helper to trigger browser download
  const downloadBlob = (blob: Blob, filename: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Source Viewfinder calculations for interactive overlay box
  const getSourceViewfinderStyle = () => {
    const sw = videoDimensions.width || 1920;
    const sh = videoDimensions.height || 1080;
    const activeZoom = currentZoomRef.current;

    const baseCropH = sh / activeZoom;
    const baseCropW = (baseCropH * 9) / 16;
    let cropW = baseCropW;
    let cropH = baseCropH;

    if (cropW > sw) {
      cropW = sw;
      cropH = (cropW * 16) / 9;
    }
    if (cropH > sh) {
      cropH = sh;
      cropW = (cropH * 9) / 16;
    }

    // Using smoothed coordinates for rendering the box
    const currentCenterX = currentPosRef.current.x * sw;
    const currentCenterY = currentPosRef.current.y * sh;

    const sx = Math.max(0, Math.min(sw - cropW, currentCenterX - cropW / 2));
    const sy = Math.max(0, Math.min(sh - cropH, currentCenterY - cropH / 2));

    const leftPercent = (sx / sw) * 100;
    const topPercent = (sy / sh) * 100;
    const widthPercent = (cropW / sw) * 100;
    const heightPercent = (cropH / sh) * 100;

    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      width: `${widthPercent}%`,
      height: `${heightPercent}%`
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <VidVertLogo size="md" />
          <div className="hidden lg:block pl-3 border-l border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">
              16:9 → 9:16 динамическое кадрирование с LERP-слежением
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {/* PWA / Offline Desktop App Button */}
          <PWAInstallButton />

          {/* Quick Demo Video Button */}
          <button
            onClick={generateDemoVideo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Загрузить синтетический демо-ролик для тестирования"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Демо-ролик</span>
          </button>

          {/* File Upload Input */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md shadow-indigo-600/25 transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Загрузить видео</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </header>

      {/* Transient Notifications / Error Banners */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/50 shadow-2xl rounded-xl p-3.5 flex items-center gap-2.5 text-sm text-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs px-2 py-1 bg-rose-900 hover:bg-rose-800 rounded text-white"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Main Video Viewport Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Horizontal Source 16:9 Viewfinder (Interactive) */}
          <div
            className={`flex flex-col gap-2 rounded-2xl bg-slate-900 border border-slate-800/80 p-3.5 shadow-xl transition-all ${
              viewMode === 'canvas-only' ? 'hidden' : viewMode === 'source-only' ? 'lg:col-span-12' : 'lg:col-span-7'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <div className="flex items-center gap-2 font-medium text-slate-300">
                <Video className="w-4 h-4 text-indigo-400" />
                <span>Горизонтальный оригинал (16:9)</span>
                {videoName && (
                  <span className="truncate max-w-[140px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                    {videoName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-slate-800/80 px-2 py-0.5 rounded text-indigo-300 font-mono">
                  {videoDimensions.width}x{videoDimensions.height}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Crosshair className="w-3 h-3 text-emerald-400" />
                  Слежение активно
                </span>
              </div>
            </div>

            {/* Video Viewport Container (Interactive Mouse & Touch) */}
            <div
              ref={sourceContainerRef}
              onPointerMove={(e) => handlePointerMove(e, 'source')}
              onClick={handleSourceClick}
              onContextMenu={handleSourceContextMenu}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 cursor-crosshair group shadow-inner"
              title="ЛКМ: Запуск / Пауза записи • ПКМ: Плей / Пауза видео"
            >
              {videoSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    playsInline
                    loop
                    crossOrigin="anonymous"
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onTimeUpdate={() => {
                      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                    }}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Target Cursor Indicator (where mouse aims) */}
                  {isTrackingActive && (
                    <div
                      style={{
                        left: `${uiTargetPos.x * 100}%`,
                        top: `${uiTargetPos.y * 100}%`
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 rounded-full border-2 border-dashed border-sky-400 opacity-60 z-10"
                    />
                  )}

                  {/* Dynamic 9:16 Crop Viewfinder Overlay Box */}
                  <div
                    ref={viewfinderBoxRef}
                    style={getSourceViewfinderStyle()}
                    className="absolute border-2 border-rose-500 rounded-lg pointer-events-none transition-none shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  >
                    {/* Inner 9:16 guide indicators */}
                    <div className="absolute inset-0 bg-rose-500/10 backdrop-contrast-125" />
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                    {/* Crosshair in viewfinder */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Crosshair className="w-5 h-5 text-rose-400 opacity-80" />
                    </div>
                    {/* Viewfinder Badge */}
                    <div className="absolute top-1 left-1 bg-rose-600/90 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shadow">
                      9:16 REC
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <Film className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">Нет загруженного видео</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs">
                    Нажмите кнопку «Загрузить видео» или используйте «Демо-ролик» для проверки
                  </p>
                </div>
              )}

              {/* Zoom HUD Floating Badge */}
              {zoomHudVisible && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 bg-slate-900/90 border border-indigo-500/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-white font-mono font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100">
                  <ZoomIn className="w-4 h-4 text-indigo-400" />
                  <span>Зум: {displayZoom.toFixed(2)}x</span>
                </div>
              )}

              {/* Viewport Info Overlay */}
              <div className="absolute bottom-2 left-2 text-[10px] bg-slate-900/80 backdrop-blur px-2 py-1 rounded text-slate-300 font-mono pointer-events-none flex items-center gap-2">
                <span>ZOOM: {displayZoom.toFixed(2)}x</span>
                <span>•</span>
                <span>LERP: {lerpFactor}</span>
                <span>•</span>
                <span className={isTrackingActive ? 'text-emerald-400' : 'text-amber-400'}>
                  {isTrackingActive ? 'FOLLOWING' : 'LOCKED'}
                </span>
              </div>
            </div>

            {/* Video Player Timeline & Media Controls */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const newTime = parseFloat(e.target.value);
                    setCurrentTime(newTime);
                    if (videoRef.current) videoRef.current.currentTime = newTime;
                  }}
                  className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[11px] font-mono text-slate-400 w-10">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                {/* Play/Pause & Volume */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                    title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.currentTime = 0;
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="С начала"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Volume Toggle */}
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      onClick={() => {
                        if (!videoRef.current) return;
                        const nextMuted = !isMuted;
                        setIsMuted(nextMuted);
                        videoRef.current.muted = nextMuted;
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        setIsMuted(v === 0);
                        if (videoRef.current) {
                          videoRef.current.volume = v;
                          videoRef.current.muted = v === 0;
                        }
                      }}
                      className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1.5 text-[11px] bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 font-medium" title="Боковые кнопки мыши: Назад = замедлить, Вперед = ускорить">
                    Скорость (боковые кнопки ◀/▶):
                  </span>
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono ${
                        playbackRate === rate
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Compact Tool Panels directly under the 16:9 player (as in screenshot) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 mt-0.5 border-t border-slate-800/80">
              
              {/* Panel 1: Zoom */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                    Масштаб (Zoom)
                  </span>
                  <span className="font-mono text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded text-[11px] border border-slate-800">
                    {displayZoom.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={3.0}
                  step={0.05}
                  value={displayZoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  {[1.0, 1.25, 1.5, 2.0, 2.5].map((zVal) => (
                    <button
                      key={zVal}
                      onClick={() => handleZoomChange(zVal)}
                      className={`px-1.5 py-0.5 rounded font-mono transition ${
                        Math.abs(displayZoom - zVal) < 0.05
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {zVal}x
                    </button>
                  ))}
                </div>
                {/* Wheel Zoom Direction */}
                <div className="pt-1 mt-0.5 flex flex-col gap-1 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Колесо мыши:</span>
                    <span className="text-indigo-400 font-mono font-medium">
                      {wheelDirection === 'forward-plus' ? 'От себя [+]' : 'От себя [-]'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <button
                      onClick={() => {
                        setWheelDirection('forward-plus');
                        showToast('Колесо: От себя [+] приблизить, К себе [-] отдалить');
                      }}
                      className={`py-1 px-1.5 rounded transition text-center font-medium ${
                        wheelDirection === 'forward-plus'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                      title="От себя приближает (+), к себе отдаляет (-)"
                    >
                      От себя [+]
                    </button>
                    <button
                      onClick={() => {
                        setWheelDirection('forward-minus');
                        showToast('Колесо: От себя [-] отдалить, К себе [+] приблизить');
                      }}
                      className={`py-1 px-1.5 rounded transition text-center font-medium ${
                        wheelDirection === 'forward-minus'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                      title="От себя отдаляет (-), к себе приближает (+)"
                    >
                      От себя [-]
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel 2: LERP Smoothness */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Плавность LERP
                  </span>
                  <span className="font-mono text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded text-[11px] border border-slate-800">
                    {lerpFactor}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.02}
                  max={0.35}
                  step={0.02}
                  value={lerpFactor}
                  onChange={(e) => setLerpFactor(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {[
                    { val: 0.04, label: 'Кино' },
                    { val: 0.1, label: 'Оптимал' },
                    { val: 0.2, label: 'Динамика' },
                    { val: 0.35, label: 'Быстро' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setLerpFactor(item.val)}
                      className={`py-1 px-1 rounded transition text-center ${
                        Math.abs(lerpFactor - item.val) < 0.02
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 pt-0.5 leading-tight">
                  Плавное кинематографичное следование камеры
                </span>
              </div>

              {/* Panel 3: Resolution & Overlays */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Вывод и Сетка
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    onClick={() => setResolution(resolution === '1080p' ? '720p' : '1080p')}
                    className="py-1 px-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-center"
                  >
                    Формат: <span className="text-indigo-400 font-bold">{resolution}</span>
                  </button>
                  <button
                    onClick={() => setFps(fps === 60 ? 30 : 60)}
                    className="py-1 px-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-center"
                  >
                    FPS: <span className="text-indigo-400 font-bold">{fps}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1 pt-0.5">
                  <button
                    onClick={() => setShowGuides(!showGuides)}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition ${
                      showGuides
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {showGuides ? '✓ Сетка 3х3 включена' : 'Сетка 3х3 выключена'}
                  </button>
                  <button
                    onClick={() => setShowSafeZone(!showSafeZone)}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition ${
                      showSafeZone
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {showSafeZone ? '✓ Safe Zone (Reels/TikTok)' : 'Safe Zone выключена'}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Output Vertical 9:16 Canvas (What gets recorded) */}
          <div
            className={`flex flex-col gap-2 rounded-2xl bg-slate-900 border border-slate-800/80 p-3.5 shadow-xl transition-all ${
              viewMode === 'source-only' ? 'hidden' : viewMode === 'canvas-only' ? 'lg:col-span-12' : 'lg:col-span-5'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <div className="flex items-center gap-2 font-medium text-slate-300">
                <span className="relative flex h-2 w-2">
                  {isRecording && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isRecording ? 'bg-rose-500' : 'bg-slate-600'
                    }`}
                  />
                </span>
                <span>Итоговый Canvas (9:16)</span>
                <span className="text-[11px] bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono">
                  {canvasWidth}x{canvasHeight} • {fps}fps
                </span>
              </div>

              {/* Recording Status Badge */}
              {isRecording && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold animate-pulse">
                  <span>REC</span>
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            {/* Vertical Canvas Container */}
            <div
              ref={containerRef}
              onContextMenu={handleCanvasContextMenu}
              onClick={handleCanvasClick}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className="relative aspect-[9/16] max-h-[520px] mx-auto w-full max-w-[290px] rounded-xl overflow-hidden bg-black border-2 border-slate-800 shadow-2xl flex items-center justify-center cursor-pointer group"
              title="ЛКМ: Запуск / Пауза записи. ПКМ: Стоп и Скачивание"
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full object-contain"
              />

              {/* 3x3 Composition Grid UI Overlay (Preview only, NOT recorded into video) */}
              {showGuides && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                  <div className="border-r border-b border-white/20 border-dashed" />
                  <div className="border-r border-b border-white/20 border-dashed" />
                  <div className="border-b border-white/20 border-dashed" />
                  <div className="border-r border-b border-white/20 border-dashed" />
                  <div className="border-r border-b border-white/20 border-dashed flex items-center justify-center">
                    <div className="w-3.5 h-3.5 relative">
                      <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-sky-400/80 -translate-y-1/2" />
                      <div className="absolute left-1/2 top-0 h-full w-[1.5px] bg-sky-400/80 -translate-x-1/2" />
                    </div>
                  </div>
                  <div className="border-b border-white/20 border-dashed" />
                  <div className="border-r border-white/20 border-dashed" />
                  <div className="border-r border-white/20 border-dashed" />
                  <div />
                </div>
              )}

              {/* Safe Zone (Reels/TikTok/Shorts) UI Overlay (Preview only, NOT recorded into video) */}
              {showSafeZone && (
                <div className="absolute inset-0 pointer-events-none pt-[10%] pb-[20%] pl-2 pr-[16%] z-10">
                  <div className="w-full h-full border border-dashed border-amber-400/60 rounded flex flex-col justify-start p-1.5 bg-amber-400/5">
                    <span className="text-[8px] font-mono text-amber-400 font-bold tracking-tight">
                      ⚡ БЕЗОПАСНАЯ ЗОНА (Reels / TikTok)
                    </span>
                  </div>
                </div>
              )}

              {/* View Overlay Indicators */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                {isRecording && (
                  <span className="bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono shadow">
                    ● ЗАПИСЬ {formatTime(recordingTime)}
                  </span>
                )}
                {isRecordingPaused && (
                  <span className="bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono shadow">
                    ПАУЗА
                  </span>
                )}
              </div>

              {/* Zoom HUD Floating Badge */}
              {zoomHudVisible && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 bg-slate-900/90 border border-indigo-500/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white font-mono font-bold text-xs shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{displayZoom.toFixed(2)}x</span>
                </div>
              )}

              <div className="absolute bottom-2 right-2 bg-slate-900/80 text-[10px] text-slate-300 px-2 py-0.5 rounded font-mono pointer-events-none">
                9:16
              </div>
            </div>

            {/* Dedicated Primary Recording Buttons (Mobile & Desktop) */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!videoSrc}
                  className="col-span-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                  <span>НАЧАТЬ ЗАПИСЬ (9:16)</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePauseRecording}
                    className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition text-white shadow-md ${
                      isRecordingPaused
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {isRecordingPaused ? (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Продолжить</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Пауза</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={stopRecordingAndDownload}
                    className="py-3 px-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Стоп & Скачать</span>
                  </button>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              💡 <span className="font-semibold text-slate-300">Десктоп:</span> ЛКМ на 9:16 = Запись/Пауза • ПКМ на 16:9 = Плей/Пауза видео • ПКМ на 9:16 = Стоп & Скачать
            </p>
          </div>
        </div>

        {/* Recorded Clips Library Drawer */}
        {recordedClips.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Записанные вертикальные клипы ({recordedClips.length})</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Оригинальный звук сохранен
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recordedClips.map((clip, idx) => (
                <div
                  key={clip.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">Клип #{recordedClips.length - idx}</span>
                    <span className="font-mono text-[11px]">{clip.timestamp}</span>
                  </div>

                  {/* Video Preview */}
                  <div className="aspect-[9/16] max-h-40 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    <video
                      src={clip.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Длительность: {formatTime(clip.duration)}</span>
                    <span className="text-emerald-400 font-semibold">{clip.size}</span>
                  </div>

                  <button
                    onClick={() => downloadBlob(clip.blob, `vertical-clip-${clip.id}.webm`)}
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать файл</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Instructions & Help Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Горячие клавиши и управление</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px] pt-1">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-0.5">ЛКМ по любому видео:</span>
              Запуск или постановка на паузу записи вертикального видео (без фиксации)
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-0.5">ПКМ по 16:9 видео:</span>
              Воспроизведение / Пауза исходного горизонтального видео
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-0.5">Боковые кнопки мыши:</span>
              Назад ◀ = замедлить, Вперед ▶ = ускорить видео (0.5x, 1x, 1.5x, 2x)
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="font-semibold text-slate-200 block mb-0.5">Колесо (Зум) / ПКМ на 9:16:</span>
              Зум: выбор направления; ПКМ на 9:16 = стоп записи и скачивание
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <VidVertIcon size={16} />
        <span>VidVert • Dynamic 9:16 Video Reframe • 100% Offline & Local</span>
      </footer>

      {/* Connectivity Banner */}
      <OfflineBanner />
    </div>
  );
}
