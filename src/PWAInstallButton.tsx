import React, { useState } from 'react';
import { Download, MonitorCheck, HelpCircle, X, WifiOff, Laptop } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already installed, show a subtle badge indicating offline readiness
  if (isInstalled) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium"
        title="Приложение установлено и работает 100% автономно без интернета"
      >
        <MonitorCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Офлайн-приложение готово</span>
        <span className="sm:hidden">Офлайн OK</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isInstallable ? (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition group"
            title="Установить как программу на компьютер для работы без интернета"
          >
            <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            <span>Установить на ПК</span>
          </button>
        ) : (
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition"
            title="Как использовать это приложение офлайн на компьютере"
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Работа оффлайн</span>
            <span className="sm:hidden">Оффлайн</span>
          </button>
        )}
      </div>

      {/* Offline & Desktop Installation Modal Guide */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Laptop className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-white">Работа офлайн на компьютере</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex gap-2.5 items-start">
                <span className="text-base">🚀</span>
                <div>
                  <strong className="text-white block font-medium">100% локальная обработка</strong>
                  Все видео обрабатываются прямо в браузере с помощью встроенных технологий (Canvas, MediaRecorder, Web Audio). Видео никуда не отправляется в интернет!
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-white">Как сохранить и открывать без интернета:</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong>В Chrome / Edge / Яндекс.Браузере:</strong> нажмите значок <strong>«Установить»</strong> (компьютер со стрелкой) в правой части адресной строки браузера.
                  </li>
                  <li>
                    Либо нажмите меню браузера (<strong>три точки ⋮</strong>) → <strong>«Сохранить и поделиться»</strong> → <strong>«Установить страницу как приложение»</strong>.
                  </li>
                  <li>
                    На рабочем столе появится ярлык. Приложение открывается в отдельном чистом окне и <strong>работает даже при полностью отключенном интернете</strong>!
                  </li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-2.5 rounded-lg bg-slate-800/80 text-xs">
                  <strong>На iPhone / iPad:</strong> Нажмите «Поделиться» (Share) в Safari → «На экран Домой».
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition"
            >
              Понятно, закрыть
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 border border-amber-400 text-slate-950 px-3.5 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200">
      <WifiOff className="w-4 h-4 text-slate-950" />
      <span>Офлайн-режим: видеоредактор работает автономно</span>
    </div>
  );
};
