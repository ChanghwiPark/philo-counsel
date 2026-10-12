'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';

export interface GeneratedDilemma {
  category: string;
  question: string;
  stances: {
    label: string;
    userOpinion: string;
  }[];
}

interface ProactiveDilemmaPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDilemma: (synthesizedPrompt: string) => void;
  customApiKey?: string;
  initialExcludeQuestions?: string[];
}

export function ProactiveDilemmaPopup({
  isOpen,
  onClose,
  onSelectDilemma,
  customApiKey,
  initialExcludeQuestions,
}: ProactiveDilemmaPopupProps) {
  const [dilemma, setDilemma] = useState<GeneratedDilemma | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentQuestions, setRecentQuestions] = useState<string[]>(
    () => initialExcludeQuestions || []
  );

  // Fetch AI generated dilemma whenever opened (if not yet loaded)
  useEffect(() => {
    if (isOpen && !dilemma && !isLoading) {
      fetchNewDilemma();
    }
  }, [isOpen]);

  const fetchNewDilemma = async () => {
    try {
      setIsLoading(true);

      // Collect recent 3~5 questions including the current dilemma
      const currentList =
        dilemma?.question && !recentQuestions.includes(dilemma.question)
          ? [...recentQuestions, dilemma.question]
          : recentQuestions;
      const excludeList = currentList.slice(-5);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_dilemma',
          apiKey: customApiKey,
          excludeQuestions: excludeList,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.dilemma) {
          setDilemma(data.dilemma);
          if (data.dilemma.question) {
            setRecentQuestions((prev) => {
              const updated = prev.includes(data.dilemma.question)
                ? prev
                : [...prev, data.dilemma.question];
              return updated.slice(-5);
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate dilemma:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to prevent meaningless meta labels like "첫 번째 입장", "두 번째 입장"
  const formatStanceLabel = (label: string, userOpinion: string, idx: number) => {
    const trimmed = label ? label.trim() : '';
    if (
      !trimmed ||
      /^(첫\s*번째|두\s*번째|첫번째|두번째|입장\s*[12]|선택\s*[12])/i.test(trimmed) ||
      trimmed.includes('첫 번째') ||
      trimmed.includes('두 번째')
    ) {
      if (userOpinion && userOpinion.length > 0) {
        return userOpinion.replace(/^["']|["']$/g, '').slice(0, 22);
      }
      return idx === 0 ? '적극적으로 지지하고 돕는다' : '신중하게 거리를 두고 지켜본다';
    }
    return trimmed;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Soft backdrop scrim: dims the page text so the nudge card has 100% crisp contrast */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* 100% Solid Pure White Bottom Slide-up Nudge Card */}
      <div className="fixed bottom-3 sm:bottom-6 pb-safe left-1/2 -translate-x-1/2 w-[94vw] max-w-lg z-50 animate-slide-up-nudge">
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-300 p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 transition-all">
          {/* Simple top row: Gentle Nudge Label & Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Sparkles size={13} className="text-indigo-600" />
              <span>이 상황, 어떻게 생각하세요?</span>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>

          {/* AI Dilemma Content Area */}
          {isLoading ? (
            <div className="py-7 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span className="text-xs font-medium">새로운 딜레마 질문을 생각하는 중...</span>
            </div>
          ) : dilemma ? (
            <div className="space-y-3">
              {/* Dilemma Question Box (Solid white/light tint, zero bleed-through) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-slate-900 font-semibold text-xs sm:text-sm leading-relaxed">
                &ldquo;{dilemma.question}&rdquo;
              </div>

              {/* Meaningful 2 Stance Choice Buttons */}
              {dilemma.stances && dilemma.stances.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dilemma.stances.slice(0, 2).map((st, idx) => {
                    const displayLabel = formatStanceLabel(st.label, st.userOpinion, idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const promptText = `${dilemma.question}\n\n제 생각에는 ${st.userOpinion}`;
                          onClose();
                          onSelectDilemma(promptText);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50/80 hover:border-indigo-300 text-xs font-semibold text-slate-800 transition-all flex items-center justify-between group shadow-2xs cursor-pointer text-left"
                      >
                        <span className="leading-snug truncate">{displayLabel}</span>
                        <ArrowRight size={11} className="text-slate-300 group-hover:text-indigo-600 shrink-0 ml-1" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Direct Debate Start Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectDilemma(dilemma.question);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>대화 바로 시작하기</span>
                <ArrowRight size={12} />
              </button>
            </div>
          ) : null}

          {/* Footer: Refresh with AI + Dismiss */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
            <button
              onClick={fetchNewDilemma}
              disabled={isLoading}
              type="button"
              className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="다른 질문 생성"
            >
              <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
              <span>다른 질문 받기</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
