import React, { useState } from 'react';
import { X, Smartphone, Download, Terminal, Check, Copy, ShieldCheck } from 'lucide-react';

interface ApkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkGuideModal: React.FC<ApkGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyCommand = (cmd: string, stepIndex: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0e1017] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Android APK & Capacitor Build</h2>
              <p className="text-[11px] text-zinc-400">Generate Release / Debug APK for Android Devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-zinc-300">
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-zinc-900 border border-emerald-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-5 h-5" />
                <span>APK Ready for Android Download!</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Generated successfully in project folder (<code className="font-mono text-emerald-300">/public/battle-esports-tournament.apk</code>)
              </p>
            </div>
            <a
              href="/battle-esports-tournament.apk"
              download="battle-esports-tournament.apk"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all text-xs shrink-0"
            >
              <Download className="w-4 h-4 animate-bounce" />
              Download APK
            </a>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="font-bold text-white block">App Package Metadata</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] mt-1 text-zinc-400">
              <div>App Name: <strong className="text-white">BATTLE ESPORTS TOURNAMENT</strong></div>
              <div>Package ID: <strong className="text-emerald-400">com.battleesports.tournament</strong></div>
              <div>Target OS: <strong className="text-white">Android 8.0+ (API 26+)</strong></div>
              <div>Framework: <strong className="text-white">React + Capacitor Wrapper</strong></div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-zinc-400 leading-relaxed">
              You can download the APK file directly using the button above, or follow these steps for local compilation:
            </p>

            {/* Step 1 */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">1. Install Capacitor in your cloned project</span>
                <button
                  onClick={() => copyCommand('npm install @capacitor/core @capacitor/cli @capacitor/android && npx cap init "BATTLE ESPORTS TOURNAMENT" com.battleesports.tournament', 1)}
                  className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copiedStep === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="p-2 rounded bg-black/60 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                npm install @capacitor/core @capacitor/cli @capacitor/android && npx cap init "BATTLE ESPORTS TOURNAMENT" com.battleesports.tournament
              </pre>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">2. Build web assets & add Android platform</span>
                <button
                  onClick={() => copyCommand('npm run build && npx cap add android && npx cap sync android', 2)}
                  className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copiedStep === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="p-2 rounded bg-black/60 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                npm run build && npx cap add android && npx cap sync android
              </pre>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">3. Compile Debug APK</span>
                <button
                  onClick={() => copyCommand('cd android && ./gradlew assembleDebug', 3)}
                  className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copiedStep === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <pre className="p-2 rounded bg-black/60 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                cd android && ./gradlew assembleDebug
              </pre>
              <p className="text-[10px] text-zinc-500 mt-1">
                Your generated APK will be at: <code className="text-zinc-400 font-mono">android/app/build/outputs/apk/debug/app-debug.apk</code>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/30 flex items-center gap-2 text-emerald-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>PWA support is active: Mobile users can also tap "Add to Home Screen" on Chrome / Android for instant standalone app launch!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
