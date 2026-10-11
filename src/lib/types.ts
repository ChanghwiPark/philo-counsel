export type AgentId =
  | 'christian'
  | 'buddhist'
  | 'hindu'
  | 'islamic'
  | 'confucian'
  | 'utilitarian'
  | 'liberal'
  | 'marxist'
  | 'daoist'
  | 'rationalist'
  | 'existentialist'
  | (string & {});

export interface AgentMeta {
  id: AgentId;
  name: string;
  stance: string;
  koreanTitle: string;
  icon: string;
  avatarBg: string;
  textColor: string;
  borderColor: string;
  bubbleBg: string;
  keyWork: string;
  summary: string;
  searchDomain?: string;
  blindSpotRole?: string;
}

export interface ConvenedCouncil {
  agents: AgentMeta[];
  blindSpotInsight: string;
  blindSpotAgentIds: AgentId[];
  coreDilemmaTheme?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | AgentId;
  senderName?: string;
  senderStance?: string;
  content: string;
  citationSource?: string;
  citationQuote?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  replyToAgentName?: string;
  timestamp: string;
  isShort?: boolean;
  isLiked?: boolean;
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
  turnMode?: TurnMode;
}

export type TurnMode = 'advice' | 'debate';

export interface UserReplyContext {
  targetMessageId?: string;
  targetAgentId: AgentId;
  targetAgentName: string;
  targetSnippet?: string;
  targetContent?: string;
}

export interface ScriptedChatMessage {
  agentId: AgentId;
  text: string;
  replyToAgentName?: string;
  targetAgentId?: AgentId;
  actionScenario?: string;
  debateRound?: number;
  debateConclusionType?: 'consensus' | 'irreconcilable' | 'divergence';
  debateConclusionSummary?: string;
  isProbingQuestion?: boolean;
  turnMode?: TurnMode;
  citationSource?: string;
  citationQuote?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  reactThought?: string;
  reactSearch?: string;
  reactRead?: string;
}

export interface AgentReActCard {
  agentId: AgentId;
  agentName: string;
  stance: string;
  thought: string;
  searchQuery: string;
  reading: string;
  coreArgument: string;
  actionScenario?: string;
  citationSource?: string;
  citationQuote?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface ConversationTurnHistory {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: any[];
  history: ConversationTurnHistory[];
  council?: ConvenedCouncil;
  createdAt: string;
  updatedAt: string;
}
