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
  Film,
  Globe,
  RotateCcw,
  Mic,
  MicOff
} from 'lucide-react';
import { PWAInstallButton, OfflineBanner } from './PWAInstallButton';
import { VidVertLogo, VidVertIcon } from './components/VidVertLogo';
import { patchWebmDuration } from './utils/fixWebmDuration';

export type Language = 'ru' | 'en' | 'es' | 'de' | 'fr' | 'zh' | 'ja';

export const LANGUAGES: { code: Language; label: string; name: string; flag: string }[] = [
  { code: 'ru', label: 'Ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'En', name: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'De', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: 'Zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', label: 'Ja', name: '日本語', flag: '🇯🇵' },
];

export interface TranslationStrings {
  headerSubtitle: string;
  upload: string;
  dropPrompt: string;
  ready: string;
  pause: string;
  safeZone: string;
  cancelTooltip: string;
  resetTooltip: string;
  saveTooltip: string;
  downloadTooltip: string;
  toolsToggle: string;
  zoomTitle: string;
  wheelDir: string;
  forwardPlus: string;
  forwardMinus: string;
  lerpTitle: string;
  lerpSmooth: string;
  lerpDefault: string;
  lerpFast: string;
  lerpSharp: string;
  resAndGuides: string;
  resLabel: string;
  guidesOn: string;
  guidesOff: string;
  safeZoneOn: string;
  safeZoneOff: string;
  savedClips: string;
  durationLabel: string;
  downloadBtn: string;
  howToUse: string;
  instructionsText: string;
  modalTitle: string;
  modalText: string;
  dontShowAgain: string;
  modalOk: string;
  confirmReset: string;
}

export const TRANSLATIONS: Record<Language, TranslationStrings> = {
  ru: {
    headerSubtitle: 'Динамическое кадрирование видео и фото с LERP-слежением',
    upload: 'Загрузить',
    dropPrompt: 'Нажмите или перетащите 16:9 видео/фото сюда',
    ready: 'ГОТОВ',
    pause: 'ПАУЗА',
    safeZone: 'Безопасная зона (Текст/UI не перекрывать)',
    cancelTooltip: 'Сброс / Отменить запись (Esc)',
    resetTooltip: 'Сбросить все настройки по умолчанию (Esc)',
    saveTooltip: 'Сохранить и скачать (Esc)',
    downloadTooltip: 'Скачать клип',
    toolsToggle: 'Настройки зума, LERP, кадрирования и сетки',
    zoomTitle: 'Зум (Zoom)',
    wheelDir: 'Направление колеса',
    forwardPlus: 'Вперед [ + ]',
    forwardMinus: 'Вперед [ - ]',
    lerpTitle: 'Плавность LERP',
    lerpSmooth: 'Очень плавно',
    lerpDefault: 'По умолчанию',
    lerpFast: 'Быстро',
    lerpSharp: 'Резко',
    resAndGuides: 'Разрешение, формат и сетки',
    resLabel: 'Разрешение',
    guidesOn: 'Сетка вкл',
    guidesOff: 'Сетка выкл',
    safeZoneOn: 'Скрыть Safe Zone (Reels/TikTok)',
    safeZoneOff: 'Safe Zone (Reels/TikTok)',
    savedClips: 'Сохраненные клипы',
    durationLabel: 'Длительность',
    downloadBtn: 'Скачать',
    howToUse: 'Как пользоваться',
    instructionsText: 'Загрузите горизонтальное видео или фото (16:9). Управляйте зелёным видоискателем мышкой или пальцем, приближайте колесиком мыши (или щипком на телефоне). Нажмите REC для записи динамического 9:16, 1:1 или 16:9 ролика. Вы можете нажать на зеленый значок микрофона справа перед стартом, чтобы наложить собственный голос (озвучить видео/слайд-шоу) в процессе записи! Для доступа к настройкам, прокрутите страницу вверх.',
    modalTitle: 'Как пользоваться VidVert',
    modalText: 'Загрузите горизонтальное видео или фото (16:9). Управляйте зелёным видоискателем мышкой или пальцем, приближайте колесиком мыши (или щипком на телефоне). Нажмите REC для записи динамического 9:16, 1:1 или 16:9 ролика. Вы можете нажать на зеленый значок микрофона справа перед стартом, чтобы наложить собственный голос (озвучить видео/слайд-шоу) в процессе записи! Для доступа к настройкам, прокрутите страницу вверх.',
    dontShowAgain: 'Больше не показывать',
    modalOk: 'Понятно',
    confirmReset: 'Вы уверены, что хотите сбросить все настройки кадрирования и зума по умолчанию?'
  },
  en: {
    headerSubtitle: 'Dynamic reframing of video and photo with LERP tracking',
    upload: 'Upload',
    dropPrompt: 'Click or drag & drop 16:9 video/photo here',
    ready: 'READY',
    pause: 'PAUSE',
    safeZone: 'Safe zone (Keep clear of text/UI)',
    cancelTooltip: 'Reset / Cancel recording (Esc)',
    resetTooltip: 'Reset all settings to default (Esc)',
    saveTooltip: 'Save and download (Esc)',
    downloadTooltip: 'Download clip',
    toolsToggle: 'Zoom, LERP, aspect ratio & Grid settings',
    zoomTitle: 'Zoom',
    wheelDir: 'Wheel Direction',
    forwardPlus: 'Forward [ + ]',
    forwardMinus: 'Forward [ - ]',
    lerpTitle: 'LERP Smoothness',
    lerpSmooth: 'Very Smooth',
    lerpDefault: 'Default',
    lerpFast: 'Fast',
    lerpSharp: 'Sharp',
    resAndGuides: 'Resolution, format & Guides',
    resLabel: 'Resolution',
    guidesOn: 'Grid ON',
    guidesOff: 'Grid OFF',
    safeZoneOn: 'Hide Safe Zone (Reels/TikTok)',
    safeZoneOff: 'Show Safe Zone (Reels/TikTok)',
    savedClips: 'Recorded Clips',
    durationLabel: 'Duration',
    downloadBtn: 'Download',
    howToUse: 'How to Use',
    instructionsText: 'Upload a horizontal video or photo (16:9). Control the green viewfinder with mouse or touch, zoom with the wheel (or pinch gesture). Click REC to record a dynamic 9:16, 1:1 or 16:9 clip. You can click the green microphone icon on the right before starting to record your voice over the video or photo/slide-show in real time! To access settings, scroll the page up.',
    modalTitle: 'How to Use VidVert',
    modalText: 'Upload a horizontal video or photo (16:9). Control the green viewfinder with mouse or touch, zoom with the wheel (or pinch gesture). Click REC to record a dynamic 9:16, 1:1 or 16:9 clip. You can click the green microphone icon on the right before starting to record your voice over the video or photo/slide-show in real time! To access settings, scroll the page up.',
    dontShowAgain: 'Don’t show again',
    modalOk: 'Got it',
    confirmReset: 'Are you sure you want to reset all reframing and zoom settings to defaults?'
  },
  es: {
    headerSubtitle: 'Reencuadre dinámico de video y foto con seguimiento LERP',
    upload: 'Subir',
    dropPrompt: 'Haga clic o arrastre el video/foto 16:9 aquí',
    ready: 'LISTO',
    pause: 'PAUSA',
    safeZone: 'Zona segura (No tapar con texto/UI)',
    cancelTooltip: 'Reiniciar / Cancelar grabación (Esc)',
    resetTooltip: 'Restablecer todos los ajustes (Esc)',
    saveTooltip: 'Guardar y descargar (Esc)',
    downloadTooltip: 'Descargar clip',
    toolsToggle: 'Ajustes de Zoom, LERP, formato y Cuadrícula',
    zoomTitle: 'Zoom',
    wheelDir: 'Dirección de Rueda',
    forwardPlus: 'Adelante [ + ]',
    forwardMinus: 'Adelante [ - ]',
    lerpTitle: 'Suavidad LERP',
    lerpSmooth: 'Muy suave',
    lerpDefault: 'Por defecto',
    lerpFast: 'Rápido',
    lerpSharp: 'Agudo',
    resAndGuides: 'Resolución, formato y Guías',
    resLabel: 'Resolución',
    guidesOn: 'Cuadrícula ON',
    guidesOff: 'Cuadrícula OFF',
    safeZoneOn: 'Ocultar Zona Segura',
    safeZoneOff: 'Mostrar Zona Segura',
    savedClips: 'Clips Grabados',
    durationLabel: 'Duración',
    downloadBtn: 'Descargar',
    howToUse: 'Cómo usar',
    instructionsText: 'Cargue un video o foto horizontal (16:9). Controle el visor verde, grabe con REC y use el micrófono de la derecha para grabar su voz.',
    modalTitle: 'Cómo usar VidVert',
    modalText: 'Cargue un video o foto horizontal (16:9). Controle el visor verde, grabe con REC y use el micrófono de la derecha para grabar su voz.',
    dontShowAgain: 'No volver a mostrar',
    modalOk: 'Entendido',
    confirmReset: '¿Está seguro de que desea restablecer todos los ajustes?'
  },
  de: {
    headerSubtitle: 'Dynamisches Reframing von Video und Foto mit LERP-Tracking',
    upload: 'Hochladen',
    dropPrompt: '16:9-Video/Foto hierher ziehen oder klicken',
    ready: 'BEREIT',
    pause: 'PAUSE',
    safeZone: 'Sicherheitszone (Text/UI freihalten)',
    cancelTooltip: 'Abbrechen / Zurücksetzen (Esc)',
    resetTooltip: 'Alle Einstellungen zurücksetzen (Esc)',
    saveTooltip: 'Speichern und herunterladen (Esc)',
    downloadTooltip: 'Clip herunterladen',
    toolsToggle: 'Zoom, LERP, Format & Raster Einstellungen',
    zoomTitle: 'Zoom',
    wheelDir: 'Mausrad-Richtung',
    forwardPlus: 'Vorwärts [ + ]',
    forwardMinus: 'Vorwärts [ - ]',
    lerpTitle: 'LERP-Glätte',
    lerpSmooth: 'Sehr glatt',
    lerpDefault: 'Standard',
    lerpFast: 'Schnell',
    lerpSharp: 'Scharf',
    resAndGuides: 'Auflösung, Format & Raster',
    resLabel: 'Auflösung',
    guidesOn: 'Raster AN',
    guidesOff: 'Raster AUS',
    safeZoneOn: 'Sicherheitszone ausblenden',
    safeZoneOff: 'Sicherheitszone anzeigen',
    savedClips: 'Aufgenommene Clips',
    durationLabel: 'Dauer',
    downloadBtn: 'Herunterladen',
    howToUse: 'So verwenden Sie VidVert',
    instructionsText: 'Laden Sie ein horizontales Video/Foto (16:9) hoch. Steuern Sie den grünen Sucher, nehmen Sie mit REC auf und nutzen Sie das Mikrofon rechts für Sprachaufnahme.',
    modalTitle: 'So verwenden Sie VidVert',
    modalText: 'Laden Sie ein horizontales Video/Foto (16:9) hoch. Steuern Sie den grünen Sucher, nehmen Sie mit REC auf und nutzen Sie das Mikrofon rechts für Sprachaufnahme.',
    dontShowAgain: 'Nicht mehr anzeigen',
    modalOk: 'Verstanden',
    confirmReset: 'Sind Sie sicher, dass Sie alle Einstellungen zurücksetzen möchten?'
  },
  fr: {
    headerSubtitle: 'Recadrage dynamique de vidéo/photo avec suivi LERP',
    upload: 'Importer',
    dropPrompt: 'Cliquez ou glissez une vidéo/photo 16:9 ici',
    ready: 'PRÊT',
    pause: 'PAUSE',
    safeZone: 'Zone sûre (Ne pas superposer texte/UI)',
    cancelTooltip: 'Annuler l’enregistrement (Esc)',
    resetTooltip: 'Réinitialiser tous les paramètres (Esc)',
    saveTooltip: 'Enregistrer et télécharger (Esc)',
    downloadTooltip: 'Télécharger le clip',
    toolsToggle: 'Paramètres Zoom, LERP, format et Grille',
    zoomTitle: 'Zoom',
    wheelDir: 'Direction de la molette',
    forwardPlus: 'Avant [ + ]',
    forwardMinus: 'Avant [ - ]',
    lerpTitle: 'Fluidité LERP',
    lerpSmooth: 'Très fluide',
    lerpDefault: 'Par défaut',
    lerpFast: 'Rapide',
    lerpSharp: 'Sec',
    resAndGuides: 'Résolution, format et Grille',
    resLabel: 'Résolution',
    guidesOn: 'Grille ACTIVÉE',
    guidesOff: 'Grille DÉSACTIVÉE',
    safeZoneOn: 'Masquer Zone Sûre',
    safeZoneOff: 'Afficher Zone Sûre',
    savedClips: 'Clips enregistrés',
    durationLabel: 'Durée',
    downloadBtn: 'Télécharger',
    howToUse: 'Comment utiliser',
    instructionsText: 'Téléchargez une vidéo ou photo (16:9). Contrôlez le viseur, enregistrez avec REC, et utilisez le micro à droite pour enregistrer votre voix.',
    modalTitle: 'Comment utiliser VidVert',
    modalText: 'Téléchargez une vidéo ou photo (16:9). Contrôlez le viseur, enregistrez avec REC, et utilisez le micro à droite pour enregistrer votre voix.',
    dontShowAgain: 'Ne plus afficher',
    modalOk: 'Compris',
    confirmReset: 'Voulez-vous vraiment réinitialiser tous les paramètres?'
  },
  zh: {
    headerSubtitle: '视频与图片动态重构与 LERP 智能追踪',
    upload: '上传',
    dropPrompt: '点击或拖拽 16:9 视频/图片至此处',
    ready: '就绪',
    pause: '暂停',
    safeZone: '安全区域 (避免被字幕/UI遮挡)',
    cancelTooltip: '重置 / 取消录制 (Esc)',
    resetTooltip: '重置所有默认设置 (Esc)',
    saveTooltip: '保存并下载 (Esc)',
    downloadTooltip: '下载视频片段',
    toolsToggle: '缩放、LERP、画幅与网格设置',
    zoomTitle: '缩放 (Zoom)',
    wheelDir: '滚轮方向',
    forwardPlus: '向前 [ + ]',
    forwardMinus: '向前 [ - ]',
    lerpTitle: 'LERP 平滑度',
    lerpSmooth: '极平滑',
    lerpDefault: '默认',
    lerpFast: '快速',
    lerpSharp: '敏捷',
    resAndGuides: '分辨率、画幅与网格',
    resLabel: '分辨率',
    guidesOn: '网格 开启',
    guidesOff: '网格 关闭',
    safeZoneOn: '隐藏安全区',
    safeZoneOff: '显示安全区',
    savedClips: '已录制片段',
    durationLabel: '时长',
    downloadBtn: '下载',
    howToUse: '如何使用',
    instructionsText: '上传 16:9 视频/图片，拖动绿色取景框，点击 REC 录制。可在右侧开启麦克风录音。',
    modalTitle: '如何使用 VidVert',
    modalText: '上传 16:9 视频/图片，拖动绿色取景框，点击 REC 录制。可在右侧开启麦克风录音。',
    dontShowAgain: '不再显示',
    modalOk: '知道了',
    confirmReset: '您确定要重置所有设置吗？'
  },
  ja: {
    headerSubtitle: '動画・写真の LERPトラッキング動的リフレーミング',
    upload: '読み込み',
    dropPrompt: '16:9動画/写真をここにドラッグ＆ドロップ',
    ready: '準備完了',
    pause: '一時停止',
    safeZone: 'セーフゾーン (テキストやUIで隠さないエリア)',
    cancelTooltip: 'リセット / 録画キャンセル (Esc)',
    resetTooltip: 'すべての設定を初期化 (Esc)',
    saveTooltip: '保存してダウンロード (Esc)',
    downloadTooltip: 'クリップを保存',
    toolsToggle: 'ズーム・LERP・比率・グリッド設定',
    zoomTitle: 'ズーム',
    wheelDir: 'ホイール方向',
    forwardPlus: '前進 [ + ]',
    forwardMinus: '前進 [ - ]',
    lerpTitle: 'LERPの滑らかさ',
    lerpSmooth: 'とても滑らか',
    lerpDefault: '標準',
    lerpFast: '高速',
    lerpSharp: '鋭い',
    resAndGuides: '解像度・比率・グリッド',
    resLabel: '解像度',
    guidesOn: 'グリッド ON',
    guidesOff: 'グリッド OFF',
    safeZoneOn: 'セーフゾーン非表示',
    safeZoneOff: 'セーフゾーン表示',
    savedClips: '録画されたクリップ',
    durationLabel: '再生時間',
    downloadBtn: '保存',
    howToUse: '使い方',
    instructionsText: '16:9の横型動画/写真をアップロードし、緑色のビューファインダーを操作してRECで録画。右側のマイクで自分の声を録音できます。',
    modalTitle: 'VidVertの使い方',
    modalText: '16:9の横型動画/写真をアップロードし、緑色のビューファインダーを操作してRECで録画。右側のマイクで自分の声を録音できます。',
    dontShowAgain: '次回から表示しない',
    modalOk: '了解',
    confirmReset: 'すべての設定を初期化してもよろしいですか？'
  }
};

const detectBrowserLanguage = (): Language => {
  try {
    const navLangs = navigator.languages || [navigator.language || 'ru'];
    for (const l of navLangs) {
      const code = l.toLowerCase().slice(0, 2);
      if (code === 'ru' || code === 'en' || code === 'es' || code === 'de' || code === 'fr' || code === 'zh' || code === 'ja') {
        return code as Language;
      }
    }
  } catch {}
  return 'ru';
};

interface RecordedClip {
  id: string;
  url: string;
  blob: Blob;
  size: string;
  duration: number;
  timestamp: string;
  filename: string;
  aspect?: '9:16' | '1:1' | '16:9';
}

// Format exported video filename as requested: VidVert_Crop_<original_name>.<ext>
const getExportFilename = (sourceName: string, ext: string = 'webm') => {
  const base = (sourceName || 'video')
    .replace(/\.[^/.]+$/, '') // strip existing extension (.mp4, .mov, etc)
    .trim();
  return `VidVert_Crop_${base || 'video'}.${ext}`;
};

export default function App() {
  // Language & Translations State (Default: auto-detect browser/device language, 7 languages support)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('vidvert_lang');
      if (saved && (saved === 'ru' || saved === 'en' || saved === 'es' || saved === 'de' || saved === 'fr' || saved === 'zh' || saved === 'ja')) {
        return saved as Language;
      }
    } catch {}
    return detectBrowserLanguage();
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // First-Start Modal State
  const [showModal, setShowModal] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vidvert_dont_show_intro') !== 'true';
    } catch {
      return true;
    }
  });
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  const handleCloseModal = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('vidvert_dont_show_intro', 'true');
      } catch {}
    }
    setShowModal(false);
  };

  useEffect(() => {
    try {
      localStorage.setItem('vidvert_lang', lang);
    } catch {}
  }, [lang]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const t = TRANSLATIONS[lang];

  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);

  // Video and Image State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [isSourceImage, setIsSourceImage] = useState<boolean>(false);
  const [cropAspect, setCropAspect] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  
  const videoNameRef = useRef<string>('');
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

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
  const [, setZoom] = useState<number>(1.25);
  const [displayZoom, setDisplayZoom] = useState<number>(1.25);
  const targetZoomRef = useRef<number>(1.25);
  const currentZoomRef = useRef<number>(1.25);
  const displayZoomRef = useRef<number>(1.25);
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
  const [fps, setFps] = useState<number>(30);
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
  const initialZoomRef = useRef<number>(1.25);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);

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

  // Global pointerup/touchend listener to prevent scrubber from getting stuck on mobile/desktop
  useEffect(() => {
    const handleGlobalRelease = () => {
      isScrubbingRef.current = false;
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
    };
  }, []);

  // Zoom HUD temporary indicator
  const [zoomHudVisible, setZoomHudVisible] = useState<boolean>(false);
  const zoomHudTimerRef = useRef<number | null>(null);

  // Canvas dimensions based on target resolution and aspect ratio
  const getCanvasDimensions = () => {
    if (cropAspect === '9:16') {
      return {
        width: resolution === '1080p' ? 1080 : 720,
        height: resolution === '1080p' ? 1920 : 1280,
        aspectClass: 'aspect-[9/16]'
      };
    } else if (cropAspect === '1:1') {
      return {
        width: resolution === '1080p' ? 1080 : 720,
        height: resolution === '1080p' ? 1080 : 720,
        aspectClass: 'aspect-square'
      };
    } else {
      // 16:9
      return {
        width: resolution === '1080p' ? 1920 : 1280,
        height: resolution === '1080p' ? 1080 : 720,
        aspectClass: 'aspect-video'
      };
    }
  };
  const { width: canvasWidth, height: canvasHeight, aspectClass: canvasAspectClass } = getCanvasDimensions();

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

  // Handle Video / Image File Upload with full format support
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      if (videoSrc && videoSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoSrc);
      }
      const isImg = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp|avif)$/i.test(file.name);
      setIsSourceImage(isImg);

      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoName(file.name);
      setIsVideoLoaded(false);
      targetZoomRef.current = 1.25;
      currentZoomRef.current = 1.25;
      displayZoomRef.current = 1.25;
      setZoom(1.25);
      setDisplayZoom(1.25);
      targetPosRef.current = { x: 0.5, y: 0.5 };
      currentPosRef.current = { x: 0.5, y: 0.5 };
      setUiTargetPos({ x: 0.5, y: 0.5 });
      showToast(`Загружено: ${file.name}`);
    } catch (err) {
      console.error('File load error:', err);
      setErrorMessage('Не удалось загрузить медиафайл.');
    } finally {
      // Clear input so selecting the same file again works
      e.target.value = '';
    }
  };

  // Image metadata loaded
  const handleImageLoaded = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    setDuration(0);
    setCurrentTime(0);
    setVideoDimensions({
      width: img.naturalWidth || 1920,
      height: img.naturalHeight || 1080
    });
    setIsVideoLoaded(true);
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
    if (isSourceImage || !videoRef.current) return;
    const clamped = Math.max(0, Math.min(duration || 0, time));
    setCurrentTime(clamped);
    videoRef.current.currentTime = clamped;
  };

  // Toggle Video / Image Playback
  const togglePlay = () => {
    if (isSourceImage) {
      setIsPlaying((prev) => !prev);
      return;
    }
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
    if (e.pointerType === 'touch') return; // Do NOT process touch pointers in pointerMove (touch handlers do touch dragging)

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

  // Right-click / context menu on 16:9 Source area
  const handleSourceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Right-click on 9:16 Canvas area
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecordingAndDownload();
      showToast('Запись остановлена (ПКМ)');
    } else {
      togglePlay();
      const willBePlaying = videoRef.current?.paused;
      showToast(willBePlaying ? 'Воспроизведение (ПКМ)' : 'Пауза (ПКМ)');
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
          showToast(`Скорость: ${nextRate}x (Боковая кнопка)`);
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
          showToast(`Скорость: ${nextRate}x (Боковая кнопка)`);
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

  // Mobile Touch Gestures - Relative delta dragging without center snapping
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isTrackingActive) {
      const touch = e.touches[0];
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      lastTouchPosRef.current = null;
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
    if (e.touches.length === 2 && initialPinchDistRef.current !== null && initialPinchDistRef.current > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      if (currentDist > 0) {
        const scaleFactor = initialPinchDistRef.current / currentDist;
        const newZoom = Math.max(0.8, Math.min(3.0, Number((initialZoomRef.current * scaleFactor).toFixed(2))));
        handleZoomChange(newZoom, true);
      }
      return;
    }
    if (e.touches.length === 1 && isTrackingActive) {
      const touch = e.touches[0];
      const target = sourceContainerRef.current || (e.currentTarget as HTMLElement);
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (lastTouchPosRef.current) {
          const dx = (touch.clientX - lastTouchPosRef.current.x) / rect.width;
          const dy = (touch.clientY - lastTouchPosRef.current.y) / rect.height;
          const newX = Math.max(0, Math.min(1, targetPosRef.current.x + dx));
          const newY = Math.max(0, Math.min(1, targetPosRef.current.y + dy));

          targetPosRef.current = { x: newX, y: newY };
          setUiTargetPos({ x: newX, y: newY });
        }
        lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      lastTouchPosRef.current = null;
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

      const mediaEl = isSourceImage ? imageRef.current : videoRef.current;
      const isMediaReady = isSourceImage
        ? Boolean(imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0)
        : Boolean(videoRef.current && (videoRef.current.readyState >= 1 || videoRef.current.videoWidth > 0));

      const sw = isSourceImage
        ? (imageRef.current?.naturalWidth || videoDimensions.width || 1920)
        : ((videoRef.current && videoRef.current.videoWidth > 0) ? videoRef.current.videoWidth : (videoDimensions.width || 1920));
      const sh = isSourceImage
        ? (imageRef.current?.naturalHeight || videoDimensions.height || 1080)
        : ((videoRef.current && videoRef.current.videoHeight > 0) ? videoRef.current.videoHeight : (videoDimensions.height || 1080));

      const baseCropHeight = sh / activeZoom;
      let baseCropWidth = (baseCropHeight * 9) / 16;
      if (cropAspect === '1:1') {
        baseCropWidth = baseCropHeight;
      } else if (cropAspect === '16:9') {
        baseCropWidth = (baseCropHeight * 16) / 9;
      }

      let cropW = baseCropWidth;
      let cropH = baseCropHeight;

      if (cropW > sw) {
        cropW = sw;
        if (cropAspect === '9:16') {
          cropH = (cropW * 16) / 9;
        } else if (cropAspect === '1:1') {
          cropH = cropW;
        } else if (cropAspect === '16:9') {
          cropH = (cropW * 9) / 16;
        }
      }
      if (cropH > sh) {
        cropH = sh;
        if (cropAspect === '9:16') {
          cropW = (cropH * 9) / 16;
        } else if (cropAspect === '1:1') {
          cropW = cropH;
        } else if (cropAspect === '16:9') {
          cropW = (cropH * 16) / 9;
        }
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

      // Draw media frame to canvas
      if (isMediaReady && mediaEl) {
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(mediaEl, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
        } catch {
          // Keep loop alive if transient frame decode glitch
        }
      } else {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Перетащите видео или фото (16:9)', canvas.width / 2, canvas.height / 2);
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
  }, [lerpFactor, resolution, videoDimensions, isSourceImage, cropAspect]);

  // Start MediaRecorder with combined Canvas Stream + Video Audio
  const startRecording = async () => {
    if (!canvasRef.current || (!videoRef.current && !isSourceImage)) {
      setErrorMessage('Канвас или медиафайл не инициализированы');
      return;
    }

    try {
      // Get microphone stream if voiceover is enabled
      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;

          if (!audioContextRef.current) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioCtx();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          if (!audioDestNodeRef.current) {
            audioDestNodeRef.current = ctx.createMediaStreamDestination();
          }

          const micSource = ctx.createMediaStreamSource(micStream);
          micSourceNodeRef.current = micSource;
          micSource.connect(audioDestNodeRef.current);
        } catch (micErr) {
          console.warn('Microphone access denied or failed:', micErr);
          showToast('Микрофон недоступен!');
        }
      }

      if (!isSourceImage && audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const canvasStream = canvasRef.current.captureStream(fps);
      const audioTracks: MediaStreamTrack[] = [];

      if (!isSourceImage || isMicEnabled) {
        if (audioDestNodeRef.current) {
          const destTracks = audioDestNodeRef.current.stream.getAudioTracks();
          if (destTracks.length > 0) {
            audioTracks.push(destTracks[0]);
          }
        }

        if (audioTracks.length === 0 && videoRef.current && !isSourceImage) {
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
      }

      const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
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
        setErrorMessage('Браузер не поддерживает запись MediaRecorder');
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
          filename: exportFilename,
          aspect: cropAspect
        };

        setRecordedClips((prev) => [newClip, ...prev]);
        downloadBlob(finalBlob, exportFilename);
        showToast(`Сохранено: ${exportFilename}`);
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

      if (!isSourceImage && videoRef.current && videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else if (isSourceImage) {
        setIsPlaying(true);
      }

      showToast('Запись 9:16 видео начата!');
    } catch (err: unknown) {
      console.error('Recording initialization error:', err);
      setErrorMessage(`Ошибка записи: ${err instanceof Error ? err.message : String(err)}`);
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
      if (!isSourceImage && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      showToast('Запись приостановлена');
    } else {
      // RESUME
      if (!isSourceImage && audioContextRef.current && audioContextRef.current.state === 'suspended') {
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

      if (!isSourceImage && videoRef.current) {
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
      } else if (isSourceImage) {
        setIsPlaying(true);
      }
      showToast('Запись возобновлена');
    }
  };

  const stopAndCleanupMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (micSourceNodeRef.current) {
      micSourceNodeRef.current.disconnect();
      micSourceNodeRef.current = null;
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

    if (!isSourceImage && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    stopAndCleanupMic();
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
    stopAndCleanupMic();

    showToast('Запись отменена!');
  };

  // Reset all settings, viewfinder position, zoom, and LERP to default values
  const resetToDefaults = () => {
    if (isRecording) {
      cancelRecording();
    }
    // Unload media file & clear source
    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setVideoName('');
    setIsSourceImage(false);
    setIsVideoLoaded(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    // Reset tracking coordinates and dimensions
    targetPosRef.current = { x: 0.5, y: 0.5 };
    currentPosRef.current = { x: 0.5, y: 0.5 };
    setUiTargetPos({ x: 0.5, y: 0.5 });
    
    // Reset zoom and smoothness (LERP)
    targetZoomRef.current = 1.25;
    currentZoomRef.current = 1.25;
    displayZoomRef.current = 1.25;
    setZoom(1.25);
    setDisplayZoom(1.25);
    setLerpFactor(0.1);

    // Reset format & FPS & Resolution
    setCropAspect('9:16');
    setResolution('1080p');
    setFps(30);

    // Reset options
    setWheelDirection('forward-plus');
    setShowGuides(false);
    setShowSafeZone(false);
    setIsMicEnabled(false);
    stopAndCleanupMic();

    // Clear any recorded clips
    recordedClips.forEach((clip) => URL.revokeObjectURL(clip.url));
    setRecordedClips([]);

    showToast('Сброс всех настроек и медиафайла');
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
    
    let baseCropW = (baseCropH * 9) / 16;
    if (cropAspect === '1:1') {
      baseCropW = baseCropH;
    } else if (cropAspect === '16:9') {
      baseCropW = (baseCropH * 16) / 9;
    }

    let cropW = baseCropW;
    let cropH = baseCropH;

    if (cropW > sw) {
      cropW = sw;
      if (cropAspect === '9:16') {
        cropH = (cropW * 16) / 9;
      } else if (cropAspect === '1:1') {
        cropH = cropW;
      } else if (cropAspect === '16:9') {
        cropH = (cropW * 9) / 16;
      }
    }
    if (cropH > sh) {
      cropH = sh;
      if (cropAspect === '9:16') {
        cropW = (cropH * 9) / 16;
      } else if (cropAspect === '1:1') {
        cropW = cropH;
      } else if (cropAspect === '16:9') {
        cropW = (cropH * 16) / 9;
      }
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

  const previewContainerClass =
    cropAspect === '9:16'
      ? 'w-full h-[46vh] xs:h-[50vh] sm:h-[54vh] max-h-[560px] max-w-[280px] xs:max-w-[320px] sm:max-w-[360px]'
      : cropAspect === '1:1'
      ? 'w-full max-w-[320px] xs:max-w-[360px] sm:max-w-[420px] aspect-square h-auto'
      : 'w-full max-w-full lg:max-w-[560px] aspect-video h-auto';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Navigation Bar (Always visible) */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-2.5">
          <VidVertLogo size="md" />
          <div className="hidden lg:block pl-3 border-l border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">
              {t.headerSubtitle}
            </p>
          </div>
        </div>

        {/* Global Action Tools: 7-Languages Selector + Upload Video Button */}
        <div className="flex items-center gap-2">
          {/* 7-Languages Selector (Small button with Ru label, without globe icon) */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer"
              title="Язык / Language (7 языков)"
            >
              <span className="text-[11px] font-bold text-slate-100">{LANGUAGES.find((l) => l.code === lang)?.label || 'Ru'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 opacity-80 shrink-0" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl z-50 py-1 backdrop-blur-lg animate-in fade-in duration-100">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLang(item.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs flex items-center justify-between text-left transition ${
                      lang === item.code
                        ? 'bg-indigo-600/30 text-indigo-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{item.flag}</span>
                      <span>{item.name}</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            disabled={isRecording}
            onChange={handleFileUpload}
            className="hidden"
          />
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
            {/* Vertical Canvas Frame (Static Dimensions, No Expansion on Recording) */}
            <div
              ref={containerRef}
              onContextMenu={handleCanvasContextMenu}
              style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              className={`relative ${canvasAspectClass} ${previewContainerClass} ${
                isRecording ? 'border-rose-500 shadow-rose-950/50' : 'border-slate-800'
              } rounded-xl overflow-hidden bg-black border-2 shadow-2xl flex items-center justify-center group`}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="w-full h-full object-contain"
              />

              {/* RIGHT-SIDE ACTION BUTTONS (Icon-only: Reset & Save, positioned on the right above 9:16 badge) */}
              <div className="absolute right-2 bottom-8 flex flex-col items-center gap-3.5 z-30">
                {/* MICROPHONE VOICE OVER BUTTON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRecording) {
                      showToast('Нельзя переключить микрофон во время записи!');
                      return;
                    }
                    setIsMicEnabled((prev) => {
                      const next = !prev;
                      showToast(next ? 'Запись голоса ВКЛ (микрофон активируется при старте)' : 'Запись голоса ВЫКЛ');
                      return next;
                    });
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transition active:scale-95 cursor-pointer border ${
                    isMicEnabled
                      ? isRecording
                        ? 'bg-rose-950/80 text-rose-500 border-rose-500 animate-pulse'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500'
                      : 'bg-slate-900/80 text-emerald-500 border-emerald-500/40 hover:text-emerald-400'
                  }`}
                  title={
                    isMicEnabled
                      ? isRecording
                        ? 'Голос записывается (Микрофон активен!)'
                        : 'Голос включен (Готов к записи)'
                      : 'Включить запись голоса (Микрофон выключен)'
                  }
                >
                  <Mic className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t.confirmReset)) {
                      resetToDefaults();
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-amber-500/80 flex items-center justify-center shadow-lg backdrop-blur-sm transition active:scale-95 cursor-pointer"
                  title={t.resetTooltip}
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                </button>

                {(isRecording || recordedClips.length > 0) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRecording) {
                        stopRecordingAndDownload();
                      } else {
                        const clip = recordedClips[0];
                        const ext = clip.blob.type.includes('mp4') ? 'mp4' : 'webm';
                        const exportName = clip.filename || getExportFilename(videoNameRef.current || videoName, ext);
                        downloadBlob(clip.blob, exportName);
                      }
                    }}
                    className="w-8 h-8 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-400/80 flex items-center justify-center shadow-lg backdrop-blur-sm transition active:scale-95 cursor-pointer"
                    title={isRecording ? t.saveTooltip : t.downloadTooltip}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}

                {/* DYNAMIC UPLOAD BUTTON IN CANVAS OVERLAY */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isRecording}
                  className={`w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-indigo-400 border border-indigo-500/40 hover:border-indigo-500 flex items-center justify-center shadow-lg backdrop-blur-sm transition active:scale-95 ${
                    isRecording ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
                  }`}
                  title={t.upload}
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                </button>
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
              {showSafeZone && cropAspect === '9:16' && (
                <div className="absolute inset-0 pointer-events-none pt-[10%] pb-[20%] pl-2 pr-[16%] z-10">
                  <div className="w-full h-full border border-dashed border-amber-400/60 rounded flex flex-col justify-start p-1.5 bg-amber-400/5">
                    <span className="text-[8px] font-mono text-amber-400 font-bold tracking-tight">
                      {t.safeZone}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Center Recording Status Badge (Semi-transparent with backdrop blur) */}
              {(isRecording || isRecordingPaused) && (
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  {isRecording && !isRecordingPaused && (
                    <div className="bg-rose-950/60 border border-rose-500/50 text-white text-[10px] font-bold px-3 py-1 rounded-full font-mono shadow-xl backdrop-blur-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>REC {formatTime(recordingTime)}</span>
                    </div>
                  )}
                  {isRecordingPaused && (
                    <div className="bg-amber-950/60 border border-amber-500/50 text-amber-200 text-[10px] font-bold px-3 py-1 rounded-full font-mono shadow-xl backdrop-blur-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{t.pause} {formatTime(recordingTime)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Zoom HUD Floating Badge */}
              {zoomHudVisible && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 bg-slate-900/90 border border-indigo-500/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white font-mono font-bold text-xs shadow-2xl flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{displayZoom.toFixed(2)}x</span>
                </div>
              )}

              <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-[9px] text-slate-300 px-1.5 py-0.5 rounded font-mono pointer-events-none">
                {cropAspect}
              </div>

              {/* Status Notifications: Displayed at top center of vertical preview */}
              {notification && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-white max-w-[90%] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur">
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
                  {isSourceImage ? (
                    <img
                      ref={imageRef}
                      src={videoSrc}
                      crossOrigin="anonymous"
                      onLoad={handleImageLoaded}
                      alt="Source media"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      crossOrigin="anonymous"
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
                      preload="auto"
                      onError={() => {
                        if (!videoSrc) return; // Ignore errors triggered when video source is cleared/reset
                        const errCode = videoRef.current?.error?.code;
                        const errMsg = videoRef.current?.error?.message;
                        if (errCode || errMsg) {
                          console.error('Video playback error:', errCode, errMsg);
                        }
                        if (errCode === 4) {
                          setErrorMessage('Кодек видео не поддерживается браузером (обычно это HEVC/H.265 или 10-bit HDR с камеры телефона). Браузер поддерживает стандартные MP4 (H.264) и WebM.');
                        } else if (errCode === 3) {
                          setErrorMessage('Ошибка декодирования видео (слишком высокое разрешение или повреждён файл).');
                        } else if (errCode === 1) {
                          return; // Aborted by browser/user, do not treat as error
                        } else {
                          setErrorMessage('Не удалось воспроизвести видеофайл. Пожалуйста, используйте MP4 (H.264).');
                        }
                      }}
                      className="w-full h-full object-contain pointer-events-none"
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

                    {/* CLASSIC RED RECORD / PAUSE CENTRAL BUTTON */}
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
                      style={{
                        transform: `translate(-50%, -50%) scale(${Math.max(0.6, Math.min(1.0, 1 / Math.sqrt(displayZoom)))})`
                      }}
                      className="absolute top-1/2 left-1/2 pointer-events-auto w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/80 border-2 border-emerald-400/90 shadow-2xl backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110 active:scale-90 z-20 cursor-pointer group"
                      title={
                        !isRecording
                          ? 'Старт записи (Клик / Пробел)'
                          : isRecordingPaused
                          ? 'Продолжить запись (Клик / P)'
                          : 'Пауза записи (Клик / P)'
                      }
                    >
                      {!isRecording ? (
                        /* Red Record Dot */
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-600 hover:bg-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.9)] group-hover:scale-105 transition" />
                      ) : isRecordingPaused ? (
                        /* Yellow Pause Icon */
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] transition" />
                      ) : (
                        /* Active Pulsing Red Square */
                        <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm bg-rose-600 shadow-[0_0_14px_rgba(225,29,72,1)] animate-pulse transition" />
                      )}
                    </button>

                    {/* Viewfinder Status Badge */}
                    <div
                      className={`absolute top-1 left-1 text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shadow text-white flex items-center gap-1 pointer-events-none select-none z-20 ${
                        !isRecording
                          ? 'bg-emerald-600/90'
                          : isRecordingPaused
                          ? 'bg-amber-500/90 text-slate-950'
                          : 'bg-rose-600/90'
                      }`}
                    >
                      {!isRecording ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                          <span>{t.ready}</span>
                        </>
                      ) : isRecordingPaused ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                          <span>{t.pause}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>REC {formatTime(recordingTime)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <label className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-600 cursor-pointer overflow-hidden">
                  <Film className="w-10 h-10 stroke-[1.2] mb-1.5 opacity-40 text-slate-400 pointer-events-none" />
                  <p className="text-xs font-medium text-slate-400 pointer-events-none">{t.dropPrompt}</p>
                  <input
                    type="file"
                    accept="video/*,image/*"
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
                  title={isPlaying ? 'Пауза (Пробел / ПКМ)' : 'Воспроизведение (Пробел / ПКМ)'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    if (!videoRef.current) return;
                    videoRef.current.currentTime = 0;
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 shrink-0"
                  title="С начала (Перемотать в 0:00)"
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
                  title={isMuted ? 'Включить звук' : 'Выключить звук'}
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
              <span>{t.toolsToggle}</span>
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
                    <span>{t.wheelDir}:</span>
                    <span className="text-indigo-400 font-mono font-medium">
                      {wheelDirection === 'forward-plus' ? t.forwardPlus : t.forwardMinus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <button
                      onClick={() => {
                        setWheelDirection('forward-plus');
                        showToast(`Колесо: ${t.forwardPlus}`);
                      }}
                      className={`py-1 px-1.5 rounded transition text-center font-medium ${
                        wheelDirection === 'forward-plus'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.forwardPlus}
                    </button>
                    <button
                      onClick={() => {
                        setWheelDirection('forward-minus');
                        showToast(`Колесо: ${t.forwardMinus}`);
                      }}
                      className={`py-1 px-1.5 rounded transition text-center font-medium ${
                        wheelDirection === 'forward-minus'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.forwardMinus}
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
                    { val: 0.04, label: t.lerpSmooth },
                    { val: 0.1, label: t.lerpDefault },
                    { val: 0.2, label: t.lerpFast },
                    { val: 0.35, label: t.lerpSharp }
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
                    {t.resAndGuides}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    onClick={() => setResolution(resolution === '1080p' ? '720p' : '1080p')}
                    className="py-1 px-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-center"
                  >
                    {t.resLabel}: <span className="text-indigo-400 font-bold">{resolution}</span>
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
                    {showGuides ? t.guidesOn : t.guidesOff}
                  </button>
                  <button
                    onClick={() => setShowSafeZone(!showSafeZone)}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition ${
                      showSafeZone
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {showSafeZone ? t.safeZoneOn : t.safeZoneOff}
                  </button>
                </div>

                {/* Aspect Ratio Presets row */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800/60 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Формат / Format:</span>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {[
                      { val: '9:16', label: '9:16 vertical' },
                      { val: '1:1', label: '1:1 square' },
                      { val: '16:9', label: '16:9 wide' }
                    ].map((fmt) => (
                      <button
                        key={fmt.val}
                        onClick={() => {
                          setCropAspect(fmt.val as any);
                          showToast(`Формат: ${fmt.val}`);
                        }}
                        className={`py-1 rounded font-semibold text-center font-mono border transition ${
                          cropAspect === fmt.val
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-800/60 text-slate-400 border-slate-800/80 hover:text-white'
                        }`}
                      >
                        {fmt.val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand signature under settings */}
                <div className="text-center text-[10px] text-indigo-400/80 font-mono font-semibold mt-2.5 pt-2 border-t border-slate-800/60">
                  VidVert by RitmXoid
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
                <span>{t.savedClips} ({recordedClips.length})</span>
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

                  <div className={`relative ${clip.aspect === '1:1' ? 'aspect-square' : clip.aspect === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} max-h-48 rounded-lg overflow-hidden bg-black flex items-center justify-center`}>
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
                    <span>{t.downloadBtn}</span>
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
            <span>{t.howToUse}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t.instructionsText}
          </p>
          <div className="text-right text-[10px] text-indigo-400/80 font-mono font-semibold mt-1">
            VidVert by RitmXoid
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-2.5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <VidVertIcon size={16} />
        <span>VidVert 1.0 — Dynamic Reframe • 100% Offline & Local</span>
      </footer>

      <OfflineBanner />

      {/* First-Start Explanation Dialog Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col gap-4 text-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{t.modalTitle}</h3>
                <p className="text-[11px] text-indigo-400 font-semibold font-mono">VidVert 1.0 — Dynamic Reframe</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
              {t.modalText}
            </p>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-medium">{t.dontShowAgain}</span>
              </label>

              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
              >
                {t.modalOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
