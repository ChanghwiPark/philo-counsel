'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, MessageSquareQuote, ArrowRight, Edit3 } from 'lucide-react';

export interface DilemmaItem {
  id: string;
  category: string;
  question: string;
  stances: {
    label: string;
    icon: string;
    userOpinion: string;
  }[];
}

export const CURATED_DILEMMAS: DilemmaItem[] = [
  {
    id: 'friend-relationship',
    category: '인간관계 · 배려와 선',
    question: '연인이 있는 이성 친구가 많이 힘들어하고 있어요. 제가 위로해줘도 될까요? 이 상황, 어떻게 생각하세요?',
    stances: [
      {
        icon: '💬',
        label: '친구로서 따뜻하게 위로해준다',
        userOpinion: '친구로서 인간적인 위로는 해줄 수 있다고 생각해요.',
      },
      {
        icon: '🛑',
        label: '오해를 피하기 위해 선을 긋는다',
        userOpinion: '상대 연인에 대한 예의와 불필요한 오해를 피하기 위해 선을 긋고 거리를 두어야 한다고 생각해요.',
      },
      {
        icon: '⚖️',
        label: '상대 연인의 감정이 최우선이다',
        userOpinion: '친구와의 관계보다 상대방 연인이 느낄 감정과 신뢰를 지켜주는 것이 먼저라고 생각해요.',
      },
    ],
  },
  {
    id: 'friend-corruption',
    category: '우정과 원칙의 갈등',
    question: '오랜 친구가 부정한 방법으로 승진하려는 것을 알게 되었습니다. 눈감아줘야 할까요, 알려야 할까요?',
    stances: [
      {
        icon: '🤝',
        label: '친구와의 오랜 신의를 지켜 눈감아준다',
        userOpinion: '오랜 친구와의 신의와 인연을 저버릴 수 없으니 이번에는 눈감아주어야 한다고 생각해요.',
      },
      {
        icon: '⚖️',
        label: '공정한 원칙과 동료들을 위해 알린다',
        userOpinion: '다른 동료들의 정당한 노력과 조직의 공정성을 위해 원칙대로 알려야 한다고 생각해요.',
      },
      {
        icon: '🕊️',
        label: '친구를 먼저 설득해 스스로 바로잡게 한다',
        userOpinion: '고발하기 전에 친구를 진심으로 설득하여 스스로 바로잡을 기회를 주어야 한다고 생각해요.',
      },
    ],
  },
  {
    id: 'family-vs-dream',
    category: '가족의 도리 vs 자아실현',
    question: '꿈에 그리던 해외 유학 기회가 왔지만, 홀로 계신 부모님이 편찮으십니다. 떠나야 할까요, 곁을 지켜야 할까요?',
    stances: [
      {
        icon: '🏡',
        label: '부모님 곁을 지키며 도리를 다한다',
        userOpinion: '자식으로서 부모님이 아프실 때 곁을 지키며 효를 다하는 것이 가장 우선이라고 생각해요.',
      },
      {
        icon: '✈️',
        label: '내 미래와 꿈을 위해 유학을 떠난다',
        userOpinion: '다시 오지 않을 내 인생의 성장과 자아실현을 위해 지금은 떠나는 것이 맞다고 생각해요.',
      },
      {
        icon: '🤝',
        label: '돌봄 대안을 마련하고 유학을 떠난다',
        userOpinion: '부모님을 돌봐드릴 현실적 대안을 정성껏 마련해 두고 유학을 떠나는 절충안을 찾아야 한다고 생각해요.',
      },
    ],
  },
  {
    id: 'work-whistleblow',
    category: '조직의 공익 vs 개인의 생계',
    question: '동료의 실수를 제가 덮어주면 팀 전체가 손해를 보고, 밝히면 동료가 해고당합니다. 어떻게 해야 할까요?',
    stances: [
      {
        icon: '🛡️',
        label: '동료의 생계를 위해 함께 감당한다',
        userOpinion: '동료 한 사람의 인생과 생계가 걸려 있으니 팀에서 함께 감싸주고 수습해야 한다고 생각해요.',
      },
      {
        icon: '📢',
        label: '다수의 피해를 막기 위해 밝힌다',
        userOpinion: '침묵해서 팀 전체와 다수가 겪을 더 큰 피해를 막기 위해 투명하게 밝혀야 한다고 생각해요.',
      },
      {
        icon: '💡',
        label: '손해를 메울 차선책을 함께 찾는다',
        userOpinion: '동료를 고발하기보다 손해를 함께 메울 수 있는 현실적인 차선책을 찾는 것이 먼저라고 생각해요.',
      },
    ],
  },
];

interface ProactiveDilemmaNudgeProps {
  onSelectPrompt: (promptText: string) => void;
  onPrefillInput: (prefill: string) => void;
}

export function ProactiveDilemmaNudge({
  onSelectPrompt,
  onPrefillInput,
}: ProactiveDilemmaNudgeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentDilemma = CURATED_DILEMMAS[currentIndex];

  const handleNextDilemma = () => {
    setCurrentIndex((prev) => (prev + 1) % CURATED_DILEMMAS.length);
  };

  const handleReactWithStance = (userOpinion: string) => {
    const fullText = `${currentDilemma.question}\n\n[나의 생각]: "${userOpinion}"\n사상가분들은 이 상황과 저의 생각에 대해 어떻게 보시나요?`;
    onSelectPrompt(fullText);
  };

  const handleAskDirectly = () => {
    onSelectPrompt(currentDilemma.question);
  };

  const handleCustomInput = () => {
    onPrefillInput(`${currentDilemma.question} - 제 생각에는 `);
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-indigo-50/70 via-white to-white border border-indigo-100/90 p-5 sm:p-6 shadow-sm space-y-4 text-left transition-all">
      {/* Top Meta Bar: Proactive Nudge Tag + Shuffle Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold shadow-2xs">
            <Sparkles size={11} />
            <span>사상가들의 선제적 질문</span>
          </span>
          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
            · {currentDilemma.category}
          </span>
        </div>

        <button
          onClick={handleNextDilemma}
          type="button"
          className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50/80 transition-colors cursor-pointer"
          title="다른 딜레마 질문 보기"
        >
          <RefreshCw size={12} />
          <span>다른 딜레마</span>
        </button>
      </div>

      {/* Dilemma Question Box */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <MessageSquareQuote size={20} className="text-indigo-600 shrink-0 mt-0.5" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug tracking-tight">
            &ldquo;{currentDilemma.question}&rdquo;
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 pl-7">
          이 딜레마에 대해 당신의 첫 번째 생각은 무엇인가요? 사상가들과 바로 토론을 시작해보세요.
        </p>
      </div>

      {/* Instant 1-Click Stance Reactions */}
      <div className="space-y-2 pt-1 pl-0 sm:pl-7">
        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <span>당신의 입장 선택하기:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {currentDilemma.stances.map((stance, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleReactWithStance(stance.userOpinion)}
              className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-indigo-50/70 hover:border-indigo-300 text-xs text-left text-slate-800 transition-all flex flex-col justify-between gap-1 shadow-2xs hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm shrink-0">{stance.icon}</span>
                <span className="font-semibold text-slate-900 group-hover:text-indigo-900 leading-snug">
                  {stance.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5 mt-0.5">
                <span>이 생각으로 토론 시작</span>
                <ArrowRight size={10} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Actions: Custom text or Ask Philosophers Directly */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 pl-0 sm:pl-7 text-[11px]">
        <button
          onClick={handleCustomInput}
          type="button"
          className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors cursor-pointer py-1"
        >
          <Edit3 size={12} />
          <span>직접 내 생각 작성해서 답하기</span>
        </button>

        <button
          onClick={handleAskDirectly}
          type="button"
          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer py-1"
        >
          <span>사상가들의 의견부터 먼저 듣기 &rarr;</span>
        </button>
      </div>
    </div>
  );
}
