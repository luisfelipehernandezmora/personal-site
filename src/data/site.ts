export const site = {
  name: "Luis Felipe Hernández Mora",
  shortName: "Luis Hernández",
  email: "luisfelipehernandezmora@gmail.com",
  location: "San José, Costa Rica",
  links: {
    linkedin: "https://www.linkedin.com/in/luis-felipe-hernandez-mora-5b0348160/",
    github: "https://github.com/luisfelipehernandezmora",
    // TODO: replace with the channel URL once it exists.
    youtube: "",
  },
};

export const metrics = [
  { value: "40", unit: "×", label: "Faster generation", note: "600s → 15s" },
  { value: "60", unit: "%", label: "Lower cost", note: "prompt caching" },
  { value: "50", unit: "+", label: "Typed MCP tools", note: "in production" },
  { value: "1,000", unit: "+", label: "Automated tests", note: "acceptance sampling" },
];

export const work = [
  {
    num: "01",
    title: "Agentic platform with human-in-the-loop governance",
    meta: "Wekan · 2025—present",
    desc: "Architected multi-agent workflows and Model Context Protocol servers that let language models execute real work — with approval gates, role-based access, and audit logging at every consequential step.",
    tags: ["MCP", "FastMCP", "Multi-agent", "HITL", "Docker"],
  },
  {
    num: "02",
    title: "Multi-provider LLM routing and cost control",
    meta: "Wekan · 2025—present",
    desc: "Built routing pipelines across providers with fallback chains and parallel execution. Cut multi-topic generation from roughly ten minutes to fifteen seconds, and reduced cost by about 60% through prompt caching and single-call screening.",
    tags: ["FastAPI", "MongoDB", "Parallelism", "Caching"],
  },
  {
    num: "03",
    title: "Evaluation harnesses for grounded output",
    meta: "Wekan · 2025—present",
    desc: "Designed statistical acceptance sampling, blind multi-model bake-offs, and a suite of over a thousand tests to hold generated output to deterministic, zero-hallucination constraints.",
    tags: ["Evaluation", "Statistical QA", "CI/CD", "Testing"],
  },
  {
    num: "04",
    title: "Grounded ingestion for technical documentation",
    meta: "Wekan · 2025—present",
    desc: "Built multimodal pipelines across PDFs, Office documents, images, and speech, converting unstructured technical material into schema-validated records that carry their provenance.",
    tags: ["Multimodal", "Whisper", "Schema validation", "Provenance"],
  },
];

export const experience = [
  {
    when: "2025 — now",
    role: "AI Product & Application Engineer",
    org: "Wekan Enterprise Solutions",
    desc: "Agentic architecture, MCP tooling, LLM routing, and evaluation systems. Also designed and delivered hands-on AI engineering workshops for 30+ developers.",
    note: "Remote",
  },
  {
    when: "2023 — 2026",
    role: "Faculty & Data Pipeline Engineer",
    org: "Amrita Vishwa Vidyapeetham · Cybersecurity Systems & Networks",
    desc: "Taught master's-level Python sequences focused on secure parsing, backend data structures, and defensive coding. Engineered secure crawlers and ETL pipelines for machine learning research.",
    note: "Remote",
  },
  {
    when: "2019 · 2021–22",
    role: "Civil Engineer & Project Specialist",
    org: "PHC Ingenieros Consultores",
    desc: "Directed delivery of a 1,800 m², three-storey residential complex — municipal permissions, budget engineering, and technical compliance.",
    note: "San José, Costa Rica",
  },
  {
    when: "2011 — 2018",
    role: "Licentiate in Civil Engineering",
    org: "Universidad de Costa Rica",
    desc: "Graduated with a perfect 100/100 thesis defense on multivariate stress models. Coursework in linear algebra, calculus, and numerical methods.",
    note: "Thesis: 100/100",
  },
  {
    when: "2021 — 2022",
    role: "Python Infrastructure & Software Development",
    org: "CodingNomads",
    desc: "Advanced Python architectures, Django, machine learning frameworks, and data pipelines.",
    note: "Program",
  },
  {
    when: "2026",
    role: "Deep Learning Specialization",
    org: "DeepLearning.AI · Coursera",
    desc: "Neural networks, optimization algorithms, and structuring machine learning projects.",
    note: "In progress",
  },
];

export const videos = [
  {
    title: "Why medical AI has to be able to say “I don’t know”",
    runtime: "Episode 01",
    status: "In production",
  },
  {
    title: "Agents that ask permission: human-in-the-loop by design",
    runtime: "Episode 02",
    status: "In production",
  },
  {
    title: "Testing a model like a structural engineer",
    runtime: "Episode 03",
    status: "Planned",
  },
];
