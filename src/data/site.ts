// Single source of truth for all site content. Facts here were checked by the orchestrator;
// do not invent new facts, numbers, dates, employers or links. Wording may be lightly
// tightened for layout, but meaning must not change.

export const person = {
  name: 'Sindre Wilting',
  fullName: 'Sindre Alstad Wilting',
  handle: 'woksin',
  title: 'Co-founder & Chief Architect at Cratis · Senior Consultant at Everdeen',
  titleShort: 'Co-founder & Chief Architect, Cratis',
  location: 'Oslo, Norway',
  email: 'sindrewilting@gmail.com',
  links: {
    github: 'https://github.com/woksin',
    linkedin: 'https://www.linkedin.com/in/sindrewilting/',
    cratis: 'https://cratis.io',
    cratisGithub: 'https://github.com/Cratis',
    everdeen: 'https://everdeen.no',
  },
  tagline: 'I build systems that remember everything.',
  intro:
    'Software engineer from Oslo. I work where architecture meets developer experience: event sourcing, event modeling, actor systems and the tools that make them pleasant to use. Co-founder and chief architect of Cratis, an open-source event sourcing platform, and a senior consultant at Everdeen.',
  about: [
    'I am drawn to the lower layers: the frameworks, runtimes and tools that let other developers ship better software faster. The hard part of software is not version 1. It is keeping a system adaptable, understandable and correct for years after.',
    'I think of information systems as flows of information and state. That is why I care about Event Modeling, Event Sourcing and Continuous Delivery: they make the flow explicit, give teams a shared language with the business, and let systems evolve gracefully.',
    'Colleagues describe me as structured, engaged and eager to learn, someone who explains complex things so others can take ownership. Lately I spend a lot of time on agentic engineering: building the guardrails, workflows and tools that make AI coding agents reliable collaborators.',
  ],
  interests: [
    'Event Modeling', 'Event Sourcing', 'CQRS', 'Domain-Driven Design', 'Actor systems',
    'Distributed systems', 'Developer experience', 'Continuous Delivery', 'Agentic engineering',
  ],
  languages: ['Norwegian (native)', 'English (fluent)'],
};

// "Now" read model shown near the top.
export const now = {
  role: 'Senior Consultant',
  company: 'Everdeen',
  since: '2025-06',
  assignment: 'Technical lead for the Insights project at Azets, on top of the Azets Common Platform',
  cratis: 'Co-founder & Chief Architect at Cratis, since Jun 2024',
  building: ['Screenplay', 'Stage', 'Cratis AI corpus', 'workstats'],
};

// `live` values are computed at build time (src/components/Stats.astro) from the GitHub
// snapshot or from `cratis.repos`; `value` is the fallback.
export const stats = [
  { value: 31700, prefix: '', suffix: '+', label: 'contributions on GitHub in the last year', live: 'contributionsLastYear' },
  { value: 3100, prefix: '', suffix: '+', label: 'merged PRs in the Cratis org', live: 'cratisMergedPrs' },
  { value: 1, prefix: '#', suffix: '', label: 'committer on 8 Cratis repositories', live: 'cratisRankOne', plain: true },
  { value: 6, prefix: '', suffix: '', label: 'languages with a Chronicle client', live: 'chronicleLanguages', plain: true },
];

// Career as an event stream. `type` is an event-modeling style past-tense event name.
// The projection (current role, companies, skills) is computed by replaying these in order.
export type CareerEvent = {
  seq: number;
  date: string; // YYYY-MM
  endDate?: string; // YYYY-MM, for engagements without a `role` that have a known end
  type: string;
  title: string;
  org?: string;
  orgUrl?: string;
  location?: string;
  summary: string;
  skills?: string[];
  role?: string; // sets "current role" in the projection
  endsRole?: string; // org whose role ends
};

export const careerEvents: CareerEvent[] = [
  { seq: 1, date: '2015-08', type: 'StudiesStarted', title: 'Bachelor, IT and Information Systems', org: 'University of Oslo', orgUrl: 'https://www.uio.no/english/', location: 'Oslo',
    summary: 'Picked the fun subjects: computer architecture, information security, operating systems (we built one from scratch), biologically inspired computing and functional programming.',
    skills: ['Functional programming', 'Operating systems', 'Information security'] },
  { seq: 2, date: '2018-02', type: 'VolunteerTeamJoined', title: 'Digital volunteer, software core team', endDate: '2020-12', org: 'Norwegian Red Cross', orgUrl: 'https://www.rodekors.no/en/', location: 'Oslo',
    summary: 'Community-Based Surveillance: an open-source, event-sourced system for early warning of disease outbreaks. Went from codeathons to the core tech team, led a major database refactoring and ran event storming sessions.',
    skills: ['C#', 'MongoDB', 'Event Sourcing', 'CQRS', 'DDD', 'Event Storming', 'TypeScript'] },
  { seq: 3, date: '2018-03', type: 'PartTimeRoleStarted', title: 'IT Analyst (part-time)', endDate: '2018-06', org: 'Nordkinn Asset Management', orgUrl: 'https://nordkinn.se',
    summary: 'Full-stack .NET, SQL and Angular. Refactored toward SOLID, introduced Swagger docs and dependency injection.',
    skills: ['.NET', 'SQL', 'Entity Framework', 'Angular'] },
  { seq: 4, date: '2018-04', type: 'ContractStarted', title: 'Software Development Consultant', endDate: '2018-06', org: 'Norwegian Red Cross',
    summary: 'Full-time contract on Community-Based Surveillance. Pushed a DevOps-first culture with automated build, test and deploy pipelines and Docker.',
    skills: ['DevOps', 'Docker', 'CI/CD'] },
  { seq: 5, date: '2018-06', type: 'DegreeCompleted', title: 'Graduated, University of Oslo', org: 'University of Oslo',
    summary: 'Bachelor degree completed.' },
  { seq: 6, date: '2018-07', type: 'EmploymentStarted', title: 'OSS Platform Engineer', org: 'Dolittle (now Aigonix)', orgUrl: 'https://aigonix.com', location: 'Oslo', role: 'OSS Platform Engineer',
    summary: 'Joined a startup almost from day one. Designed and built a multi-tenant event sourcing runtime on .NET, an actor framework, MongoDB and gRPC. Ran SLA-bound hosting on Azure Kubernetes and automated delivery with GitHub Actions.',
    skills: ['.NET', 'gRPC', 'Actor systems', 'Kubernetes', 'Azure', 'GitHub Actions', 'Go', 'Multi-tenancy', 'API design'] },
  { seq: 7, date: '2023-03', type: 'EmploymentStarted', title: 'Software Engineer', org: 'DNV · Veracity', orgUrl: 'https://veracity.com', location: 'Høvik', role: 'Software Engineer', endsRole: 'Dolittle (now Aigonix)',
    summary: 'Event-driven microservices data platform in a large international team. Standardised tooling and built reusable .NET libraries used across the software division.',
    skills: ['Event-driven architecture', 'Microservices', 'Scrum'] },
  { seq: 8, date: '2023-04', type: 'CertificationsEarned', title: 'Three Microsoft Azure certificates', org: 'Coursera',
    summary: 'Azure Services and Lifecycles; Azure Management Tools and Security Solutions; Introduction to Microsoft Azure Cloud Services.' },
  { seq: 9, date: '2023-08', type: 'EmploymentStarted', title: 'Senior Systems Developer', org: 'Stacc', orgUrl: 'https://stacc.com', location: 'Oslo', role: 'Senior Systems Developer', endsRole: 'DNV · Veracity',
    summary: 'Fintech for banks across Oslo and Serbia. Revived a legacy application, set up CI/CD with coverage and vulnerability tracking, and started the move toward multi-tenant SaaS and event-driven design.',
    skills: ['React', 'TypeScript', 'SaaS', 'Fintech'] },
  { seq: 10, date: '2024-06', type: 'EmploymentStarted', title: 'Tech Lead, OCEAN', org: 'Kongsberg Digital · Maritime Simulation', orgUrl: 'https://www.kongsbergdigital.com', location: 'Horten', role: 'Tech Lead', endsRole: 'Stacc',
    summary: 'Headhunted to lead OCEAN: a greenfield, event-sourced microservice system adding role-based access control to maritime simulators, on-prem or in the cloud. Ran event modeling sessions, coached the team, and owned the gateway and identity design.',
    skills: ['Orleans', 'Event Modeling', 'OAuth 2.0 / OIDC', 'YARP', 'Docker', 'Architecture'] },
  { seq: 11, date: '2024-06', type: 'CompanyCoFounded', title: 'Co-founder & Chief Architect', org: 'Cratis', orgUrl: 'https://cratis.io', role: 'Co-founder & Chief Architect',
    summary: 'Co-founded Cratis with Einar Ingebrigtsen: an open-source event sourcing platform, from the Screenplay modeling language to the Chronicle event store. Architect, developer and content creator. OCEAN was built on it, so the framework and the product improved together.',
    skills: ['Chronicle', 'Arc', 'OpenTelemetry', 'Performance profiling'] },
  { seq: 12, date: '2025-01', type: 'SystemDeployed', title: 'OCEAN live at a customer site in England', org: 'Kongsberg Digital · Maritime Simulation',
    summary: 'Led the technical rollout on site, debugged first-deployment issues and made sure it worked in a real operating environment.' },
  { seq: 13, date: '2025-06', type: 'EmploymentStarted', title: 'Senior Consultant', org: 'Everdeen', orgUrl: 'https://everdeen.no', location: 'Oslo', role: 'Senior Consultant', endsRole: 'Kongsberg Digital · Maritime Simulation',
    summary: 'Everdeen is an approved Norwegian staffing firm for senior independent consultants, with assignments through Hive Consulting. Assigned to the Azets Common Platform: a serverless, multi-tenant, event-driven integration platform syncing accounting and payroll data for thousands of Nordic customers. Owned data flow between integration sources and ran event modeling sessions.',
    skills: ['AWS', 'Serverless', 'PostgreSQL', 'Marten', 'GitLab'] },
  { seq: 14, date: '2025-11', type: 'LeadershipAssigned', title: 'Technical lead, Insights project', org: 'Azets (via Everdeen)',
    summary: 'Leading the technical work from discovery interviews with advisers and management to a BigQuery-based data foundation for analytics and AI.',
    skills: ['Google BigQuery', 'Data platforms', 'AI'] },
  { seq: 15, date: '2025-11', type: 'TalkGiven', title: 'Webinar: Event Modeling', org: 'Hive Consulting', orgUrl: 'https://www.hiveconsulting.no/videos/v/4nbyh4e53ael6t6yxz57xsrtgrczk5',
    summary: 'With Einar Ingebrigtsen (Novanet): how Event Modeling and Event Sourcing create clarity, shared understanding and control in complex projects.' },
  { seq: 16, date: '2026-04', type: 'TalkGiven', title: 'Webinar: Event Sourcing', org: 'Novanet × Hive Consulting', orgUrl: 'https://novanet.no/webinar-event-sourcing/',
    summary: 'With Einar Ingebrigtsen: what event sourcing is, CQRS, projections and event stores, and lessons from real production implementations with Cratis.' },
  { seq: 17, date: '2026-09', type: 'ToolReleased', title: 'reap v5', org: 'woksin', orgUrl: 'https://github.com/woksin/reap',
    summary: 'Rust TUI that finds stale developer junk and prunes only what is provably safe to lose.',
    skills: ['Rust', 'ratatui'] },
  { seq: 18, date: '2026-10', type: 'ToolReleased', title: 'workstats v1.11', org: 'woksin', orgUrl: 'https://github.com/woksin/workstats',
    summary: 'Local-first analytics of Git and AI-assisted work. Zero telemetry.',
    skills: ['Rust', 'Agentic engineering'] },
];

export type CratisRepo = {
  name: string;
  /** Omitted for repositories that are not public. */
  url?: string;
  kind: string;
  group: 'pipeline' | 'tooling' | 'client';
  step?: string;
  note?: string;
  role: string;
  /** Rank among all-time committers; 0 when not in the top two. */
  rank: number;
  founded: boolean;
  commits: number;
  prs: number;
  desc: string;
};

export const cratis = {
  pitch: 'Cratis makes event sourcing and CQRS practical: a production-grade event store and runtime, an opinionated application framework, and tooling that lets teams without event sourcing experience build robust, multi-tenant systems.',
  role: 'Co-founder and Chief Architect since 2024 (Cratis is a company of two: Sindre and Einar Ingebrigtsen): architecture, design and implementation of the core, with a focus on performance, robustness and correctness, plus docs, samples, videos and livestreams.',
  mergedPrs: 3100,
  about: 'https://cratis.no/about/',
  cofounder: 'Einar Ingebrigtsen',
  // All-time contribution figures per repository, from the GitHub API on `asOf`.
  asOf: '2026-10-15',
  // Model to running app, left to right.
  pipeline: ['Screenplay', 'Stage', 'Arc', 'Chronicle'],
  clientLanguages: ['.NET', 'TypeScript', 'Kotlin/Java', 'Elixir', 'Go', 'Python'],
  repos: [
    { name: 'Screenplay', url: 'https://github.com/Cratis/Screenplay', kind: 'Modeling language', group: 'pipeline', step: 'Model',
      role: 'Lead developer', rank: 1, founded: false, commits: 2142, prs: 305,
      desc: 'The modeling language for Cratis: one declarative .play model holds events, commands, queries, projections, specs and automations, and compiles. VS Code extension.' },
    { name: 'Stage', url: 'https://github.com/Cratis/Stage', kind: 'Renderer', group: 'pipeline', step: 'Render',
      role: 'Lead developer', rank: 1, founded: false, commits: 981, prs: 189,
      desc: 'Compiles Screenplay models, runs their specifications, and renders a real Arc + Chronicle application from the model.' },
    { name: 'Arc', url: 'https://github.com/Cratis/Arc', kind: 'Framework', group: 'pipeline', step: 'Run',
      role: '#2 all-time', rank: 2, founded: false, commits: 2129, prs: 411,
      desc: 'Full-stack CQRS for ASP.NET Core with validation, authorization and generated TypeScript proxies.' },
    { name: 'Chronicle', url: 'https://github.com/Cratis/Chronicle', kind: 'Event store', group: 'pipeline', step: 'Remember',
      role: '#2 all-time', rank: 2, founded: false, commits: 3802, prs: 466,
      desc: 'The event store: immutable facts, derived read models; MongoDB, PostgreSQL, SQL Server or SQLite; Orleans kernel; gRPC clients.' },
    { name: 'AI', url: 'https://github.com/Cratis/AI', kind: 'Agent corpus', group: 'tooling',
      role: 'Founder & lead', rank: 1, founded: true, commits: 1177, prs: 207,
      desc: 'MIT agent corpus: one canonical set of Cratis rules, skills and agents with adapters for Claude Code, Codex, Copilot, Cursor, OpenCode and Pi; installed with `cratis ai install`.' },
    { name: 'cli', url: 'https://github.com/Cratis/cli', kind: 'Terminal', group: 'tooling',
      role: 'Founder & lead', rank: 1, founded: true, commits: 622, prs: 133,
      desc: 'Terminal workflows for diagnosing Chronicle event stores (events, observers, projections, failed partitions) and installing the AI corpus.' },
    { name: 'Lens', url: 'https://github.com/Cratis/Lens', kind: 'Browser extension', group: 'tooling',
      role: '#1 committer', rank: 1, founded: false, commits: 57, prs: 18,
      desc: 'Switch tenant and identity, and run commands and queries against a live Arc app.' },
    { name: 'Chronicle.Mcp', url: 'https://github.com/Cratis/Chronicle.Mcp', kind: 'MCP server', group: 'tooling',
      role: 'Contributor', rank: 0, founded: false, commits: 39, prs: 13,
      desc: 'MCP server connecting AI agents to a running Chronicle store.' },
    { name: 'Chronicle.TypeScript', url: 'https://github.com/Cratis/Chronicle.TypeScript', kind: 'Client · TypeScript', group: 'client',
      role: 'Lead', rank: 1, founded: false, commits: 480, prs: 113,
      desc: '@cratis/chronicle for Node and TypeScript.' },
    { name: 'Chronicle.Go', url: 'https://github.com/Cratis/Chronicle.Go', kind: 'Client · Go', group: 'client',
      role: 'Founder', rank: 1, founded: true, commits: 423, prs: 16,
      desc: 'Idiomatic Go client for Chronicle.' },
    { name: 'Chronicle.Python', url: 'https://github.com/Cratis/Chronicle.Python', kind: 'Client · Python', group: 'client',
      role: 'Founder', rank: 1, founded: true, commits: 35, prs: 11,
      desc: 'Python client (pre-alpha).' },
    { name: 'Chronicle.Kotlin', url: 'https://github.com/Cratis/Chronicle.Kotlin', kind: 'Client · JVM', group: 'client',
      role: '#2 contributor', rank: 2, founded: false, commits: 177, prs: 48,
      desc: 'JVM client with a Spring Boot starter, on Maven Central.' },
    { name: 'Chronicle.Elixir', url: 'https://github.com/Cratis/Chronicle.Elixir', kind: 'Client · Elixir', group: 'client',
      role: '#2 contributor', rank: 2, founded: false, commits: 134, prs: 35,
      desc: 'Elixir client, on Hex.' },
  ] as CratisRepo[],
  highlights: [
    'Transactional AppendMany in the storage layer',
    'WebSocket ping/pong for observable queries',
    'JSDoc for generated TypeScript proxies from C# XML docs',
    '.NET 10 upgrade with multi-targeting for 8, 9 and 10',
    'Correlation and tracing across the runtime',
    'Parallel integration test runs',
    'Self-reducing read models in Arc',
  ],
};

export type Project = {
  name: string;
  url: string;
  pitch: string;
  features: string[];
  stack: string[];
  install?: string;
  version?: string;
  category: 'cli' | 'agents' | 'app';
};

export const projects: Project[] = [
  { name: 'workstats', category: 'cli', url: 'https://github.com/woksin/workstats', version: 'v1.11',
    pitch: 'See where the work happened, without sending your work anywhere.',
    features: ['Separates human, agent-authored and AI co-authored commits', 'Agent wall-clock, parallelism and token usage', 'Open JSONL event format', 'Zero telemetry'],
    stack: ['Rust'], install: 'brew install woksin/workstats/workstats' },
  { name: 'reap', category: 'cli', url: 'https://github.com/woksin/reap', version: 'v5',
    pitch: 'Find and prune stale developer junk, and know which of it you can afford to lose.',
    features: ['Branches, worktrees, build artifacts, Docker and caches', 'Safe / rebuildable / irreversible tiers', 'Only prunes what is provably safe', 'Built for the age of agentic programming'],
    stack: ['Rust', 'ratatui'], install: 'brew install woksin/reap/reap' },
  { name: 'gearprice', category: 'cli', url: 'https://github.com/woksin/gearprice', version: 'v0.2',
    pitch: 'What guitar gear costs on Reverb right now, and what class it sits in.',
    features: ['Price bands from steal to premium', 'Category percentile across 100k+ listings', 'Reads full live listing sets'],
    stack: ['Rust'], install: 'brew tap woksin/gearprice && brew install gearprice' },
  { name: 'Varde', category: 'app', url: 'https://github.com/woksin/Varde',
    pitch: 'A self-hosted family life operating system on a kitchen wall tablet.',
    features: ['Chores, rewards, routines, meals, lists and calendar', 'No punishments, no leaderboards', 'One Docker Compose stack on the LAN', 'Built on Cratis Arc and Chronicle'],
    stack: ['.NET 10', 'Chronicle', 'Arc', 'React 19', 'Tailwind'] },
  { name: 'pi-setup', category: 'agents', url: 'https://github.com/woksin/pi-setup',
    pitch: 'My whole AI coding agent setup: rules, agents, guards, review workflows and model routing.',
    features: ['Pinned-model subagents', 'Cross-provider review workflow', 'Guards, issue tracking, phase queue', 'Usage and cleanup tooling'],
    stack: ['TypeScript', 'Python', 'Bash'] },
  { name: 'pi-jobs', category: 'agents', url: 'https://github.com/woksin/pi-jobs',
    pitch: 'Background jobs and watches that wake the agent when they finish, at zero token cost.',
    features: ['job_start / job_watch', 'Process-group supervision', 'No polling'],
    stack: ['TypeScript'], install: 'pi install npm:@woksin/pi-jobs' },
  { name: 'pi-recover', category: 'agents', url: 'https://github.com/woksin/pi-recover',
    pitch: 'Pick up subagents, jobs and workflows from a session that stopped abruptly.',
    features: ['Deterministic session parsing', 'Recovery report with original prompts', 'Dry-run mode'],
    stack: ['TypeScript'], install: 'pi install npm:@woksin/pi-recover' },
];

export const talks = [
  { title: 'Event Modeling – veien å skape klarhet, felles forståelse og kontroll i komplekse prosjekter', lang: 'no',
    host: 'Hive Consulting webinar', with: 'Einar Ingebrigtsen (Novanet)', date: '2025-11-12', year: '2025',
    url: 'https://www.hiveconsulting.no/videos/v/4nbyh4e53ael6t6yxz57xsrtgrczk5',
    summary: 'How Event Modeling and Event Sourcing create clarity, shared understanding and control in complex projects.' },
  { title: 'Event Sourcing med Hive Consulting', lang: 'no',
    host: 'Novanet × Hive Consulting webinar', with: 'Einar Ingebrigtsen', date: '2026-04-22', year: '2026',
    url: 'https://novanet.no/webinar-event-sourcing/',
    summary: 'What event sourcing is, CQRS, projections and event stores, and lessons from real production implementations with Cratis.' },
];

// Community participation. Attended, not spoken at.
export const community = [
  { title: 'Event Modeling Conference', detail: 'The first one, in Munich', date: '2025-10' },
  { title: 'Event Modeling Conference 2026', detail: '', date: '2026' },
];

export const education = [
  { degree: 'Bachelor, IT and Information Systems', school: 'University of Oslo', from: '2015', to: '2018' },
];

export const certifications = [
  { title: 'Microsoft Azure Services and Lifecycles', issuer: 'Microsoft (Coursera)', year: '2023', url: 'https://www.coursera.org/account/accomplishments/certificate/4GXAS9J582UX' },
  { title: 'Microsoft Azure Management Tools and Security Solutions', issuer: 'Microsoft (Coursera)', year: '2023', url: 'https://www.coursera.org/account/accomplishments/certificate/YHYXFCBQ45T4' },
  { title: 'Introduction to Microsoft Azure Cloud Services', issuer: 'Microsoft (Coursera)', year: '2023', url: 'https://www.coursera.org/account/accomplishments/certificate/MA776BHVW5XV' },
];

export const skills = {
  'Architecture & methods': ['Event Modeling', 'Event Sourcing', 'CQRS', 'DDD', 'Event Storming', 'Microservices', 'Actor systems', 'Multi-tenancy', 'TDD / BDD', 'Continuous Delivery'],
  'Languages': ['C#', 'TypeScript', 'Rust', 'Go', 'SQL'],
  'Platforms & frameworks': ['.NET / ASP.NET Core', 'Orleans', 'Cratis Chronicle & Arc', 'Marten', 'React', 'gRPC', 'OpenTelemetry'],
  'Data': ['MongoDB', 'PostgreSQL', 'SQL Server', 'Google BigQuery'],
  'Cloud & ops': ['Azure', 'AWS', 'Kubernetes', 'Docker', 'GitHub Actions', 'Prometheus', 'Grafana'],
  'Agentic engineering': ['Multi-agent workflows', 'Cross-provider review', 'Agent guardrails', 'Claude, GPT and open models'],
};

// Agentic engineering: the harness around AI coding agents. Public work only.
export const agentic = {
  pitch: 'Using coding agents is the easy part. I build what makes them reliable collaborators: the rules, routing, guards, queues and reviews around them, and the tools that measure what they actually do.',
  // The workflow my own setup runs for every change.
  workflow: [
    { step: 'Plan', event: 'TaskPlanned', who: 'Orchestrator', text: 'Scopes the change and writes a brief with owned files, the exact gate command and a done condition.' },
    { step: 'Implement', event: 'ChangeImplemented', who: 'Pinned subagent', text: 'A subagent type pinned to a model and thinking level does the work inside the brief.' },
    { step: 'Review', event: 'ChangeReviewed', who: 'Other provider', text: 'Adversarial review by a model from another provider. Only confirmed blocking findings send it back.' },
    { step: 'Gate', event: 'GatesPassed', who: 'Local CI mirror', text: 'The same build, lint and tests as CI, run locally through a priority build queue before anything is pushed.' },
    { step: 'Ship', event: 'PullRequestMerged', who: 'Orchestrator', text: 'Push once, wait for CI without polling, merge, and close the issue.' },
  ],
  items: [
    { name: 'pi-setup', url: 'https://github.com/woksin/pi-setup', kind: 'Agent configuration',
      text: 'My complete, published agent setup: 17 custom subagent types each pinned to a model and thinking level, model-routing profiles, and workflows including a cross-provider adversarial code review that gates only on confirmed blocking findings.',
      list: ['Guards', 'Wait-guard that blocks CI polling', 'Issue-work leases across sessions', 'Provider fallback', 'Phase-priority build queue', 'Cache retention', 'ai-work lifecycle', 'Cratis CLI guard'],
      listLabel: '8 extensions' },
    { name: 'pi-jobs', url: 'https://github.com/woksin/pi-jobs', kind: 'npm · @woksin/pi-jobs',
      text: 'Background jobs and watches that wake the agent when they finish, at zero token cost.' },
    { name: 'pi-recover', url: 'https://github.com/woksin/pi-recover', kind: 'npm · @woksin/pi-recover',
      text: 'Pick up subagents, jobs and workflows from a session that stopped abruptly.' },
    { name: 'workstats', url: 'https://github.com/woksin/workstats', kind: 'Measurement',
      text: 'Measuring rather than claiming AI productivity: human hours against agent wall-clock, parallel-agent concurrency, tokens, and agent-authored against co-authored commits.' },
    { name: 'Cratis AI', url: 'https://github.com/Cratis/AI', kind: 'Agent corpus',
      text: 'One canonical set of Cratis rules, skills and agents with adapters for Claude Code, Codex, Copilot, Cursor, OpenCode and Pi.' },
  ] as { name: string; url?: string; kind: string; text: string; list?: string[]; listLabel?: string }[],
};
