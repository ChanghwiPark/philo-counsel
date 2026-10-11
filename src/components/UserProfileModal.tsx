'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ThumbsUp,
  BookOpen,
  Award,
  Compass,
  Trash2,
  LogIn,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { LikedAdvice, ValueSystemAnalysis, analyzeUserValueSystem, PHILOSOPHY_VISUALS } from '@/lib/valueSystem';
import { RecommendedClassicCard } from './RecommendedClassicCard';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  reactions: LikedAdvice[];
  onRemoveLike: (messageId: string) => void;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  reactions,
  onRemoveLike,
  onOpenAuthModal,
  onLogout,
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'bookmarks'>('analysis');

  if (!isOpen) return null;

  const hasReactions = reactions.length > 0;
  const analysis: ValueSystemAnalysis = analyzeUserValueSystem(reactions);
  const activeDistribution = [...analysis.distribution]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const userNameTag = currentUser ? `${currentUser.name}님` : '고민자님';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              {currentUser ? currentUser.name.slice(0, 1) : '나'}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
                {currentUser ? `${currentUser.name}님의 철학 가치관` : '나의 철학 가치관 프로필'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {currentUser ? currentUser.email : '사상가 조언 공감 기반 가치 체계 분석'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation (Only visible when user has at least 1 reaction) */}
        {hasReactions && (
          <div className="flex border-b border-slate-100 px-5 bg-white text-xs font-semibold">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'analysis'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Compass size={14} />
              <span>가치관 분석 리포트</span>
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ThumbsUp size={14} />
              <span>공감한 조언 모음</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {reactions.length}
              </span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {!hasReactions ? (
            /* Simple, Minimal Guide Text when 0 likes exist */
            <div className="py-12 sm:py-16 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
                <ThumbsUp size={24} className="stroke-[1.75]" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-slate-800">
                  아직 공감한 조언이 없습니다
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  사상가들의 조언 중 마음에 와닿는 답변에{' '}
                  <span className="font-semibold text-slate-700">👍 공감</span>을 남겨보세요.
                  <br />
                  공감하신 조언들을 바탕으로 {userNameTag}의 고유한 철학 가치관을 분석해 드립니다.
                </p>
              </div>

              {!currentUser && (
                <div className="pt-2">
                  <p className="text-[11px] text-slate-400">
                    ※ 로그인하시면 지난 상담 기록과 가치관 프로필이 안전하게 보관됩니다.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="mt-3 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <LogIn size={13} />
                    <span>로그인 / 회원가입</span>
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'analysis' ? (
            /* Full Value System Analysis Report */
            <div className="space-y-6">
              {/* Archetype Hero Card: Crisp, High-Contrast, Zero Background Watermark Clutter */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 text-white p-5 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">{analysis.archetypeIcon}</span>
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                      철학적 가치관 아키타입
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {analysis.archetypeTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-indigo-200/90 mt-1 font-medium">
                      {analysis.archetypeSubtitle}
                    </p>
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pt-1 font-normal">
                    {analysis.description}
                  </p>
                </div>
              </div>

              {/* Section 1: Value Distribution Breakdown */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Award size={14} className="text-slate-500" />
                    <span>공감도 분포</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/80">
                    총 {reactions.length}건 공감
                  </span>
                </div>

                {/* Multi-segment Progress Bar with filled vibrant colors */}
                <div className="h-9 sm:h-10 w-full bg-slate-100 rounded-xl p-1 flex gap-1 shadow-inner border border-slate-200/90 overflow-hidden">
                  {activeDistribution.map((item) => {
                    const pct = Math.round((item.count / analysis.totalLikes) * 100);
                    const widthPct = (item.count / analysis.totalLikes) * 100;
                    const bgStyle =
                      item.gradientStyle ||
                      PHILOSOPHY_VISUALS[item.agentId]?.gradientStyle ||
                      item.color ||
                      '#475569';

                    return (
                      <div
                        key={item.agentId}
                        style={{
                          flex: `${item.count} 1 0%`,
                          background: bgStyle,
                        }}
                        className="h-full rounded-lg transition-all duration-500 flex items-center justify-center px-1.5 overflow-hidden text-white shadow-2xs group relative select-none"
                        title={`${item.name}: ${pct}% (${item.count}회 공감)`}
                      >
                        {widthPct >= 18 ? (
                          <span className="text-xs font-bold whitespace-nowrap truncate drop-shadow-xs flex items-center gap-1">
                            <span>{item.icon}</span>
                            <span>{item.name}</span>
                            <span className="opacity-95 text-[11px] font-semibold">{pct}%</span>
                          </span>
                        ) : widthPct >= 8 ? (
                          <span className="text-[11px] font-bold whitespace-nowrap drop-shadow-xs flex items-center gap-0.5">
                            <span>{item.icon}</span>
                            <span>{pct}%</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold whitespace-nowrap drop-shadow-xs">
                            {item.icon}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanatory Cards Grid: Icon + Name + One-line Core Stance */}
                <div
                  className={`grid gap-2 pt-0.5 ${
                    activeDistribution.length === 1
                      ? 'grid-cols-1'
                      : 'grid-cols-1 sm:grid-cols-2'
                  }`}
                >
                  {activeDistribution.map((item) => (
                    <div
                      key={item.agentId}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/70 transition-all flex items-center gap-2.5 shadow-2xs group"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 shadow-2xs transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${item.color}15`,
                          border: `1px solid ${item.color}35`,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-[13px] text-slate-900 shrink-0">
                          {item.name}
                        </span>
                        <span className="text-slate-300 text-xs select-none shrink-0">—</span>
                        <span className="text-[11px] sm:text-xs text-slate-600 truncate font-medium">
                          {item.stance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Decision Making Compass Narrative */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass size={14} className="text-slate-500" />
                  <span>선택의 기로에서 {userNameTag}을 이끄는 나침반</span>
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                    {analysis.decisionStyleSummary}
                  </p>
                </div>
              </div>

              {/* Section 3: Recommended Readings based on values (Componentized) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-slate-500" />
                  <span>내 가치관을 더 깊이 탐구할 추천 고전</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {analysis.recommendedReadings.map((reading, idx) => (
                    <RecommendedClassicCard
                      key={idx}
                      book={reading.book}
                      author={reading.author}
                      coreIdea={reading.coreIdea}
                    />
                  ))}
                </div>
              </div>

              {/* Guest Callout Banner if not logged in */}
              {!currentUser && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold">💡 게스트 모드로 분석 중입니다</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      로그인하시면 공감 내역과 가치관 프로필이 영구 보관됩니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <LogIn size={13} />
                    <span>로그인/가입</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Bookmarked Advices List Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-800">
                  내가 공감한 사상가들의 조언 ({reactions.length}건)
                </span>
                <span className="text-[11px] text-slate-400">
                  공감한 조언은 프로필 가치관 분석에 즉시 반영됩니다
                </span>
              </div>

              <div className="space-y-3">
                {reactions.map((advice) => (
                  <div
                    key={advice.messageId}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all shadow-2xs relative group space-y-2.5"
                  >
                    {/* Top Meta row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {advice.agentName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          {advice.agentStance}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {advice.likedAt}
                        </span>
                        <button
                          onClick={() => onRemoveLike(advice.messageId)}
                          className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="공감 취소"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {advice.content}
                    </p>

                    {/* Citation quote if exists */}
                    {(advice.citationSource || advice.citationQuote) && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-0.5">
                        {advice.citationSource && (
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <BookOpen size={11} className="text-indigo-600" />
                            <span>{advice.citationSource}</span>
                          </div>
                        )}
                        {advice.citationQuote && (
                          <p className="text-slate-500 italic pl-3 border-l-2 border-slate-300">
                            &ldquo;{advice.citationQuote}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (onLogout) {
                onLogout();
              }
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-600 hover:text-slate-800 text-xs font-semibold transition-colors border border-slate-200/80 cursor-pointer shadow-2xs"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
