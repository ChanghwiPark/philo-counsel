import { AgentId, AgentMeta, ConvenedCouncil } from './types';
import { AGENTS, getAgentMeta, canonicalAgentId } from './agents';
import { LikedAdvice } from './valueSystem';

interface DilemmaThemeConfig {
  theme: string;
  keywords: string[];
  primaryAgents: AgentId[];
  defaultBlindSpotAgent: AgentId;
  defaultBlindSpotReason: string;
}

const DILEMMA_THEMES: DilemmaThemeConfig[] = [
  {
    theme: '인간관계와 감정적 경계',
    keywords: ['이성 친구', '연인', '바람', '친구', '우정', '짝사랑', '헤어', '이별', '위로', '질투', '감정', '애인', '남친', '여친', '배신', '서운', '외로움', '거리', '호감'],
    primaryAgents: ['christian', 'confucian', 'rationalist'],
    defaultBlindSpotAgent: 'existentialist',
    defaultBlindSpotReason:
      '타인의 시선이나 관계의 눈치에 얽매여 ‘나 자신의 진정한 실존적 결단과 책임’을 회피하는 자기기만(Bad Faith)에 빠지기 쉽습니다.',
  },
  {
    theme: '공정과 원칙 vs 신의와 의리',
    keywords: ['비리', '부정', '승진', '덮어', '고발', '침묵', '규정', '원칙', '거짓말', '진실', '손해', '피해', '팀', '동료', '내부고발', '양심', '정직', '폭로'],
    primaryAgents: ['rationalist', 'utilitarian', 'confucian'],
    defaultBlindSpotAgent: 'daoist',
    defaultBlindSpotReason:
      '당장의 인간적 비난이나 외부의 불이익을 두려워한 나머지, 억지로 상황을 뜯어고치려 애쓰기보다 순리에 맡기는 비움의 유연성을 잃기 쉽습니다.',
  },
  {
    theme: '가족의 도리 vs 자아실현과 꿈',
    keywords: ['부모', '효도', '가족', '유학', '대학원', '창업', '진로', '꿈', '퇴사', '직장', '안정', '독립', '생계', '이직', '적성', '커리어', '결혼', '자식'],
    primaryAgents: ['confucian', 'existentialist', 'liberal'],
    defaultBlindSpotAgent: 'daoist',
    defaultBlindSpotReason:
      '모든 상황을 내 뜻대로 완벽하게 통제하고 해결해야 한다는 강박 때문에, 억지로 애쓰지 않고 순리에 맡기는 비움의 유연성을 놓치기 쉽습니다.',
  },
  {
    theme: '정직과 배려의 갈등',
    keywords: ['피드백', '평가', '상처', '솔직', '선의의 거짓말', '조언', '지적', '실수', '용기', '충고', '비판', '팩트'],
    primaryAgents: ['rationalist', 'christian', 'buddhist'],
    defaultBlindSpotAgent: 'existentialist',
    defaultBlindSpotReason:
      '‘내가 상대에게 올바른 답을 주어야 한다’는 집착과 자아 중심적 우월감에 사로잡혀, 스스로의 선택에 온전히 책임지는 실존적 결단을 잊기 쉽습니다.',
  },
  {
    theme: '물질적 조건과 사회적 불평등',
    keywords: ['돈', '월급', '부자', '가난', '착취', '노동', '불평등', '자본', '계약', '재산', '공정', '경쟁', '연봉', '빈부', '자본주의', '투자', '주식', '빚', '경제', '보상'],
    primaryAgents: ['marxist', 'liberal', 'utilitarian'],
    defaultBlindSpotAgent: 'hindu',
    defaultBlindSpotReason:
      '눈앞의 경제적 이해관계와 권리 다툼에만 몰두하다 보면, 우주적 인과의 법칙(업)과 더 깊은 영혼의 도덕적 의무를 성찰하는 시각을 간과하기 쉽습니다.',
  },
  {
    theme: '내면의 평정과 실존적 불안',
    keywords: ['불안', '번아웃', '우울', '무기력', '허무', '의미', '스트레스', '자책', '후회', '평온', '멘탈', '휴식', '마음', '명상', '지침', '괴로움', '공허', '방황'],
    primaryAgents: ['buddhist', 'existentialist', 'daoist'],
    defaultBlindSpotAgent: 'utilitarian',
    defaultBlindSpotReason:
      '내면의 평화와 실존적 번민에만 침잠하다 보면, 구체적 현실에서 삶의 조건을 개선하고 실질적인 삶의 효용을 만들어가는 적극적 행동을 놓치기 쉽습니다.',
  },
  {
    theme: '절대적 신념과 영적 평화',
    keywords: ['신앙', '종교', '기도', '신', '운명', '죄', '구원', '내세', '알라', '하느님', '하나님', '업보', '해탈', '사후', '영혼', '성경', '불경'],
    primaryAgents: ['christian', 'islamic', 'hindu'],
    defaultBlindSpotAgent: 'rationalist',
    defaultBlindSpotReason:
      '종교적 신념이나 운명론에만 의탁하다 보면, 명확하게 증명된 사실과 냉철한 이성적 논증의 잣대를 놓치기 쉽습니다.',
  },
  {
    theme: '정의와 법 vs 자비와 관용',
    keywords: ['처벌', '용서', '범죄', '단죄', '복수', '엄벌', '관용', '선처', '참회', '가해자', '피해자', '재판', '법', '정의', '잘못'],
    primaryAgents: ['islamic', 'rationalist', 'christian'],
    defaultBlindSpotAgent: 'buddhist',
    defaultBlindSpotReason:
      '처벌과 단죄의 잣대에만 얽매이다 보면, 모든 존재의 상호연결성과 고통의 근원을 연민으로 품어내는 자비의 관점을 잊기 쉽습니다.',
  },
];

export function selectCouncilForDilemma(
  dilemmaText: string,
  userLikes: LikedAdvice[] = []
): ConvenedCouncil {
  const normalized = (dilemmaText || '').toLowerCase();

  // 1. Determine user's like profile & affinity counts using canonical IDs
  const likeCounts: Record<string, number> = {};
  userLikes.forEach((item) => {
    const cId = canonicalAgentId(item.agentId);
    likeCounts[cId] = (likeCounts[cId] || 0) + 1;
  });

  const likedAgentIds = Object.keys(likeCounts);
  let dominantAgentId: AgentId | null = null;
  if (likedAgentIds.length > 0) {
    dominantAgentId = likedAgentIds.reduce((a, b) =>
      likeCounts[a] > likeCounts[b] ? a : b
    ) as AgentId;
  }

  // 2. Identify the Dilemma Theme
  let matchedTheme = DILEMMA_THEMES.find((t) =>
    t.keywords.some((kw) => normalized.includes(kw))
  );

  if (!matchedTheme) {
    matchedTheme = {
      theme: '인생의 기로와 도덕적 갈등',
      keywords: [],
      primaryAgents: ['rationalist', 'utilitarian', 'existentialist'],
      defaultBlindSpotAgent: 'daoist',
      defaultBlindSpotReason:
        '결과의 득실이나 의무감에만 매몰되어, 자연스러운 순리에 따르는 비움과 유연성의 관점을 간과하기 쉽습니다.',
    };
  }

  // 3. Select 1~2 Blind Spot Agents
  const blindSpotAgentIds: AgentId[] = [];
  let blindSpotInsightText = '';

  if (dominantAgentId) {
    // User has an established preference
    const dominantMeta = getAgentMeta(dominantAgentId);

    // Complementary opposing blind spots for the 11 traditions
    const blindSpotMap: Record<string, { challengerId: AgentId; reason: string }> = {
      christian: {
        challengerId: 'existentialist',
        reason:
          '신앙과 절대적 사랑에 의탁하는 성향으로 인해, 미리 정해진 구원 너머에서 ‘오직 나 자신의 주체적 자유로 결단하고 책임지는 실존적 고뇌’를 회피하기 쉽습니다.',
      },
      buddhist: {
        challengerId: 'marxist',
        reason:
          '마음의 집착을 비우고 관조하는 평온에 머물다 보면, 부조리한 현실 구조의 모순과 노동·물질적 불평등을 적극적으로 타개하려는 사회적 실천을 놓치기 쉽습니다.',
      },
      hindu: {
        challengerId: 'rationalist',
        reason:
          '우주적 실재(브라만)와 업(카르마)의 인과에 집중하다 보면, 감정이나 믿음에 흔들리지 않고 냉철하게 검증하는 순수 이성적 논증을 간과하기 쉽습니다.',
      },
      islamic: {
        challengerId: 'liberal',
        reason:
          '절대적 순종과 공동체적 형제애를 강조하다 보면, 집단의 규범으로부터 보호받아야 할 개인의 고유한 사적 자유와 권리를 제약하기 쉽습니다.',
      },
      confucian: {
        challengerId: 'existentialist',
        reason:
          '가족과 인간관계의 도리(禮)를 중시하는 성향으로 인해, 관습과 타인의 기대를 털어내고 ‘오직 나 자신의 주체적 자유로 선택하고 책임지는 결단’을 망설이기 쉽습니다.',
      },
      utilitarian: {
        challengerId: 'rationalist',
        reason:
          '계산과 결과의 효용에만 집중하는 성향으로 인해, 유용성의 계산을 넘어 어떤 상황에서도 양보할 수 없는 ‘보편적 도덕법칙과 인간 존엄의 절대성’을 간과하기 쉽습니다.',
      },
      liberal: {
        challengerId: 'confucian',
        reason:
          '개인의 자유와 권리만을 절대화하다 보면, 원자화된 개인이 잊기 쉬운 따뜻한 관계의 도리와 가족·공동체의 조화로운 유대감을 소홀히 하기 쉽습니다.',
      },
      marxist: {
        challengerId: 'daoist',
        reason:
          '모든 갈등을 물질적 조건과 사회 구조의 모순으로만 분석하다 보면, 억지스러움을 버리고 자연의 순리에 맡기는 ‘무위자연(無爲自然)의 유연성’을 놓치기 쉽습니다.',
      },
      daoist: {
        challengerId: 'utilitarian',
        reason:
          '자연스러운 순리에만 맡기다 보면, 구체적 현실 상황에서 최대 다수의 실질적 고통을 계산하고 줄여나가는 ‘적극적인 유용성과 책임 있는 실천’을 방관하기 쉽습니다.',
      },
      rationalist: {
        challengerId: 'christian',
        reason:
          '엄격한 이성과 보편 법칙의 잣대만을 앞세우다 보면, 차가운 논리로 설명되지 않는 취약한 존재를 향한 ‘무조건적인 사랑과 따뜻한 은혜’를 놓치기 쉽습니다.',
      },
      existentialist: {
        challengerId: 'confucian',
        reason:
          '홀로 서는 개인의 자유와 결단을 중시하다 보면, 나를 둘러싼 오랜 인연과 공동체가 건네는 ‘따뜻한 관계의 도리와 정성’을 섣불리 단절하기 쉽습니다.',
      },
    };

    const paired = blindSpotMap[dominantAgentId] || {
      challengerId: 'rationalist',
      reason: '당장의 상황 판단이나 감정에 휩쓸리기 쉬운 상황에서, 냉철한 보편적 도덕법칙을 성찰하는 시각이 필요합니다.',
    };

    blindSpotAgentIds.push(paired.challengerId);
    blindSpotInsightText = `상담자님께서 선호하시는 [${dominantMeta.name}] 관점(${dominantMeta.stance})의 편향을 보완하고자, ${paired.reason} 이에 따라 [${getAgentMeta(paired.challengerId).name}]을 사각지대 보완 사상가로 지정했습니다.`;
  } else {
    // Guest or no likes yet -> infer from dilemma theme
    const defaultChallengerId: AgentId = matchedTheme.defaultBlindSpotAgent;
    blindSpotAgentIds.push(defaultChallengerId);
    const challengerMeta = getAgentMeta(defaultChallengerId);
    blindSpotInsightText = `본 고민은 '${matchedTheme.theme}'에 관한 문제로, ${matchedTheme.defaultBlindSpotReason} 이에 따라 [${challengerMeta.name}]의 시각을 생각 사각지대 보완 관점으로 소집했습니다.`;
  }

  // 4. Assemble Exactly 4 Dynamic Thinkers from the 11 Traditions
  const candidateIds: AgentId[] = [];

  // If user has a favorite tradition, ensure it is convened
  if (dominantAgentId) {
    candidateIds.push(dominantAgentId);
  }

  // Include primary thinkers relevant to the dilemma theme
  matchedTheme.primaryAgents.forEach((id) => {
    if (!candidateIds.includes(id)) {
      candidateIds.push(id);
    }
  });

  // Include the blind spot challenger
  blindSpotAgentIds.forEach((id) => {
    if (!candidateIds.includes(id)) {
      candidateIds.push(id);
    }
  });

  // Fallback pool across all 11 traditions to ensure exactly 4 thinkers
  const fallbackPool: AgentId[] = [
    'buddhist',
    'confucian',
    'rationalist',
    'utilitarian',
    'existentialist',
    'daoist',
    'liberal',
    'marxist',
    'christian',
    'hindu',
    'islamic',
  ];

  fallbackPool.forEach((id) => {
    if (candidateIds.length < 4 && !candidateIds.includes(id)) {
      candidateIds.push(id);
    }
  });

  let finalIds = candidateIds.slice(0, 4);

  // Guarantee blind spot challenger presence in the 4 seats
  const primaryChallengerId = blindSpotAgentIds[0];
  if (primaryChallengerId && !finalIds.includes(primaryChallengerId)) {
    finalIds[3] = primaryChallengerId;
  }

  // Mark blind spot roles on the agent metadata
  const convenedAgents: AgentMeta[] = finalIds.map((id) => {
    const meta = getAgentMeta(id);
    const isBlindSpot = blindSpotAgentIds.includes(id);
    return {
      ...meta,
      blindSpotRole: isBlindSpot
        ? `사각지대 보완: ${meta.blindSpotRole || meta.summary}`
        : meta.blindSpotRole || meta.summary,
    };
  });

  return {
    agents: convenedAgents,
    blindSpotInsight: blindSpotInsightText,
    blindSpotAgentIds,
    coreDilemmaTheme: matchedTheme.theme,
  };
}
