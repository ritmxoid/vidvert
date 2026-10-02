/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
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
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { VidVertLogo, VidVertIcon } from './components/VidVertLogo';
import { safeFixWebm, patchWebmDuration } from './utils/fixWebmDuration';
import { translations, LanguageCode, detectBrowserLanguage } from './i18n/translations';
import { LanguageSelector } from './components/LanguageSelector';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';

interface RecordedClip {
  id: string;
  url: string;
  blob: Blob;
  size: string;
  duration: number;
  timestamp: string;
  filename: string;
}

// Format exported video filename: VidVert_Crop_<original_name>.<ext>
const getExportFilename = (sourceName: string, ext: string = 'webm') => {
  const base = (sourceName || 'video')
    .replace(/\.[^/.]+$/, '') // strip existing extension
    .trim();
  return `VidVert_Crop_${base || 'video'}.${ext}`;
};

export default function App() {
  // i18n Language State (Auto-detects browser language, persists in localStorage)
  const [currentLang, setCurrentLang] = useState<LanguageCode>(() => {
    return detectBrowserLanguage();
  });

  const handleSelectLang = (newLang: LanguageCode) => {
    setCurrentLang(newLang);
    try {
      localStorage.setItem('vidvert_lang', newLang);
    } catch {}
  };

  const t = translations[currentLang] || translations.ru;

  // Interactive 30s Tutorial Modal State (Auto-opens on first visit, or manually via button)
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('vidvert_seen_tutorial_v1');
    } catch {
      return false;
    }
  });

  const handleCloseTutorial = () => {
    setShowTutorialModal(false);
    try {
      localStorage.setItem('vidvert_seen_tutorial_v1', 'true');
    } catch {}
  };

  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);

  // Media (Video or Horizontal Image) State
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const videoNameRef = useRef<string>('');
  useEffect(() => {
    videoNameRef.current = videoName;
  }, [videoName]);
  const [, setIsVideoLoaded] = useState<boolean>(false);
  const [, setIsImageLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
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

  // Handle Media File Upload (Video or Image)
  const handleMediaFile = (file: File) => {
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    setMediaType(isImg ? 'image' : 'video');

    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    videoNameRef.current = file.name;
    setIsPlaying(false);
    setCurrentTime(0);
    setErrorMessage(null);

    // Reset zoom and position
    targetZoomRef.current = 1.0;
    currentZoomRef.current = 1.0;
    displayZoomRef.current = 1.0;
    setDisplayZoom(1.0);
    targetPosRef.current = { x: 0.5, y: 0.5 };
    currentPosRef.current = { x: 0.5, y: 0.5 };
    setUiTargetPos({ x: 0.5, y: 0.5 });

    if (isImg) {
      const img = new Image();
      img.onload = () => {
        setVideoDimensions({
          width: img.naturalWidth || 1920,
          height: img.naturalHeight || 1080
        });
        setDuration(0);
        setIsImageLoaded(true);
        setIsVideoLoaded(true);
      };
      img.src = url;
    } else {
      setIsImageLoaded(false);
      setIsVideoLoaded(false);
    }

    showToast(`✓ ${file.name}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMediaFile(file);
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

  // Toggle Video Playback or Image Mode Recording
  const togglePlay = () => {
    if (mediaType === 'image') {
      if (!isRecording) {
        startRecording();
      } else {
        stopRecordingAndDownload();
      }
      return;
    }

    if (!videoRef.current) return;
    const v = videoRef.current;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (v.paused || v.ended) {
      if (v.currentTime >= (duration - 0.2) && duration > 0) {
        v.currentTime = 0;
      }
      const p = v.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setErrorMessage(null);
        }).catch((err) => {
          console.warn('Playback error, retrying muted:', err);
          v.muted = true;
          setIsMuted(true);
          v.play()
            .then(() => {
              setIsPlaying(true);
              setErrorMessage(null);
            })
            .catch(() => {});
        });
      }
    } else {
      v.pause();
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

  // Right-click on 16:9 Source area
  const handleSourceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mediaType === 'image') {
      if (!isRecording) {
        startRecording();
      } else {
        stopRecordingAndDownload();
      }
      return;
    }
    togglePlay();
    const willBePlaying = videoRef.current?.paused;
    showToast(willBePlaying ? t.toastPlayRMB : t.toastPauseRMB);
  };

  // Right-click on 9:16 Canvas area
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecordingAndDownload();
      showToast(t.toastStopRMB);
    } else {
      togglePlay();
      const willBePlaying = videoRef.current?.paused;
      showToast(willBePlaying ? t.toastPlayRMB : t.toastPauseRMB);
    }
  };

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
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isTrackingActive) {
      const touch = e.touches[0];
      const target = sourceContainerRef.current || (e.currentTarget as HTMLElement);
      const rect = target.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
      targetPosRef.current = { x: relX, y: relY };
      setUiTargetPos({ x: relX, y: relY });
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / initialPinchDistRef.current;
      const newZoom = Math.max(0.8, Math.min(3.0, currentZoomRef.current * factor));
      targetZoomRef.current = newZoom;
      setZoomHudVisible(true);
      if (zoomHudTimerRef.current) clearTimeout(zoomHudTimerRef.current);
      zoomHudTimerRef.current = window.setTimeout(() => setZoomHudVisible(false), 1200);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  // Main Render Loop (Draws 9:16 Crop from 16:9 Video to Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      // 1. LERP Position
      const targetPos = targetPosRef.current;
      const currentPos = currentPosRef.current;
      currentPos.x += (targetPos.x - currentPos.x) * lerpFactor;
      currentPos.y += (targetPos.y - currentPos.y) * lerpFactor;

      // 2. LERP Zoom
      const targetZoom = targetZoomRef.current;
      const currentZoom = currentZoomRef.current;
      currentZoomRef.current += (targetZoom - currentZoom) * (lerpFactor * 1.5);
      const activeZoom = Math.max(0.8, Math.min(3.0, currentZoomRef.current));

      // Sync display zoom state throttled
      const now = performance.now();
      if (now - lastUiSyncRef.current > 120) {
        lastUiSyncRef.current = now;
        if (Math.abs(displayZoomRef.current - activeZoom) > 0.02) {
          displayZoomRef.current = activeZoom;
          setDisplayZoom(Number(activeZoom.toFixed(2)));
        }
      }

      // Fast direct DOM update of viewfinder box
      const vf = viewfinderBoxRef.current;
      if (vf && videoDimensions.width && videoDimensions.height) {
        const sw = videoDimensions.width;
        const sh = videoDimensions.height;
        const baseCropH = sh / activeZoom;
        const baseCropW = (baseCropH * 9) / 16;
        let cropW = Math.min(sw, baseCropW);
        let cropH = Math.min(sh, baseCropH);

        const currentCenterX = currentPos.x * sw;
        const currentCenterY = currentPos.y * sh;
        const sx = Math.max(0, Math.min(sw - cropW, currentCenterX - cropW / 2));
        const sy = Math.max(0, Math.min(sh - cropH, currentCenterY - cropH / 2));

        vf.style.left = `${(sx / sw) * 100}%`;
        vf.style.top = `${(sy / sh) * 100}%`;
        vf.style.width = `${(cropW / sw) * 100}%`;
        vf.style.height = `${(cropH / sh) * 100}%`;
      }

      // 3. Draw Video or Image onto Canvas
      const video = videoRef.current;
      const img = imageRef.current;

      const isVideoReady = Boolean(video && (video.readyState >= 1 || video.videoWidth > 0));
      const isImageReady = Boolean(img && img.complete && img.naturalWidth > 0);

      const sourceEl: CanvasImageSource | null =
        mediaType === 'image'
          ? (isImageReady ? img : null)
          : (isVideoReady ? video : null);

      if (sourceEl) {
        const sw =
          mediaType === 'image'
            ? (img?.naturalWidth || videoDimensions.width || 1920)
            : (video?.videoWidth || videoDimensions.width || 1920);
        const sh =
          mediaType === 'image'
            ? (img?.naturalHeight || videoDimensions.height || 1080)
            : (video?.videoHeight || videoDimensions.height || 1080);

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

        const currentCenterX = currentPos.x * sw;
        const currentCenterY = currentPos.y * sh;
        const sx = Math.max(0, Math.min(sw - cropW, currentCenterX - cropW / 2));
        const sy = Math.max(0, Math.min(sh - cropH, currentCenterY - cropH / 2));

        ctx.drawImage(sourceEl, sx, sy, cropW, cropH, 0, 0, canvasWidth, canvasHeight);
      } else {
        // Fallback / Placeholder
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('9:16 LIVE CROP', canvasWidth / 2, canvasHeight / 2);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [canvasWidth, canvasHeight, lerpFactor, videoDimensions, mediaType]);

  // Start Recording Stream
  const startRecording = () => {
    if (isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      const canvasStream = canvas.captureStream(fps);
      const combinedStream = new MediaStream();

      canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

      if (audioDestNodeRef.current && audioDestNodeRef.current.stream) {
        audioDestNodeRef.current.stream.getAudioTracks().forEach((track) => {
          combinedStream.addTrack(track);
        });
      }

      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options: MediaRecorderOptions = {
        videoBitsPerSecond: resolution === '1080p' ? 12_000_000 : 8_000_000
      };
      if (selectedMime) options.mimeType = selectedMime;

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm'
        });

        const elapsedMs = totalRecordedMsRef.current;
        let finalBlob = rawBlob;

        if (finalBlob.type.includes('webm') && elapsedMs > 0) {
          try {
            finalBlob = await safeFixWebm(finalBlob, elapsedMs / 1000);
          } catch (e) {
            console.warn('safeFixWebm notice:', e);
          }
        }

        const url = URL.createObjectURL(finalBlob);
        const durationSec = Math.round(elapsedMs / 1000);
        const sizeMb = (finalBlob.size / (1024 * 1024)).toFixed(2) + ' MB';
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const ext = finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const exportFilename = getExportFilename(videoNameRef.current || videoName, ext);

        const newClip: RecordedClip = {
          id: String(Date.now()),
          url,
          blob: finalBlob,
          size: sizeMb,
          duration: durationSec,
          timestamp,
          filename: exportFilename
        };

        setRecordedClips((prev) => [newClip, ...prev]);
        downloadBlob(finalBlob, exportFilename);
        showToast(t.recordingSaved);
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingTime(0);
      totalRecordedMsRef.current = 0;
      lastResumeTimeRef.current = performance.now();

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      if (mediaType === 'video' && videoRef.current && videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }

      showToast(t.recordingStarted);
    } catch (err: unknown) {
      console.error('Recording initialization error:', err);
      setErrorMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Pause / Resume Recording
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (!isRecordingPaused) {
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
      showToast(t.recordingPaused);
    } else {
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
        const p = videoRef.current.play();
        if (p !== undefined) {
          p.then(() => setIsPlaying(true)).catch((err) => {
            console.warn('Resume play error, retrying muted:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          });
        }
      }
      showToast(t.recordingResumed);
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

  // Cancel / Reset recording without saving
  const cancelRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }

    recordedChunksRef.current = [];
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingTime(0);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }

    showToast(t.recordingCanceled);
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
      {/* Top Navigation Bar (Hidden during recording to maximize vertical space) */}
      {/* Header Bar - Always Stationary */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 px-2 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <VidVertLogo size="md" />
          <div className="hidden lg:block pl-3 border-l border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Header Action Tools: Help + Language Switcher + Upload Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Simple Clean Round Help Button */}
          <button
            type="button"
            onClick={() => setShowTutorialModal(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center justify-center font-bold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            title={t.helpTooltip}
          >
            <HelpCircle className="w-4 h-4 text-slate-300" />
          </button>

          {/* Language Switcher Dropdown */}
          <LanguageSelector currentLang={currentLang} onSelectLang={handleSelectLang} />

          {/* Upload Video Button */}
          <label className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition active:scale-95 shrink-0 cursor-pointer overflow-hidden">
            <Upload className="w-3.5 h-3.5 pointer-events-none" />
            <span className="pointer-events-none">{t.uploadVideo}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
          </label>
        </div>
      </header>

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
            {t.close}
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="w-full mx-auto p-0 lg:p-4 flex flex-col max-w-7xl">
        
        {/* Mobile & Desktop Main Arena: Both Videos Always Visible Simultaneously */}
        {/* On mobile: h-[calc(100dvh-49px)] maximizes the 9:16 vertical preview height and pushes 16:9 flush to bottom */}
        <div className="w-full h-[calc(100dvh-49px)] lg:h-auto flex flex-col justify-between lg:grid lg:grid-cols-12 gap-1 lg:gap-3 items-stretch">
          
          {/* SECTION 1: TOP VERTICAL 9:16 PREVIEW - MAXIMAL SCREEN HEIGHT */}
          <div className="w-full lg:col-span-5 order-1 flex-1 min-h-0 flex flex-col items-center justify-center bg-slate-950 p-1 sm:p-2 sm:rounded-2xl border-b lg:border border-slate-800/80">
            <div
              ref={containerRef}
              onContextMenu={handleCanvasContextMenu}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className={`relative aspect-[9/16] h-full max-h-full w-auto max-w-full lg:h-[68vh] lg:max-h-[720px] rounded-xl overflow-hidden bg-black border-2 shadow-2xl flex items-center justify-center group ${
                isRecording
                  ? 'border-rose-500 shadow-rose-950/50'
                  : 'border-slate-800'
              }`}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full object-contain"
              />

              {/* TOP-RIGHT CORNER ACTION BUTTONS: «СТОП» и «СОХРАНИТЬ» */}
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
                      title={t.cancelRecordingTooltip}
                    >
                      <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                      <span>{t.buttonStop}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopRecordingAndDownload();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg backdrop-blur transition active:scale-95 cursor-pointer"
                      title={t.saveClipTooltip}
                    >
                      <Download className="w-3 h-3" />
                      <span>{t.buttonSave}</span>
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
                    title={t.downloadLastRecording}
                  >
                    <Download className="w-3 h-3" />
                    <span>{t.buttonSave}</span>
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
                      {t.safeZoneBadge}
                    </span>
                  </div>
                </div>
              )}

              {/* View Overlay Indicators */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-20">
                {isRecording && (
                  <span className="bg-rose-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow">
                    ● {t.statusRec} {formatTime(recordingTime)}
                  </span>
                )}
                {isRecordingPaused && (
                  <span className="bg-amber-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow">
                    {t.statusPause}
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

              {/* Status Notifications */}
              {notification && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-white max-w-[90%] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate text-[11px] font-medium">{notification}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: 16:9 HORIZONTAL VIDEO */}
          <div className="w-full shrink-0 lg:col-span-7 order-2 flex flex-col items-center bg-black lg:bg-slate-900 lg:rounded-2xl border-0 lg:border border-slate-800/80">
            <div
              ref={sourceContainerRef}
              onPointerMove={(e) => handlePointerMove(e, 'source')}
              onContextMenu={handleSourceContextMenu}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className="relative aspect-video w-full bg-black cursor-crosshair group overflow-hidden"
            >
              {videoSrc ? (
                <>
                  {mediaType === 'image' ? (
                    <img
                      ref={imageRef}
                      src={videoSrc}
                      alt={videoName || 'Horizontal source'}
                      onLoad={(e) => {
                        const target = e.currentTarget;
                        setVideoDimensions({
                          width: target.naturalWidth || 1920,
                          height: target.naturalHeight || 1080
                        });
                        setIsImageLoaded(true);
                        setIsVideoLoaded(true);
                      }}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  ) : (
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
                      onError={(e) => {
                        const err = e.currentTarget.error;
                        // Aborted requests (code 1) happen during pause/seek and are not real playback errors
                        if (!err || err.code === 1) return;
                        console.warn('Video format playback error code:', err.code, err.message);
                        setErrorMessage(t.playbackError);
                      }}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                  )}

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

                    {/* CENTER TARGET BUTTON */}
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
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto min-w-[48px] min-h-[48px] p-3 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-2xl border-2 border-white/50 z-20 cursor-pointer ${
                        !isRecording
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/40'
                          : isRecordingPaused
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/40'
                          : 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-500/50'
                      }`}
                      title={
                        !isRecording
                          ? t.targetTooltipStart
                          : isRecordingPaused
                          ? t.targetTooltipResume
                          : t.targetTooltipPause
                      }
                    >
                      <Crosshair className="w-6 h-6 stroke-[2.5]" />
                    </button>

                    {/* Viewfinder Status Badge */}
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
                          <span>{t.statusReady}</span>
                        </>
                      ) : isRecordingPaused ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                          <span>{t.statusPause}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>{t.statusRec} {formatTime(recordingTime)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleMediaFile(file);
                  }}
                  className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-600 cursor-pointer overflow-hidden group"
                >
                  <div className="flex items-center gap-2 mb-2 text-slate-400 group-hover:text-indigo-400 transition-colors pointer-events-none">
                    <Film className="w-8 h-8 stroke-[1.4] opacity-70" />
                    <span className="text-sm font-bold opacity-30">+</span>
                    <ImageIcon className="w-8 h-8 stroke-[1.4] opacity-70" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300 pointer-events-none">{t.dropOrClickToUpload}</p>
                  <p className="text-[10px] text-slate-500 pointer-events-none mt-1 max-w-sm">{t.dropZoneSubtitle}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                </label>
              )}
            </div>

            {/* SECTION 3: THIN TIMELINE SCRUBBER TRACK FOR VIDEO (ONLY WHEN VIDEO FILE IS LOADED) */}
            {mediaType === 'video' && videoSrc ? (
              <div className="w-full bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2.5 py-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95 shrink-0 cursor-pointer"
                    title={isPlaying ? t.pause : t.play}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.currentTime = 0;
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 shrink-0 cursor-pointer"
                    title={t.fromStart}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0 w-9 text-right">
                    {formatTime(currentTime)}
                  </span>

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
                    className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    title={isMuted ? t.unmute : t.mute}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : null}

          </div>

        </div>

        {/* SECTION 4: TOGGABLE TOOL PANELS (Zoom, LERP, Resolution, Guides) */}
        <div className="w-full order-3 mt-1">
          <button
            onClick={() => setShowToolPanels(!showToolPanels)}
            className="w-full py-2 px-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-between hover:bg-slate-800 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.settingsToggleTitle}</span>
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
                    {t.zoomTitle}
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
                      className={`px-1.5 py-0.5 rounded font-mono transition cursor-pointer ${
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
                    <span>{t.mouseWheelTitle}</span>
                    <span className="text-indigo-400 font-mono font-medium">
                      {wheelDirection === 'forward-plus' ? t.wheelAwayPlus : t.wheelAwayMinus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <button
                      onClick={() => {
                        setWheelDirection('forward-plus');
                        showToast(t.wheelAwayPlusToast);
                      }}
                      className={`py-1 px-1.5 rounded transition text-center font-medium cursor-pointer ${
                        wheelDirection === 'forward-plus'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.wheelAwayPlus}
                    </button>
                    <button
                      onClick={() => {
                        setWheelDirection('forward-minus');
                        showToast(t.wheelAwayMinusToast);
                      }}
                      className={`py-1 px-1.5 rounded transition text-center font-medium cursor-pointer ${
                        wheelDirection === 'forward-minus'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.wheelAwayMinus}
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel 2: LERP Smoothness */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    {t.lerpTitle}
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
                    { val: 0.04, label: t.lerpCinema },
                    { val: 0.1, label: t.lerpOptimal },
                    { val: 0.2, label: t.lerpDynamic },
                    { val: 0.35, label: t.lerpFast }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setLerpFactor(item.val)}
                      className={`py-1 px-1 rounded transition text-center cursor-pointer ${
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
                    {t.outputAndGridTitle}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    onClick={() => setResolution(resolution === '1080p' ? '720p' : '1080p')}
                    className="py-1 px-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-center cursor-pointer"
                  >
                    {t.formatLabel}: <span className="text-indigo-400 font-bold">{resolution}</span>
                  </button>
                  <button
                    onClick={() => setFps(fps === 60 ? 30 : 60)}
                    className="py-1 px-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-center cursor-pointer"
                  >
                    {t.fpsLabel}: <span className="text-indigo-400 font-bold">{fps}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1 pt-0.5">
                  <button
                    onClick={() => setShowGuides(!showGuides)}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition cursor-pointer ${
                      showGuides
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {showGuides ? t.grid3x3On : t.grid3x3Off}
                  </button>
                  <button
                    onClick={() => setShowSafeZone(!showSafeZone)}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition cursor-pointer ${
                      showSafeZone
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {showSafeZone ? t.safeZoneOn : t.safeZoneOff}
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
                <span>{t.recordedClipsTitle} ({recordedClips.length})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {recordedClips.map((clip, idx) => (
                <div
                  key={clip.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200 truncate max-w-[170px]" title={clip.filename || `Clip #${recordedClips.length - idx}`}>
                      {clip.filename || `Clip #${recordedClips.length - idx}`}
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
                    <span>{t.durationLabel}: {formatTime(clip.duration)}</span>
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
                    <span>{t.downloadFile}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 6: INSTRUCTIONS & QUICK LAUNCH CARD */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 order-5 mt-1">
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-300 block mb-0.5">{t.userMemoTitle}</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t.userMemoDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTutorialModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.understand30s}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-2.5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <VidVertIcon size={16} />
        <span>VidVert • Dynamic 9:16 Video Reframe • 100% Offline & Local</span>
      </footer>

      {/* Interactive 30-Second Tutorial Modal */}
      <InteractiveTutorialModal
        isOpen={showTutorialModal}
        onClose={handleCloseTutorial}
        onUploadClick={() => {
          fileInputRef.current?.click();
        }}
        lang={currentLang}
      />
    </div>
  );
}
