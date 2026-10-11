import { AgentId, AgentMeta } from './types';
import { AGENTS, AGENT_ORDER, canonicalAgentId, getAgentMeta } from './agents';

export interface LikedAdvice {
  messageId: string;
  sessionId?: string;
  agentId: AgentId;
  agentName: string;
  agentStance: string;
  content: string;
  citationSource?: string;
  citationQuote?: string;
  likedAt: string;
}

export interface PhilosophyDistribution {
  agentId: AgentId;
  name: string;
  stance: string;
  icon: string;
  count: number;
  percentage: number;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
  gradientClass: string;
  gradientStyle: string;
  keyWork: string;
  summary: string;
}

export interface ValueSystemAnalysis {
  totalLikes: number;
  distribution: PhilosophyDistribution[];
  dominantPhilosophy: AgentId | 'balanced' | 'none';
  dominantAgentMeta?: AgentMeta;
  archetypeTitle: string;
  archetypeSubtitle: string;
  archetypeIcon: string;
  description: string;
  decisionStyleSummary: string;
  coreStrengths: string[];
  recommendedReadings: {
    book: string;
    author: string;
    coreIdea: string;
  }[];
}

export const PHILOSOPHY_VISUALS: Record<
  string,
  {
    icon: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
    gradientClass: string;
    gradientStyle: string;
  }
> = {
  christian: {
    icon: '✝️',
    color: '#0284c7',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    barColor: 'bg-sky-500',
    gradientClass: 'from-sky-500 to-indigo-500',
    gradientStyle: 'linear-gradient(135deg, #0284c7 0%, #4338ca 100%)',
  },
  buddhist: {
    icon: '🪷',
    color: '#059669',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    barColor: 'bg-emerald-500',
    gradientClass: 'from-emerald-500 to-teal-500',
    gradientStyle: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  },
  hindu: {
    icon: '🕉️',
    color: '#ea580c',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    barColor: 'bg-orange-500',
    gradientClass: 'from-orange-500 to-amber-600',
    gradientStyle: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
  },
  islamic: {
    icon: '☪️',
    color: '#16a34a',
    badgeBg: 'bg-green-50',
    badgeText: 'text-green-700',
    badgeBorder: 'border-green-200',
    barColor: 'bg-green-500',
    gradientClass: 'from-green-500 to-emerald-600',
    gradientStyle: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
  },
  confucian: {
    icon: '📜',
    color: '#d97706',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    barColor: 'bg-amber-500',
    gradientClass: 'from-amber-500 to-orange-500',
    gradientStyle: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
  },
  utilitarian: {
    icon: '💡',
    color: '#7c3aed',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    barColor: 'bg-purple-500',
    gradientClass: 'from-purple-500 to-violet-600',
    gradientStyle: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
  },
  liberal: {
    icon: '🗽',
    color: '#2563eb',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    barColor: 'bg-blue-500',
    gradientClass: 'from-blue-500 to-cyan-600',
    gradientStyle: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
  },
  marxist: {
    icon: '⚒️',
    color: '#dc2626',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200',
    barColor: 'bg-red-500',
    gradientClass: 'from-red-500 to-rose-600',
    gradientStyle: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  },
  daoist: {
    icon: '🌊',
    color: '#0d9488',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    barColor: 'bg-teal-500',
    gradientClass: 'from-teal-500 to-emerald-600',
    gradientStyle: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
  },
  rationalist: {
    icon: '⚖️',
    color: '#4f46e5',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    barColor: 'bg-indigo-500',
    gradientClass: 'from-indigo-500 to-blue-600',
    gradientStyle: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
  },
  existentialist: {
    icon: '⚡',
    color: '#e11d48',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    barColor: 'bg-rose-500',
    gradientClass: 'from-rose-500 to-red-600',
    gradientStyle: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
  },
};

// Backward compatibility visual aliases
PHILOSOPHY_VISUALS.kantian = PHILOSOPHY_VISUALS.rationalist;
PHILOSOPHY_VISUALS.stoic = PHILOSOPHY_VISUALS.rationalist;
PHILOSOPHY_VISUALS.care_ethics = PHILOSOPHY_VISUALS.christian;
PHILOSOPHY_VISUALS.virtue_ethics = PHILOSOPHY_VISUALS.rationalist;

export function analyzeUserValueSystem(reactions: LikedAdvice[]): ValueSystemAnalysis {
  const totalLikes = reactions.length;

  // Count likes per agent dynamically with alias resolution
  const counts: Record<string, number> = {};
  AGENT_ORDER.forEach((id) => {
    counts[id] = 0;
  });

  reactions.forEach((item) => {
    const canonId = canonicalAgentId(item.agentId);
    counts[canonId] = (counts[canonId] || 0) + 1;
  });

  // Calculate distributions across all 11 traditions
  const distribution: PhilosophyDistribution[] = AGENT_ORDER.map((id) => {
    const canonId = canonicalAgentId(id);
    const agent = getAgentMeta(canonId);
    const visuals = PHILOSOPHY_VISUALS[canonId] || {
      icon: agent.icon,
      color: '#475569',
      badgeBg: 'bg-slate-50',
      badgeText: 'text-slate-700',
      badgeBorder: 'border-slate-200',
      barColor: 'bg-slate-500',
      gradientClass: 'from-slate-500 to-slate-700',
    };
    const count = counts[canonId] || 0;
    const percentage = totalLikes > 0 ? Math.round((count / totalLikes) * 100) : 0;

    return {
      agentId: id,
      name: agent.name,
      stance: agent.stance,
      icon: visuals.icon,
      count,
      percentage,
      color: visuals.color,
      badgeBg: visuals.badgeBg,
      badgeText: visuals.badgeText,
      badgeBorder: visuals.badgeBorder,
      barColor: visuals.barColor,
      gradientClass: visuals.gradientClass,
      gradientStyle: visuals.gradientStyle || `linear-gradient(135deg, ${visuals.color} 0%, ${visuals.color} 100%)`,
      keyWork: agent.keyWork,
      summary: agent.summary,
    };
  });

  // Initial Empty State
  if (totalLikes === 0) {
    return {
      totalLikes: 0,
      distribution,
      dominantPhilosophy: 'none',
      archetypeTitle: '가치관 탐색가',
      archetypeSubtitle: '아직 공감하신 조언 데이터가 없습니다',
      archetypeIcon: '🧭',
      description:
        '사상가들의 조언 중 마음에 와닿거나 자신의 도덕적 나침반으로 삼고 싶은 답변에 👍 공감을 남겨보세요. 당신이 어떤 철학적 관점에 가장 깊이 공감하는지 종합 분석하여 고유한 가치관 프로필을 완성해 드립니다.',
      decisionStyleSummary:
        '고민 상담 대화 중 마음에 드는 조언 아래의 [👍 공감] 버튼을 누르시면 실시간으로 11대 가치 체계 분포가 계산됩니다.',
      coreStrengths: ['새로운 지혜를 향한 열린 태도', '다양한 관점을 경청하는 유연성', '자신만의 기준을 찾아가는 주도성'],
      recommendedReadings: [
        {
          book: '도덕형이상학 정초',
          author: '칸트',
          coreIdea: '어떤 상황에서도 타협할 수 없는 인간 존엄과 보편적 이성',
        },
        {
          book: '숫타니파타',
          author: '붓다',
          coreIdea: '모든 것은 인연에 따라 일어나니 집착을 내려놓는 지혜',
        },
      ],
    };
  }

  // Sort by count descending to find dominant / ties
  const sorted = [...distribution].sort((a, b) => b.count - a.count);
  const highest = sorted[0];
  const runnerUp = sorted[1];

  // Check if it's a balanced tie between top philosophies
  const isTie = highest.count > 0 && runnerUp && highest.count === runnerUp.count;

  if (isTie) {
    const highestMeta = getAgentMeta(highest.agentId);
    const runnerUpMeta = getAgentMeta(runnerUp.agentId);

    return {
      totalLikes,
      distribution,
      dominantPhilosophy: 'balanced',
      archetypeTitle: '다면적 조화주의자',
      archetypeSubtitle: `${highest.name}과 ${runnerUp.name}의 지혜를 균형 있게 품은 가치관`,
      archetypeIcon: '⚖️✨',
      description:
        `당신은 어느 한 극단적인 기준에 얽매이지 않고, 상황의 본질에 따라 ${highest.name}과 ${runnerUp.name}의 상호 보완적인 도덕적 지혜를 종합적으로 헤아리는 유연하고 성숙한 사유를 지니고 있습니다.`,
      decisionStyleSummary:
        '복합적인 딜레마 앞에서 단편적인 흑백논리를 피하고, 현실적 조건과 인간적 가치 사이에서 최선의 균형점을 찾아냅니다.',
      coreStrengths: ['다면적 관점을 종합하는 포용력', '상황에 부합하는 유연한 지혜', '극단에 치우치지 않는 균형 감각'],
      recommendedReadings: [
        {
          book: highestMeta.keyWork,
          author: highestMeta.name,
          coreIdea: highestMeta.summary,
        },
        {
          book: runnerUpMeta.keyWork,
          author: runnerUpMeta.name,
          coreIdea: runnerUpMeta.summary,
        },
      ],
    };
  }

  // Single Dominant Philosophy
  const dominantId = canonicalAgentId(highest.agentId);
  const dominantMeta = getAgentMeta(dominantId);

  switch (dominantId) {
    case 'christian':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'christian',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '신앙과 사랑의 단독자',
        archetypeSubtitle: '기독교 철학의 은혜와 절대적 사랑을 지향하는 가치관',
        archetypeIcon: '✝️',
        description:
          '당신은 눈앞의 이익이나 세속적 평가에 휘둘리기보다, 신 앞에서의 정직한 양심과 이웃을 향한 헌신적인 사랑을 최고의 가치로 여깁니다. 인간의 한계를 인정하며 겸손하게 은혜와 구원의 길을 걷고자 합니다.',
        decisionStyleSummary:
          '나 중심의 계산을 내려놓고, 무엇이 진정으로 사랑과 도덕적 선(善)에 부합하는지 신앙과 양심의 깊은 성찰을 통해 결단합니다.',
        coreStrengths: ['이웃과 약자를 향한 헌신적인 사랑', '세속적 유혹에 흔들리지 않는 굳은 믿음', '자기 오만을 경계하는 깊은 겸손'],
        recommendedReadings: [
          {
            book: '공포와 전율',
            author: '쇠렌 키에르케고르',
            coreIdea: '신 앞에서의 단독자로서 실존적 결단을 내리는 신앙의 비약',
          },
          {
            book: '고백록',
            author: '아우구스티누스',
            coreIdea: '인간의 방황을 끝내고 참된 평안을 얻는 절대적 사랑의 고백',
          },
        ],
      };

    case 'buddhist':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'buddhist',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '초연한 통찰과 자비의 성찰가',
        archetypeSubtitle: '불교의 연기설(緣起說)과 집착 없는 평정을 지향하는 가치관',
        archetypeIcon: '🪷',
        description:
          '당신은 복잡하고 고통스러운 갈등 상황 앞에서 당장의 집착과 감정의 소용돌이를 한 걸음 물러나 관조할 줄 아는 사람입니다. 모든 것은 서로 연결되어 원인과 조건에 따라 일어난다는 연기(緣起)의 지혜를 신뢰하며, 타인과 자신을 향한 따뜻한 자비와 마음의 평안을 최우선 가치로 둡니다.',
        decisionStyleSummary:
          '눈앞의 욕망이나 타인의 평가에 얽매이기보다, 내면의 번뇌를 내려놓고 모든 존재를 연민으로 품을 수 있는 고요한 선택을 지향합니다.',
        coreStrengths: [
          '감정적 소용돌이에 휩쓸리지 않는 평정심',
          '인연과 인과관계를 깊이 꿰뚫어 보는 통찰력',
          '자신과 타인의 결점을 너그럽게 품는 자비심',
        ],
        recommendedReadings: [
          {
            book: '숫타니파타',
            author: '붓다',
            coreIdea: '그물에 걸리지 않는 바람처럼, 무소의 뿔처럼 혼자서 가라',
          },
          {
            book: '법구경',
            author: '붓다',
            coreIdea: '모든 것은 마음이 으뜸이니, 맑은 마음으로 행하면 행복이 따른다',
          },
        ],
      };

    case 'hindu':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'hindu',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '우주적 합일과 카르마의 수행자',
        archetypeSubtitle: '힌두 철학의 범아일여(梵我一如)와 의무를 지향하는 가치관',
        archetypeIcon: '🕉️',
        description:
          '당신은 개별적인 자아(아트만)가 우주의 궁극적 실재(브라만)와 연결되어 있음을 느끼며, 삶의 모든 사건이 인과(카르마)의 질서 속에 있음을 신뢰합니다. 결과에 집착하지 않고 오직 현재 내게 주어진 도덕적 의무(다르마)를 묵묵히 행합니다.',
        decisionStyleSummary:
          '일시적인 득실이나 감정의 집착을 넘어, 내 영혼의 성장과 우주적 조화에 부합하는 본질적 의무를 행합니다.',
        coreStrengths: ['결과에 얽매이지 않고 행동하는 초연함', '우주적 인과율을 통찰하는 넓은 시야', '자신에게 주어진 의무를 다하는 충직함'],
        recommendedReadings: [
          {
            book: '바가바드 기타',
            author: '비야사',
            coreIdea: '결과에 대한 집착을 버리고 오직 너의 의무를 다하라',
          },
          {
            book: '우파니샤드',
            author: '고대 인도 현인들',
            coreIdea: '너 자신이 곧 그것이다(Tat Tvam Asi), 우주와 영혼의 궁극적 합일',
          },
        ],
      };

    case 'islamic':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'islamic',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '순종과 공동체 정의의 실천가',
        archetypeSubtitle: '이슬람 사상의 절대적 순종과 평화, 형제애를 지향하는 가치관',
        archetypeIcon: '☪️',
        description:
          '당신은 유일신(알라)의 뜻에 순종하며 삶의 모든 영역에서 공의와 책임을 실천하고자 합니다. 개인의 이기심을 넘어 공동체 전체의 복지와 평화, 약자에 대한 배려와 정의를 엄격하게 지켜나갑니다.',
        decisionStyleSummary:
          '편법이나 사사로운 이익을 배격하고, 신 앞에서의 약속과 공동체의 정의로운 규범을 올곧게 지킵니다.',
        coreStrengths: ['공동체와 형제를 향한 강한 유대감', '어떤 유혹 앞에서도 굽히지 않는 올곧은 정의감', '삶과 신념이 일치하는 성실성'],
        recommendedReadings: [
          {
            book: '쿠란',
            author: '이슬람 성전',
            coreIdea: '하나님을 경외하고 정의를 지키며 사람들에게 선을 베풀라',
          },
          {
            book: '결정적 논고',
            author: '이븐 루시드',
            coreIdea: '종교적 신앙과 철학적 이성의 조화로운 통합',
          },
        ],
      };

    case 'confucian':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'confucian',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '관계와 도리를 세우는 인본주의자',
        archetypeSubtitle: '유가 사상의 인(仁)과 예(禮), 가족과 공동체 조화를 지향하는 가치관',
        archetypeIcon: '📜',
        description:
          '당신은 인간이란 고립된 개인이 아니라 사람과 사람 사이의 관계 속에서 비로소 완성된다고 믿습니다. 가족에 대한 도리와 타인에 대한 측은지심(仁), 신뢰와 예의(禮)를 실천함으로써 우리 모두가 함께 어우러지는 따뜻하고 조화로운 공동체를 만드는 데 깊은 보람을 느낍니다.',
        decisionStyleSummary:
          '홀로 서기보다는 내가 맺고 있는 관계의 책임과 도리를 먼저 헤아리며, 진심 어린 배려와 신뢰를 통해 갈등을 지혜롭게 풉니다.',
        coreStrengths: [
          '타인의 아픔을 내 일처럼 아파하는 측은지심(仁)',
          '인간관계의 신뢰와 책임을 묵묵히 지키는 충직함',
          '공동체의 온기와 조화를 이끄는 포용력',
        ],
        recommendedReadings: [
          {
            book: '논어',
            author: '공자',
            coreIdea: '남이 나를 알아주지 않아도 서운해하지 않는 군자의 도리',
          },
          {
            book: '맹자',
            author: '맹자',
            coreIdea: '우물에 빠지려는 아이를 보고 차마 지나치지 못하는 인(仁)의 본성',
          },
        ],
      };

    case 'utilitarian':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'utilitarian',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '최선의 행복을 빚는 합리적 실용주의자',
        archetypeSubtitle: '공리주의의 최대 다수 최대 행복과 파급 효과를 극대화하는 가치관',
        archetypeIcon: '💡',
        description:
          '당신은 공허한 명분이나 맹목적 도그마에 얽매이지 않고, 실제로 가장 많은 사람들에게 더 큰 행복과 실질적인 도움을 가져다주는 선택을 선호합니다. 냉철한 이성과 현실적 데이터를 바탕으로 한 합리적인 판단을 통해 사회와 개인 모두에게 최선의 결과를 만들어내는 전략가입니다.',
        decisionStyleSummary:
          '감상주의를 배제하고 기회비용과 파급 효과를 꼼꼼히 저울질하여, 실질적인 고통을 줄이고 전체의 행복을 극대화하는 길을 택합니다.',
        coreStrengths: [
          '현실의 복잡성을 꿰뚫어 보는 냉철하고 합리적인 분석력',
          '더 많은 사람에게 실질적 행복을 주는 문제 해결력',
          '탁상공론을 거부하는 탁월한 현실 실천성',
        ],
        recommendedReadings: [
          {
            book: '공리주의',
            author: '존 스튜어트 밀',
            coreIdea: '최대 다수의 최대 행복, 그리고 질적으로 고귀한 쾌락',
          },
          {
            book: '도덕과 입법의 원칙',
            author: '제러미 벤담',
            coreIdea: '고통을 피하고 쾌락을 증진하는 객관적 효용의 계산',
          },
        ],
      };

    case 'liberal':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'liberal',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '자유와 기본권을 수호하는 자율주의자',
        archetypeSubtitle: '자유주의의 개인 권리와 법치, 사유재산 보호를 지향하는 가치관',
        archetypeIcon: '🗽',
        description:
          '당신은 어떤 집단이나 권력도 침해할 수 없는 개인의 고유한 자유와 권리를 최고의 가치로 여깁니다. 타인에게 해를 끼치지 않는 한 자신의 삶을 스스로 설계하고 영위할 자율성을 지지하며, 법치와 공정한 기회를 신뢰합니다.',
        decisionStyleSummary:
          '집단의 강요나 획일성에 굴하지 않고, 각 개인의 권리와 자유로운 선택권을 존중하는 합리적 선을 지킵니다.',
        coreStrengths: ['개인의 자유와 주체성을 존중하는 개방성', '부당한 권력 남용과 억압을 경계하는 비판 의식', '다양성을 포용하는 관용의 태도'],
        recommendedReadings: [
          {
            book: '자유론',
            author: '존 스튜어트 밀',
            coreIdea: '개인의 개성과 자유가 만개할 때 인류는 비로소 진보한다',
          },
          {
            book: '통치론',
            author: '존 로크',
            coreIdea: '생명, 자유, 재산에 대한 침해할 수 없는 자연권',
          },
        ],
      };

    case 'marxist':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'marxist',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '구조적 모순을 직시하는 유물론적 변혁가',
        archetypeSubtitle: '마르크스주의의 물질적 조건 분석과 노동권, 불평등 해소를 지향하는 가치관',
        archetypeIcon: '⚒️',
        description:
          '당신은 개인의 도덕심이나 추상적 관념만으로는 현실의 불평등을 해결할 수 없다고 봅니다. 삶을 지배하는 실질적인 물질적·경제적 조건과 사회 구조적 모순을 냉철하게 직시하며, 노동하는 인간의 존엄과 실질적 평등을 위해 행동합니다.',
        decisionStyleSummary:
          '피상적인 말잔치를 걷어내고, 누가 경제적 이익을 얻고 누가 소외당하는지 권력과 계급의 역학을 꿰뚫어 봅니다.',
        coreStrengths: ['사회 구조적 모순을 파헤치는 비판적 통찰력', '약자와 노동하는 사람들을 향한 굳은 연대 의식', '근본적 변화를 도모하는 실천적 용기'],
        recommendedReadings: [
          {
            book: '자본론',
            author: '카를 마르크스',
            coreIdea: '자본주의 생산양식의 내적 법칙과 인간 소외의 구조',
          },
          {
            book: '공산당 선언',
            author: '카를 마르크스, 프리드리히 엥겔스',
            coreIdea: '만국의 노동자여, 억압의 사슬을 끊고 연대하라',
          },
        ],
      };

    case 'daoist':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'daoist',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '유연한 순리의 무위자연가',
        archetypeSubtitle: '도가 사상의 무위자연과 비움의 유연성을 지향하는 가치관',
        archetypeIcon: '🌊',
        description:
          '당신은 인위적인 옳고 그름의 분별과 억지스러운 집착을 내려놓고, 다투지 않고 가장 낮은 곳으로 흐르는 물(上善若水)처럼 자연의 거대한 순리에 몸을 맡기는 지혜를 신뢰합니다.',
        decisionStyleSummary:
          '조급하게 상황을 쥐고 흔들려 하기보다, 힘을 빼고 흐름을 관찰하며 가장 자연스럽고 무리 없는 해법을 기다립니다.',
        coreStrengths: [
          '경직된 틀에 갇히지 않는 부드러운 유연성',
          '인위적 갈등을 유발하지 않는 무쟁(無爭)의 지혜',
          '순리를 기다릴 줄 아는 깊은 호흡과 여유',
        ],
        recommendedReadings: [
          {
            book: '도덕경',
            author: '노자',
            coreIdea: '가장 좋은 것은 물과 같아서, 만물을 이롭게 하면서도 다투지 않는다',
          },
          {
            book: '장자',
            author: '장자',
            coreIdea: '작은 시비분별을 넘어 거대한 자유(逍遙遊)를 누리라',
          },
        ],
      };

    case 'rationalist':
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'rationalist',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '원칙과 논리를 벼리는 순수 합리주의자',
        archetypeSubtitle: '합리주의의 이성적 진리와 칸트적 보편 도덕법칙을 지향하는 가치관',
        archetypeIcon: '⚖️',
        description:
          '당신은 어떤 유혹이나 감정적 동요 앞에서도 결코 흔들리지 않는 내면의 이성과 도덕법칙을 가장 귀하게 여깁니다. 인간을 어떤 목적의 수단으로 대우하지 않고 그 자체로 존엄하게 대하며, 증명된 진리와 보편적 원칙을 엄격하게 수호합니다.',
        decisionStyleSummary:
          '결과의 유불리를 따지기 전에 ‘이 선택이 모든 사람에게 보편적 법칙이 될 수 있는가?’를 이성적으로 엄격히 자문합니다.',
        coreStrengths: [
          '어떤 상황에서도 타협하지 않는 논리적 정직성과 일관성',
          '감정에 휩쓸리지 않는 명확한 이성적 판단력',
          '보편적 원칙과 인간 존엄을 지키는 굳은 신념',
        ],
        recommendedReadings: [
          {
            book: '도덕형이상학 정초',
            author: '이마누엘 칸트',
            coreIdea: '네 의지의 준칙이 언제나 보편적 입법의 원리가 되도록 행위하라',
          },
          {
            book: '성찰',
            author: '르네 데카르트',
            coreIdea: '명석판명한 이성을 통해 흔들리지 않는 진리의 초석을 세우다',
          },
        ],
      };

    case 'existentialist':
    default:
      return {
        totalLikes,
        distribution,
        dominantPhilosophy: 'existentialist',
        dominantAgentMeta: dominantMeta,
        archetypeTitle: '주체적 결단의 실존주의자',
        archetypeSubtitle: '실존주의의 실존적 자유와 온전한 자기 책임을 지향하는 가치관',
        archetypeIcon: '⚡',
        description:
          '당신은 정해진 본질이나 타인의 시선, 사회적 관습에 기대지 않고, 매 순간 스스로 선택하고 그 무게를 온전히 감당하는 주체적인 삶을 추구합니다. 자기기만(Bad Faith)을 거부하고 진정한 자유를 향해 당당히 결단합니다.',
        decisionStyleSummary:
          '남들의 기대나 편리한 규칙 뒤에 숨지 않고, 내가 진정으로 원하는 삶의 방향에 대한 실존적 책임감을 가지고 결단을 내립니다.',
        coreStrengths: [
          '타인의 시선에 휘둘리지 않는 주체적 결단력',
          '선택의 무게를 당당히 감당하는 책임감',
          '관습적 위선을 꿰뚫어 보는 정직한 자유',
        ],
        recommendedReadings: [
          {
            book: '존재와 무',
            author: '장 폴 사르트르',
            coreIdea: '실존은 본질에 앞서며, 인간은 자유라는 형벌에 처해 있다',
          },
          {
            book: '차라투스트라는 이렇게 말했다',
            author: '프리드리히 니체',
            coreIdea: '스스로 자신의 삶을 창조하고 운명을 사랑하라(Amor Fati)',
          },
        ],
      };
  }
}
