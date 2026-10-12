'use client';

import React, { useState } from 'react';
import { ConvenedCouncil, AgentMeta } from '@/lib/types';
import { Sparkles, Eye, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface CouncilBannerProps {
  council: ConvenedCouncil;
}

export function CouncilBanner({ council }: CouncilBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentMeta | null>(null);

  // Automatically expand when a new council theme is convened
  const [prevTheme, setPrevTheme] = useState(council?.coreDilemmaTheme);
  if (council?.coreDilemmaTheme !== prevTheme) {
    setPrevTheme(council?.coreDilemmaTheme);
    setIsExpanded(true);
  }

  if (!council || !council.agents || council.agents.length === 0) return null;

  return (
    <div
      className={`mb-6 rounded-2xl border transition-all duration-300 overflow-hidden ${
        isExpanded
          ? 'bg-white border-slate-200/90 shadow-2xs'
          : 'bg-slate-100/50 border-slate-200/70 hover:border-slate-300/80 shadow-none'
      }`}
    >
      {/* Top Banner Bar (Clickable header to toggle) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-300 cursor-pointer select-none ${
          isExpanded
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white'
            : 'bg-slate-100/80 hover:bg-slate-200/60 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-2xs shrink-0 transition-colors duration-300 ${
              isExpanded
                ? 'bg-white/10 text-white'
                : 'bg-white border border-slate-200/80 text-slate-700'
            }`}
          >
            🏛️
          </div>
          <div className="min-w-0">
            <h3
              className={`text-xs sm:text-sm font-bold tracking-tight transition-colors duration-300 ${
                isExpanded ? 'text-white' : 'text-slate-800'
              }`}
            >
              소집된 가치관 원탁
            </h3>
            {council.coreDilemmaTheme && (
              <p
                className={`text-[11px] font-normal truncate max-w-[200px] sm:max-w-md transition-colors duration-300 ${
                  isExpanded ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                쟁점: {council.coreDilemmaTheme}
              </p>
            )}
          </div>
        </div>

        {/* Toggle details button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? '가치관 원탁 간략히 접기' : '가치관 원탁 상세보기 펼치기'}
          className={`relative z-10 text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
            isExpanded
              ? 'text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs'
          }`}
        >
          <span>{isExpanded ? '간략히' : '상세보기'}</span>
          {isExpanded ? (
            <ChevronUp size={13} className="text-slate-300" />
          ) : (
            <ChevronDown size={13} className="text-slate-500" />
          )}
        </button>
      </div>

      {/* Collapsible Content Area */}
      {isExpanded && (
        <div className="animate-fade-in border-t border-slate-100">
          {/* Convened Agents Chips Row */}
          <div className="p-2.5 sm:p-4 bg-slate-50/50 border-b border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5">
              {council.agents.map((agent) => {
                const isBlindSpot = council.blindSpotAgentIds.includes(agent.id);
                const isSelected = selectedAgent?.id === agent.id;

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgent(isSelected ? null : agent)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-white border-indigo-400 ring-2 ring-indigo-100 shadow-xs'
                        : isBlindSpot
                        ? 'bg-amber-50/40 border-amber-200/90 hover:bg-white hover:border-amber-300'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Blind spot badge */}
                    {isBlindSpot && (
                      <span className="absolute -top-1.5 right-1.5 px-1 sm:px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[8.5px] sm:text-[9px] font-bold shadow-2xs flex items-center gap-0.5">
                        <Sparkles size={8} />
                        <span>사각지대 보완</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${agent.avatarBg} border flex items-center justify-center text-xs sm:text-sm shrink-0 shadow-2xs`}
                      >
                        {agent.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-[11.5px] sm:text-xs truncate">
                          {agent.name}
                        </div>
                        <div className="text-[9.5px] sm:text-[10px] text-slate-500 truncate font-medium">
                          {agent.stance}
                        </div>
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] sm:text-[10px] text-slate-400 truncate flex items-center gap-1">
                      <BookOpen size={10} className="shrink-0 text-slate-400" />
                      <span className="truncate">{agent.keyWork}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Agent Quick Detail (Pop-down) */}
          {selectedAgent && (
            <div className="px-4 py-3 bg-white border-b border-indigo-100 text-xs animate-fade-in flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-base shrink-0">
                {selectedAgent.icon}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{selectedAgent.koreanTitle}</span>
                  {council.blindSpotAgentIds.includes(selectedAgent.id) && (
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800">
                      사각지대 보완 사상가
                    </span>
                  )}
                </div>
                <p className="text-slate-600 leading-relaxed font-normal text-[11.5px]">
                  {selectedAgent.summary}
                </p>
                <div className="text-[11px] text-indigo-600 font-medium">
                  대표 원전: {selectedAgent.keyWork}
                </div>
              </div>
            </div>
          )}

          {/* Blind Spot Insight Callout Bar */}
          <div className="p-3 sm:p-4 bg-white flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-100/80 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Eye size={13} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <span>사각지대 조명</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (본 딜레마에서 간과하기 쉬운 관점)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {council.blindSpotInsight}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
