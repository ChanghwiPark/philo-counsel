import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  AGENTS,
  getAgentMeta,
  getIndividualAgentSystemPrompt,
  getIndividualReActPrompt,
  getGroupChatSystemPrompt,
  getIdleDebateSystemPrompt,
  getIdleNudgeSystemPrompt,
  getDirectedAgentReplySystemPrompt,
  canonicalAgentId,
  normalizeAgentKoreanName,
  normalizeKoreanMentions,
  detectUserTurnMode,
  TurnMode,
} from '@/lib/agents';
import { ScriptedChatMessage, ConvenedCouncil, AgentMeta, AgentReActCard, AgentId } from '@/lib/types';
import { LikedAdvice } from '@/lib/valueSystem';
import { selectCouncilForDilemma } from '@/lib/councilSelector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action: 'chat' | 'idle_debate' | 'idle_nudge' | 'generate_dilemma' = body.action || 'chat';
    const userMessage: string = body.message?.trim() || '';
    const conversationHistory: HistoryTurn[] = body.history || [];
    const clientApiKey: string = body.apiKey?.trim() || '';
    const userName: string = body.userName?.trim() || '고민자';
    const preferredAgentId: AgentId | undefined = body.preferredAgentId
      ? canonicalAgentId(body.preferredAgentId)
      : undefined;
    const userLikes: LikedAdvice[] = body.userLikes || [];
    const excludeQuestions: string[] = Array.isArray(body.excludeQuestions)
      ? body.excludeQuestions.map((q: any) => String(q).trim()).filter(Boolean)
      : [];
    let council: ConvenedCouncil | undefined = body.council;

    const apiKey = clientApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (action === 'generate_dilemma') {
        return NextResponse.json({ dilemma: getFallbackDilemma(excludeQuestions) });
      }
      return NextResponse.json(
        {
          error: 'OpenAI API 키가 설정되지 않았습니다. .env.local 파일이나 설정 모달에서 API 키를 입력해주세요.',
        },
        { status: 401 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // 1. Dynamic AI Dilemma Generation for Proactive Intervention
    if (action === 'generate_dilemma') {
      try {
        const dilemmaPrompt = `당신은 인간 삶의 첨예한 도덕적 갈등과 가치관 딜레마를 발굴하는 철학적 질문 생성기입니다.
다음 4대 핵심 사상가(불교, 칸트 의무론, 유교, 공리주의)가 각자의 독창적인 관점에서 치열하게 논쟁할 수 있는 현실적이고 생생한 딜레마 질문 1개와, 사용자가 직관적으로 선택할 수 있는 상반된 구체적 행동 입장 2개를 생성하세요:
- 불교 사상: 연기(緣起)와 공(空), 집착 내려놓기와 자비
- 칸트 윤리학: 보편적 도덕법칙, 정언명령과 의무론
- 유교 사상: 인(仁)과 예(禮), 효(孝)와 가족/공동체의 도리
- 공리주의: 최대 다수의 최대 행복, 결과의 실질적 유용성 계산

[필수 조건]
- 인간관계, 사랑/연애, 직장/커리어, 가족, 우정, 공정성, 양심 등 현대인이 일상에서 마주칠 법한 구체적인 딜레마여야 합니다.
- 질문 문장은 친근하고 직관적인 구어체로 "~어떻게 생각하세요?" 혹은 "~어떻게 해야 할까요?"로 끝나야 합니다.
- ★라벨 규칙★: stances 배열의 label에 '첫 번째 입장', '선택 1' 같은 메타 단어를 절대로 쓰지 말고, 구체적인 행동이나 결정을 나타내는 핵심 문구(10~20자)를 직접 작성하세요.

반드시 유효한 JSON 단일 객체만 반환하세요:
{
  "category": "인간관계와 도덕",
  "question": "연인이 있는 이성 친구가 많이 힘들어하고 있어요. 제가 위로해줘도 될까요? 이 상황, 어떻게 생각하세요?",
  "stances": [
    {
      "label": "친구로서 따뜻하게 위로해준다",
      "userOpinion": "친구로서 인간적인 위로는 해줄 수 있다고 생각해요."
    },
    {
      "label": "오해를 막기 위해 거리를 둔다",
      "userOpinion": "상대 연인에 대한 예의상 선을 긋고 거리를 두어야 한다고 생각해요."
    }
  ]
}`;

        let userContent =
          '현대인의 삶에서 마주하는 새롭고 현실적인 도덕적/철학적 딜레마 질문 1개와 상반된 입장 2개를 JSON으로 생성해주세요.';
        if (excludeQuestions.length > 0) {
          const formattedExcludes = excludeQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n');
          userContent += `\n\n[최근 추천된 질문 목록]\n${formattedExcludes}\n\n★필수 지침: 위 최근 질문들과 주제, 상황, 질문 문장이 중복되거나 유사하지 않은 완전히 새로운 다른 분야의 질문을 생성하세요.`;
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: dilemmaPrompt },
            {
              role: 'user',
              content: userContent,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.85,
        });

        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        if (parsed.question && parsed.stances && Array.isArray(parsed.stances)) {
          return NextResponse.json({ dilemma: parsed });
        }
        return NextResponse.json({ dilemma: getFallbackDilemma(excludeQuestions) });
      } catch (err) {
        console.error('Dilemma generation error:', err);
        return NextResponse.json({ dilemma: getFallbackDilemma(excludeQuestions) });
      }
    }

    // Auto-select council if not already convened
    if (!council && (action === 'chat' || !council)) {
      council = selectCouncilForDilemma(userMessage, userLikes);
    }
    const targetAgents: AgentMeta[] = council?.agents || [
      AGENTS.buddhist,
      AGENTS.rationalist,
      AGENTS.confucian,
      AGENTS.utilitarian,
    ];

    // 2. Idle Nudge Action (Context-Aware Check-in Question)
    if (action === 'idle_nudge') {
      const nudgeAgent =
        (preferredAgentId && targetAgents.find((a) => a.id === preferredAgentId)) ||
        targetAgents.find((a) => a.id === 'buddhist' || a.id === 'confucian') ||
        targetAgents[0] ||
        AGENTS.buddhist;
      const systemPrompt = getIdleNudgeSystemPrompt(userName, targetAgents);

      const recentContext = conversationHistory.length > 0
        ? conversationHistory
            .slice(-6)
            .map((h) => `${h.role === 'user' ? userName : '사상가'}: ${h.content}`)
            .join('\n')
        : userMessage;

      const userPrompt = `[대화 맥락 및 최근 발언]\n${recentContext}\n\n위 대화 맥락과 ${userName}님의 고민을 바탕으로, ${nudgeAgent.name} 사상가가 상담자가 아직 말하지 않은 구체적인 사실·전제·인간관계를 하나 추측하여 그것을 직접 확인하는 닫힌 질문(Probing Question)을 1개 JSON으로 작성하세요.
"어떤 방향으로 마음이 기울고 계신가요?" 같은 모호한 감정 질문을 절대 하지 말고, 아직 확인되지 않은 사실관계나 전제를 직접 파고드는 닫힌 질문(예: 이미 눈치채고 있는지 여부, 두 사람 중 누구와 더 오래 알았는지, 털어놓지 않았을 때 나중에 알게 될지 여부 등)을 @${userName}님에게 던지세요.`;

      try {
        const comp = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        });
        const parsed = JSON.parse(comp.choices[0].message.content || '{}');
        const msgs = Array.isArray(parsed.messages) ? parsed.messages : [];
        if (msgs.length > 0) {
          const normalizedMsgs = msgs.map((m: any) => ({
            ...m,
            agentId: canonicalAgentId(m.agentId || nudgeAgent.id),
            isProbingQuestion: true,
          }));
          return NextResponse.json({ messages: normalizedMsgs, council });
        }
      } catch (e) {
        console.warn('Idle nudge OpenAI error:', e);
      }
      return NextResponse.json({
        messages: getFallbackResponse('idle_nudge', userMessage, userName, council),
        council,
      });
    }

    // 3. Idle Debate Action: Connected philosophical debate exchange between debaters
    if (action === 'idle_debate') {
      try {
        const sysPrompt = getIdleDebateSystemPrompt(targetAgents);
        const comp = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: sysPrompt },
            {
              role: 'user',
              content: `상담자('${userName}님')의 고민: "${userMessage}". 방금 나눈 대화에 이어, 사상가들끼리 상대 핵심 논거의 약점을 정면 반박하고, 오늘 당장 취할 구체적 행동 지침(동사 중심 종결)을 대립시키는 2~3합의 공방을 나누고, 마지막에 '① 합의: ...' 또는 '② 입장 차 확인: 우리는 ...에서 갈린다'로 결론을 명시하세요.`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
        });

        const parsed = JSON.parse(comp.choices[0]?.message?.content || '{}');
        const rawList = Array.isArray(parsed.messages) ? parsed.messages : [];
        if (rawList.length > 0) {
          return NextResponse.json({
            messages: enrichDebateMessages(rawList, userName),
            council,
          });
        }
      } catch (e) {
        console.warn('Idle debate OpenAI error:', e);
      }

      return NextResponse.json({
        messages: getFallbackResponse('idle_debate', userMessage, userName, council),
        council,
      });
    }

    // 4. Main Chat Action: Directed reply OR multi-agent living debate synthesis
    if (!userMessage) {
      return NextResponse.json({ error: '고민 내용을 입력해주세요.' }, { status: 400 });
    }

    const replyTargetAgentId: string | undefined = body.replyTargetAgentId;
    const replyTargetMessageContent: string | undefined = body.replyTargetMessageContent;
    const replyTargetSnippet: string | undefined = body.replyTargetSnippet;

    const turnMode: TurnMode = detectUserTurnMode(userMessage, conversationHistory);

    let councilMessages: ScriptedChatMessage[];
    if (replyTargetAgentId) {
      councilMessages = await executeDirectedAgentReply(
        openai,
        targetAgents,
        replyTargetAgentId,
        userMessage,
        userName,
        conversationHistory,
        replyTargetSnippet || (replyTargetMessageContent ? replyTargetMessageContent.slice(0, 80) : undefined),
        council
      );
    } else {
      councilMessages = await executeMultiAgentDebate(
        openai,
        targetAgents,
        userMessage,
        userName,
        conversationHistory,
        council,
        turnMode
      );
    }

    return NextResponse.json({
      messages: councilMessages,
      council,
      turnMode,
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * Execute a multi-agent living philosophical debate adhering to the 5 core principles:
 * 1. 7 diverse interaction variations (반박, 동조·강화, 연합/견제, 양보·수정, 비유·일화, 재질문/되치기, 사용자 직접 호명)
 * 2. Contrasting rhythm (15~35 char sharp cuts vs 60~120 char deep arguments)
 * 3. Individual emotional temperature and authentic voice
 * 4. 4-phase narrative arc (입장 제시 → 진영 충돌 → 양보/반전 → 사용자에게 공 넘김)
 * 5. Close grounding in the user's concrete dilemma
 */
/**
 * Phase 1: Execute Independent Agent ReAct Call
 * Each agent runs as a standalone model call, grasping previous conversation flow and user dilemma,
 * to independently reason (Thought), search (Search Query), verify literature (Reading),
 * and extract authentic evidence & core argument.
 */
async function executeAgentReAct(
  openai: OpenAI,
  agent: AgentMeta,
  userMessage: string,
  userName: string,
  conversationHistory: HistoryTurn[]
): Promise<AgentReActCard> {
  const instructions = getIndividualReActPrompt(agent, userName);
  const userPrompt = `상담자('${userName}님')의 고민: "${userMessage}"

당신(${agent.name})만의 고유한 철학적 관점에서 고민의 본질을 성찰(생각)하고,
핵심 고전/문헌 키워드를 탐색(Search)하여, 실제 원전 가르침(Reading)과 핵심 논거, 원전 구절을 JSON으로 도출하세요.`;

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: instructions },
    ];
    // Supply conversation history so each independent agent grasps the preceding conversation flow!
    if (conversationHistory.length > 0) {
      for (const h of conversationHistory.slice(-4)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: 'user', content: userPrompt });

    const comp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.76,
      max_tokens: 500,
    });

    const parsed = JSON.parse(comp.choices[0]?.message?.content || '{}');
    return {
      agentId: agent.id,
      agentName: agent.name,
      stance: agent.stance,
      thought: parsed.thought || `${agent.name} 관점에서 고민의 본질을 성찰합니다.`,
      searchQuery: parsed.searchQuery || agent.searchDomain || agent.keyWork,
      reading: parsed.reading || `${agent.keyWork}의 가르침 파악`,
      coreArgument: parsed.coreArgument || agent.summary,
      citationSource: parsed.citationSource || agent.keyWork,
      citationQuote: parsed.citationQuote,
    };
  } catch (err: any) {
    console.warn(`[Phase 1 ReAct] Agent ${agent.name} error:`, err.message);
    return {
      agentId: agent.id,
      agentName: agent.name,
      stance: agent.stance,
      thought: `${agent.name} 관점에서 고민자의 두려움과 상황의 본질을 성찰합니다.`,
      searchQuery: agent.searchDomain || agent.keyWork,
      reading: `${agent.keyWork}의 핵심 지혜 확인`,
      coreArgument: agent.summary,
      citationSource: agent.keyWork,
    };
  }
}

/**
 * Plan A: 2-Phase Multi-Agent Architecture
 * Phase 1: Parallel Independent ReAct Exploration (Promise.allSettled)
 *   - Each agent independently thinks, searches, and verifies evidence while grasping previous conversation flow.
 * Phase 2: Living Multi-Voiced Debate Synthesis
 *   - Uses the 4 independently harvested ReAct cards to stage a connected, fierce roundtable debate
 *     with 4-phase narrative arc, 7 interaction types, and contrasting rhythm.
 */
async function executeMultiAgentDebate(
  openai: OpenAI,
  convenedAgents: AgentMeta[],
  userMessage: string,
  userName: string,
  conversationHistory: HistoryTurn[],
  council?: ConvenedCouncil,
  turnMode: TurnMode = 'advice'
): Promise<ScriptedChatMessage[]> {
  try {
    // 1. Phase 1: Parallel Independent ReAct Calls (Promise.allSettled)
    const reactTasks = convenedAgents.map((agent) =>
      executeAgentReAct(openai, agent, userMessage, userName, conversationHistory)
    );
    const reactSettled = await Promise.allSettled(reactTasks);
    const reactCards: AgentReActCard[] = reactSettled.map((res, idx) => {
      if (res.status === 'fulfilled') return res.value;
      const fallbackAgent = convenedAgents[idx] || AGENTS.buddhist;
      return {
        agentId: fallbackAgent.id,
        agentName: fallbackAgent.name,
        stance: fallbackAgent.stance,
        thought: `${fallbackAgent.name} 관점에서 고민의 본질을 성찰합니다.`,
        searchQuery: fallbackAgent.keyWork,
        reading: `${fallbackAgent.keyWork}의 교훈`,
        coreArgument: fallbackAgent.summary,
        citationSource: fallbackAgent.keyWork,
      };
    });

    // 2. Phase 2: Living Multi-Voiced Debate Synthesis using Phase 1 ReAct Cards
    const instructions = getGroupChatSystemPrompt(
      userName,
      convenedAgents,
      council?.blindSpotInsight || '',
      reactCards,
      turnMode
    );

    // Extract any previous facts or stances disclosed by the user from conversationHistory
    const userDisclosedFacts = conversationHistory
      .filter((h) => h.role === 'user')
      .map((h) => h.content.trim())
      .filter(Boolean)
      .join('\n- ');

    let userPrompt: string;
    if (turnMode === 'advice') {
      userPrompt = `[상담자('${userName}님')의 고민/질문]:
"${userMessage}"
${userDisclosedFacts ? `\n[상담자가 이전 대화에서 밝힌 구체적 사실관계 및 전제]:\n- ${userDisclosedFacts}\n` : ''}
소집된 사상가들이 Phase 1에서 각자 독립적으로 생각하고 탐색해 온 'ReAct 근거 카드'를 확보했습니다.

★[Mode 1: 각자 조언 + 별도 질문 말풍선 실행 지침]★:
1. 소집된 ${convenedAgents.length}명의 사상가가 차례대로 1명씩(총 ${convenedAgents.length}개 말풍선), 자신의 고유한 철학적 시각과 오늘 당장 실행할 구체적 행동 시나리오(동사 중심 종결)만을 온전한 1개의 말풍선으로 제시하세요.
   ★절대 조언 말풍선 끝에 @${userName}님 질문을 붙이지 마세요!★
2. 사상가 간 행동 제안이 중복되지 않도록 타이밍/화법/대안/내면 성찰의 서로 다른 각도를 제시하세요.
3. 모든 사상가의 조언이 끝난 뒤, 마지막 순서의 사상가는 오직 상담자에게 질문만 던지는 "별도의 독립된 질문 말풍선"(말풍선 ${convenedAgents.length + 1}번, isProbingQuestion: true)을 생성하여 앞선 조언들을 종합하고 @${userName}님에게 어느 관점에 마음이 가는지 묻거나, 혹시 조언 중 이해가 안 되거나 더 궁금한 점이 있다면 편하게 물어보도록 따뜻하게 안내하세요.
`;
    } else {
      userPrompt = `[상담자('${userName}님')의 답변/의견]:
"${userMessage}"
${userDisclosedFacts ? `\n[상담자가 이전 대화에서 밝힌 구체적 사실관계 및 전제]:\n- ${userDisclosedFacts}\n` : ''}
소집된 사상가들이 Phase 1에서 각자 독립적으로 생각하고 탐색해 온 'ReAct 근거 카드'를 확보했습니다.

★[Mode 2: 사용자 의견 기반 디베이트 & 별도 질문 말풍선 실행 지침]★:
1. ★고민자에게 질문을 넘기기 전까지는 사상가들끼리 계속 대화를 이어가세요.★ 절대 서로 치고받는 싸움이 아니라, 상담자의 의견을 발전(develop)시키기 위해 사상가들끼리 서로 지지, 리스크 지적, 보완책 제시, 반론을 4~6턴 동안 활발하게 티키타카로 주고받으세요. 이 동안에는 사상가들끼리 대화하며 아직 상담자에게 질문을 넘기지 마세요.
2. ★고민자에게 생각을 발전시키는 질문은 반드시 '별도의 독립된 말풍선(Separate Dialogue Bubble)'으로 분리하세요.★
   사상가 간의 토론이 충분히 오간 뒤, 마지막 사상가가 오직 질문만을 담은 1개의 독립된 말풍선(isProbingQuestion: true)으로 토론을 종합하여 @${userName}님에게 처음 생각하신 결정을 어떻게 더 구체적으로 다듬고 준비하고 싶은지 묻고, 혹시 사상가들의 토론 내용 중 이해가 안 가거나 더 짚고 넘어가고 싶은 점이 있다면 편하게 물어보도록 안내하세요.
   ★절대 사상가의 본인 발언(토론/주장)과 @${userName}님 질문을 한 말풍선에 합치지 마세요!★
`;
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: instructions },
    ];
    if (conversationHistory.length > 0) {
      for (const h of conversationHistory.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: 'user', content: userPrompt });

    const comp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1500,
    });

    const parsed = JSON.parse(comp.choices[0]?.message?.content || '{}');
    const rawList = Array.isArray(parsed.messages) ? parsed.messages : [];
    if (rawList.length > 0) {
      return enrichDebateMessages(rawList, userName, reactCards, turnMode);
    }
  } catch (err: any) {
    console.warn('2-Phase multi-agent debate error, falling back:', err);
  }

  return getFallbackResponse('chat', userMessage, userName, council, turnMode);
}

/**
 * Execute a directed reply targeting a specific agent (or specific message from an agent).
 * The targeted agent acts as the lead respondent based on their prior remarks and persona,
 * while other convened agents remain mostly quiet with at most 1 brief sharp interruption.
 * Anti-convergence is strictly maintained.
 */
async function executeDirectedAgentReply(
  openai: OpenAI,
  targetAgents: AgentMeta[],
  leadAgentId: string,
  userMessage: string,
  userName: string,
  conversationHistory: HistoryTurn[],
  quotedSnippet?: string,
  council?: ConvenedCouncil
): Promise<ScriptedChatMessage[]> {
  const canonLeadId = canonicalAgentId(leadAgentId);
  const leadAgent = targetAgents.find((a) => a.id === canonLeadId) || getAgentMeta(canonLeadId);
  const peerAgents = targetAgents.filter((a) => a.id !== leadAgent.id);

  // Phase 1: ReAct call for the lead agent to verify literature and arguments for this specific reply
  let reactCards: AgentReActCard[] = [];
  try {
    const leadCard = await executeAgentReAct(
      openai,
      leadAgent,
      userMessage,
      userName,
      conversationHistory
    );
    reactCards = [leadCard];
  } catch (e) {
    console.warn('Directed agent ReAct error:', e);
  }

  // Phase 2: Directed conversation generation
  const sysPrompt = getDirectedAgentReplySystemPrompt(
    leadAgent,
    peerAgents,
    userName,
    quotedSnippet
  );

  const userDisclosedFacts = conversationHistory
    .filter((h) => h.role === 'user')
    .map((h) => h.content.trim())
    .filter(Boolean)
    .join('\n- ');

  const userPrompt = `상담자('${userName}님')가 [${leadAgent.name}] 사상가를 직접 지목하여 답변/반론을 보냈습니다:
"${userMessage}"
${quotedSnippet ? `지목된 이전 발언: "${quotedSnippet}"` : ''}
${userDisclosedFacts ? `\n[상담자가 이전 대화에서 밝힌 사실관계 및 전제]:\n- ${userDisclosedFacts}\n★위 사용자의 새로운 답변/사실관계를 발언에 즉각 반영하세요★\n` : ''}
${reactCards[0] ? `[${leadAgent.name}의 ReAct 탐색 근거]\n- 생각: ${reactCards[0].thought}\n- 핵심 논거: ${reactCards[0].coreArgument}\n- 원전: ${reactCards[0].citationSource || ''} / ${reactCards[0].citationQuote || ''}` : ''}

위 맥락을 바탕으로, ${leadAgent.name}가 주 응답자로서 오늘 당장 실행할 구체적 행동 지침(동사 중심 종결)을 전개하고, 필요 시 동료 사상가가 상대 논거 약점을 찌르며 짧게 1회 끼어드는 3~4개의 역동적인 말풍선을 JSON으로 생성하세요. 절대 서로 타협하거나 입장이 수렴하지 않도록 하세요.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: sysPrompt },
  ];
  if (conversationHistory.length > 0) {
    for (const h of conversationHistory.slice(-4)) {
      messages.push({ role: h.role, content: h.content });
    }
  }
  messages.push({ role: 'user', content: userPrompt });

  try {
    const comp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1200,
    });

    const parsed = JSON.parse(comp.choices[0]?.message?.content || '{}');
    const rawList = Array.isArray(parsed.messages) ? parsed.messages : [];
    if (rawList.length > 0) {
      return enrichDebateMessages(rawList, userName, reactCards);
    }
  } catch (err) {
    console.warn('Directed reply OpenAI error:', err);
  }

  return getFallbackDirectedReply(leadAgent, peerAgents, userMessage, userName, quotedSnippet);
}

function getFallbackDirectedReply(
  leadAgent: AgentMeta,
  peerAgents: AgentMeta[],
  userMessage: string,
  userName: string,
  quotedSnippet?: string
): ScriptedChatMessage[] {
  const peer = peerAgents[0] || (leadAgent.id === 'rationalist' ? AGENTS.utilitarian : AGENTS.rationalist);
  return [
    {
      agentId: leadAgent.id,
      text: `${quotedSnippet ? `방금 말씀드린 바와 같이, ` : ''}${leadAgent.name}의 관점에서는 그 상황의 본질을 직시해야 합니다. 상담자님의 질문은 결국 ${leadAgent.stance}의 문제로 귀결됩니다.`,
      citationSource: leadAgent.keyWork,
      reactThought: `${leadAgent.name}의 핵심 신념으로 상담자의 직접적인 반론에 대응합니다.`,
    },
    {
      agentId: leadAgent.id,
      text: `눈앞의 현실적 타협보다 스스로 세운 내면의 원칙과 가치를 지키는 것이 진정한 해답입니다.`,
    },
    {
      agentId: peer.id,
      replyToAgentName: leadAgent.name,
      text: `잠시만요, ${leadAgent.name}님. 그렇게만 결론내리기엔 현실에서 겪는 실질적인 대가가 너무 크지 않습니까?`,
    },
    {
      agentId: leadAgent.id,
      text: `@${peer.name}님, 실질적 대가를 핑계로 본질을 회피할 순 없습니다.`,
    },
    {
      agentId: leadAgent.id,
      isProbingQuestion: true,
      text: `@${userName}님, 당신의 양심은 지금 무엇을 가리키고 있습니까?`,
    },
  ];
}

function preprocessRawList(rawList: any[], userName: string = '고민자'): any[] {
  const result: any[] = [];
  const agentNames = [
    '불교', '석가모니', '칸트', '유교', '공자', '공리주의', '밀', '벤담',
    '기독교', '아우구스티누스', '도가', '노자', '장자', '실존주의', '사르트르',
    '자유주의', '롤스', '마르크스주의', '마르크스', '힌두 철학', '이슬람'
  ];

  for (const item of rawList) {
    const text = (item.text || '').trim();
    if (!text) continue;

    // If item is already explicitly marked as a probing question and doesn't contain an action scenario, keep it
    if (item.isProbingQuestion && !item.actionScenario && text.length < 150) {
      result.push(item);
      continue;
    }

    const endPattern = /(?:\?|물어보세요[.]?|질문해\s*주세요[.]?|말씀해\s*주세요[.]?|들려주세요[.]?)$/;
    if (!endPattern.test(text)) {
      result.push(item);
      continue;
    }

    // 1. Try split by user mention
    let splitResult: { speech: string; question: string } | null = null;
    const mentionMatch = text.match(
      /(?:^|\s+)(@?[가-힣a-zA-Z0-9_-]+님[,:\s]+[\s\S]*?(?:\?|물어보세요[.]?|질문해\s*주세요[.]?|말씀해\s*주세요[.]?|들려주세요[.]?)[\s.]*)$/
    );
    if (mentionMatch) {
      const qPart = mentionMatch[1].trim();
      const isAgent = agentNames.some((a) => new RegExp('^@?' + a + '님?').test(qPart));
      if (!isAgent) {
        const speechPart = text.slice(0, text.length - mentionMatch[0].length).trim();
        if (speechPart.length >= 10) {
          splitResult = { speech: speechPart, question: qPart };
        }
      }
    }

    // 2. Try split by check-in phrase without mention
    if (!splitResult) {
      const phraseMatch = text.match(
        /(?:^|\s+)((?:저희(?:의)?\s*(?:조언|토론|논쟁|이야기)[\s\S]*?|[^.!?\n]*(?:마음이\s*(?:더\s*)?가시나요|기울고\s*계신가요|어떻게\s*생각하시나요|어느\s*(?:관점|쪽)에|어떤\s*방향으로|어떻게\s*(?:더\s*)?보완)[\s\S]*?(?:\?|물어보세요[.]?|질문해\s*주세요[.]?|말씀해\s*주세요[.]?|들려주세요[.]?)[\s.]*))$/
      );
      if (phraseMatch) {
        const qPart = phraseMatch[1].trim();
        const isAgent = agentNames.some((a) => new RegExp('^@?' + a + '님?').test(qPart));
        if (!isAgent) {
          const speechPart = text.slice(0, text.length - phraseMatch[0].length).trim();
          if (speechPart.length >= 10) {
            splitResult = { speech: speechPart, question: qPart };
          }
        }
      }
    }

    if (splitResult) {
      let questionPart = splitResult.question;
      if (!questionPart.startsWith('@') && !questionPart.includes('님')) {
        questionPart = `@${userName}님, ${questionPart}`;
      }

      result.push({
        ...item,
        text: splitResult.speech,
        isProbingQuestion: false,
      });

      result.push({
        agentId: item.agentId,
        text: questionPart,
        isProbingQuestion: true,
        turnMode: item.turnMode,
        actionScenario: undefined,
      });
    } else {
      result.push(item);
    }
  }
  return result;
}

function enrichDebateMessages(
  rawList: any[],
  userName: string = '고민자',
  reactCards: AgentReActCard[] = [],
  turnMode?: TurnMode
): ScriptedChatMessage[] {
  const CANONICAL_URL_MAP: Record<string, { url: string; title: string }> = {
    buddhist: {
      url: 'https://encykorea.aks.ac.kr/Article/E0078329',
      title: '한국민족문화대백과사전 - 불교 철학',
    },
    rationalist: {
      url: 'https://plato.stanford.edu/entries/kant-moral/',
      title: "Stanford Encyclopedia of Philosophy - Kant's Moral Philosophy",
    },
    confucian: {
      url: 'https://encykorea.aks.ac.kr/Article/E0013063',
      title: '한국민족문화대백과사전 - 유교 윤리와 도리',
    },
    utilitarian: {
      url: 'https://plato.stanford.edu/entries/utilitarianism-history/',
      title: 'Stanford Encyclopedia of Philosophy - History of Utilitarianism',
    },
    christian: {
      url: 'https://plato.stanford.edu/entries/augustine/',
      title: 'Stanford Encyclopedia of Philosophy - Saint Augustine',
    },
    daoist: {
      url: 'https://plato.stanford.edu/entries/daoism/',
      title: 'Stanford Encyclopedia of Philosophy - Daoism',
    },
    existentialist: {
      url: 'https://plato.stanford.edu/entries/existentialism/',
      title: 'Stanford Encyclopedia of Philosophy - Existentialism',
    },
    liberal: {
      url: 'https://plato.stanford.edu/entries/liberalism/',
      title: 'Stanford Encyclopedia of Philosophy - Liberalism',
    },
  };

  const cardMap = new Map<string, AgentReActCard>();
  for (const card of reactCards) {
    cardMap.set(card.agentId, card);
  }

  const processedList = preprocessRawList(rawList, userName);

  return processedList.map((item: any, idx: number) => {
    const rawAgentId = item.agentId || 'buddhist';
    const canonId = canonicalAgentId(rawAgentId);
    const agentMeta = getAgentMeta(canonId);
    const card = cardMap.get(canonId);

    let text = (item.text || '').trim();
    text = normalizeKoreanMentions(text, userName);

    // Determine the speaker of the immediately preceding turn
    // At idx === 0, the immediate preceding speaker in the dialogue was the user!
    const prevSpeakerId = idx > 0 ? canonicalAgentId(rawList[idx - 1]?.agentId) : undefined;
    const prevSpeakerName = prevSpeakerId
      ? getAgentMeta(prevSpeakerId).name
      : (userName || '고민자');

    let replyTo = item.replyToAgentName ? normalizeAgentKoreanName(item.replyToAgentName) : undefined;
    if (!replyTo) {
      const mentionMatch = text.match(/^@([가-힣a-zA-Z]+)님?|^([가-힣a-zA-Z]+)님\s*[,:]/);
      if (mentionMatch) {
        const candidate = mentionMatch[1] || mentionMatch[2];
        if (candidate === userName || candidate === '고민자' || candidate === '상담자') {
          replyTo = userName !== '고민자' ? userName : '고민자';
        } else if (candidate) {
          replyTo = normalizeAgentKoreanName(candidate);
        }
      }
    } else if (replyTo === '고민자' || replyTo === userName || replyTo === '상담자') {
      replyTo = userName !== '고민자' ? userName : '고민자';
    }

    // If addressing the immediately preceding speaker: suppress @tag & replyTo!
    const isTalkingToPrevSpeaker = Boolean(
      prevSpeakerName &&
      replyTo &&
      (replyTo === prevSpeakerName ||
        ((prevSpeakerName === '고민자' || prevSpeakerName === userName) &&
          (replyTo === '고민자' || replyTo === userName)))
    );

    if (isTalkingToPrevSpeaker) {
      replyTo = undefined;
      // Strip leading @callout if explicitly addressed to immediate speaker
      const immediateMentionRegex = new RegExp(
        `^@(${prevSpeakerName}|고민자|${userName})(님)?\\s*[,:]?\\s*|^(${prevSpeakerName}|고민자|${userName})님\\s*[,:]\\s*`,
        'i'
      );
      text = text.replace(immediateMentionRegex, '');
    }

    let source = item.citationSource ? String(item.citationSource).trim() : undefined;
    let quote = item.citationQuote ? String(item.citationQuote).trim() : undefined;

    if (!source && card?.citationSource && (item.interactionType?.includes('원전') || text.includes('『'))) {
      source = card.citationSource;
      quote = card.citationQuote;
    }

    let url: string | undefined = undefined;
    let title: string | undefined = undefined;

    if (source && CANONICAL_URL_MAP[canonId]) {
      url = CANONICAL_URL_MAP[canonId].url;
      title = CANONICAL_URL_MAP[canonId].title;
    }

    const targetAgent = item.targetAgentId
      ? canonicalAgentId(item.targetAgentId)
      : replyTo && replyTo !== userName && replyTo !== '고민자'
        ? canonicalAgentId(replyTo)
        : undefined;

    let conclusionType: 'consensus' | 'irreconcilable' | undefined = item.debateConclusionType;
    let conclusionSummary: string | undefined = item.debateConclusionSummary;
    if (!conclusionType) {
      if (text.includes('① 합의:') || text.includes('합의:')) {
        conclusionType = 'consensus';
        const match = text.match(/(?:①\s*)?합의:\s*([^.\n]+)/);
        if (match) conclusionSummary = match[1].trim();
      } else if (text.includes('② 입장 차 확인:') || text.includes('입장 차 확인:')) {
        conclusionType = 'irreconcilable';
        const match = text.match(/(?:②\s*)?입장 차 확인:\s*([^.\n]+)/);
        if (match) conclusionSummary = match[1].trim();
      }
    }

    const isProbingQuestion = Boolean(
      item.isProbingQuestion ||
      ((text.includes('?') || text.includes('물어보세요') || text.includes('질문해 주세요')) &&
        (text.includes('눈치채') ||
          text.includes('알고 계신') ||
          text.includes('가능성은') ||
          text.includes('더 오래') ||
          text.includes('누구와') ||
          text.includes('확인해') ||
          text.includes('마련해') ||
          text.includes('어떤 방향') ||
          text.includes('어떻게 더') ||
          text.includes('어떻게 생각') ||
          text.includes('마음이 가시나요') ||
          text.includes('기울고 계신가요') ||
          text.includes('물어보세요') ||
          text.includes('궁금한 점') ||
          text.includes('질문해 주세요')))
    );

    return {
      agentId: canonId,
      text,
      turnMode,
      replyToAgentName: replyTo,
      targetAgentId: targetAgent,
      actionScenario: item.actionScenario || undefined,
      debateRound: typeof item.debateRound === 'number' ? item.debateRound : undefined,
      debateConclusionType: conclusionType,
      debateConclusionSummary: conclusionSummary,
      isProbingQuestion,
      citationSource: source,
      citationQuote: quote,
      sourceUrl: url,
      sourceTitle: title,
      reactThought: card?.thought || (source ? `${agentMeta.name} 사상의 핵심 관점에서 상황의 본질을 성찰합니다.` : undefined),
      reactSearch: card?.searchQuery || (source ? `${source} ${quote ? quote.slice(0, 20) : ''}`.trim() : undefined),
      reactRead: card?.reading || quote || (source ? `${source}의 가르침을 통해 조명` : undefined),
    };
  });
}

/**
 * Execute an individual agent as an independent model call with OpenAI Responses API + Web Search.
 * Returns 1~2 chat messages with conversational contrast (short question/reaction + concise advice with authentic URL).
 */
async function executeIndividualAgent(
  openai: OpenAI,
  agent: AgentMeta,
  userMessage: string,
  userName: string,
  conversationHistory: HistoryTurn[],
  councilAgents: AgentMeta[] = [AGENTS.buddhist, AGENTS.rationalist, AGENTS.confucian, AGENTS.utilitarian]
): Promise<ScriptedChatMessage[]> {
  const instructions = getIndividualAgentSystemPrompt(agent, userName, councilAgents);
  const userPrompt = `상담자(${userName}님)의 고민: "${userMessage}"

반드시 당신(${agent.name})의 관점에서 "생각 → 검색 → 읽기 → 발언"의 ReAct 흐름으로 신뢰할 수 있는 문헌을 웹 검색하여 실제 근거와 원전 구절, 실제로 검색된 웹 URL을 포함하여 지정된 형식으로 1~2개의 생생한 대화 말풍선을 작성하세요. 절대 긴 강의식 글을 쓰지 마세요.`;

  try {
    // Primary: OpenAI Responses API with built-in web search tool preview
    const res = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      instructions,
      input: userPrompt,
    });

    return parseAgentResponses(res.output_text, res.output, agent, userName);
  } catch (err: any) {
    console.warn(`[Agent ${agent.name}] Responses API failed, falling back to chat completions:`, err.message);

    // Secondary Fallback: Chat Completions API with gpt-4o
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: instructions },
      ];
      if (conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-4)) {
          messages.push({ role: h.role, content: h.content });
        }
      }
      messages.push({ role: 'user', content: userPrompt });

      const comp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.72,
        max_tokens: 650,
      });

      const rawText = comp.choices[0]?.message?.content || '';
      return parseAgentResponses(rawText, null, agent, userName);
    } catch (fallbackErr: any) {
      console.error(`[Agent ${agent.name}] Fallback failed:`, fallbackErr);
      return getSingleAgentFallbackMessages(agent, userMessage, userName);
    }
  }
}

/**
 * Parse an agent's response text and annotations into clean chat messages representation.
 * Distinguishes between short reactions/questions and concise advice with real source citations.
 */
function parseAgentResponses(
  rawText: string = '',
  outputItems: any[] | null | undefined,
  agent: AgentMeta,
  userName: string = '고민자'
): ScriptedChatMessage[] {
  let text = (rawText || '').trim();

  // 1. Extract ReAct steps (thought, search, read)
  const thoughtMatch = text.match(/(?:-\s*생각|생각):\s*([^\n]+)/i);
  const searchMatch = text.match(/(?:-\s*검색|검색):\s*([^\n]+)/i);
  const readMatch = text.match(/(?:-\s*읽기|읽기):\s*([^\n]+)/i);
  const reactThought = thoughtMatch ? thoughtMatch[1].trim() : undefined;
  const reactSearch = searchMatch ? searchMatch[1].trim() : undefined;
  const reactRead = readMatch ? readMatch[1].trim() : undefined;

  // 2. Extract Responses API annotations URLs
  const annotationUrls: { title?: string; url: string }[] = [];
  if (Array.isArray(outputItems)) {
    for (const item of outputItems) {
      if (item && item.content) {
        for (const c of item.content) {
          if (c.annotations) {
            for (const a of c.annotations) {
              if (a.type === 'url_citation' && a.url) {
                annotationUrls.push({ title: a.title, url: a.url });
              }
            }
          }
        }
      }
    }
  }

  // 3. Extract [발언 1] / [메시지 1] and [발언 2] / [메시지 2]
  const sp1 = text.match(/\[(?:발언\s*1|메시지\s*1)\]([\s\S]*?)(?=\[(?:발언\s*2|메시지\s*2)|$)/i);
  const sp2 = text.match(/\[(?:발언\s*2|메시지\s*2)\]([\s\S]*)/i);

  // Canonical authentic academic source fallback if web search didn't yield a direct link
  const CANONICAL_URL_MAP: Record<string, { url: string; title: string }> = {
    buddhist: {
      url: 'https://encykorea.aks.ac.kr/Article/E0078329',
      title: '한국민족문화대백과사전 - 불교 철학',
    },
    rationalist: {
      url: 'https://plato.stanford.edu/entries/kant-moral/',
      title: "Stanford Encyclopedia of Philosophy - Kant's Moral Philosophy",
    },
    confucian: {
      url: 'https://encykorea.aks.ac.kr/Article/E0013063',
      title: '한국민족문화대백과사전 - 유교 윤리와 도리',
    },
    utilitarian: {
      url: 'https://plato.stanford.edu/entries/utilitarianism-history/',
      title: 'Stanford Encyclopedia of Philosophy - History of Utilitarianism',
    },
  };

  const results: ScriptedChatMessage[] = [];

  const extractCitation = (blockText: string) => {
    let source = '';
    let quote = '';
    let url = '';
    let title = '';

    const srcMatch = blockText.match(/(?:-\s*출처|\[?(?:원전\/)?출처\]?):\s*([^\n]+)/i);
    if (srcMatch) source = srcMatch[1].trim();

    const qteMatch = blockText.match(/(?:-\s*구절|\[?(?:원전\s*)?(?:구절|인용구?)\]?):\s*([^\n]+)/i);
    if (qteMatch) quote = qteMatch[1].trim().replace(/^["'「『]|["'」』]$/g, '');

    const explicitUrl = blockText.match(/(?:-\s*URL|\[?참고\s*URL\]?):\s*([^\n]+)/i);
    if (explicitUrl) {
      const candidate = explicitUrl[1].trim();
      const mdLinkMatch = candidate.match(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/);
      if (mdLinkMatch) {
        title = mdLinkMatch[1];
        url = mdLinkMatch[2];
      } else {
        const httpMatch = candidate.match(/https?:\/\/[^\s\)\]]+/);
        if (httpMatch) url = httpMatch[0];
      }
    }

    if (!url && annotationUrls.length > 0) {
      url = annotationUrls[0].url;
      title = annotationUrls[0].title || '';
    }

    if (!url) {
      const anyHttp = blockText.match(/https?:\/\/[^\s\)\]]+/);
      if (anyHttp) url = anyHttp[0];
    }

    if (url && /example\.com|dummy|test\.com|localhost/i.test(url)) {
      url = '';
    }

    if (!url && CANONICAL_URL_MAP[agent.id]) {
      url = CANONICAL_URL_MAP[agent.id].url;
      if (!title) title = CANONICAL_URL_MAP[agent.id].title;
    }

    if (!source && annotationUrls.length > 0 && annotationUrls[0].title) {
      source = annotationUrls[0].title;
    }
    if (!source) {
      source = agent.keyWork;
    }

    return { source, quote, url, title };
  };

  const cleanBodyText = (body: string): string => {
    let clean = body
      .replace(/(?:-\s*대상|대상):\s*[^\n]+/gi, '')
      .replace(/(?:-\s*내용|내용):\s*/gi, '')
      .replace(/(?:-\s*출처|\[?(?:원전\/)?출처\]?):\s*[^\n]+/gi, '')
      .replace(/(?:-\s*구절|\[?(?:원전\s*)?(?:구절|인용구?)\]?):\s*[^\n]+/gi, '')
      .replace(/(?:-\s*URL|\[?참고\s*URL\]?):\s*[^\n]+/gi, '')
      .replace(/\[ReAct\s*탐색\][\s\S]*?(?=\[발언|\[메시지|$)/gi, '')
      .replace(/###\s*\[?(?:생각|검색|읽기|답변)[^\]\n]*\]?/gi, '')
      .trim();

    return normalizeKoreanMentions(clean, userName);
  };

  if (sp1) {
    const raw1 = sp1[1];
    const tgtMatch = raw1.match(/(?:-\s*대상|대상):\s*([^\n]+)/i);
    let replyTarget: string | undefined = undefined;
    if (tgtMatch) {
      const rawTarget = tgtMatch[1].trim();
      if (!rawTarget.includes(userName) && !rawTarget.includes('고민자')) {
        replyTarget = normalizeAgentKoreanName(rawTarget);
      }
    }

    const clean1 = cleanBodyText(raw1);
    if (clean1.length > 0) {
      results.push({
        agentId: agent.id,
        text: clean1,
        replyToAgentName: replyTarget,
      });
    }
  }

  if (sp2) {
    const raw2 = sp2[1];
    const { source, quote, url, title } = extractCitation(raw2);
    const clean2 = cleanBodyText(raw2);

    if (clean2.length > 0) {
      results.push({
        agentId: agent.id,
        text: clean2,
        citationSource: source,
        citationQuote: quote || undefined,
        sourceUrl: url || undefined,
        sourceTitle: title || undefined,
        reactThought,
        reactSearch,
        reactRead,
      });
    }
  }

  // Fallback if neither [발언 1] nor [발언 2] were delimited
  if (results.length === 0) {
    const { source, quote, url, title } = extractCitation(text);
    const clean = cleanBodyText(text);

    const sentences = clean.split(/(?<=[.?!])\s+/);
    if (sentences.length >= 3 && clean.length > 80) {
      const first = sentences[0];
      const rest = sentences.slice(1).join(' ');
      results.push({
        agentId: agent.id,
        text: first,
      });
      results.push({
        agentId: agent.id,
        text: rest,
        citationSource: source,
        citationQuote: quote || undefined,
        sourceUrl: url || undefined,
        sourceTitle: title || undefined,
        reactThought,
        reactSearch,
        reactRead,
      });
    } else {
      results.push({
        agentId: agent.id,
        text: clean || text,
        citationSource: source,
        citationQuote: quote || undefined,
        sourceUrl: url || undefined,
        sourceTitle: title || undefined,
        reactThought,
        reactSearch,
        reactRead,
      });
    }
  }

  return results;
}

/**
 * Fallback responses for an individual agent providing conversational short & advice turns.
 */
function getSingleAgentFallbackMessages(
  agent: AgentMeta,
  question: string,
  userName: string = '고민자'
): ScriptedChatMessage[] {
  if (agent.id === 'buddhist') {
    return [
      {
        agentId: 'buddhist',
        text: `@${userName}님, 그 결정을 망설이게 만드는 마음에 '타인의 인정'이나 '비난에 대한 공포'가 섞여 있지는 않나요?`,
        reactThought: '고민자의 마음 밑바닥에 자리한 불안과 결과를 완벽히 통제하려는 집착을 성찰합니다.',
        reactSearch: '숫타니파타 연기 무집착 법구경',
        reactRead: '모든 것은 원인과 조건에 의해 변화하니 집착을 비우라.',
        isProbingQuestion: true,
      },
      {
        agentId: 'buddhist',
        actionScenario: '스마트폰을 끄고 3분간 들숨과 날숨을 세며 불안을 가라앉힌 뒤, 내가 진짜 두려워하는 것이 무엇인지 백지에 세 단어로 적어보십시오.',
        text: `@${userName}님, 결과를 완벽히 통제하려는 집착을 잠시 내려놓으십시오. 오늘 당장 스마트폰을 끄고 3분간 숨을 고른 뒤, 감정을 뺀 객관적 사실만을 백지에 세 단어로 적어 정리하십시오.`,
        citationSource: '『숫타니파타』',
        citationQuote: '그물에 걸리지 않는 바람처럼, 진흙에 물들지 않는 연꽃처럼 가라.',
        sourceUrl: 'https://encykorea.aks.ac.kr/Article/E0078329',
      },
    ];
  }

  if (agent.id === 'rationalist') {
    return [
      {
        agentId: 'rationalist',
        text: `마음을 비운다는 핑계로 마땅히 져야 할 현실의 도덕적 책임을 회피해서는 안 됩니다.`,
        replyToAgentName: '불교',
        targetAgentId: 'buddhist',
        debateRound: 1,
        reactThought: '감정이나 비움 뒤에 숨은 도덕적 회피를 경계하고 정언명령을 세웁니다.',
        reactSearch: '칸트 도덕형이상학 정초 정언명령 의무론',
        reactRead: '인간의 존엄성과 도덕법칙은 상황에 따라 타협될 수 없다.',
      },
      {
        agentId: 'rationalist',
        actionScenario: '오늘 당장 내가 본 사실 관계를 감정이나 핑계 없이 시간순으로 한 줄씩 종이에 적어 정리하십시오.',
        text: `@${userName}님, 거짓이나 회피를 전제로 성립되는 선택은 결코 정당화될 수 없습니다. 오늘 당장 내가 목격한 사실 관계만을 감정이나 핑계 없이 시간순으로 한 줄씩 종이에 적어 정리하십시오.`,
        citationSource: '칸트 『도덕형이상학 정초』',
        citationQuote: '네 의지의 준칙이 언제나 동시에 보편적 입법의 원리가 될 수 있도록 행위하라.',
        sourceUrl: 'https://plato.stanford.edu/entries/kant-moral/',
      },
    ];
  }

  if (agent.id === 'confucian') {
    return [
      {
        agentId: 'confucian',
        text: `차가운 원칙만 서슬 퍼렇게 들이대다 사람 마음에 깊은 상처를 주면 어찌합니까?`,
        replyToAgentName: '칸트',
        targetAgentId: 'rationalist',
        debateRound: 2,
        reactThought: '차가운 보편 원칙보다 인간에 대한 따뜻한 인(仁)과 관계의 도리를 살핍니다.',
        reactSearch: '논어 인(仁) 예(禮) 신(信) 인간관계',
        reactRead: '군자는 근본에 힘쓰며, 사람과의 신뢰와 예의를 잃지 않는다.',
      },
      {
        agentId: 'confucian',
        actionScenario: "친구와 둘만 있는 조용한 자리를 잡고, 제3자를 탓하지 말고 '내가 이런 걸 직접 목격했다'는 사실만 담담히 전하십시오.",
        text: `@${userName}님, 사람 사이의 신의(信)와 예(禮)는 책 속의 글자가 아닙니다. 오늘 친구와 둘만 만날 수 있는 조용한 자리를 잡고, 비난 섞지 말고 목격한 사실만을 담담하게 직접 전하십시오.`,
        citationSource: '『논어』 학이편',
        citationQuote: '군자는 근본에 힘쓰나니, 근본이 서면 도(道)가 생겨난다.',
        sourceUrl: 'https://encykorea.aks.ac.kr/Article/E0013063',
      },
    ];
  }

  // Utilitarian
  return [
    {
      agentId: 'utilitarian',
      text: `듣기 좋은 명분과 예의만 찾다가 모두가 파국을 맞으면 그게 무슨 도리입니까?`,
      replyToAgentName: '유교',
      targetAgentId: 'confucian',
      debateRound: 3,
      debateConclusionType: 'divergence',
      debateConclusionSummary: '직접 사실을 밝히는 의리(유교) vs 충격 완화를 위한 계산과 시점 조율(공리주의)',
      reactThought: '공허한 명분론이 초래하는 실질적 고통과 장기적 파급 효과를 계산합니다.',
      reactSearch: '존 스튜어트 밀 공리주의 최대 다수의 최대 행복',
      reactRead: '행위의 도덕성은 결과적으로 행복을 증진하고 고통을 줄이는 데 있다.',
    },
    {
      agentId: 'utilitarian',
      actionScenario: "말을 꺼내기 전에 '말했을 때'와 '침묵했을 때' 각각 누가 얼마나 상처받는지 종이에 1점부터 10점까지 적어 비교하십시오.",
      text: `@${userName}님, 공허한 명분만 따지다 모두가 파국을 맞으면 안 됩니다. 말을 꺼내기 전에 오늘 종이를 반으로 접어, 말했을 때와 침묵했을 때 각자가 입을 피해 점수를 1~10점으로 매겨 비교해 보십시오. ② 입장 차 확인: 우리는 '직접 사실을 밝히는 의리'와 '충격 완화를 위한 계산과 시점 조율'이라는 우선순위에서 갈립니다.`,
      citationSource: '존 스튜어트 밀 『공리주의』',
      citationQuote: '행동의 옳고 그름은 그것이 행복을 증진하는 경향에 비례한다.',
      sourceUrl: 'https://plato.stanford.edu/entries/utilitarianism-history/',
    },
  ];
}

function getFallbackResponse(
  action: 'chat' | 'idle_debate' | 'idle_nudge',
  question: string,
  userName: string = '고민자',
  council?: ConvenedCouncil,
  turnMode: TurnMode = 'advice'
): ScriptedChatMessage[] {
  if (action === 'idle_debate') {
    return [
      {
        agentId: 'rationalist',
        targetAgentId: 'utilitarian',
        replyToAgentName: '공리주의',
        debateRound: 1,
        actionScenario: '오늘 종이에 감정을 배제하고 객관적 사실과 도덕적 의무의 경계를 명확히 그어 정리하십시오.',
        text: '@공리주의, 실질적 피해를 줄인다는 계산만 앞세워 침묵한다면 기만과 배신을 묵인하는 것과 무엇이 다릅니까? 당장 오늘 종이에 사실과 거짓의 경계를 명확히 그어 직시하십시오.',
        citationSource: '칸트 『도덕형이상학 정초』',
        sourceUrl: 'https://plato.stanford.edu/entries/kant-moral/',
      },
      {
        agentId: 'utilitarian',
        targetAgentId: 'rationalist',
        replyToAgentName: '칸트',
        debateRound: 2,
        debateConclusionType: 'divergence',
        debateConclusionSummary: '원칙에 따른 즉각적 진실 공개(칸트) vs 파국 방지를 위한 현실적 대비(공리주의)',
        actionScenario: '진실을 밝히기 전 상대방이 겪을 심리적 타격을 완화할 안전망과 지지자를 먼저 확보하십시오.',
        text: "@칸트, 원칙만 내세워 당사자가 회복 불능의 파탄을 겪게 방치하는 것은 무책임한 폭력입니다. 진실을 말하더라도 상대가 충격을 견딜 완충 장치부터 준비해야 합니다. ② 입장 차 확인: 우리는 '원칙에 따른 즉각적 진실 공개'와 '파국을 방지하기 위한 현실적 대비'라는 우선순위에서 갈립니다.",
        citationSource: '존 스튜어트 밀 『공리주의』',
        sourceUrl: 'https://plato.stanford.edu/entries/utilitarianism-history/',
      },
    ];
  }

  if (action === 'idle_nudge') {
    const isWorkTopic = /직장|일|회사|퇴사|이직|승진|창업|꿈|워라밸|사업|돈|성공|커리어/i.test(question);
    const isRelationTopic = /친구|연인|애인|남자친구|여자친구|남편|아내|부모|가족|결혼|인간관계|서운|신뢰|바람|배신/i.test(question);
    const isMoralTopic = /거짓말|솔직|비밀|양심|도덕|원칙|규칙|고백|죄책감/i.test(question);

    const topicTemplates: ScriptedChatMessage[] = [];

    if (isWorkTopic) {
      topicTemplates.push(
        {
          agentId: 'rationalist',
          isProbingQuestion: true,
          text: `@${userName}님, 이직이나 새로운 도전을 고민하실 때, 만약 실패하더라도 최소 6개월 이상 버틸 수 있는 구체적인 비상 생활 자금을 이미 마련해두셨나요?`,
        },
        {
          agentId: 'utilitarian',
          isProbingQuestion: true,
          text: `@${userName}님, 지금의 직장에서 느끼는 갈등이 '업무 내용과 비전' 때문인가요, 아니면 '특정 상사나 동료와의 인간관계' 때문인가요?`,
        },
        {
          agentId: 'existentialist',
          isProbingQuestion: true,
          text: `@${userName}님, 현재 직장에서 이 문제를 해결하기 위해 직속 상사나 인사팀에 공식적으로 면담을 신청해보신 적이 있습니까?`,
        }
      );
    } else if (isRelationTopic) {
      topicTemplates.push(
        {
          agentId: 'confucian',
          isProbingQuestion: true,
          text: `@${userName}님, 그 친구가 이미 상대의 미묘한 변화나 거짓말을 어느 정도 눈치채고 있을 가능성을 직접 감지하신 적이 있나요?`,
        },
        {
          agentId: 'rationalist',
          isProbingQuestion: true,
          text: `@${userName}님, 두 사람 중 상담자님과 더 오랜 기간 깊은 신뢰와 비밀을 나눠온 쪽은 누구인가요?`,
        },
        {
          agentId: 'utilitarian',
          isProbingQuestion: true,
          text: `@${userName}님, 지금 말하지 않고 침묵한다면, 훗날 당신이 이 사실을 미리 알고 있었다는 것을 그 친구가 알게 될 가능성이 높습니까?`,
        }
      );
    } else if (isMoralTopic) {
      topicTemplates.push(
        {
          agentId: 'rationalist',
          isProbingQuestion: true,
          text: `@${userName}님, 지금 침묵을 지킨다면 나중에 이 비밀이 제3자를 통해 폭로되었을 때 당신도 공범이나 방조자로 지목될 위험이 있습니까?`,
        },
        {
          agentId: 'utilitarian',
          isProbingQuestion: true,
          text: `@${userName}님, 당신이 고백했을 때 상대방에게 실질적인 금전적·사회적 불이익이 즉시 발생합니까, 아니면 감정적 충격에 그칩니까?`,
        }
      );
    }

    const defaultTemplates: ScriptedChatMessage[] = [
      {
        agentId: 'buddhist',
        isProbingQuestion: true,
        text: `@${userName}님, 결정을 내리기까지 스스로 정해둔 명확한 마감 기한이나 디데이가 정해져 있나요?`,
      },
      {
        agentId: 'confucian',
        isProbingQuestion: true,
        text: `@${userName}님, 이 문제로 인해 이미 당사자 중 누군가와 심각한 말다툼이나 갈등을 겪은 적이 있습니까?`,
      },
      {
        agentId: 'rationalist',
        isProbingQuestion: true,
        text: `@${userName}님, 이 문제를 상담자님 혼자만의 결단으로 해결할 수 있습니까, 아니면 다른 관계자의 동의가 반드시 필요합니까?`,
      },
      {
        agentId: 'utilitarian',
        isProbingQuestion: true,
        text: `@${userName}님, 두 선택지 중 한쪽을 선택했을 때 당장 오늘 밤부터 후회할 것이 확실한 쪽이 있습니까?`,
      },
    ];

    const pool = topicTemplates.length > 0 ? [...topicTemplates, ...defaultTemplates] : defaultTemplates;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return [picked];
  }

  if (turnMode === 'debate') {
    return [
      {
        agentId: 'confucian',
        text: `@${userName}님의 그 결단에는 관계를 아끼고 소중히 지키려는 따뜻한 인(仁)의 마음이 담겨 있습니다. 쉬운 회피 대신 정면으로 마주하려는 태도 자체가 큰 용기입니다.`,
        actionScenario: '오늘 상대방의 입장에서 느낄 감정을 먼저 헤아려보고 메모하십시오.',
        turnMode: 'debate',
      },
      {
        agentId: 'utilitarian',
        replyToAgentName: '유교',
        text: `유교님의 말씀대로 용기는 귀하나, 상대가 준비되지 않은 상태에서 일방적으로 전달되면 감당하기 힘든 파국을 부를 수 있습니다. 말을 꺼내기 전 상대의 심리적 충격을 완화할 지지자나 안전한 시간대를 먼저 확보하는 보완책이 반드시 필요합니다.`,
        actionScenario: '진실을 전하기 전 상대방이 겪을 심리적 타격을 완화할 안전망과 지지자를 먼저 확보하십시오.',
        turnMode: 'debate',
      },
      {
        agentId: 'rationalist',
        replyToAgentName: '공리주의',
        text: `공리주의님, 완충 장치를 핑계로 진실을 왜곡하거나 시점을 미루어선 안 됩니다. 감정이나 억측을 섞지 말고, 오직 객관적으로 목격한 사실만을 정직하게 정리해 전해야 합니다.`,
        actionScenario: '상대방이 이미 알고 있는 사실과 아직 모르는 사실의 경계를 명확히 분리하십시오.',
        turnMode: 'debate',
      },
      {
        agentId: 'buddhist',
        replyToAgentName: '칸트',
        text: `칸트님 말씀처럼 사실을 담담히 전하되, 전하는 사람 자신의 마음에 불안이나 두려움이라는 집착이 없어야 상대에게도 상처가 덜 남습니다. 먼저 마음을 비우는 것이 우선입니다.`,
        turnMode: 'debate',
      },
      // 별도의 독립된 질문 말풍선 (Separate Dialogue Bubble)
      {
        agentId: 'rationalist',
        isProbingQuestion: true,
        text: `@${userName}님, 사상가들의 토론을 통해 진실을 밝히는 용기와 함께 충격을 줄이기 위한 사전 준비의 필요성을 짚어보았습니다. 이러한 점들을 들으신 지금, 처음 생각하신 결정을 어떻게 더 구체적으로 보완하여 실행하고 싶으신가요? 또는 이해가 안 되거나 더 궁금한 점이 있다면 편하게 물어보세요.`,
        turnMode: 'debate',
      },
    ];
  }

  return [
    {
      agentId: 'buddhist',
      text: `결과를 완벽히 통제하려는 집착을 잠시 내려놓으십시오. 오늘 당장 스마트폰을 끄고 3분간 숨을 고른 뒤, 감정을 뺀 객관적 사실만을 백지에 세 단어로 적어 정리하십시오.`,
      actionScenario: '스마트폰을 끄고 3분간 들숨과 날숨을 세며 불안을 가라앉힌 뒤 객관적 사실을 정리하십시오.',
      citationSource: '『숫타니파타』',
      citationQuote: '그물에 걸리지 않는 바람처럼, 진흙에 물들지 않는 연꽃처럼 가라.',
      sourceUrl: 'https://encykorea.aks.ac.kr/Article/E0078329',
      turnMode: 'advice',
    },
    {
      agentId: 'rationalist',
      text: `거짓이나 회피를 전제로 성립되는 선택은 결코 정당화될 수 없습니다. 오늘 당장 내가 목격한 사실 관계만을 감정이나 핑계 없이 시간순으로 한 줄씩 종이에 적어 정리하십시오.`,
      actionScenario: '목격한 사실만을 감정이나 억측 없이 시간순으로 한 줄씩 종이에 적어 정리하십시오.',
      citationSource: '임마누엘 칸트 『윤리형이상학 정초』',
      citationQuote: '네 의지의 준칙이 언제나 동시에 보편적 입법의 원리가 될 수 있도록 행위하라.',
      sourceUrl: 'https://plato.stanford.edu/entries/kant-moral/',
      turnMode: 'advice',
    },
    {
      agentId: 'confucian',
      text: `사람 사이의 신의(信)와 예(禮)는 책 속의 글자가 아닙니다. 오늘 친구와 둘만 만날 수 있는 조용한 자리를 잡고, 비난 섞지 말고 목격한 사실만을 담담하게 직접 전하십시오.`,
      actionScenario: '친구와 둘만 있는 조용한 자리를 잡고, 비난하지 말고 본 사실만 담담히 전하십시오.',
      citationSource: '『논어』 학이편',
      citationQuote: '군자는 근본에 힘쓰나니, 근본이 서면 도(道)가 생겨난다.',
      sourceUrl: 'https://encykorea.aks.ac.kr/Article/E0013063',
      turnMode: 'advice',
    },
    {
      agentId: 'utilitarian',
      text: `공허한 명분보다 실질적 피해를 줄이는 지혜가 필요합니다. 말을 꺼내기 전에 오늘 종이를 반으로 접어, 말했을 때와 침묵했을 때 각자가 입을 피해 점수를 1~10점으로 매겨 비교해 보십시오.`,
      actionScenario: '말했을 때와 안 했을 때 각각의 피해 점수를 1~10점으로 적어 비교하십시오.',
      citationSource: '존 스튜어트 밀 『공리주의』',
      citationQuote: '행동의 옳고 그름은 그것이 행복을 증진하는 경향에 비례한다.',
      sourceUrl: 'https://plato.stanford.edu/entries/utilitarianism-history/',
      turnMode: 'advice',
    },
    // 별도의 독립된 질문 말풍선 (Separate Dialogue Bubble)
    {
      agentId: 'utilitarian',
      isProbingQuestion: true,
      text: `@${userName}님, 저희 사상가들의 조언을 모두 들어보셨습니다. 불교의 비움, 칸트의 원칙, 유교의 관계, 공리주의의 실리 중 지금 어느 방향으로 마음이 더 기울고 계신가요? 혹시 조언 중 이해가 안 되거나 더 궁금한 점이 있다면 편하게 물어보세요.`,
      turnMode: 'advice',
    },
  ];
}

function getFallbackDilemma(excludeQuestions: string[] = []): {
  category: string;
  question: string;
  stances: { label: string; userOpinion: string }[];
} {
  const pool = [
    {
      category: '가족의 도리 vs 자아실현',
      question:
        '가족을 생각하면 안정적인 직장에 남는 게 맞는 것 같은데, 오랜 꿈이던 창업에도 도전해보고 싶어요. 어떻게 해야 할까요?',
      stances: [
        {
          label: '가족을 위해 안정적인 직장에 남는다',
          userOpinion: '가족에 대한 책임과 안정이 우선이므로 지금은 자리를 지키는 게 맞다고 생각해요.',
        },
        {
          label: '내 꿈과 도전을 위해 창업한다',
          userOpinion: '한 번뿐인 인생에서 내 꿈을 실현하고 도전하는 결단이 필요하다고 생각해요.',
        },
      ],
    },
    {
      category: '정직과 우정의 갈등',
      question:
        '친구의 연인이 바람피우는 걸 목격했습니다. 친구에게 솔직하게 얘기해주는 게 맞을까요, 모른척해야 할까요?',
      stances: [
        {
          label: '친구에게 솔직하게 알려준다',
          userOpinion: '친구를 진정으로 위한다면 아프더라도 진실을 말해주는 것이 도리라고 생각해요.',
        },
        {
          label: '오해와 파장을 막기 위해 침묵한다',
          userOpinion: '타인의 연애 문제에 섣불리 개입하기보다 신중하게 지켜보는 게 낫다고 생각해요.',
        },
      ],
    },
    {
      category: '원칙과 배려의 갈등',
      question:
        '친구가 열심히 준비한 발표를 망치고 자책할 때, 솔직하게 냉정한 피드백을 해야 할까요, 따뜻하게 감싸주어야 할까요?',
      stances: [
        {
          label: '솔직하고 냉정하게 피드백한다',
          userOpinion: '친구의 진정한 성장을 위해서는 아프더라도 정직한 진실을 말해주어야 해요.',
        },
        {
          label: '따뜻하게 감싸주며 위로한다',
          userOpinion: '지금은 무너진 마음을 보듬고 용기를 주는 따뜻한 배려가 먼저라고 생각해요.',
        },
      ],
    },
  ];

  if (excludeQuestions && excludeQuestions.length > 0) {
    const filtered = pool.filter(
      (item) => !excludeQuestions.some((eq) => eq.includes(item.question) || item.question.includes(eq))
    );
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
