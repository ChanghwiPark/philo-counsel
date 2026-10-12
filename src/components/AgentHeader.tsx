'use client';

import React from 'react';
import { History, LogIn, Sparkles } from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface AgentHeaderProps {
  onOpenHistory: () => void;
  onOpenAuthModal: () => void;
  onOpenProfile: () => void;
  onGoHome?: () => void;
  currentUser: UserProfile | null;
  userArchetype?: string;
  userArchetypeIcon?: string;
}

export function AgentHeader({
  onOpenHistory,
  onOpenAuthModal,
  onOpenProfile,
  onGoHome,
  currentUser,
  userArchetype,
  userArchetypeIcon,
}: AgentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-2.5 sm:px-4 py-2 sm:py-3 shadow-xs">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Clickable Logo & Title to go Home */}
        <button
          onClick={onGoHome}
          type="button"
          className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer select-none transition-all hover:opacity-90 shrink-0"
          title="홈으로 이동 (새 상담 시작)"
        >
          {/* 4 Pillars of Philosophy (Agora) Logo Mark */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 p-0.5 shadow-sm flex items-center justify-center shrink-0 group-hover:shadow-md group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-white rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-indigo-600 shadow-2xs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"
              >
                <path d="M3 20h18" />
                <path d="M4 17h16" />
                {/* 4 Pillars: Buddhist, Kantian, Confucian, Utilitarian */}
                <path d="M6 17V8" />
                <path d="M10 17V8" />
                <path d="M14 17V8" />
                <path d="M18 17V8" />
                {/* Pediment roof */}
                <path d="M2 7l10-4 10 4" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm sm:text-base md:text-lg tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">
              철학 상담소
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              고민마다 맞춤 소집되는 사상가 원탁 대화
            </p>
          </div>
        </button>

        {/* Right: History Button + Consolidated Profile & Auth */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* History drawer button placed to the left of the Profile button */}
          <button
            onClick={onOpenHistory}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-2xs flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="상담 기록 보기"
          >
            <History size={15} className="text-slate-600" />
            <span className="text-xs font-medium hidden sm:inline">기록</span>
          </button>

          {currentUser ? (
            /* Logged-in: Displays profile name and their analyzed philosophical type */
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 transition-all shadow-2xs hover:border-indigo-300 cursor-pointer group"
              title="가치관 프로필 및 내 정보 보기"
            >
              <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {currentUser.name.slice(0, 1)}
              </div>
              <span className="font-semibold truncate max-w-[60px] sm:max-w-[100px]">
                {currentUser.name}님
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 truncate max-w-[130px] sm:max-w-[200px] hidden sm:flex items-center gap-1">
                {userArchetypeIcon && <span>{userArchetypeIcon}</span>}
                <span>{userArchetype || '가치관 탐색가'}</span>
              </span>
            </button>
          ) : (
            /* Guest / Logged-out: Value profile & Login buttons */
            <>
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs cursor-pointer"
                title="나의 철학 가치관 분석 보기"
              >
                <span>{userArchetypeIcon || '🧭'}</span>
                <span className="truncate max-w-[120px] sm:max-w-[180px] hidden xs:inline sm:inline">
                  {userArchetype || '가치관'}
                </span>
                <span className="xs:hidden sm:hidden text-xs">가치관</span>
              </button>

              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs cursor-pointer"
              >
                <LogIn size={13} />
                <span>로그인</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
