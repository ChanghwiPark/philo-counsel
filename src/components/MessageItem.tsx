'use client';

import React, { useState, useRef } from 'react';
import { AgentId } from '@/lib/types';
import { AGENTS, getAgentMeta, canonicalAgentId, normalizeAgentKoreanName, normalizeKoreanMentions } from '@/lib/agents';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  CornerDownRight,
  ExternalLink,
  ThumbsUp,
} from 'lucide-react';

export interface DisplayMessage {
  id: string;
  sender: 'user' | AgentId;
  content: string;
  citationSource?: string;
  citationQuote?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  replyToAgentName?: string;
  timestamp: string;
  isLiked?: boolean;
  isCheckin?: boolean;
  reactThought?: string;
  reactSearch?: string;
  reactRead?: string;
  replyTargetMessageId?: string;
  replyTargetAgentId?: AgentId;
  replyTargetAgentName?: string;
  replyTargetSnippet?: string;
  targetAgentId?: AgentId;
  actionScenario?: string;
  debateRound?: number;
  debateConclusionType?: 'consensus' | 'irreconcilable' | 'divergence';
  debateConclusionSummary?: string;
  isProbingQuestion?: boolean;
}

export interface UserReplyContext {
  targetMessageId?: string;
  targetAgentId: AgentId;
  targetAgentName: string;
  targetSnippet?: string;
  targetContent?: string;
}

interface ParsedReAct {
  hasReAct: boolean;
  thought?: string;
  search?: string;
  read?: string;
  advice: string;
}

export function parseReActContent(
  text: string,
  msgThought?: string,
  msgSearch?: string,
  msgRead?: string
): ParsedReAct {
  if (msgThought || msgSearch || msgRead) {
    return {
      hasReAct: true,
      thought: msgThought,
      search: msgSearch,
      read: msgRead,
      advice: text,
    };
  }

  const thoughtMatch = text.match(/(?:###\s*\[?생각(?:.*?\])?|\[생각(?:\s*\(.*?\))?\])([\s\S]*?)(?=(?:###\s*\[?검색|\[검색|###\s*\[?읽기|\[읽기|###\s*\[?답변|\[답변|$))/i);
  const searchMatch = text.match(/(?:###\s*\[?검색(?:.*?\])?|\[검색(?:\s*\(.*?\))?\])([\s\S]*?)(?=(?:###\s*\[?읽기|\[읽기|###\s*\[?답변|\[답변|$))/i);
  const readMatch = text.match(/(?:###\s*\[?읽기(?:.*?\])?|\[읽기(?:\s*\(.*?\))?\])([\s\S]*?)(?=(?:###\s*\[?답변|\[답변|$))/i);
  const adviceMatch = text.match(/(?:###\s*\[?(?:답변|조언)(?:.*?\])?|\[(?:답변|조언)(?:\s*\(.*?\))?\])([\s\S]*)/i);

  if (thoughtMatch || searchMatch || readMatch) {
    const thought = thoughtMatch ? thoughtMatch[1].trim() : '';
    const search = searchMatch ? searchMatch[1].trim() : '';
    const read = readMatch ? readMatch[1].trim() : '';
    let advice = adviceMatch ? adviceMatch[1].trim() : '';
    if (!advice) {
      advice = text
        .replace(/(?:###\s*\[?생각(?:.*?\])?|\[생각(?:\s*\(.*?\))?\])[\s\S]*?(?=(?:###\s*\[?검색|\[검색|###\s*\[?읽기|\[읽기|###\s*\[?답변|\[답변|$))/gi, '')
        .replace(/(?:###\s*\[?검색(?:.*?\])?|\[검색(?:\s*\(.*?\))?\])[\s\S]*?(?=(?:###\s*\[?읽기|\[읽기|###\s*\[?답변|\[답변|$))/gi, '')
        .replace(/(?:###\s*\[?읽기(?:.*?\])?|\[읽기(?:\s*\(.*?\))?\])[\s\S]*?(?=(?:###\s*\[?답변|\[답변|$))/gi, '')
        .trim();
    }
    return {
      hasReAct: true,
      thought,
      search,
      read,
      advice: advice || text,
    };
  }
  return { hasReAct: false, advice: text };
}

export function extractTargetName(
  replyToAgentName?: string | null,
  rawContent?: string,
  userName: string = '고민자'
): string | undefined {
  let effectiveTargetName = normalizeAgentKoreanName(replyToAgentName);
  if (!effectiveTargetName && rawContent) {
    const allTraditionsPattern =
      '기독교|불교|힌두 철학|힌두철학|힌두|이슬람|유가|유교|공리주의|자유주의|마르크스주의|마르크스|유물론|도가|노자|장자|합리주의|칸트|데카르트|스토아|실존주의|사르트르|니체';
    const startAgentMentionRegex = new RegExp(
      `^@(${allTraditionsPattern})(님)?\\s*[,:]?\\s*|^(${allTraditionsPattern})님\\s*[,:]\\s*`,
      'i'
    );
    const escapedUserName = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startUserMentionRegex = new RegExp(`^@(${escapedUserName}|고민자)(님)?\\s*[,:]?\\s*`, 'i');

    const startMatch = rawContent.match(startAgentMentionRegex);
    if (startMatch) {
      effectiveTargetName = normalizeAgentKoreanName(startMatch[1] || startMatch[3]);
    } else {
      const userMatch = rawContent.match(startUserMentionRegex);
      if (userMatch) {
        effectiveTargetName = userName !== '고민자' ? userName : '고민자';
      }
    }
  } else if (
    effectiveTargetName === '고민자' ||
    effectiveTargetName === userName ||
    effectiveTargetName === '상담자'
  ) {
    effectiveTargetName = userName !== '고민자' ? userName : '고민자';
  }
  return effectiveTargetName;
}

export function getCleanDialogueSnippet(rawContent: string, maxLength: number = 36): string {
  if (!rawContent) return '';
  const parsed = parseReActContent(rawContent);
  let text = parsed.advice || rawContent;

  // Strip leading explicit mentions like "@칸트님, " or "@고민자님, " without touching regular subjects
  text = text.replace(
    /^@([가-힣a-zA-Z\s]+)(님)?\s*[,:]?\s*|^([가-힣a-zA-Z\s]+)님\s*[,:]\s*/,
    ''
  );

  // Collapse whitespace
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength) + '...';
}

interface MessageItemProps {
  message: DisplayMessage;
  showAvatar?: boolean;
  previousSender?: 'user' | AgentId;
  replySnippet?: string;
  replyTargetId?: string;
  onNavigateToMessage?: (id: string) => void;
  onSelectReplyTarget?: (context: UserReplyContext) => void;
  isLiked?: boolean;
  onToggleLike?: (message: DisplayMessage) => void;
  userName?: string;
  isReplyingToThis?: boolean;
}

export function MessageItem({
  message,
  showAvatar = true,
  previousSender,
  replySnippet,
  replyTargetId,
  onNavigateToMessage,
  onSelectReplyTarget,
  isLiked = false,
  onToggleLike,
  userName = '고민자',
  isReplyingToThis = false,
}: MessageItemProps) {
  // 1. User Message (Right-aligned, 24px horizontal padding)
  if (message.sender === 'user') {
    return (
      <div className="flex justify-end items-end gap-2.5 animate-fade-in group">
        <span className="text-[10px] text-slate-400 shrink-0 mb-1 select-none">
          {message.timestamp}
        </span>
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          {/* If this user message was sent in reply to a specific agent or message */}
          {message.replyTargetAgentName && (
            <div className="mb-1.5 mr-1">
              <button
                type="button"
                onClick={() => message.replyTargetMessageId && onNavigateToMessage?.(message.replyTargetMessageId)}
                className={`group/reply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11.5px] font-medium transition-all text-left max-w-full ${message.replyTargetMessageId
                    ? 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 hover:border-indigo-400 text-slate-300 hover:text-white cursor-pointer shadow-2xs active:scale-[0.99]'
                    : 'bg-slate-800/70 border-slate-700 text-slate-400'
                  }`}
                title={message.replyTargetMessageId ? '클릭하여 해당 사상가의 발언으로 이동' : undefined}
              >
                <CornerDownRight size={12} className="text-indigo-400 group-hover/reply:text-indigo-300 shrink-0" />
                <span className="font-semibold text-indigo-300 group-hover/reply:text-indigo-200 shrink-0">
                  @{message.replyTargetAgentName}에게 답장
                </span>
                {message.replyTargetSnippet && (
                  <>
                    <span className="text-slate-600 shrink-0">|</span>
                    <span className="text-slate-400 group-hover/reply:text-slate-200 truncate text-[11px] font-normal">
                      "{message.replyTargetSnippet}"
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
          <div
            className="w-full bg-slate-900 text-white rounded-2xl rounded-br-xs shadow-xs"
            style={{
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingTop: '13px',
              paddingBottom: '13px',
            }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Agent Message (Left-aligned, 28px comfortable horizontal padding)
  const [isReActOpen, setIsReActOpen] = useState(false);
  const canonSender = message.sender === 'user' ? 'user' : canonicalAgentId(message.sender);
  const meta = getAgentMeta(canonSender);
  const parsedReAct = parseReActContent(
    message.content,
    message.reactThought,
    message.reactSearch,
    message.reactRead
  );

  // Strictly match an explicit mention tag at the beginning of the text:
  // Requires '@' symbol OR an explicit vocative callout followed by ',' or ':' (e.g. "@칸트", "@칸트님", "칸트님:")
  // Never match plain subjects like "칸트는", "유교에서는", "불교의"
  const allTraditionsPattern =
    '기독교|불교|힌두 철학|힌두철학|힌두|이슬람|유가|유교|공리주의|자유주의|마르크스주의|마르크스|유물론|도가|노자|장자|합리주의|칸트|데카르트|스토아|실존주의|사르트르|니체';
  const startAgentMentionRegex = new RegExp(
    `^@(${allTraditionsPattern})(님)?\\s*[,:]?\\s*|^(${allTraditionsPattern})님\\s*[,:]\\s*`,
    'i'
  );
  const bodyAgentRegex = new RegExp(`@(${allTraditionsPattern})(님)?`, 'gi');

  // Support user person mentions (@고민자 or @userName)
  const escapedUserName = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startUserMentionRegex = new RegExp(`^@(${escapedUserName}|고민자)(님)?\\s*[,:]?\\s*`, 'i');

  const effectiveTargetName = extractTargetName(message.replyToAgentName, message.content, userName);
  const isTargetingUser = Boolean(
    effectiveTargetName &&
    (effectiveTargetName === '고민자' || effectiveTargetName === userName || effectiveTargetName === '상담자')
  );

  const isCheckin = Boolean(message.isCheckin || message.id.startsWith('checkin-') || message.isProbingQuestion);

  // Determine if this message is addressing the immediately preceding speaker
  const prevSpeakerName =
    previousSender === 'user'
      ? userName || '고민자'
      : previousSender
        ? getAgentMeta(previousSender).name
        : undefined;

  const isTalkingToPreviousSpeaker = Boolean(
    prevSpeakerName &&
    effectiveTargetName &&
    (effectiveTargetName === prevSpeakerName ||
      ((prevSpeakerName === '고민자' || prevSpeakerName === userName) &&
        (effectiveTargetName === '고민자' || effectiveTargetName === userName)))
  );

  // ONLY attach "@사람/@사상가" tag/badge if talking to someone who is NOT the immediately preceding speaker and not a direct check-in!
  const shouldShowReplyBadge = Boolean(effectiveTargetName && !isTalkingToPreviousSpeaker && !isCheckin);

  // Render text without agent @ tags (only user @ tags are highlighted)
  const renderContentWithMentions = (rawText: string) => {
    // 1. Normalize any stray English tags to Korean first
    let text = normalizeKoreanMentions(rawText, userName);

    // 2. Remove leading explicit mention tag from the start of the bubble (without touching normal subjects)
    text = text.replace(startAgentMentionRegex, '');
    if (shouldShowReplyBadge && isTargetingUser && !isCheckin) {
      text = text.replace(startUserMentionRegex, '');
    }

    // 3. Remove @ tags from agent names in the rest of the text so it reads as plain natural text
    text = text.replace(bodyAgentRegex, '$1님');

    // 4. Only highlight user mentions (@userName님 or @고민자님)
    const userPattern =
      userName !== '고민자'
        ? `@${escapedUserName}님|@고민자님|@${escapedUserName}`
        : `@고민자님`;
    const userRegex = new RegExp(`(${userPattern})`, 'g');

    const parts = text.split(userRegex);

    return (
      <>
        {parts.map((part, idx) => {
          if (!part) return null;

          const isUserMention =
            part === `@${userName}님` ||
            part === `@고민자님` ||
            part === `@${userName}`;

          if (isUserMention) {
            return (
              <span
                key={idx}
                className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md mx-0.5 shadow-2xs"
              >
                @{userName}님
              </span>
            );
          }

          return <React.Fragment key={idx}>{part}</React.Fragment>;
        })}
      </>
    );
  };

  return (
    <div className="flex justify-start items-start gap-3 sm:gap-4 animate-fade-in pb-1.5">
      {/* Avatar */}
      {showAvatar ? (
        <div
          className={`w-10 h-10 rounded-2xl ${meta.avatarBg} border flex items-center justify-center shrink-0 shadow-xs text-base sm:text-lg mt-0.5`}
          title={meta.name}
        >
          {meta.icon || '📜'}
        </div>
      ) : (
        <div className="w-10 shrink-0" />
      )}

      {/* Bubble Container */}
      <div className="flex-1 max-w-[94%] sm:max-w-[88%]">
        {/* Sender Name Header */}
        {showAvatar && (
          <div className="flex items-center gap-2 mb-1.5 pl-1">
            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">{meta.name}</span>
          </div>
        )}

        {/* Reply tag if replying to someone who is NOT the immediately preceding speaker */}
        {shouldShowReplyBadge && (
          <div className="mb-2 ml-1">
            <button
              type="button"
              onClick={() => replyTargetId && onNavigateToMessage?.(replyTargetId)}
              className={`group/reply inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all text-left max-w-[96%] sm:max-w-[85%] ${replyTargetId
                  ? 'bg-slate-100/95 hover:bg-indigo-50 border-slate-200/90 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]'
                  : 'bg-slate-100/90 border-slate-200 text-slate-600'
                }`}
              title={replyTargetId ? '클릭하여 해당 대화로 이동' : undefined}
            >
              <CornerDownRight size={13} className="text-slate-400 group-hover/reply:text-indigo-600 shrink-0 transition-colors" />
              <span className="shrink-0 font-semibold text-slate-800 group-hover/reply:text-indigo-700">
                @{effectiveTargetName} 님에게
              </span>
              {replySnippet && (
                <>
                  <span className="text-slate-300 group-hover/reply:text-indigo-200 shrink-0 select-none">|</span>
                  <span className="text-slate-500 group-hover/reply:text-indigo-600 truncate text-[11.5px] font-normal">
                    "{replySnippet}"
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Chat Bubble & Timestamp row */}
        <div className="flex items-end gap-2.5">
          <div className="relative group/bubble max-w-full">
            {/* Main Bubble Card */}
            <div
              className={`rounded-2xl rounded-tl-xs border min-w-[120px] transition-all duration-300 ${isCheckin
                  ? 'bg-gradient-to-br from-indigo-50/80 via-purple-50/30 to-white border-indigo-300 shadow-xs'
                  : `${meta.borderColor} bg-white shadow-xs`
                }`}
              style={{
                paddingLeft: '28px',
                paddingRight: '28px',
                paddingTop: '16px',
                paddingBottom: '16px',
              }}
            >
              {/* 1. 사고 과정 (보조 정보 형태로 덜 두드러지게 토글 제공) */}
              {parsedReAct.hasReAct && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setIsReActOpen(!isReActOpen)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-1 rounded text-[11.5px] text-slate-400 hover:text-slate-600 hover:bg-slate-100/60 transition-colors cursor-pointer select-none font-normal"
                    aria-label={isReActOpen ? '사고 과정 접기' : '사고 과정 보기'}
                  >
                    <span>사고 과정 {isReActOpen ? '접기' : '보기'}</span>
                    {isReActOpen ? (
                      <ChevronUp size={12} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown size={12} className="text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isReActOpen && (
                    <div className="mt-1.5 mb-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-2 text-[11.5px] leading-relaxed text-slate-600 animate-fade-in">
                      {parsedReAct.thought && (
                        <div>
                          <strong className="text-slate-700 font-medium block mb-0.5">💭 [생각 / 분석]</strong>
                          <p className="whitespace-pre-wrap text-slate-500 pl-2 border-l-2 border-slate-200 leading-relaxed font-normal">{parsedReAct.thought}</p>
                        </div>
                      )}
                      {parsedReAct.search && (
                        <div>
                          <strong className="text-slate-700 font-medium block mb-0.5">🔍 [웹 검색 / 탐색]</strong>
                          <p className="whitespace-pre-wrap text-slate-500 pl-2 border-l-2 border-slate-200 leading-relaxed font-normal">{parsedReAct.search}</p>
                        </div>
                      )}
                      {parsedReAct.read && (
                        <div>
                          <strong className="text-slate-700 font-medium block mb-0.5">📖 [문헌 읽기 / 근거 확인]</strong>
                          <p className="whitespace-pre-wrap text-slate-500 pl-2 border-l-2 border-slate-200 leading-relaxed font-normal">{parsedReAct.read}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Main Content */}
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-normal text-sm sm:text-[14.5px]">
                {renderContentWithMentions(parsedReAct.advice)}
              </p>

              {/* 2.5 Debate Conclusion Summary Box (합의 또는 입장 차 확인 명시 종료) */}
              {(message.debateConclusionType || /(?:①\s*합의:|②\s*입장\s*차\s*확인:)/.test(parsedReAct.advice)) && (
                <div className="mt-3 px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[12.5px] flex items-start gap-2 shadow-2xs">
                  <span className="shrink-0 font-bold px-1.5 py-0.5 rounded text-[11px] bg-amber-100 text-amber-900 border border-amber-200/80">
                    {message.debateConclusionType === 'consensus' || /①\s*합의:/.test(parsedReAct.advice)
                      ? '🤝 논쟁 합의'
                      : '⚖️ 쟁점 입장 차 확인'}
                  </span>
                  <span className="text-amber-950 font-medium leading-relaxed">
                    {message.debateConclusionSummary ||
                      (parsedReAct.advice.match(/(?:①\s*합의:\s*|②\s*입장\s*차\s*확인:\s*)([^\n.]+)/)?.[1] ?? '핵심 가치 기준에 대한 입장이 명확히 정리되었습니다.')}
                  </span>
                </div>
              )}

              {/* 3. Citation Card (Without the green pill badge) */}
              {(message.citationSource || message.citationQuote || message.sourceUrl) && (
                <div
                  className={`rounded-xl ${meta.bubbleBg} border ${meta.borderColor} text-xs`}
                  style={{
                    marginTop: '13px',
                    paddingLeft: '18px',
                    paddingRight: '18px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1.5">
                    <BookOpen size={14} className={meta.textColor} />
                    <span className="text-xs sm:text-[12.5px]">{message.citationSource || '참고 원전 및 문헌'}</span>
                  </div>

                  {message.citationQuote && (
                    <p
                      className="text-slate-600 italic border-l-2 border-slate-300 leading-relaxed text-[12px] sm:text-[12.5px]"
                      style={{
                        paddingLeft: '12px',
                        marginTop: '5px',
                      }}
                    >
                      &ldquo;{message.citationQuote}&rdquo;
                    </p>
                  )}

                  {/* Retrieved Source URL Link */}
                  {message.sourceUrl && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                      <ExternalLink size={12} className="text-indigo-600 shrink-0" />
                      <span className="font-medium text-slate-600">출처:</span>
                      <a
                        href={message.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-[280px] sm:max-w-[420px] font-mono text-[10.5px] font-medium"
                        title={message.sourceUrl}
                      >
                        {message.sourceTitle || message.sourceUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Action Buttons (Reply + Reaction) on the bottom-right border of the bubble card */}
            <div className="absolute -bottom-3.5 right-3.5 sm:right-5 z-20 flex items-center gap-1.5">
              {/* Reply Button (이 메시지에 바로 답장하기) */}
              <button
                type="button"
                onClick={() => {
                  onSelectReplyTarget?.({
                    targetMessageId: message.id,
                    targetAgentId: canonicalAgentId(message.sender),
                    targetAgentName: meta.name,
                    targetSnippet: getCleanDialogueSnippet(message.content),
                    targetContent: message.content,
                  });
                }}
                aria-label={`${meta.name}의 메시지에 답장하기`}
                title={isReplyingToThis ? '답장 선택 해제' : `${meta.name}의 메시지에 답장하기`}
                className={`group/reply flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all duration-200 cursor-pointer select-none shadow-xs active:scale-90 ${isReplyingToThis
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-100 ring-2 ring-indigo-300 scale-105'
                    : 'bg-white hover:bg-indigo-50 border-slate-200/90 hover:border-indigo-300 text-slate-400 hover:text-indigo-600'
                  }`}
              >
                <CornerDownLeft size={13} className="transition-transform group-hover/reply:-translate-x-0.5" />
              </button>

              {/* Like Button */}
              <button
                type="button"
                onClick={() => onToggleLike?.(message)}
                aria-label={isLiked ? '공감 취소' : '와닿는 조언에 공감하기 (👍)'}
                title={isLiked ? '공감 취소' : '와닿는 조언에 공감하기 (👍)'}
                className={`group/like flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all duration-200 cursor-pointer select-none shadow-xs active:scale-90 ${isLiked
                    ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-amber-100 ring-2 ring-amber-200/70 scale-105'
                    : 'bg-white hover:bg-amber-50/70 border-slate-200/90 hover:border-amber-300 text-slate-400 hover:text-amber-600'
                  }`}
              >
                <ThumbsUp
                  size={13.5}
                  className={`transition-all duration-200 ${isLiked
                      ? 'fill-amber-400 text-amber-600 scale-110'
                      : 'text-slate-400 group-hover/like:text-amber-600 group-hover/like:scale-110'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Timestamp */}
          <span className="text-[10px] text-slate-400 shrink-0 mb-1 select-none">
            {message.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
