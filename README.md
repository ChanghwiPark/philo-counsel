# PhiloCounsel 🏛️

> **A Multi-Agent Deliberation & Ethical Counseling Platform**  
> *Scaffolding moral reasoning through grounded, anti-convergent debate across diverse philosophical traditions.*

[![Live Demo](https://img.shields.io/badge/Live_Demo-philo--counsel.web.app-indigo?style=for-the-badge&logo=firebase)](https://philo-counsel.web.app)
[![Service Language](https://img.shields.io/badge/Service_Language-Korean_(한국어)-0052CC?style=for-the-badge)](https://philo-counsel.web.app)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.js.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)](https://openai.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting_%26_Functions-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

> 💡 **Language Notice**: The live web application, conversational dialogues, and philosopher persona prompts are delivered natively in **Korean (한국어)** to capture realistic cultural and interpersonal nuances. This documentation is provided in English for global open-source accessibility.

---

## 🌟 Why PhiloCounsel?

### The Problem
When people face real-life dilemmas—in workplace ethics, relationships, family obligations, or personal integrity—engaging with unfamiliar philosophical traditions is difficult. Primary texts are dense and scattered, formal ethics education is scarce, and self-guided exploration tends to stall at one's initial intuition. 

### Why Not Standard Chatbots?
Standard LLMs (like single-turn ChatGPT) fall short on value-laden topics:
1. **Moral Homogenization**: Deliberation in standard LLMs often drifts toward a bland, neutral consensus, erasing up to 72% of issue-critical nuances and diverse stances (*Wan et al., 2026; Seror, 2025*).
2. **Flattened Perspectives**: They compress complex trade-offs into a single, generic compromise ("on one hand, on the other hand...") rather than letting distinct value systems genuinely collide and critique one another.
3. **Passive & Stateless**: They wait passively to be prompted, fail to track a user's moral blind spots, and offer no proactive scaffolding to nudge users past superficial answers.

**PhiloCounsel** inverts this dynamic. Rather than handing users a pre-settled answer, it coordinates an autonomous panel of value-system agents to **elicit, critique, debate, and refine** moral dilemmas—empowering inquirers to widen their moral reasoning and own their decisions.

---

## 🧠 Key Features & Interaction Modes

### 1. Dynamic Council Convening & Thinker Personas (Pool of 11 Traditions)
PhiloCounsel maintains an internal corpus of **11 diverse philosophical, ethical, and religious traditions**. For each dilemma, an orchestrator dynamically convenes a balanced panel of **2 to 4 traditions**—pairing issue-relevant viewpoints with an intentional **"blind-spot challenger"** to expand the user's moral horizons. Rather than bare role prompts, every agent is grounded in curated primary source corpora to prevent shallow caricaturing (*Tan et al., 2026*).

#### *Representative Council (Exemplary 4-Tradition Panel)*
The table below illustrates the default foundational council frequently convened for core personal and ethical dilemmas:

| Icon | Tradition | Core Philosophy | Primary Canonical Texts | Guidance Focus |
| :---: | :--- | :--- | :--- | :--- |
| 🪷 | **Buddhism** | Non-attachment (*Pratītyasamutpāda*), Compassion (*Karuṇā*) | *Sutta Nipata*, *Dhammapada* | Calming anxiety, accepting reality, untangling obsession with outcomes |
| ⚖️ | **Immanuel Kant** | Categorical Imperative, Universal Duty, Moral Autonomy | *Groundwork of the Metaphysics of Morals* | Acting on conscience and universal moral principle without opportunistic excuses |
| 📜 | **Confucianism** | Benevolence (*Ren* 仁), Propriety (*Li* 礼), Relational Duty | *Analects (论语)*, *Mencius (孟子)* | Preserving relational trust, fulfilling familial/social roles with tactful sincerity |
| 💡 | **Utilitarianism** | Greatest Happiness, Harm Reduction, Consequential Welfare | J.S. Mill's *Utilitarianism*, Jeremy Bentham | Calculating realistic outcomes, minimizing net suffering, buffering shocks |

> *Note: Other available traditions in the system's pool include **Daoism** (natural non-action / Wu Wei), **Existentialism** (radical freedom & self-definition), **Liberalism** (Rawlsian justice & individual rights), **Marxism** (structural critique of material conditions), **Christian Ethics** (Agape love & restorative forgiveness), **Hindu Philosophy** (Dharma & non-attached action), and **Islamic Ethics** (divine justice & social trust).*

---

### 2. Mode 1: Multi-Perspective Actionable Advice (`turnMode: advice`)
* **Trigger**: The inquirer introduces a dilemma or asks an open question.
* **Concrete Guidance**: Each convened thinker delivers advice grounded in primary texts and pairs it with an **actionable, day-one behavioral scenario** (concrete verbs, avoiding abstract truisms).
* **Separate Question Bubble**: Concludes with an independent interactive dialogue bubble (`isProbingQuestion: true`) asking which philosophical path resonates most, or warmly welcoming questions if anything is unclear.

---

### 3. Mode 2: Multi-Turn Deliberation & Thought Refinement (`turnMode: debate`)
* **Trigger**: The inquirer chooses a stance or shares an opinion.
* **Connected Inter-Agent Debate**: The thinkers engage in a multi-turn connected debate (**4–6 turns**) amongst themselves—validating the user's moral courage, stress-testing risks, suggesting safeguards, and exploring trade-offs without premature interruption.
* **Thought Refinement Question**: Concludes with an independent interactive bubble (`isProbingQuestion: true`) asking how the inquirer wishes to refine their decision, or inviting them to question any unconvincing points.

---

### 4. Anti-Convergence Design (Preserving Disagreement)
* Repurposes a Tree-of-Thoughts architecture with the voting/adjudication step removed: agents are **strictly forbidden from collapsing into a generic compromise**.
* A divergence monitor tracks stance similarity, re-prompting thinkers if they begin drifting toward consensus. Differences are kept sharp so users can learn from competing priorities.

---

### 5. Proactive Intervention & Adaptive Memory
* **Idle Watchdog**: When conversation momentum stalls, a proactive orchestrator intervenes with context-aware check-in questions or injects an overlooked tradition rather than waiting passively.
* **Autonomous Dilemma Generator**: Suggests real-world moral dilemma scenarios on demand across career, relationships, and honesty.
* **Persistent Value Profile**: Tracks which traditions the user favors, detects moral blind spots, and surfaces counter-perspectives across sessions.

---

### 6. User-Centered Dialogue & ReAct Transparency
* **Separate Dialogue Bubbles**: Concluding check-in questions to the user are decoupled into dedicated bubbles with an `indigo-purple` gradient, signaling clearly when it is the inquirer's turn.
* **Inspectable ReAct Chain**: A subtle toggle allows inquirers to inspect an agent's reasoning (**Thought → Search → Read**) with direct links to the Stanford Encyclopedia of Philosophy.
* **Human-like Group Chat Simulation**: Natural typing intervals and sequential delivery mimic an authentic group chat, giving inquirers time to absorb each perspective.

---

## 🏗️ Agentic Architecture

The system operates on an **Understand → Plan → Act → Observe → Adapt** loop:

```
[ User Dilemma / Educational Prompt ]
                │
                ▼
      ┌───────────────────┐
      │    UNDERSTAND     │  Framing module extracts neutral issues, stakeholders,
      │                   │  and loads the user's historical value profile.
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │       PLAN        │  Orchestrator selects 2–4 tradition agents
      │                   │  (including a deliberate blind-spot challenger).
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │        ACT        │  Agents retrieve canonical literature, debate positions,
      │                   │  and cross-critique (monitored against consensus collapse).
      └─────────┬─────────┘
                │
                ▼
      ┌───────────────────┐
      │ OBSERVE & ADAPT   │  Tracks inquirer reactions, updates value profile,
      │                   │  and steps in autonomously when momentum stalls.
      └───────────────────┘
```

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React
* **AI & Orchestration**: OpenAI GPT-4o (`gpt-4o-mini` reasoning backend), Multi-Agent ReAct Engine
* **Cloud & Infrastructure**: Firebase Hosting, Firebase Cloud Functions (2nd Gen SSR), Cloud Firestore, Firebase Auth
* **Language & Tooling**: TypeScript 5, ESLint, PostCSS

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/ChanghwiPark/philo-counsel.git
cd philo-counsel
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env.local
```
Add your OpenAI API key in `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🌐 Live Demo & Deployment

* **Live Web App**: [https://philo-counsel.web.app](https://philo-counsel.web.app)
* **Production Deploy**:
  ```bash
  npx firebase-tools deploy --only hosting --project philo-counsel
  ```

---

## 📄 License

Released under the [MIT License](LICENSE).
