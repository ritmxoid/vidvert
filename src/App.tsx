/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  RefreshCw,
  Sliders,
  Crosshair,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Film
} from 'lucide-react';
import { PWAInstallButton, OfflineBanner } from './PWAInstallButton';
import { VidVertLogo, VidVertIcon } from './components/VidVertLogo';
import { patchWebmDuration } from './utils/fixWebmDuration';

interface RecordedClip {
  id: string;
  url: string;
  blob: Blob;
  size: string;
  duration: number;
  timestamp: string;
  filename: string;
}

// Format exported video filename as requested: VidVert_Crop_<original_name>.<ext>
const getExportFilename = (sourceName: string, ext: string = 'webm') => {
  const base = (sourceName || 'video')
    .replace(/\.[^/.]+$/, '') // strip existing extension (.mp4, .mov, etc)
    .trim();
  return `VidVert_Crop_${base || 'video'}.${ext}`;
};

export default function App() {
  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const videoNameRef = useRef<string>('');
  useEffect(() => {
    videoNameRef.current = videoName;
  }, [videoName]);
  const [, setIsVideoLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [, setVolume] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });

  // Tracking and Framing State
  const [isTrackingActive] = useState<boolean>(true);
  const [, setZoom] = useState<number>(1.0);
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

  // UI Panels Collapsible State for max mobile visibility
  const [showToolPanels, setShowToolPanels] = useState<boolean>(true);

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
  const recordingStartTimeRef = useRef<number>(0);
  const totalRecordedMsRef = useRef<number>(0);
  const lastResumeTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

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
    }, 2800);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Handle Video File Upload with full Android/iOS & Desktop format support
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    try {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }

      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoName(file.name);
      setIsVideoLoaded(false);
      showToast(`Загружено: ${file.name}`);
    } catch (err) {
      console.error('File load error:', err);
      setErrorMessage('Не удалось загрузить видеофайл');
    } finally {
      // Clear input so selecting the same file again works
      e.target.value = '';
    }
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

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const synthAudioCtx = new AudioCtx();
    const synthDest = synthAudioCtx.createMediaStreamDestination();

    const osc = synthAudioCtx.createOscillator();
    const gain = synthAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, synthAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, synthAudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(synthDest);
    osc.start();

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

    let frame = 0;
    const maxFrames = 300;

    const renderDemoFrame = () => {
      if (frame >= maxFrames) {
        recorder.stop();
        return;
      }

      const t = frame / 30;

      const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 720);

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

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballX, ballY, 15, 0, Math.PI * 2);
      ctx.fill();

      const runnerX = ((t * 120) % 1400) - 60;
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(runnerX, 480, 60, 120, 12);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(runnerX + 30, 450, 24, 0, Math.PI * 2);
      ctx.fill();

      const droneX = 640 + Math.cos(t * 1.1) * 380;
      const droneY = 180 + Math.sin(t * 1.8) * 80;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(droneX, droneY, 20, 0, Math.PI * 2);
      ctx.fill();

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
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    setDuration(dur);
    setVideoDimensions({
      width: v.videoWidth || 1920,
      height: v.videoHeight || 1080
    });
    setIsVideoLoaded(true);
    setupAudioGraph(v);
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
          source.connect(dest);
          source.connect(ctx.destination);

          audioSourceNodeRef.current = source;
          audioDestNodeRef.current = dest;
        } catch (err) {
          console.warn('Audio node connection notice:', err);
        }
      }
    } catch (e) {
      console.warn('Audio setup error:', e);
    }
  };

  // Seek video to specific timestamp
  const seekVideo = (time: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(duration || 0, time));
    setCurrentTime(clamped);
    videoRef.current.currentTime = clamped;
  };

  // Toggle Video Playback
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (videoRef.current.paused) {
      if (videoRef.current.currentTime >= (duration - 0.2) && duration > 0) {
        videoRef.current.currentTime = 0;
      }
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback error, retrying:', err);
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Update position on pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, source: 'source' | 'canvas') => {
    if (!isTrackingActive) return;

    const targetRect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - targetRect.left) / targetRect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - targetRect.top) / targetRect.height));

    if (source === 'source') {
      targetPosRef.current = { x: relX, y: relY };
      setUiTargetPos({ x: relX, y: relY });
    } else {
      const newX = Math.max(0, Math.min(1, currentPosRef.current.x + (relX - 0.5) * 0.15));
      const newY = Math.max(0, Math.min(1, currentPosRef.current.y + (relY - 0.5) * 0.15));
      targetPosRef.current = { x: newX, y: newY };
      setUiTargetPos({ x: newX, y: newY });
    }
  };

  // Click handler for 16:9 Source area
  const handleSourceClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!isRecording) {
      startRecording();
    } else {
      togglePauseRecording();
    }
  };

  // Right-click on 16:9 Source area
  const handleSourceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    togglePlay();
    const willBePlaying = videoRef.current?.paused;
    showToast(willBePlaying ? '▶ Воспроизведение (ПКМ)' : '⏸ Пауза (ПКМ)');
  };

  // Click handler for 9:16 Canvas area
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (!isRecording) {
      startRecording();
    } else {
      togglePauseRecording();
    }
  };

  // Right-click on 9:16 Canvas area
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

  // Speed controls via mouse side buttons
  useEffect(() => {
    const speeds = [0.5, 1, 1.5, 2];

    const handleSideButtons = (e: MouseEvent) => {
      if (e.button === 3) {
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

  // Native non-passive Wheel listener
  useEffect(() => {
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const isForward = e.deltaY < 0;
      const isZoomIn = wheelDirectionRef.current === 'forward-plus' ? isForward : !isForward;

      const rawDelta = Math.abs(e.deltaY);
      const momentumStep = Math.min(0.25, Math.max(0.08, rawDelta * 0.0013));
      const step = isZoomIn ? momentumStep : -momentumStep;

      const nextTarget = Math.max(0.8, Math.min(3.0, Number((targetZoomRef.current + step).toFixed(3))));
      targetZoomRef.current = nextTarget;

      setZoomHudVisible(true);
      if (zoomHudTimerRef.current) clearTimeout(zoomHudTimerRef.current);
      zoomHudTimerRef.current = window.setTimeout(() => {
        setZoomHudVisible(false);
      }, 1200);
    };

    const sourceEl = sourceContainerRef.current;
    const canvasEl = containerRef.current;

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

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isTrackingActive) {
      const touch = e.touches[0];
      const target = sourceContainerRef.current || (e.currentTarget as HTMLElement);
      const rect = target.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
      targetPosRef.current = { x: relX, y: relY };
      setUiTargetPos({ x: relX, y: relY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialPinchDistRef.current = dist;
      initialZoomRef.current = currentZoomRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const scaleFactor = currentDist / initialPinchDistRef.current;
      const newZoom = Math.max(0.8, Math.min(3.0, Number((initialZoomRef.current * scaleFactor).toFixed(2))));
      handleZoomChange(newZoom, true);
      return;
    }

    if (e.touches.length === 1 && isTrackingActive) {
      const touch = e.touches[0];
      const target = sourceContainerRef.current || (e.currentTarget as HTMLElement);
      const rect = target.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
      targetPosRef.current = { x: relX, y: relY };
      setUiTargetPos({ x: relX, y: relY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const video = videoRef.current;

      // Smooth LERP tracking calculation on EVERY frame
      currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * lerpFactor;
      currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * lerpFactor;

      const zoomDelta = targetZoomRef.current - currentZoomRef.current;
      if (Math.abs(zoomDelta) > 0.0001) {
        currentZoomRef.current += zoomDelta * 0.06;
      } else {
        currentZoomRef.current = targetZoomRef.current;
      }

      const activeZoom = currentZoomRef.current;
      const sw = (video && video.videoWidth > 0) ? video.videoWidth : (videoDimensions.width || 1920);
      const sh = (video && video.videoHeight > 0) ? video.videoHeight : (videoDimensions.height || 1080);

      const baseCropHeight = sh / activeZoom;
      const baseCropWidth = (baseCropHeight * 9) / 16;

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

      const centerX = currentPosRef.current.x * sw;
      const centerY = currentPosRef.current.y * sh;

      const sx = Math.max(0, Math.min(sw - cropW, centerX - cropW / 2));
      const sy = Math.max(0, Math.min(sh - cropH, centerY - cropH / 2));

      // Always update viewfinder box DOM in sync with requestAnimationFrame!
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

      // Draw video frame to canvas
      if (video && (video.readyState >= 1 || video.videoWidth > 0)) {
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
        } catch (drawErr) {
          // Keep loop alive if transient frame decode glitch
        }
      } else {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Загрузите горизонтальное видео (16:9)', canvas.width / 2, canvas.height / 2);
      }

      const now = performance.now();
      if (now - lastUiSyncRef.current > 50) {
        lastUiSyncRef.current = now;
        if (Math.abs(currentZoomRef.current - displayZoomRef.current) > 0.01) {
          displayZoomRef.current = currentZoomRef.current;
          setDisplayZoom(Number(currentZoomRef.current.toFixed(2)));
          setZoom(Number(currentZoomRef.current.toFixed(2)));
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [lerpFactor, resolution, videoDimensions]);

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

      const canvasStream = canvasRef.current.captureStream(fps);
      const audioTracks: MediaStreamTrack[] = [];

      if (audioDestNodeRef.current) {
        const destTracks = audioDestNodeRef.current.stream.getAudioTracks();
        if (destTracks.length > 0) {
          audioTracks.push(destTracks[0]);
        }
      }

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

      const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeTypes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm'
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

      recorder.onstop = async () => {
        const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
        let finalBlob = new Blob(recordedChunksRef.current, { type: selectedMimeType });

        let computedDurationMs = totalRecordedMsRef.current;
        if (lastResumeTimeRef.current > 0) {
          computedDurationMs += Math.max(0, performance.now() - lastResumeTimeRef.current);
        }
        const durationMs = Math.max(1000, Math.round(computedDurationMs));

        // Inject EBML duration metadata so mobile gallery and players display total time and allow seeking!
        if (extension === 'webm') {
          try {
            finalBlob = await patchWebmDuration(finalBlob, durationMs);
          } catch (patchErr) {
            console.warn('Could not patch WebM duration:', patchErr);
          }
        }

        const url = URL.createObjectURL(finalBlob);
        const clipDuration = Math.round(durationMs / 1000);
        const exportFilename = getExportFilename(videoNameRef.current || videoName, extension);

        const newClip: RecordedClip = {
          id: Date.now().toString(),
          url,
          blob: finalBlob,
          size: `${(finalBlob.size / (1024 * 1024)).toFixed(2)} MB`,
          duration: clipDuration,
          timestamp: new Date().toLocaleTimeString(),
          filename: exportFilename
        };

        setRecordedClips((prev) => [newClip, ...prev]);

        downloadBlob(finalBlob, exportFilename);
        showToast(`✅ Сохранено: ${exportFilename}`);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = performance.now();
      totalRecordedMsRef.current = 0;
      lastResumeTimeRef.current = performance.now();
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingTime(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

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

    if (!isRecordingPaused) {
      // PAUSE
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      if (lastResumeTimeRef.current > 0) {
        totalRecordedMsRef.current += Math.max(0, performance.now() - lastResumeTimeRef.current);
        lastResumeTimeRef.current = 0;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecordingPaused(true);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      showToast('⏸️ Запись приостановлена');
    } else {
      // RESUME
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      lastResumeTimeRef.current = performance.now();
      setIsRecordingPaused(false);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.warn('Video resume retry notice:', err);
              if (videoRef.current) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            });
        }
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

    if (lastResumeTimeRef.current > 0) {
      totalRecordedMsRef.current += Math.max(0, performance.now() - lastResumeTimeRef.current);
      lastResumeTimeRef.current = 0;
    }

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setIsRecordingPaused(false);

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Cancel / Reset recording without saving (Keep original video loaded, rewind to start)
  const cancelRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      // Detach save handler so it does not save/download the cancelled buffer
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    recordedChunksRef.current = [];
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingTime(0);

    // Rewind original video back to the beginning so user can record again immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }

    showToast('⏹️ Запись отменена. Оригинал перемотан в начало и готов к записи!');
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

  // Source Viewfinder calculations
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
      {/* Top Navigation Bar (Hidden during recording to free max top space) */}
      {!isRecording && (
        <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-2.5">
            <VidVertLogo size="md" />
            <div className="hidden lg:block pl-3 border-l border-slate-800">
              <p className="text-[11px] text-slate-400 font-medium">
                16:9 → 9:16 динамическое кадрирование с LERP-слежением
              </p>
            </div>
          </div>

          {/* Global Action Tool: Upload Video Button in Top Right */}
          <div className="flex items-center gap-2">
            <label className="relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition active:scale-95 shrink-0 cursor-pointer overflow-hidden">
              <Upload className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Загрузить видео</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
            </label>
          </div>
        </header>
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
      <main className="flex-1 w-full mx-auto p-0 sm:p-4 flex flex-col gap-2 max-w-7xl">
        
        {/* Mobile & Desktop Main Arena: Both Videos Always Visible Simultaneously */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 items-stretch">
          
          {/* SECTION 1: TOP VERTICAL 9:16 PREVIEW (Placed on top, maximizes height) */}
          <div className="w-full lg:col-span-5 order-1 flex flex-col items-center bg-slate-950 p-1 sm:p-2 sm:rounded-2xl border-b lg:border border-slate-800/80">
            {/* Vertical Canvas Frame (Expands vertically to maximum size) */}
            <div
              ref={containerRef}
              onContextMenu={handleCanvasContextMenu}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className={`relative aspect-[9/16] transition-all duration-300 w-full ${
                isRecording
                  ? 'h-[55vh] xs:h-[59vh] sm:h-[65vh] max-h-[660px] max-w-[320px] xs:max-w-[360px] sm:max-w-[400px] border-rose-500 shadow-rose-950/50'
                  : 'h-[44vh] xs:h-[48vh] sm:h-[52vh] max-h-[540px] max-w-[270px] xs:max-w-[310px] sm:max-w-[350px] border-slate-800'
              } rounded-xl overflow-hidden bg-black border-2 shadow-2xl flex items-center justify-center group`}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full object-contain"
              />

              {/* TOP-RIGHT CORNER ACTION BUTTONS: «СБРОС» и «СОХРАНИТЬ» */}
              <div className="absolute top-2 right-2 flex items-center gap-1 z-30">
                {isRecording && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRecording();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-rose-300 border border-rose-500/50 text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur transition active:scale-95 cursor-pointer"
                      title="Сбросить запись (без сохранения)"
                    >
                      <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                      <span>СТОП</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopRecordingAndDownload();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur transition active:scale-95 cursor-pointer"
                      title="Сохранить и скачать клип"
                    >
                      <Download className="w-3 h-3" />
                      <span>СОХРАНИТЬ</span>
                    </button>
                  </>
                )}
                {!isRecording && recordedClips.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const clip = recordedClips[0];
                      const ext = clip.blob.type.includes('mp4') ? 'mp4' : 'webm';
                      const exportName = clip.filename || getExportFilename(videoNameRef.current || videoName, ext);
                      downloadBlob(clip.blob, exportName);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur transition active:scale-95 cursor-pointer"
                    title="Скачать последнюю запись"
                  >
                    <Download className="w-3 h-3" />
                    <span>СОХРАНИТЬ</span>
                  </button>
                )}
              </div>

              {/* Composition Guides */}
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

              {/* Safe Zone */}
              {showSafeZone && (
                <div className="absolute inset-0 pointer-events-none pt-[10%] pb-[20%] pl-2 pr-[16%] z-10">
                  <div className="w-full h-full border border-dashed border-amber-400/60 rounded flex flex-col justify-start p-1.5 bg-amber-400/5">
                    <span className="text-[8px] font-mono text-amber-400 font-bold tracking-tight">
                      ⚡ БЕЗОПАСНАЯ ЗОНА
                    </span>
                  </div>
                </div>
              )}

              {/* View Overlay Indicators */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-20">
                {isRecording && (
                  <span className="bg-rose-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow">
                    ● REC {formatTime(recordingTime)}
                  </span>
                )}
                {isRecordingPaused && (
                  <span className="bg-amber-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow">
                    ПАУЗА
                  </span>
                )}
              </div>

              {/* Zoom HUD Floating Badge */}
              {zoomHudVisible && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 bg-slate-900/90 border border-indigo-500/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white font-mono font-bold text-xs shadow-2xl flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{displayZoom.toFixed(2)}x</span>
                </div>
              )}

              <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-[9px] text-slate-300 px-1.5 py-0.5 rounded font-mono pointer-events-none">
                9:16
              </div>

              {/* Status Notifications: Displayed ONLY in the bottom area of the vertical preview */}
              {notification && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-white max-w-[90%] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-[11px] font-medium">{notification}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: 16:9 HORIZONTAL VIDEO (100% Full Width of mobile screen, BORDERLESS) */}
          <div className="w-full lg:col-span-7 order-2 flex flex-col items-center bg-black lg:bg-slate-900 lg:rounded-2xl border-0 lg:border border-slate-800/80 overflow-hidden">
            {/* 100% Full Width Viewport Container (Edge-to-Edge on mobile, No Card Borders) */}
            <div
              ref={sourceContainerRef}
              onPointerMove={(e) => handlePointerMove(e, 'source')}
              onContextMenu={handleSourceContextMenu}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className="relative aspect-video w-full bg-black cursor-crosshair group"
            >
              {videoSrc ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    playsInline
                    loop
                    muted={isMuted}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onLoadedData={handleVideoLoadedMetadata}
                    onDurationChange={() => {
                      if (videoRef.current) {
                        const d = videoRef.current.duration;
                        if (Number.isFinite(d) && d > 0) {
                          setDuration(d);
                        }
                      }
                    }}
                    onTimeUpdate={() => {
                      if (videoRef.current && !isScrubbingRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => {
                      const errCode = videoRef.current?.error?.code;
                      const errMsg = videoRef.current?.error?.message;
                      if (errCode || errMsg) {
                        console.error('Video playback error:', errCode, errMsg);
                      }
                      setErrorMessage('Не удалось воспроизвести данный видеофайл. Проверьте формат.');
                    }}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Target Cursor Indicator */}
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
                    className={`absolute border-2 rounded-lg pointer-events-none transition-none ${
                      !isRecording
                        ? 'border-emerald-500 shadow-[0_0_18px_rgba(34,197,94,0.5)]'
                        : isRecordingPaused
                        ? 'border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.5)]'
                        : 'border-rose-500 shadow-[0_0_22px_rgba(239,68,68,0.6)]'
                    }`}
                  >
                    {/* Inner Tint */}
                    <div
                      className={`absolute inset-0 transition-colors ${
                        !isRecording
                          ? 'bg-emerald-500/10'
                          : isRecordingPaused
                          ? 'bg-amber-500/10'
                          : 'bg-rose-500/10'
                      }`}
                    />

                    {/* Corner Accents */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />

                    {/* CENTER TARGET BUTTON (ГОТОВ / REC / ПАУЗА) - Optimized for instant touch */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isRecording) {
                          startRecording();
                        } else {
                          togglePauseRecording();
                        }
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!isRecording) {
                          startRecording();
                        } else {
                          togglePauseRecording();
                        }
                      }}
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto min-w-[48px] min-h-[48px] p-3 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-2xl border-2 border-white/50 z-20 cursor-pointer ${
                        !isRecording
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/40'
                          : isRecordingPaused
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/40'
                          : 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-500/50'
                      }`}
                      title={
                        !isRecording
                          ? 'Нажмите для старта записи'
                          : isRecordingPaused
                          ? 'Нажмите для возобновления'
                          : 'Нажмите для паузы'
                      }
                    >
                      <Crosshair className="w-6 h-6 stroke-[2.5]" />
                    </button>

                    {/* Viewfinder Status Badge - Tappable for quick control */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isRecording) {
                          startRecording();
                        } else {
                          togglePauseRecording();
                        }
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!isRecording) {
                          startRecording();
                        } else {
                          togglePauseRecording();
                        }
                      }}
                      className={`absolute top-1 left-1 text-[9px] font-mono px-2 py-1 rounded font-bold shadow text-white flex items-center gap-1 pointer-events-auto cursor-pointer transition active:scale-95 z-20 ${
                        !isRecording
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : isRecordingPaused
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      {!isRecording ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                          <span>ГОТОВ</span>
                        </>
                      ) : isRecordingPaused ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                          <span>ПАУЗА</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>REC {formatTime(recordingTime)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <label className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-600 cursor-pointer overflow-hidden">
                  <Film className="w-10 h-10 stroke-[1.2] mb-1.5 opacity-40 text-slate-400 pointer-events-none" />
                  <p className="text-xs font-medium text-slate-400 pointer-events-none">Нажмите сюда или «Загрузить видео» вверху</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                </label>
              )}
            </div>

            {/* SECTION 3: THIN TIMELINE SCRUBBER TRACK DIRECTLY BELOW 16:9 VIDEO */}
            <div className="w-full bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2.5 py-1.5 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95 shrink-0"
                  title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    if (!videoRef.current) return;
                    videoRef.current.currentTime = 0;
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 shrink-0"
                  title="С начала"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <span className="text-[10px] font-mono text-slate-400 shrink-0 w-9 text-right">
                  {formatTime(currentTime)}
                </span>

                {/* Thin Scrubber Slider */}
                <input
                  type="range"
                  min={0}
                  max={duration > 0 && Number.isFinite(duration) ? duration : 100}
                  step={0.05}
                  value={currentTime}
                  onPointerDown={() => {
                    isScrubbingRef.current = true;
                  }}
                  onPointerUp={() => {
                    isScrubbingRef.current = false;
                  }}
                  onTouchStart={() => {
                    isScrubbingRef.current = true;
                  }}
                  onTouchEnd={() => {
                    isScrubbingRef.current = false;
                  }}
                  onInput={(e) => {
                    const newTime = parseFloat((e.target as HTMLInputElement).value);
                    if (Number.isFinite(newTime)) {
                      setCurrentTime(newTime);
                      if (videoRef.current) videoRef.current.currentTime = newTime;
                    }
                  }}
                  onChange={(e) => {
                    const newTime = parseFloat(e.target.value);
                    if (Number.isFinite(newTime)) {
                      setCurrentTime(newTime);
                      if (videoRef.current) videoRef.current.currentTime = newTime;
                    }
                  }}
                  className="flex-1 h-1.5 bg-slate-800/90 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-slate-700/60"
                />

                <span className="text-[10px] font-mono text-slate-400 shrink-0 w-9">
                  {formatTime(duration)}
                </span>

                <button
                  onClick={() => {
                    if (!videoRef.current) return;
                    const nextMuted = !isMuted;
                    setIsMuted(nextMuted);
                    videoRef.current.muted = nextMuted;
                  }}
                  className="text-slate-400 hover:text-white shrink-0"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* SECTION 4: TOGGABLE TOOL PANELS (Zoom, LERP, Resolution, Guides) */}
        <div className="w-full order-3 mt-1">
          <button
            onClick={() => setShowToolPanels(!showToolPanels)}
            className="w-full py-2 px-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-between hover:bg-slate-800 transition"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Параметры зума, плавности LERP и сетки</span>
            </div>
            {showToolPanels ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showToolPanels && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2.5 animate-in fade-in duration-150">
              
              {/* Panel 1: Zoom */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                    Масштаб (Zoom)
                  </span>
                  <span className="font-mono text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded text-[11px] border border-slate-800">
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
                    >
                      От себя [-]
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel 2: LERP Smoothness */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Плавность LERP
                  </span>
                  <span className="font-mono text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded text-[11px] border border-slate-800">
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
              </div>

              {/* Panel 3: Resolution & Overlays */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
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
          )}
        </div>

        {/* SECTION 5: RECORDED CLIPS DRAWER */}
        {recordedClips.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-col gap-2.5 order-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Записанные клипы ({recordedClips.length})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {recordedClips.map((clip, idx) => (
                <div
                  key={clip.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200 truncate max-w-[170px]" title={clip.filename || `Клип #${recordedClips.length - idx}`}>
                      {clip.filename || `Клип #${recordedClips.length - idx}`}
                    </span>
                    <span className="font-mono text-[10px]">{clip.timestamp}</span>
                  </div>

                  <div className="aspect-[9/16] max-h-36 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    <video
                      src={clip.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>Длительность: {formatTime(clip.duration)}</span>
                    <span className="text-emerald-400 font-semibold">{clip.size}</span>
                  </div>

                  <button
                    onClick={() => {
                      const ext = clip.blob.type.includes('mp4') ? 'mp4' : 'webm';
                      const exportName = clip.filename || getExportFilename(videoNameRef.current || videoName, ext);
                      downloadBlob(clip.blob, exportName);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать файл</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 6: INSTRUCTIONS CARD */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 flex flex-col gap-1.5 order-5 mt-1">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Памятка пользователю</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            При запуске записи верхнее меню с логотипом прячется за экран, давая максимальную высоту для вертикального 9:16 превью. Оба видео одновременно видны на экране телефона!
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-2.5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <VidVertIcon size={16} />
        <span>VidVert • Dynamic 9:16 Video Reframe • 100% Offline & Local</span>
      </footer>

      <OfflineBanner />
    </div>
  );
}
