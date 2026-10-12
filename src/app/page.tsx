'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AgentHeader } from '@/components/AgentHeader';
import {
  MessageItem,
  DisplayMessage,
  UserReplyContext,
  extractTargetName,
  getCleanDialogueSnippet,
} from '@/components/MessageItem';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { AuthModal } from '@/components/AuthModal';
import { HistorySidebar } from '@/components/HistorySidebar';
import { UserProfileModal } from '@/components/UserProfileModal';
import { ProactiveDilemmaPopup } from '@/components/ProactiveDilemmaPopup';
import { CouncilBanner } from '@/components/CouncilBanner';
import { Send, Sparkles, Loader2, RefreshCw, CornerDownLeft, X } from 'lucide-react';
import { AGENTS, getAgentMeta, canonicalAgentId, normalizeAgentKoreanName } from '@/lib/agents';
import {
  AgentId,
  ScriptedChatMessage,
  UserProfile,
  ChatSession,
  ConversationTurnHistory,
  ConvenedCouncil,
} from '@/lib/types';
import { LikedAdvice, analyzeUserValueSystem } from '@/lib/valueSystem';
import {
  getCurrentUser,
  subscribeAuthState,
  subscribeUserSessions,
  subscribeUserReactions,
  getUserSessions,
  saveUserSession,
  deleteUserSession,
  logoutUser,
  getUserReactions,
  toggleUserReaction,
  saveUserReactions,
  migrateGuestReactions,
} from '@/lib/auth';
import {
  logAppEvent,
  hashString,
  extractDomain,
  STORE_RAW_QUERY_TEXT,
} from '@/lib/analytics';

// ==========================================
// 대화 흐름 및 순차 발언 제어 설정 상수 (수정 및 튜닝 가능)
// ==========================================
const DIALOGUE_CONFIG = {
  // 사상가 발언 사이의 기본 간격 (ms) - 이전 발언 렌더링 후 다음 발언 시작 전 휴식
  BASE_INTERVAL_MS: 1800,
  // 글자 수 비례 타이핑 표시 계수 (ms/자) - 사용자의 요청으로 여유있게 상향 조정
  CHAR_TYPING_MS: 48,
  // 최소 타이핑 표시 시간 (ms)
  MIN_TYPING_MS: 1800,
  // 최대 타이핑 표시 시간 (ms)
  MAX_TYPING_MS: 4000,
  // 사상가 연속 발언 횟수 후 사용자 체크인/호출 발동 기준 (N회) - 사용자 변경치(6) 유지
  CHECKIN_CONSECUTIVE_AGENT_TURNS: 6,
  // 유휴(idle) 상태에서 사상가 간 추가 토론 발동 대기 시간 (ms)
  IDLE_DEBATE_DELAY_MS: 16000,
  // 유휴(idle) 상태에서 사용자 호출(nudge) 발동 대기 시간 (ms)
  IDLE_NUDGE_DELAY_MS: 22000,
};

// 주기적 사용자 호출(체크인)을 위한 다양한 사상가별 발언 템플릿 (대화 문맥 기반 변주 지원)
function getRandomCheckinMessage(
  userName: string = '고민자',
  preferredAgentId?: AgentId,
  contextText: string = ''
): { agentId: AgentId; text: string } {
  const isWorkTopic = /직장|일|회사|퇴사|이직|승진|창업|꿈|워라밸|사업|돈|성공|커리어/i.test(contextText);
  const isRelationshipTopic = /친구|연인|애인|남자친구|여자친구|남편|아내|부모|가족|결혼|인간관계|서운|신뢰|바람|배신/i.test(contextText);
  const isMoralTopic = /거짓말|솔직|비밀|양심|도덕|원칙|규칙|고백|죄책감/i.test(contextText);

  const workTemplates: { agentId: AgentId; text: string }[] = [
    {
      agentId: 'rationalist',
      text: `@${userName}님, 이직이나 창업을 결단하시기 전에, 실패하더라도 최소 6개월간 버틸 수 있는 구체적인 비상 생활 자금을 이미 마련해두셨나요?`,
    },
    {
      agentId: 'utilitarian',
      text: `@${userName}님, 지금 직장에서 느끼는 갈등의 원인이 '업무 자체의 비전' 때문인가요, 아니면 '특정 상사나 동료와의 인간관계' 때문인가요?`,
    },
    {
      agentId: 'existentialist',
      text: `@${userName}님, 이 도전을 위해 공식적인 사직서나 사업 계획서를 단 한 줄이라도 실제로 작성해보신 적이 있나요?`,
    },
    {
      agentId: 'buddhist',
      text: `@${userName}님, 결정을 망설이게 하는 진짜 이유가 '생계에 대한 현실적 불안'인가요, 아니면 '직장 타이틀을 내려놓는 데 대한 두려움'인가요?`,
    },
    {
      agentId: 'confucian',
      text: `@${userName}님, 가족이나 동반자에게 창업이나 퇴사 의사를 이미 솔직하게 털어놓고 상의해보셨습니까?`,
    },
  ];

  const relationTemplates: { agentId: AgentId; text: string }[] = [
    {
      agentId: 'confucian',
      text: `@${userName}님, 그 친구가 이미 상대의 미묘한 변화나 거짓말을 어느 정도 눈치채고 있을 가능성을 혹시 직접 감지하신 적이 있나요?`,
    },
    {
      agentId: 'buddhist',
      text: `@${userName}님, 지금 마음을 짓누르는 갈등이 '친구를 향한 순수한 걱정'입니까, 아니면 '내가 비난받을까 두려운 마음'입니까?`,
    },
    {
      agentId: 'existentialist',
      text: `@${userName}님, 그 친구에게 진실을 말했을 때 둘의 관계가 완전히 끊어질 각오까지 이미 되어 있으신가요?`,
    },
    {
      agentId: 'rationalist',
      text: `@${userName}님, 두 사람 중 상담자님과 더 오랜 기간 깊은 신뢰와 비밀을 나눠온 쪽은 누구인가요?`,
    },
    {
      agentId: 'utilitarian',
      text: `@${userName}님, 지금 말하지 않고 침묵한다면, 훗날 당신이 이 사실을 미리 알고 있었다는 것을 그 친구가 알게 될 가능성이 높습니까?`,
    },
  ];

  const moralTemplates: { agentId: AgentId; text: string }[] = [
    {
      agentId: 'rationalist',
      text: `@${userName}님, 지금 침묵을 지킨다면 나중에 이 비밀이 제3자를 통해 폭로되었을 때 당신도 공범이나 방조자로 지목될 위험이 있습니까?`,
    },
    {
      agentId: 'utilitarian',
      text: `@${userName}님, 당신이 고백했을 때 상대방에게 실질적인 금전적·사회적 불이익이 즉시 발생합니까, 아니면 감정적 충격에 그칩니까?`,
    },
    {
      agentId: 'confucian',
      text: `@${userName}님, 이 일을 바로잡기 위해 당사자에게 먼저 '스스로 사실을 고백할 기회'를 주어보셨습니까?`,
    },
  ];

  const checkinTemplates: { agentId: AgentId; text: string }[] = [
    {
      agentId: 'buddhist',
      text: `@${userName}님, 이 문제를 해결하기 위해 스스로 정해둔 명확한 결단의 마감 기한이나 디데이가 정해져 있나요?`,
    },
    {
      agentId: 'confucian',
      text: `@${userName}님, 이 문제로 인해 이미 당사자 중 누군가와 심각한 말다툼이나 갈등을 겪은 적이 있습니까?`,
    },
    {
      agentId: 'rationalist',
      text: `@${userName}님, 이 문제를 상담자님 혼자만의 결단으로 해결할 수 있습니까, 아니면 다른 관계자의 동의가 반드시 필요합니까?`,
    },
    {
      agentId: 'utilitarian',
      text: `@${userName}님, 두 선택지 중 한쪽을 골랐을 때 당장 오늘 밤부터 후회할 것이 확실한 쪽이 있습니까?`,
    },
    {
      agentId: 'existentialist',
      text: `@${userName}님, 타인의 조언을 모두 배제했을 때, 당신 스스로 책임을 오롯이 질 수 있는 선택지가 마음속에 이미 정해져 있나요?`,
    },
  ];

  let pool = checkinTemplates;
  if (isWorkTopic) pool = [...workTemplates, ...checkinTemplates];
  else if (isRelationshipTopic) pool = [...relationTemplates, ...checkinTemplates];
  else if (isMoralTopic) pool = [...moralTemplates, ...checkinTemplates];

  if (preferredAgentId) {
    const matching = pool.filter((t) => t.agentId === preferredAgentId);
    if (matching.length > 0) {
      return matching[Math.floor(Math.random() * matching.length)];
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

const SAMPLE_PROMPTS = [
  '가족을 생각하면 안정적인 직장에 남는 게 맞는 것 같은데, 오랜 꿈이던 창업에도 도전해보고 싶어요. 어떻게 해야 할까요?',
  '친구의 연인이 바람피우는 걸 봤어요. 솔직하게 얘기해주는 게 맞을까요?',
  '제 메시지는 읽씹하면서 SNS 스토리는 바로 올리는 친구, 서운하다고 말해도 될까요?',
];

function formatKoreanTime(date = new Date()): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${period} ${displayHours}:${displayMinutes}`;
}

export default function PhilosophicalCounselingPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingFromApi, setIsGeneratingFromApi] = useState(false);
  const [isAgentPlaying, setIsAgentPlaying] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isAwaitingUserCheckin, setIsAwaitingUserCheckin] = useState(false);
  const [typingAgent, setTypingAgent] = useState<{ id: AgentId; name: string } | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [history, setHistory] = useState<ConversationTurnHistory[]>([]);

  // Keep isProcessing synced for backward compatibility
  useEffect(() => {
    setIsProcessing(isGeneratingFromApi || isAgentPlaying);
  }, [isGeneratingFromApi, isAgentPlaying]);

  // Auth, Profile & History State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<LikedAdvice[]>([]);
  const [isProactivePopupOpen, setIsProactivePopupOpen] = useState(false);
  const [currentCouncil, setCurrentCouncil] = useState<ConvenedCouncil | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<UserReplyContext | null>(null);

  const handleNavigateToMessage = useCallback((targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetId);
      setTimeout(() => {
        setHighlightedMsgId((curr) => (curr === targetId ? null : curr));
      }, 2200);
    }
  }, []);

  const handleSelectReplyTarget = useCallback((target: UserReplyContext) => {
    setReplyTarget((prev) => (prev?.targetMessageId === target.targetMessageId ? null : target));
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }, []);

  // Synchronous stable ref to strictly prevent duplicate session creation
  const currentSessionIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<UserProfile | null>(null);
  const currentCouncilRef = useRef<ConvenedCouncil | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const messagesRef = useRef<DisplayMessage[]>([]);
  const reactionsRef = useRef<LikedAdvice[]>([]);
  const historyRef = useRef<ConversationTurnHistory[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    reactionsRef.current = reactions;
  }, [reactions]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const isHistoryOpenRef = useRef(false);
  const isProfileOpenRef = useRef(false);
  const isAuthModalOpenRef = useRef(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentCouncilRef.current = currentCouncil;
  }, [currentCouncil]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isPlayingRef = useRef(false);
  const currentTurnIdRef = useRef<number>(0);
  const isUserTypingRef = useRef<boolean>(false);
  const isAgentPlayingRef = useRef<boolean>(false);
  const consecutiveAgentCountRef = useRef<number>(0);
  const isAwaitingUserCheckinRef = useRef<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const homeIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingInactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idlePhaseRef = useRef<number>(0);

  // Clear typing inactivity timer
  const clearTypingInactivityTimer = useCallback(() => {
    if (typingInactivityTimerRef.current) {
      clearTimeout(typingInactivityTimerRef.current);
      typingInactivityTimerRef.current = null;
    }
  }, []);

  // Clear idle timer
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearHomeIdleTimer = useCallback(() => {
    if (homeIdleTimerRef.current) {
      clearTimeout(homeIdleTimerRef.current);
      homeIdleTimerRef.current = null;
    }
  }, []);

  // When History or Profile or Auth modal is opened, immediately suppress nudge popup and clear timers
  useEffect(() => {
    isHistoryOpenRef.current = isHistoryOpen;
    if (isHistoryOpen) {
      setIsProactivePopupOpen(false);
      clearHomeIdleTimer();
      clearIdleTimer();
    }
  }, [isHistoryOpen, clearHomeIdleTimer, clearIdleTimer]);

  useEffect(() => {
    isProfileOpenRef.current = isProfileOpen;
    if (isProfileOpen) {
      setIsProactivePopupOpen(false);
      clearHomeIdleTimer();
      clearIdleTimer();
    }
  }, [isProfileOpen, clearHomeIdleTimer, clearIdleTimer]);

  useEffect(() => {
    isAuthModalOpenRef.current = isAuthModalOpen;
    if (isAuthModalOpen) {
      setIsProactivePopupOpen(false);
      clearHomeIdleTimer();
      clearIdleTimer();
    }
  }, [isAuthModalOpen, clearHomeIdleTimer, clearIdleTimer]);

  // Proactive system intervention: when idle on home screen for 12s without typing
  // STRICTLY SUPPRESSED if History or Profile or Auth modal is being viewed
  useEffect(() => {
    const isModalActive = isHistoryOpen || isProfileOpen || isAuthModalOpen;
    if (
      messages.length === 0 &&
      !isProcessing &&
      !isProactivePopupOpen &&
      !isModalActive
    ) {
      clearHomeIdleTimer();
      homeIdleTimerRef.current = setTimeout(() => {
        if (
          inputText.trim().length === 0 &&
          messages.length === 0 &&
          !isHistoryOpenRef.current &&
          !isProfileOpenRef.current &&
          !isAuthModalOpenRef.current
        ) {
          setIsProactivePopupOpen(true);
          logAppEvent('idle_proactive_nudge', {
            sessionId: currentSessionIdRef.current || 'home',
            userId: getEffectiveUserId(),
            nudge_type: 'home_dilemma_popup',
            idle_seconds: 12,
          });
        }
      }, 12000);
    } else {
      clearHomeIdleTimer();
    }

    return () => {
      clearHomeIdleTimer();
    };
  }, [
    messages.length,
    isProcessing,
    isProactivePopupOpen,
    inputText,
    isHistoryOpen,
    isProfileOpen,
    isAuthModalOpen,
    clearHomeIdleTimer,
  ]);

  // 1. Load custom API key & Subscribe to Firebase Auth state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('philosophical_counseling_api_key');
      if (stored) {
        setCustomApiKey(stored);
      }
    } catch (e) { }

    const cachedUser = getCurrentUser();
    setCurrentUser(cachedUser);
    currentUserRef.current = cachedUser;

    const unsubAuth = subscribeAuthState((user) => {
      setCurrentUser(user);
      currentUserRef.current = user;
    });

    return () => unsubAuth();
  }, []);

  // 2. Real-time synchronisation for user sessions and reactions across all devices
  useEffect(() => {
    const userId = currentUser ? currentUser.id : 'guest';

    // Instant local cache load
    setSessions(getUserSessions(userId));
    setReactions(getUserReactions(userId));

    // Connect live Firestore listeners if authenticated
    if (currentUser && currentUser.id !== 'guest') {
      const unsubSessions = subscribeUserSessions(currentUser.id, (remoteSessions) => {
        setSessions(remoteSessions);
      });

      const unsubReactions = subscribeUserReactions(currentUser.id, (remoteReactions) => {
        setReactions(remoteReactions);
      });

      return () => {
        unsubSessions();
        unsubReactions();
      };
    }
  }, [currentUser]);

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    try {
      localStorage.setItem('philosophical_counseling_api_key', key);
    } catch (e) { }
  };

  const getEffectiveUserId = useCallback(() => {
    return currentUser ? currentUser.id : 'guest';
  }, [currentUser]);

  // Synchronously retrieve or create a stable session ID
  const getOrCreateSessionId = useCallback(() => {
    if (!currentSessionIdRef.current) {
      const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      currentSessionIdRef.current = newId;
      setCurrentSessionId(newId);
    }
    return currentSessionIdRef.current;
  }, []);

  // Telemetry: Lifecycle session start & session end on unload
  useEffect(() => {
    const initialSessionId = getOrCreateSessionId();
    sessionStartTimeRef.current = Date.now();
    logAppEvent('session_start', {
      sessionId: initialSessionId,
      userId: getEffectiveUserId(),
      source: 'initial_load',
      has_prior_history: false,
    });

    const handleBeforeUnload = () => {
      const activeSessionId = currentSessionIdRef.current;
      if (activeSessionId) {
        logAppEvent('session_end', {
          sessionId: activeSessionId,
          userId: getEffectiveUserId(),
          reason: 'page_leave',
          duration_seconds: Math.floor((Date.now() - sessionStartTimeRef.current) / 1000),
          total_user_messages: messagesRef.current.filter((m) => m.sender === 'user').length,
          total_agent_messages: messagesRef.current.filter((m) => m.sender !== 'user').length,
          total_likes: reactionsRef.current.filter((r) => r.sessionId === activeSessionId).length,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save current conversation session
  const persistSession = useCallback(
    (
      sessionId: string,
      currentMsgs: DisplayMessage[],
      currentHist: ConversationTurnHistory[],
      titleSeed?: string,
      councilToSave?: ConvenedCouncil | null
    ) => {
      if (currentMsgs.length === 0) return;
      const userId = getEffectiveUserId();
      const stableId = currentSessionIdRef.current || sessionId;
      if (!currentSessionIdRef.current) {
        currentSessionIdRef.current = stableId;
        setCurrentSessionId(stableId);
      }

      // Title from first user message
      const firstUserMsg = currentMsgs.find((m) => m.sender === 'user');
      const title =
        titleSeed ||
        (firstUserMsg
          ? firstUserMsg.content.slice(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '')
          : '철학 상담');

      const sessionObj: ChatSession = {
        id: stableId,
        userId,
        title,
        messages: currentMsgs,
        history: currentHist,
        council: councilToSave !== undefined ? (councilToSave || undefined) : (currentCouncilRef.current || undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveUserSession(userId, sessionObj);
      setSessions(getUserSessions(userId));
    },
    [getEffectiveUserId]
  );

  // Auto-scroll to bottom ONLY when new messages arrive or when typing agent appears (never on like click)
  const prevMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isNewMessage || typingAgent) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages.length, typingAgent]);

  // Pausable wait helper:
  // - Resolves when targetMs has elapsed
  // - If isUserTypingRef.current is true, pauses timer until typing stops!
  // - If currentTurnIdRef.current !== turnId, aborts immediately and returns false!
  const pausableWait = useCallback(
    async (targetMs: number, turnId: number): Promise<boolean> => {
      let elapsed = 0;
      const tickMs = 50;
      while (elapsed < targetMs) {
        if (currentTurnIdRef.current !== turnId) {
          return false;
        }
        if (isUserTypingRef.current) {
          // Pause while user is actively typing
          await new Promise((r) => setTimeout(r, tickMs));
          continue;
        }
        await new Promise((r) => setTimeout(r, tickMs));
        elapsed += tickMs;
      }
      return currentTurnIdRef.current === turnId;
    },
    []
  );

  // Triggers user check-in when agents have spoken consecutively for N turns
  const triggerCheckinNudge = useCallback(
    async (turnId: number, previousAgentId?: AgentId) => {
      if (currentTurnIdRef.current !== turnId) return;

      const userName = currentUserRef.current ? currentUserRef.current.name : '고민자';

      // Extract recent dialogue context for context-sensitive check-in variation
      const recentHistoryTurns = historyRef.current.slice(-6);
      const recentContextText = recentHistoryTurns.map((t) => t.content).join(' ');

      // Context-aware fallback template
      let checkin = getRandomCheckinMessage(userName, previousAgentId, recentContextText);

      // Attempt to dynamically fetch a context-tailored check-in question via API
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'idle_nudge',
            history: historyRef.current,
            apiKey: customApiKey,
            userName,
            preferredAgentId: previousAgentId,
            council: currentCouncilRef.current || undefined,
            userLikes: reactionsRef.current,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            const apiMsg = data.messages[0];
            if (apiMsg.text && apiMsg.text.trim()) {
              checkin = {
                agentId: canonicalAgentId(apiMsg.agentId || previousAgentId || 'buddhist'),
                text: apiMsg.text,
              };
            }
          }
        }
      } catch (err) {
        // Fallback already prepared
      }

      if (currentTurnIdRef.current !== turnId) return;
      const agentMeta = getAgentMeta(checkin.agentId);

      // Brief reading pause before check-in begins
      const finishedWait = await pausableWait(DIALOGUE_CONFIG.BASE_INTERVAL_MS, turnId);
      if (!finishedWait || currentTurnIdRef.current !== turnId) return;

      // Show typing indicator for check-in agent
      setTypingAgent({ id: checkin.agentId, name: agentMeta.name });
      const typingTime = Math.min(
        DIALOGUE_CONFIG.MAX_TYPING_MS,
        Math.max(
          DIALOGUE_CONFIG.MIN_TYPING_MS,
          checkin.text.length * DIALOGUE_CONFIG.CHAR_TYPING_MS
        )
      );
      const finishedTyping = await pausableWait(typingTime, turnId);
      setTypingAgent(null);
      if (!finishedTyping || currentTurnIdRef.current !== turnId) return;

      const checkinMsg: DisplayMessage = {
        id: `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: canonicalAgentId(checkin.agentId),
        content: checkin.text,
        timestamp: formatKoreanTime(),
        isCheckin: true,
      };

      setMessages((prev) => {
        const next = [...prev, checkinMsg];
        if (currentSessionIdRef.current) {
          persistSession(
            currentSessionIdRef.current,
            next,
            historyRef.current,
            undefined,
            currentCouncilRef.current
          );
        }
        return next;
      });

      const checkinLine = `[${agentMeta.name}]: ${checkin.text}`;
      setHistory((prevHist) => [
        ...prevHist,
        { role: 'assistant', content: checkinLine },
      ]);

      // STRICT LOCK: Check-in question delivered. Strictly wait for user reply; NEVER resume automatically!
      isAwaitingUserCheckinRef.current = true;
      setIsAwaitingUserCheckin(true);
      consecutiveAgentCountRef.current = 0;
      clearIdleTimer();

      logAppEvent('idle_proactive_nudge', {
        sessionId: currentSessionIdRef.current || 'chat',
        userId: getEffectiveUserId(),
        nudge_type: 'consecutive_turns_checkin',
        consecutive_turns: DIALOGUE_CONFIG.CHECKIN_CONSECUTIVE_AGENT_TURNS,
        raw_checkin_question: checkinLine,
      });
    },
    [clearIdleTimer, customApiKey, pausableWait, persistSession]
  );

  const playDialogueQueueRef = useRef<(agentMessages: DisplayMessage[], turnId: number) => Promise<void>>();

  // Seamlessly continue debate between agents until CHECKIN_CONSECUTIVE_AGENT_TURNS is reached.
  // Transitions after a natural brief pause (2200ms) eliminating the long awkward "round" gap!
  const scheduleDebateContinuation = useCallback(
    (turnId: number) => {
      clearIdleTimer();

      if (
        isAwaitingUserCheckinRef.current ||
        isUserTypingRef.current ||
        isGeneratingFromApi ||
        isHistoryOpenRef.current ||
        isProfileOpenRef.current ||
        isAuthModalOpenRef.current
      ) {
        return;
      }

      idleTimerRef.current = setTimeout(async () => {
        if (
          currentTurnIdRef.current !== turnId ||
          isAwaitingUserCheckinRef.current ||
          isUserTypingRef.current ||
          isGeneratingFromApi ||
          isHistoryOpenRef.current ||
          isProfileOpenRef.current ||
          isAuthModalOpenRef.current
        ) {
          return;
        }

        try {
          setIsGeneratingFromApi(true);
          const userName = currentUserRef.current ? currentUserRef.current.name : '고민자';
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'idle_debate',
              history: historyRef.current,
              apiKey: customApiKey,
              userName,
              council: currentCouncilRef.current || undefined,
              userLikes: reactionsRef.current,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              const incomingList: ScriptedChatMessage[] = data.messages;
              const precomputed: DisplayMessage[] = incomingList.map((item, idx) => ({
                id: `msg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                sender: canonicalAgentId(item.agentId),
                content: item.text,
                citationSource: item.citationSource,
                citationQuote: item.citationQuote,
                sourceUrl: item.sourceUrl,
                sourceTitle: item.sourceTitle,
                replyToAgentName: item.replyToAgentName,
                reactThought: item.reactThought,
                reactSearch: item.reactSearch,
                reactRead: item.reactRead,
                timestamp: formatKoreanTime(),
                targetAgentId: item.targetAgentId,
                actionScenario: item.actionScenario,
                debateRound: item.debateRound,
                debateConclusionType: item.debateConclusionType,
                debateConclusionSummary: item.debateConclusionSummary,
                isProbingQuestion: item.isProbingQuestion,
              }));

              if (currentTurnIdRef.current === turnId && !isAwaitingUserCheckinRef.current) {
                await playDialogueQueueRef.current?.(precomputed, turnId);
              }
            }
          }
        } catch (e) {
          console.error('Seamless debate continuation error:', e);
        } finally {
          setIsGeneratingFromApi(false);
        }
      }, 2200);
    },
    [clearIdleTimer, customApiKey, isGeneratingFromApi]
  );

  // Play agent messages sequentially with natural length-based delay and interruption support
  const playDialogueQueue = useCallback(
    async (agentMessages: DisplayMessage[], turnId: number) => {
      playDialogueQueueRef.current = playDialogueQueue;
      isAgentPlayingRef.current = true;
      setIsAgentPlaying(true);
      isPlayingRef.current = true;

      for (let i = 0; i < agentMessages.length; i++) {
        if (currentTurnIdRef.current !== turnId) break;

        const item = agentMessages[i];
        const canonSender =
          item.sender === 'user' ? 'user' : canonicalAgentId(item.sender as string);
        const agentMeta = getAgentMeta(canonSender);

        // 1. Wait if user is currently typing
        while (isUserTypingRef.current) {
          if (currentTurnIdRef.current !== turnId) break;
          await new Promise((r) => setTimeout(r, 60));
        }
        if (currentTurnIdRef.current !== turnId) break;

        // 2. Set typing indicator
        setTypingAgent({ id: canonSender as AgentId, name: agentMeta.name });

        // 3. Length-proportional typing delay
        const charCount = item.content.length;
        const typingDelay = Math.min(
          DIALOGUE_CONFIG.MAX_TYPING_MS,
          Math.max(
            DIALOGUE_CONFIG.MIN_TYPING_MS,
            charCount * DIALOGUE_CONFIG.CHAR_TYPING_MS
          )
        );

        const finishedTyping = await pausableWait(typingDelay, turnId);
        if (!finishedTyping || currentTurnIdRef.current !== turnId) {
          setTypingAgent(null);
          break;
        }

        // Hide typing indicator right before rendering message
        setTypingAgent(null);

        // 4. Render message
        setMessages((prev) => {
          const next = [...prev, item];
          if (currentSessionIdRef.current) {
            persistSession(
              currentSessionIdRef.current,
              next,
              historyRef.current,
              undefined,
              currentCouncilRef.current
            );
          }
          return next;
        });

        // 5. Update history incrementally so interruptions have exact context
        const formattedLine = `[${agentMeta.name}]: ${item.content}`;
        setHistory((prevHist) => {
          const lastTurn = prevHist[prevHist.length - 1];
          if (lastTurn && lastTurn.role === 'assistant') {
            return [
              ...prevHist.slice(0, -1),
              { role: 'assistant', content: `${lastTurn.content}\n${formattedLine}` },
            ];
          } else {
            return [...prevHist, { role: 'assistant', content: formattedLine }];
          }
        });

        // 6. Log telemetry
        logAppEvent('agent_response_generated', {
          sessionId: currentSessionIdRef.current || 'default',
          userId: getEffectiveUserId(),
          agent_id: item.sender,
          agent_name: agentMeta.name,
          agent_stance: agentMeta.stance,
          char_length: item.content.length,
          has_web_search: Boolean(item.sourceUrl),
          source_domain: extractDomain(item.sourceUrl),
          turn_order: i + 1,
          round_type:
            idlePhaseRef.current > 0
              ? idlePhaseRef.current === 1
                ? 'idle_debate'
                : 'idle_nudge'
              : 'council_response',
          raw_response_text: item.content,
          citation_source: item.citationSource || null,
          citation_quote: item.citationQuote || null,
          react_thought: item.reactThought || null,
          action_scenario: item.actionScenario || null,
          is_probing_question: Boolean(item.isProbingQuestion),
        });

        // 7. Increment consecutive agent turns count
        consecutiveAgentCountRef.current += 1;

// Dialogue queue continues smoothly until all planned agent turns and the separate question bubble are delivered

        // 9. Natural interval pause between speakers
        const pauseDelay = Math.max(
          DIALOGUE_CONFIG.BASE_INTERVAL_MS,
          charCount < 40
            ? DIALOGUE_CONFIG.BASE_INTERVAL_MS
            : DIALOGUE_CONFIG.BASE_INTERVAL_MS + 400
        );
        const finishedPause = await pausableWait(pauseDelay, turnId);
        if (!finishedPause || currentTurnIdRef.current !== turnId) {
          break;
        }
      }

      if (currentTurnIdRef.current === turnId) {
        setTypingAgent(null);
        isAgentPlayingRef.current = false;
        setIsAgentPlaying(false);
        isPlayingRef.current = false;

        // In the new 2-mode conversational flow:
        // Every advice round (Mode 1) and debate-develop round (Mode 2) ends with thinkers asking the user for their opinion.
        // Therefore, we yield the floor and wait for the user to reply!
        isAwaitingUserCheckinRef.current = true;
        setIsAwaitingUserCheckin(true);
        consecutiveAgentCountRef.current = 0;
        clearIdleTimer();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearIdleTimer, pausableWait, persistSession, scheduleDebateContinuation, triggerCheckinNudge]
  );

  // Schedule idle follow-up:
  // Phase 1 (16s): agents debate each other further
  // Phase 2 (22s): agent nudges the user with @고민자님
  const scheduleIdleCheck = useCallback(() => {
    clearIdleTimer();

    // If awaiting check-in response, never schedule idle events!
    if (isAwaitingUserCheckinRef.current) {
      return;
    }

    if (
      isHistoryOpenRef.current ||
      isProfileOpenRef.current ||
      isAuthModalOpenRef.current
    ) {
      return;
    }

    if (idlePhaseRef.current === 0) {
      // Wait IDLE_DEBATE_DELAY_MS for idle debate between agents
      idleTimerRef.current = setTimeout(async () => {
        if (
          isGeneratingFromApi ||
          isAgentPlayingRef.current ||
          isUserTypingRef.current ||
          isHistoryOpenRef.current ||
          isProfileOpenRef.current ||
          isAuthModalOpenRef.current
        )
          return;
        idlePhaseRef.current = 1;
        logAppEvent('idle_proactive_nudge', {
          sessionId: currentSessionIdRef.current || 'chat',
          userId: getEffectiveUserId(),
          nudge_type: 'chat_idle_debate',
          idle_seconds: Math.round(DIALOGUE_CONFIG.IDLE_DEBATE_DELAY_MS / 1000),
        });
        try {
          setIsGeneratingFromApi(true);
          const userName = currentUserRef.current ? currentUserRef.current.name : '고민자';
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'idle_debate',
              history: historyRef.current,
              apiKey: customApiKey,
              userName,
              council: currentCouncilRef.current || undefined,
              userLikes: reactions,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              const incomingList: ScriptedChatMessage[] = data.messages;
              const precomputed: DisplayMessage[] = incomingList.map((item, idx) => ({
                id: `msg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                sender: canonicalAgentId(item.agentId),
                content: item.text,
                citationSource: item.citationSource,
                citationQuote: item.citationQuote,
                sourceUrl: item.sourceUrl,
                sourceTitle: item.sourceTitle,
                replyToAgentName: item.replyToAgentName,
                reactThought: item.reactThought,
                reactSearch: item.reactSearch,
                reactRead: item.reactRead,
                timestamp: formatKoreanTime(),
                targetAgentId: item.targetAgentId,
                actionScenario: item.actionScenario,
                debateRound: item.debateRound,
                debateConclusionType: item.debateConclusionType,
                debateConclusionSummary: item.debateConclusionSummary,
                isProbingQuestion: item.isProbingQuestion,
              }));

              const thisTurnId = ++currentTurnIdRef.current;
              await playDialogueQueue(precomputed, thisTurnId);
            }
          }
        } catch (e) {
          console.error('Idle debate error:', e);
        } finally {
          setIsGeneratingFromApi(false);
        }
      }, DIALOGUE_CONFIG.IDLE_DEBATE_DELAY_MS);
    } else if (idlePhaseRef.current === 1) {
      // Wait IDLE_NUDGE_DELAY_MS for user nudge (@고민자님)
      idleTimerRef.current = setTimeout(async () => {
        if (
          isGeneratingFromApi ||
          isAgentPlayingRef.current ||
          isUserTypingRef.current ||
          isHistoryOpenRef.current ||
          isProfileOpenRef.current ||
          isAuthModalOpenRef.current
        )
          return;
        idlePhaseRef.current = 2;
        logAppEvent('idle_proactive_nudge', {
          sessionId: currentSessionIdRef.current || 'chat',
          userId: getEffectiveUserId(),
          nudge_type: 'chat_user_nudge',
          idle_seconds: Math.round(DIALOGUE_CONFIG.IDLE_NUDGE_DELAY_MS / 1000),
        });
        try {
          setIsGeneratingFromApi(true);
          const userName = currentUserRef.current ? currentUserRef.current.name : '고민자';
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'idle_nudge',
              history: historyRef.current,
              apiKey: customApiKey,
              userName,
              council: currentCouncilRef.current || undefined,
              userLikes: reactions,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              const incomingList: ScriptedChatMessage[] = data.messages;
              const precomputed: DisplayMessage[] = incomingList.map((item, idx) => ({
                id: `msg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                sender: canonicalAgentId(item.agentId),
                content: item.text,
                citationSource: item.citationSource,
                citationQuote: item.citationQuote,
                sourceUrl: item.sourceUrl,
                sourceTitle: item.sourceTitle,
                replyToAgentName: item.replyToAgentName,
                timestamp: formatKoreanTime(),
                targetAgentId: item.targetAgentId,
                actionScenario: item.actionScenario,
                debateRound: item.debateRound,
                debateConclusionType: item.debateConclusionType,
                debateConclusionSummary: item.debateConclusionSummary,
                isProbingQuestion: item.isProbingQuestion,
              }));

              const thisTurnId = ++currentTurnIdRef.current;
              await playDialogueQueue(precomputed, thisTurnId);
            }
          }
        } catch (e) {
          console.error('Idle nudge error:', e);
        } finally {
          setIsGeneratingFromApi(false);
        }
      }, DIALOGUE_CONFIG.IDLE_NUDGE_DELAY_MS);
    }
  }, [clearIdleTimer, customApiKey, isGeneratingFromApi, playDialogueQueue, reactions]);

  const handleInputChange = (val: string) => {
    setInputText(val);
    clearTypingInactivityTimer();

    const trimmed = val.trim();
    if (trimmed.length === 0) {
      isUserTypingRef.current = false;
      setIsUserTyping(false);
      return;
    }

    // Actively typing right now
    isUserTypingRef.current = true;
    setIsUserTyping(true);
    clearIdleTimer();
    setTypingAgent(null);

    // If draft text remains in input but no user typing activity is detected for 4s, resume paused dialogue!
    typingInactivityTimerRef.current = setTimeout(() => {
      isUserTypingRef.current = false;
      setIsUserTyping(false);
    }, 4000);
  };

  const handleInputBlur = () => {
    clearTypingInactivityTimer();
    isUserTypingRef.current = false;
    setIsUserTyping(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGeneratingFromApi) return;

    // Immediately stop old agent playback turn so user interruption takes effect!
    const thisTurnId = ++currentTurnIdRef.current;
    isAgentPlayingRef.current = false;
    setIsAgentPlaying(false);
    isPlayingRef.current = false;
    setTypingAgent(null);

    // Reset user typing & consecutive agent count & checkin awaiting lock
    clearTypingInactivityTimer();
    isUserTypingRef.current = false;
    setIsUserTyping(false);
    isAwaitingUserCheckinRef.current = false;
    setIsAwaitingUserCheckin(false);
    setInputText('');
    consecutiveAgentCountRef.current = 0;

    clearIdleTimer();
    idlePhaseRef.current = 0;
    setIsGeneratingFromApi(true);

    // Synchronous stable session ID for this conversation
    const sessionId = getOrCreateSessionId();

    // 1. Add User Message (Preserving directed reply target info if active)
    const currentReplyTarget = replyTarget;
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: formatKoreanTime(),
      replyTargetMessageId: currentReplyTarget?.targetMessageId,
      replyTargetAgentId: currentReplyTarget?.targetAgentId,
      replyTargetAgentName: currentReplyTarget?.targetAgentName,
      replyTargetSnippet: currentReplyTarget?.targetSnippet,
    };

    setReplyTarget(null);

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    // Telemetry: Log user dilemma query submission
    logAppEvent('user_query_submit', {
      sessionId,
      userId: getEffectiveUserId(),
      query_length: text.length,
      word_count: text.trim().split(/\s+/).length,
      query_hash: hashString(text),
      message_index: nextMessages.length,
      has_active_council: Boolean(currentCouncilRef.current),
      raw_query_text: text,
      preferred_agent: currentReplyTarget?.targetAgentId || null,
    });

    const updatedHistory: ConversationTurnHistory[] = [
      ...historyRef.current,
      { role: 'user', content: text },
    ];
    setHistory(updatedHistory);
    historyRef.current = updatedHistory;

    // Initial save of the session
    persistSession(sessionId, nextMessages, updatedHistory, text.slice(0, 32), currentCouncilRef.current);

    try {
      setTypingAgent({ id: 'rationalist', name: '4대 사상가 (웹 검색 및 성찰 중...)' });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: text,
          history: updatedHistory,
          apiKey: customApiKey,
          userName: currentUser ? currentUser.name : '고민자',
          userLikes: reactions,
          council: currentCouncilRef.current || undefined,
          replyTargetAgentId: currentReplyTarget?.targetAgentId,
          replyTargetMessageContent: currentReplyTarget?.targetContent,
          replyTargetSnippet: currentReplyTarget?.targetSnippet,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      const incomingList: ScriptedChatMessage[] = data.messages || [];

      if (incomingList.length === 0) {
        throw new Error('사상가들의 대화 내용을 불러오지 못했습니다.');
      }

      // If user typed another message while API was fetching, abort this turn
      if (currentTurnIdRef.current !== thisTurnId) {
        return;
      }

      // Update convened council if returned from backend
      if (data.council) {
        setCurrentCouncil(data.council);
        currentCouncilRef.current = data.council;
      }

      // Precompute stable agent messages with verified web search source URLs
      const precomputedAgentMessages: DisplayMessage[] = incomingList.map((item, idx) => ({
        id: `msg-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        sender: canonicalAgentId(item.agentId),
        content: item.text,
        citationSource: item.citationSource,
        citationQuote: item.citationQuote,
        sourceUrl: item.sourceUrl,
        sourceTitle: item.sourceTitle,
        replyToAgentName: item.replyToAgentName,
        reactThought: item.reactThought,
        reactSearch: item.reactSearch,
        reactRead: item.reactRead,
        timestamp: formatKoreanTime(),
        targetAgentId: item.targetAgentId,
        actionScenario: item.actionScenario,
        debateRound: item.debateRound,
        debateConclusionType: item.debateConclusionType,
        debateConclusionSummary: item.debateConclusionSummary,
        isProbingQuestion: item.isProbingQuestion,
      }));

      // API fetch complete; now begin sequential agent playback!
      setIsGeneratingFromApi(false);
      await playDialogueQueue(precomputedAgentMessages, thisTurnId);
    } catch (err: any) {
      console.error('Chat send error:', err);
      alert(err.message || '상담 진행 중 문제가 발생했습니다.');
      setTypingAgent(null);
      setIsGeneratingFromApi(false);
      isAgentPlayingRef.current = false;
      setIsAgentPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      // Keystroke activity detected: refresh inactivity timeout for 4s
      clearTypingInactivityTimer();
      isUserTypingRef.current = true;
      setIsUserTyping(true);
      typingInactivityTimerRef.current = setTimeout(() => {
        isUserTypingRef.current = false;
        setIsUserTyping(false);
      }, 4000);
    }
  };

  // Toggle thumbs-up like reaction on advice
  const handleToggleLike = (msg: DisplayMessage) => {
    if (msg.sender === 'user') return;
    const userId = getEffectiveUserId();
    const agentMeta = getAgentMeta(msg.sender as AgentId);

    const advice: LikedAdvice = {
      messageId: msg.id,
      sessionId: currentSessionIdRef.current || undefined,
      agentId: msg.sender as AgentId,
      agentName: agentMeta.name,
      agentStance: agentMeta.stance,
      content: msg.content,
      citationSource: msg.citationSource,
      citationQuote: msg.citationQuote,
      likedAt: formatKoreanTime(),
    };

    const res = toggleUserReaction(userId, advice);
    setReactions(res.reactions);

    // Telemetry: Log like/unlike click with agent details
    logAppEvent('like_clicked', {
      sessionId: currentSessionIdRef.current || undefined,
      userId,
      agent_id: msg.sender,
      agent_name: agentMeta.name,
      agent_stance: agentMeta.stance,
      action: res.isLiked ? 'like' : 'unlike',
      response_length: msg.content.length,
      total_likes_in_session: res.reactions.length,
      raw_liked_text: msg.content,
    });

    // Update messages state
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isLiked: res.isLiked } : m))
    );

    // Also update current session storage so like status persists
    if (currentSessionIdRef.current) {
      const updatedMsgs = messages.map((m) =>
        m.id === msg.id ? { ...m, isLiked: res.isLiked } : m
      );
      persistSession(currentSessionIdRef.current, updatedMsgs, history, undefined, currentCouncilRef.current);
    }
  };

  // Remove a like directly from the profile modal
  const handleRemoveLike = (messageId: string) => {
    const userId = getEffectiveUserId();
    const updated = reactions.filter((r) => r.messageId !== messageId);
    saveUserReactions(userId, updated);
    setReactions(updated);

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isLiked: false } : m))
    );

    if (currentSessionIdRef.current) {
      const updatedMsgs = messages.map((m) =>
        m.id === messageId ? { ...m, isLiked: false } : m
      );
      persistSession(currentSessionIdRef.current, updatedMsgs, history, undefined, currentCouncilRef.current);
    }
  };

  // Start a fresh new chat session cleanly
  const handleNewChat = () => {
    // Telemetry: Log session end for previous conversation if active
    if (currentSessionIdRef.current) {
      logAppEvent('session_end', {
        sessionId: currentSessionIdRef.current,
        userId: getEffectiveUserId(),
        reason: 'new_chat',
        duration_seconds: Math.floor((Date.now() - sessionStartTimeRef.current) / 1000),
        total_user_messages: messages.filter((m) => m.sender === 'user').length,
        total_agent_messages: messages.filter((m) => m.sender !== 'user').length,
        total_likes: reactions.filter((r) => r.sessionId === currentSessionIdRef.current).length,
      });
    }

    clearIdleTimer();
    clearTypingInactivityTimer();
    isAwaitingUserCheckinRef.current = false;
    setIsAwaitingUserCheckin(false);
    consecutiveAgentCountRef.current = 0;
    isUserTypingRef.current = false;
    setIsUserTyping(false);
    if (homeIdleTimerRef.current) {
      clearTimeout(homeIdleTimerRef.current);
    }
    setIsProactivePopupOpen(false);
    idlePhaseRef.current = 0;
    isPlayingRef.current = false;

    // Reset session timer and generate fresh ID
    sessionStartTimeRef.current = Date.now();
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    currentSessionIdRef.current = newSessionId;
    setCurrentSessionId(newSessionId);

    // Telemetry: Log fresh session start
    logAppEvent('session_start', {
      sessionId: newSessionId,
      userId: getEffectiveUserId(),
      source: 'new_chat',
      has_prior_history: false,
    });

    prevMessageCountRef.current = 0;
    setCurrentCouncil(null);
    currentCouncilRef.current = null;
    setReplyTarget(null);
    setMessages([]);
    setHistory([]);
    setTypingAgent(null);
    setIsProcessing(false);
  };

  // Switch to an existing session from sidebar
  const handleSelectSession = (session: ChatSession) => {
    clearIdleTimer();
    clearTypingInactivityTimer();
    if (homeIdleTimerRef.current) {
      clearTimeout(homeIdleTimerRef.current);
    }
    setIsProactivePopupOpen(false);
    idlePhaseRef.current = 0;
    isPlayingRef.current = false;

    // Set synchronous stable ID to the existing session ID
    currentSessionIdRef.current = session.id;
    setCurrentSessionId(session.id);
    const loadedMsgs: DisplayMessage[] = (session.messages || []).map((m: any) => {
      if (m && m.sender && m.sender !== 'user') {
        return {
          ...m,
          sender: canonicalAgentId(m.sender),
        };
      }
      return m;
    });

    const lastMsg = loadedMsgs[loadedMsgs.length - 1];
    const isLastMsgCheckin = Boolean(
      lastMsg &&
      lastMsg.sender !== 'user' &&
      (lastMsg.isCheckin || lastMsg.id?.startsWith('checkin-'))
    );
    isAwaitingUserCheckinRef.current = isLastMsgCheckin;
    setIsAwaitingUserCheckin(isLastMsgCheckin);
    consecutiveAgentCountRef.current = 0;
    isUserTypingRef.current = false;
    setIsUserTyping(false);

    prevMessageCountRef.current = loadedMsgs.length;
    setCurrentCouncil(session.council || null);
    currentCouncilRef.current = session.council || null;
    setReplyTarget(null);
    setMessages(loadedMsgs);
    setHistory(session.history || []);
    setTypingAgent(null);
    setIsProcessing(false);

    setTimeout(() => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'auto',
      });
    }, 50);
  };

  const handleDeleteSession = (sessionId: string) => {
    const userId = getEffectiveUserId();
    deleteUserSession(userId, sessionId);
    setSessions(getUserSessions(userId));
    if (currentSessionIdRef.current === sessionId) {
      handleNewChat();
    }
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    currentUserRef.current = user;

    // If user currently had an active chat, save under their account
    if (messages.length > 0 && currentSessionIdRef.current) {
      const firstUserMsg = messages.find((m) => m.sender === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '')
        : '철학 상담';
      const sessionObj: ChatSession = {
        id: currentSessionIdRef.current,
        userId: user.id,
        title,
        messages,
        history,
        council: currentCouncilRef.current || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveUserSession(user.id, sessionObj);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setSessions(getUserSessions('guest'));
    setReactions(getUserReactions('guest'));
    handleNewChat();
  };

  const handlePrefillInput = (text: string) => {
    setInputText(text);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const valueAnalysis = analyzeUserValueSystem(reactions);
  const userArchetype = reactions.length > 0 ? valueAnalysis.archetypeTitle : '가치관 탐색가';
  const userArchetypeIcon = reactions.length > 0 ? valueAnalysis.archetypeIcon : '🧭';

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] bg-slate-50 text-slate-800 overflow-hidden">
      {/* Header */}
      <AgentHeader
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onGoHome={handleNewChat}
        currentUser={currentUser}
        userArchetype={userArchetype}
        userArchetypeIcon={userArchetypeIcon}
      />

      {/* Main Chat Area */}
      <main
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-2.5 py-4 sm:px-6 sm:py-6 max-w-4xl w-full mx-auto"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in max-w-xl mx-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Sparkles size={26} className="sm:w-[30px] sm:h-[30px]" />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                요즘, 풀리지 않는 고민이 있나요?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                하나의 정답 대신, 2500년에 걸친 수많은 철학과 사상이 각자의 시선으로 당신의 고민에 답합니다.
              </p>
            </div>

            {/* Dilemma Starter Prompts */}
            <div className="w-full text-left pt-1 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <span>자주 묻는 현실적 고민 예시</span>
              </div>
              <div className="space-y-2.5">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-indigo-50/60 hover:border-indigo-200 text-xs sm:text-sm text-slate-700 transition-all flex items-start gap-2.5 group cursor-pointer shadow-2xs"
                  >
                    <span className="text-indigo-500 font-medium shrink-0 mt-0.5">Q.</span>
                    <span className="group-hover:text-indigo-950 font-normal leading-snug">
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>

              {/* Compact gray button under sample prompts */}
              <div className="pt-0.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsProactivePopupOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/90 text-slate-600 hover:text-slate-900 text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 border border-slate-200/80 shadow-2xs cursor-pointer"
                  title="새로운 고민 질문 받아보기"
                >
                  <Sparkles size={11} className="text-slate-400" />
                  <span>질문 더 받아보기</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              ※ 사상가들은 결코 하나의 정답으로 합의하지 않습니다. 와닿는 조언에 👍 공감을 남기시면서 나의 가치관을 만들어보세요.
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 pb-8">
            {/* Convened Council Banner & Blind Spot Spotlight */}
            {currentCouncil && <CouncilBanner council={currentCouncil} />}

            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const prevSender = prevMsg ? (prevMsg.sender === 'user' ? 'user' : canonicalAgentId(prevMsg.sender)) : undefined;
              const currentSender = msg.sender === 'user' ? 'user' : canonicalAgentId(msg.sender);
              const showAvatar = !prevMsg || prevSender !== currentSender || Boolean(msg.isCheckin);
              const isMsgLiked = reactions.some((r) => r.messageId === msg.id);

              const currentUserName = currentUser ? currentUser.name : '고민자';
              const targetName = extractTargetName(msg.replyToAgentName, msg.content, currentUserName);

              const prevSpeakerName =
                prevMsg?.sender === 'user'
                  ? currentUserName
                  : prevMsg
                    ? getAgentMeta(prevMsg.sender).name
                    : undefined;

              const isImmediateReply = Boolean(
                prevSpeakerName &&
                targetName &&
                (targetName === prevSpeakerName ||
                  ((prevSpeakerName === '고민자' || prevSpeakerName === currentUserName) &&
                    (targetName === '고민자' || targetName === currentUserName)))
              );

              // Look back to find the specific previous message from the agent or user being replied to
              let replyTargetId: string | undefined = undefined;
              let replySnippet: string | undefined = undefined;

              if (targetName && !isImmediateReply && msg.sender !== 'user') {
                const isTargetUser =
                  targetName === '고민자' ||
                  targetName === currentUserName ||
                  targetName === '상담자';
                const targetAgentId = !isTargetUser ? canonicalAgentId(targetName) : undefined;

                for (let i = index - 1; i >= 0; i--) {
                  const m = messages[i];
                  if (isTargetUser && m.sender === 'user') {
                    replyTargetId = m.id;
                    replySnippet = getCleanDialogueSnippet(m.content);
                    break;
                  }
                  if (
                    !isTargetUser &&
                    (canonicalAgentId(m.sender) === targetAgentId || getAgentMeta(m.sender).name === targetName)
                  ) {
                    replyTargetId = m.id;
                    replySnippet = getCleanDialogueSnippet(m.content);
                    break;
                  }
                }
              }

              return (
                <div
                  key={msg.id}
                  id={msg.id}
                  className={`transition-all duration-500 rounded-2xl ${highlightedMsgId === msg.id
                      ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-50 bg-indigo-50/40 shadow-sm'
                      : ''
                    }`}
                >
                  <MessageItem
                    message={msg}
                    showAvatar={showAvatar}
                    previousSender={prevMsg?.sender}
                    replySnippet={replySnippet}
                    replyTargetId={replyTargetId}
                    onNavigateToMessage={handleNavigateToMessage}
                    onSelectReplyTarget={handleSelectReplyTarget}
                    isLiked={isMsgLiked}
                    onToggleLike={handleToggleLike}
                    userName={currentUserName}
                    isReplyingToThis={replyTarget?.targetMessageId === msg.id}
                  />
                </div>
              );
            })}

            {/* Live Messenger Typing Indicator */}
            {typingAgent && (
              <div className="flex items-center gap-3 my-4 pl-0.5 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shadow-2xs">
                  {typingAgent.name.slice(0, 1)}
                </div>
                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-2xs flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">
                    {typingAgent.name}님이 입력 중...
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Input Form Bar */}
      <footer className="border-t border-slate-200/80 bg-white/95 backdrop-blur-md p-2.5 sm:p-4 pb-safe">
        <div className="max-w-4xl mx-auto">
          {/* Active Directed Reply Banner */}
          {replyTarget && (
            <div className="mb-2 p-2 sm:px-3 sm:py-2 bg-indigo-50/95 border border-indigo-200/90 rounded-2xl flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <CornerDownLeft size={12} className="sm:w-[13px] sm:h-[13px]" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <span className="font-semibold text-xs text-indigo-900 shrink-0">
                    @{replyTarget.targetAgentName}에게 답장 중
                  </span>
                  {replyTarget.targetSnippet && (
                    <span className="text-[11px] sm:text-[11.5px] text-indigo-700/80 truncate max-w-[150px] xs:max-w-[220px] sm:max-w-md italic font-normal">
                      "{replyTarget.targetSnippet}"
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="p-1 rounded-lg hover:bg-indigo-200/60 text-indigo-600 hover:text-indigo-900 transition-colors shrink-0 cursor-pointer"
                aria-label="답장 모드 해제"
                title="답장 취소 (전체 대화로 전환)"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-1.5 sm:p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-2xs"
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              disabled={isGeneratingFromApi}
              placeholder={
                isGeneratingFromApi
                  ? '사상가들이 생각을 정리하고 있습니다...'
                  : replyTarget
                    ? `${replyTarget.targetAgentName}에게 보낼 질문이나 반론을 입력하세요...`
                    : isAwaitingUserCheckin
                      ? '생각이나 선택을 들려주세요. 궁금한 점을 질문하셔도 좋습니다...'
                      : isAgentPlaying
                        ? '사상가들이 대화 중입니다. 언제든 생각을 나누거나 끼어드세요...'
                        : '당신의 고민이나 딜레마를 들려주세요'
              }
              rows={1}
              className="flex-1 bg-transparent px-2.5 sm:px-3 py-1.5 sm:py-2 text-base sm:text-sm text-slate-800 placeholder-slate-400 resize-none outline-none max-h-32 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isGeneratingFromApi}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all duration-200 shrink-0 shadow-xs"
              aria-label="메시지 전송"
            >
              {isGeneratingFromApi ? (
                <Loader2 size={17} className="animate-spin text-slate-400" />
              ) : (
                <Send size={17} />
              )}
            </button>
          </form>
          <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 px-1">
            <span className="hidden sm:inline">Shift + Enter 줄바꿈 | 대화 내용은 실시간으로 보존됩니다</span>
            <span className="sm:hidden">대화 내용 자동 저장</span>
            {messages.length > 0 && !isProcessing && (
              <button
                type="button"
                onClick={handleNewChat}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={11} />
                <span>새 상담 시작</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals & Sidebar Drawer */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
        hasEnvKey={true}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        reactions={reactions}
        onRemoveLike={handleRemoveLike}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentUser={currentUser}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        userArchetype={userArchetype}
      />

      <ProactiveDilemmaPopup
        isOpen={isProactivePopupOpen}
        onClose={() => setIsProactivePopupOpen(false)}
        onSelectDilemma={(prompt) => {
          setIsProactivePopupOpen(false);
          handleSendMessage(prompt);
        }}
        customApiKey={customApiKey}
        initialExcludeQuestions={SAMPLE_PROMPTS}
      />
    </div>
  );
}
