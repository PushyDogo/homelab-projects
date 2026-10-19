ROADMAP.stages.push({
  id: "stage-2",
  n: 2,
  level: "Beginner to intermediate",
  title: "Building with LLMs",
  tag: "LLM-Apps",
  index: "011-LLM Apps",
  blurb: "The developer side: APIs, context engineering, evaluation, retrieval, tools, agents, and what it takes to put them in front of users.",
  outcome: "you have shipped an agentic application with a regression eval suite in CI, traces you can debug from, and a threat model you wrote yourself.",
  modules: [
    {
      id: "b-api",
      track: "build",
      title: "LLM APIs, structured output and cost",
      h: [8, 12],
      summary: "Call models properly: messages, streaming, structured output, prompt caching, batching, retries, and knowing what each request costs.",
      needs: ["f-generation"],
      topics: [
        "Request anatomy: system, user and assistant turns; stateless APIs and who holds the conversation",
        "Streaming with server-sent events; time to first token as a UX number",
        "Structured output: JSON schema, strict mode, validation with Pydantic, what to do on a schema failure",
        "Prompt caching: what is cached, cache breakpoints, how prompt layout affects the hit rate",
        "Batch APIs and when asynchronous processing halves the bill",
        "Rate limits, retries with backoff and jitter, timeouts, idempotency",
        "Multimodal input: images, PDFs, audio",
        "The OpenAI-compatible API as the common interface for hosted and self-hosted models"
      ],
      questions: [
        "Why must the client resend the whole conversation on every call, and what does that imply for cost as a chat grows?",
        "How should a prompt be ordered to maximise cache hits, and what invalidates the cache?",
        "What are three different ways to get JSON out of a model, and how do their guarantees differ?",
        "A request times out after the model has already generated a tool call. What could go wrong on retry?",
        "Estimate the monthly cost of a feature from requests per day, input and output tokens, and cache hit rate."
      ],
      exercises: [
        { t: "Thin client, no framework", env: "any", d: "Write a small Python client over raw HTTP for one hosted provider: streaming, structured output validated by Pydantic, retries with backoff, and per-request token and cost logging." },
        { t: "Caching experiment", env: "any", d: "Send the same long system prompt plus varying questions 20 times with and without prompt caching. Report cost and latency. Then reorder the prompt badly and show the hit rate collapse." },
        { t: "Same code, local model", env: "pc", d: "Point the same client at a local OpenAI-compatible server (Ollama or llama.cpp) by changing only the base URL. Note every behavioural difference." }
      ],
      resources: [
        { t: "Claude API documentation", u: "https://platform.claude.com/docs/en/home", k: "doc", n: "Messages, streaming, structured outputs, prompt caching, batch" },
        { t: "OpenAI API documentation", u: "https://platform.openai.com/docs/overview", k: "doc", n: "Responses API and structured outputs" },
        { t: "Pydantic", u: "https://docs.pydantic.dev/latest/", k: "doc" },
        { t: "Instructor", u: "https://python.useinstructor.com/", k: "tool", n: "Read how it retries on validation errors, then decide whether you need it" }
      ],
      notes: ["LLM API request anatomy", "Prompt caching", "Structured outputs"]
    },
    {
      id: "b-context",
      track: "build",
      title: "Prompt and context engineering",
      h: [10, 14],
      summary: "Writing instructions is the small part. The larger skill is deciding what goes into the context window, in what form, and what stays out.",
      needs: ["b-api"],
      why: "Most quality problems in LLM applications are context problems: missing information, too much irrelevant information, or instructions that conflict.",
      topics: [
        "Clear instructions: role, goal, constraints, the reasons behind them, output format",
        "Examples: when few-shot helps, when it over-anchors",
        "Structure: delimiters and tags, long documents first, questions last",
        "Giving the model room to think; when extended reasoning pays for itself",
        "Context as a budget: relevance, sufficiency, ordering, and degradation as the window fills",
        "Compaction, summarisation and note-taking for long-running tasks",
        "Instruction files and conventions for coding agents (`AGENTS.md`, `CLAUDE.md`), skills as on-demand context",
        "Prompts as code: versioning, review, and never changing one without an eval"
      ],
      questions: [
        "What is the difference between prompt engineering and context engineering? Give an example of a failure that only the second can fix.",
        "Why does adding more retrieved documents sometimes make answers worse?",
        "When would you choose a few-shot prompt over detailed instructions, and what is the risk?",
        "How would you keep an agent effective on a task that needs ten times more tokens than its context window?",
        "Why is 'explain the reason for the rule' often more effective than writing the rule in capitals?"
      ],
      exercises: [
        { t: "Three real prompts, iterated", env: "any", d: "Take three tasks from your own work (incident summary, log triage, change-risk review). For each, write a first prompt, collect 15 realistic inputs, and iterate against them. Keep every version and why you changed it." },
        { t: "Context ablation", env: "any", d: "For one task, vary the context deliberately: missing key facts, right facts buried in noise, contradictory facts. Record how the output degrades in each case." },
        { t: "Write an agent instruction file", env: "pc", d: "Write an `AGENTS.md` for your `ai-lab` repo, use a coding agent on a real task with and without it, and note what changed." }
      ],
      resources: [
        { t: "Prompt engineering overview (Anthropic)", u: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview", k: "doc" },
        { t: "Effective context engineering for AI agents", u: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", k: "article" },
        { t: "Prompt engineering guide (OpenAI)", u: "https://platform.openai.com/docs/guides/prompt-engineering", k: "doc" },
        { t: "AGENTS.md", u: "https://agents.md/", k: "doc", n: "The cross-tool convention for agent instructions" }
      ],
      notes: ["Context engineering", "Prompt structure patterns", "Compaction and long-running context"]
    },
    {
      id: "b-evals",
      track: "build",
      title: "Evals I: measuring before improving",
      h: [14, 20],
      summary: "Error analysis on real outputs, building a dataset, code and model graders, and making a quality number you trust enough to gate a release on.",
      needs: ["b-context"],
      why: "Evals are the skill postings now name explicitly, and the one most teams are weakest at. Everything else in this stage depends on it.",
      topics: [
        "Look at the data first: open coding of failures, then grouping them into failure modes",
        "Datasets: sourcing from production, synthetic generation, edge cases, keeping a held-out set",
        "Grader types: exact and code-based checks, model-graded rubrics, human review",
        "LLM-as-judge done properly: binary criteria, one criterion per judge, validating the judge against human labels",
        "Metrics that mean something: pass rate per failure mode, with confidence intervals",
        "Offline vs online evaluation; regression suites in CI",
        "Non-determinism: repeated trials, seeds, variance",
        "Frameworks (Inspect, promptfoo, Langfuse/LangSmith/Braintrust datasets) and what they do and do not give you",
        "Coverage by design: mapping the scenarios an application must handle, and their edges, before writing cases"
      ],
      questions: [
        "Why start with error analysis on 50–100 real traces rather than choosing metrics first?",
        "How do you know an LLM judge is trustworthy? Describe the validation procedure.",
        "Your eval pass rate moved from 82% to 85% on 60 examples. Is that an improvement? Show the reasoning.",
        "What belongs in a CI gate versus a nightly run versus production monitoring?",
        "Why are generic 'helpfulness' or 'hallucination' scores from a tool usually not useful?"
      ],
      exercises: [
        { t: "Error analysis by hand", env: "any", d: "Collect at least 60 outputs from one of your prompts on realistic inputs. Annotate each in a spreadsheet with free-text failure notes, then cluster them into a failure taxonomy with counts." },
        { t: "Build the suite", env: "any", d: "Turn the top failure modes into graders: code checks where possible, a validated binary LLM judge otherwise. Measure judge agreement against your own labels (true positive and true negative rates)." },
        { t: "Gate a change", env: "any", d: "Wire the suite into CI in the `ai-lab` repo so a prompt change that regresses a failure mode fails the build. Demonstrate with a deliberately bad change." }
      ],
      resources: [
        { t: "Your AI product needs evals (Hamel Husain)", u: "https://hamel.dev/blog/posts/evals/", k: "article" },
        { t: "LLM evals FAQ", u: "https://hamel.dev/blog/posts/evals-faq/", k: "article", n: "Dense and practical; return to it often" },
        { t: "Inspect AI", u: "https://inspect.aisi.org.uk/", k: "tool", n: "Open-source eval framework with solid primitives" },
        { t: "promptfoo", u: "https://www.promptfoo.dev/docs/intro/", k: "tool" },
        { t: "AI Engineering (Chip Huyen), chapters 3–4", u: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", k: "book" }
      ],
      notes: ["Error analysis for LLM apps", "LLM-as-judge", "Eval datasets", "Statistical significance in evals"]
    },
    {
      id: "b-retrieval",
      track: "build",
      title: "Embeddings and retrieval",
      h: [12, 16],
      summary: "Search is the hard part of RAG. Dense and sparse retrieval, approximate nearest-neighbour indexes, hybrid search, reranking, and measuring retrieval separately from generation.",
      needs: ["f-tokens", "b-evals"],
      topics: [
        "Embedding models: bi-encoders, dimensions, Matryoshka truncation, query vs document prefixes",
        "Similarity: cosine, dot product, and why normalisation matters",
        "Lexical search: BM25 and why it still wins on identifiers and exact terms",
        "Hybrid search and rank fusion",
        "ANN indexes: HNSW and IVF, the recall/latency/memory trade-off, quantized vectors",
        "Rerankers: cross-encoders and late interaction (ColBERT-style)",
        "Retrieval metrics: recall@k, precision@k, MRR, nDCG",
        "Choosing a store: pgvector vs a dedicated engine; metadata filtering and its effect on recall"
      ],
      questions: [
        "Why is a cross-encoder more accurate than a bi-encoder, and why can it not be used for first-stage retrieval?",
        "Explain how HNSW finds neighbours and which parameters trade recall for speed.",
        "Give two query types where BM25 beats dense retrieval and two where it loses.",
        "How would you build a labelled retrieval eval set without labelling thousands of pairs by hand?",
        "What happens to recall when you apply a selective metadata filter on an ANN index, and how do engines deal with it?"
      ],
      exercises: [
        { t: "Retrieval bake-off", env: "pc", d: "Index a real corpus (your vault plus your homelab and lab docs, or a few hundred pages of technical documentation) in Postgres with pgvector. Build 40 question-to-passage labels. Compare BM25, dense, hybrid, and hybrid plus reranker on recall@5 and MRR." },
        { t: "Serve embeddings yourself", env: "pc", d: "Run an open embedding model and a reranker locally on the GPU and use them for the bake-off instead of an API. Record throughput in documents per second." },
        { t: "HNSW knobs", env: "pc", d: "Sweep `ef_search` and `m` on your index and plot recall against query latency." }
      ],
      resources: [
        { t: "pgvector", u: "https://github.com/pgvector/pgvector", k: "code" },
        { t: "Sentence Transformers", u: "https://sbert.net/", k: "doc", n: "Embedding and cross-encoder models, training included" },
        { t: "MTEB leaderboard", u: "https://huggingface.co/spaces/mteb/leaderboard", k: "tool" },
        { t: "Qdrant documentation", u: "https://qdrant.tech/documentation/", k: "doc", n: "Clear explanations of HNSW, filtering and quantization" }
      ],
      notes: ["Dense vs sparse retrieval", "HNSW", "Reranking", "Retrieval metrics"]
    },
    {
      id: "b-rag",
      track: "build",
      title: "RAG systems end to end",
      h: [16, 24],
      summary: "Ingestion, chunking, contextualisation, generation with citations, and evaluation of the whole pipeline. Then the agentic version where the model drives the search.",
      needs: ["b-retrieval"],
      project: true,
      topics: [
        "Ingestion: parsing PDFs, tables and code; document structure; incremental re-indexing",
        "Chunking strategies and why chunk boundaries cause most retrieval failures",
        "Contextual retrieval: adding document-level context to each chunk",
        "Query transformation: rewriting, decomposition, multi-query",
        "Generation: grounding, citations, answering 'I don't know'",
        "Evaluating RAG in two halves: retrieval quality and answer faithfulness/relevance",
        "Agentic RAG: search as a tool the model calls iteratively",
        "When not to use RAG: long context, fine-tuning, or just a better search box",
        "Access control: retrieving only what the asking user may see"
      ],
      questions: [
        "A RAG answer is wrong. What is your procedure for deciding whether retrieval or generation is at fault?",
        "Why does fixed-size chunking fail on tables and code, and what would you do instead?",
        "What does contextual retrieval add to a chunk, and why does that improve both dense and BM25 retrieval?",
        "When is agentic search better than a single retrieve-then-generate step, and what does it cost?",
        "How do you enforce per-user document permissions in a vector search?"
      ],
      exercises: [
        { t: "Vault assistant v1", env: "pc", d: "Build a RAG service over your Obsidian vault and lab docs: ingestion that respects Markdown structure, hybrid retrieval, answers with links back to the source notes, behind a FastAPI endpoint." },
        { t: "RAG eval suite", env: "pc", d: "Create 50 questions with reference answers, including ten that the corpus cannot answer. Measure retrieval recall, faithfulness and correct refusals. Improve the weakest number and show before and after." },
        { t: "Agentic version", env: "pc", d: "Replace the fixed pipeline with search exposed as a tool. Compare quality, latency and cost on the same eval set." },
        { t: "Deploy to the homelab", env: "lab", d: "Run the API and Postgres with pgvector on k3s, calling a hosted or PC-hosted model. Keep it as the base for later modules." }
      ],
      resources: [
        { t: "Introducing Contextual Retrieval", u: "https://www.anthropic.com/news/contextual-retrieval", k: "article" },
        { t: "AI Engineering (Chip Huyen), chapter 6", u: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", k: "book" },
        { t: "Ragas", u: "https://docs.ragas.io/en/stable/", k: "tool", n: "Useful metric definitions; validate them against your own labels" },
        { t: "Docling", u: "https://github.com/docling-project/docling", k: "tool", n: "Document parsing for PDFs and tables" }
      ],
      notes: ["Chunking strategies", "Contextual retrieval", "RAG evaluation", "Agentic RAG"]
    },
    {
      id: "b-data",
      track: "build",
      title: "Documents and structured data: extraction and Text-to-SQL",
      h: [12, 18],
      summary: "The two workloads enterprises ask for most after chat: turning messy documents into validated structured records, and letting people query databases in plain language.",
      why: "Document intake, extraction, validation and routing is the core of several postings, and Text-to-SQL is named alongside RAG and multi-agent systems in forward-deployed roles.",
      needs: ["b-rag"],
      topics: [
        "Document pipelines: classify, parse, extract, validate, enrich, route; where each step fails",
        "Parsing choices: OCR, layout models, vision-language models reading pages directly",
        "Schema-first extraction with validation rules, confidence, and a human review queue",
        "Measuring extraction: field-level precision and recall against a labelled set",
        "Text-to-SQL: schema linking, giving the model the right tables, dialects, read-only execution",
        "Semantic layers and why curated metrics beat raw schemas",
        "Evaluating Text-to-SQL by execution result, not string match",
        "Programmatic prompt optimisation (DSPy): signatures, optimisers, when it beats hand-tuning",
        "Auditability: recording which document and which model produced each field"
      ],
      questions: [
        "Where would you put a human in a document-extraction pipeline, and what decides which documents they see?",
        "Why is execution accuracy the right metric for Text-to-SQL, and what does it still miss?",
        "A 300-table warehouse does not fit in the prompt. How do you get the right schema to the model?",
        "What can a vision-language model reading a page image do that OCR followed by an LLM cannot, and what does it cost?",
        "What does a DSPy optimiser change, and what does it need from you to do it?"
      ],
      exercises: [
        { t: "Extraction pipeline with a scorecard", env: "pc", d: "Take 40 real documents of one type (invoices, bank statements, datasheets). Define a schema, extract with a model, validate with rules, and score every field against hand labels. Route low-confidence documents to a review list." },
        { t: "Text-to-SQL over your own data", env: "pc", d: "Load a real dataset into DuckDB or Postgres (your finance tracker data is a good candidate). Build a read-only question-answering tool, write 40 question and expected-result pairs, and report execution accuracy." },
        { t: "Optimise a prompt programmatically", env: "any", d: "Re-implement one of your prompts in DSPy and run an optimiser against your eval set. Compare with your hand-written prompt and read what it produced." }
      ],
      resources: [
        { t: "DSPy", u: "https://dspy.ai/", k: "doc" },
        { t: "Docling", u: "https://github.com/docling-project/docling", k: "tool" },
        { t: "BIRD Text-to-SQL benchmark", u: "https://bird-bench.github.io/", k: "article", n: "Read the task definition and the error categories" },
        { t: "DuckDB documentation", u: "https://duckdb.org/docs/stable/", k: "doc" }
      ],
      notes: ["Document extraction pipelines", "Text-to-SQL", "DSPy and prompt optimisation"]
    },
    {
      id: "b-tools",
      track: "build",
      title: "Tool calling and MCP",
      h: [12, 16],
      summary: "How a model acts: tool definitions, the call-and-result loop, designing tools a model can use well, and the Model Context Protocol for exposing them.",
      needs: ["b-api"],
      topics: [
        "The tool-use loop: schema in, tool call out, result back, repeat",
        "Tool design: names, descriptions, parameters, return shapes sized for a context window, actionable errors",
        "Parallel tool calls and tool choice",
        "MCP: hosts, clients, servers; tools, resources and prompts; stdio and streamable HTTP transports",
        "MCP authorisation with OAuth; remote vs local servers",
        "Code execution as a tool; when writing code beats many tool calls",
        "Too many tools: tool search, deferred loading, and the context cost of definitions",
        "Trust: tool results are untrusted input"
      ],
      questions: [
        "Describe one full tool-call round trip at the message level, including what the model sees.",
        "What makes a tool description good? Rewrite a bad one from an API you know.",
        "What does MCP standardise, and what did integrations look like without it?",
        "Why can connecting 30 MCP servers make an agent worse, and what are the mitigations?",
        "Why should text returned by a tool be treated differently from text in the system prompt?"
      ],
      exercises: [
        { t: "Tool loop by hand", env: "any", d: "Implement the tool-use loop against a raw API with three tools, including parallel calls and error results. No SDK helpers." },
        { t: "Homelab MCP server", env: "lab", d: "Write an MCP server exposing read-only tools over your cluster: node status, pod list and logs, battery and temperature from the phones. Use it from a desktop client or a coding agent." },
        { t: "Evaluate the tools", env: "any", d: "Write 20 tasks that need your tools. Measure task success and number of calls, then improve descriptions and return formats and measure again." }
      ],
      resources: [
        { t: "Model Context Protocol", u: "https://modelcontextprotocol.io/", k: "doc", n: "Specification, SDKs and the architecture overview" },
        { t: "Writing effective tools for agents", u: "https://www.anthropic.com/engineering/writing-tools-for-agents", k: "article" },
        { t: "Tool use (Claude docs)", u: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview", k: "doc" },
        { t: "MCP Python SDK", u: "https://github.com/modelcontextprotocol/python-sdk", k: "code" }
      ],
      notes: ["Tool calling loop", "Model Context Protocol", "Tool design for agents"]
    },
    {
      id: "b-agents",
      track: "build",
      title: "Agents: loops, harnesses and workflows",
      h: [16, 24],
      summary: "An agent is a model using tools in a loop. Learn when a fixed workflow is the better design, build an agent loop yourself, then use an SDK knowing what it does for you.",
      needs: ["b-tools", "b-context"],
      topics: [
        "Workflows vs agents: chaining, routing, parallelisation, orchestrator-workers, evaluator-optimiser",
        "The agent loop: gather context, act, verify; stop conditions and budgets",
        "The harness: tools, permissions, context management, memory, sub-agents",
        "Planning, task lists and self-verification",
        "Memory: conversation state, files as memory, retrieval over past work",
        "Sub-agents for context isolation and parallel work, and their cost",
        "Frameworks and SDKs: Claude Agent SDK, OpenAI Agents SDK, LangGraph, Pydantic AI; what to look for when choosing",
        "Sandboxing: where agent-written code runs",
        "TypeScript as the second language of agent work: the same loop with a TypeScript SDK",
        "Skills: packaging instructions and scripts an agent loads on demand"
      ],
      questions: [
        "Give a task that should be a workflow and one that needs an agent, and say why.",
        "What does an agent harness provide beyond the model, and which parts most affect quality?",
        "Why do multi-agent systems use several times more tokens, and when is that worth it?",
        "How does an agent know it is finished, and what stops it running forever?",
        "What would you want from a framework that you could not easily build yourself?"
      ],
      exercises: [
        { t: "Agent in 200 lines", env: "any", d: "Write a minimal agent: loop, tool registry, file read/write and shell tools, a step budget, and context trimming. Give it a real multi-step task in a sandbox directory." },
        { t: "Same agent, with an SDK", env: "any", d: "Rebuild it on one agent SDK. List what the SDK gave you for free and what you had to bend." },
        { t: "Homelab operator, read-only", env: "lab", d: "Combine your MCP server with an agent that answers 'why is X unhealthy?' by inspecting the cluster. Read-only tools only. Collect ten traces and review each one." },
        { t: "One agent in TypeScript", env: "any", d: "Port your minimal agent or an MCP server to TypeScript. Several agent platforms in current postings are TypeScript-first; aim to be able to read and change such a codebase." }
      ],
      resources: [
        { t: "Building effective agents", u: "https://www.anthropic.com/engineering/building-effective-agents", k: "article", n: "Start here" },
        { t: "12-factor agents", u: "https://github.com/humanlayer/12-factor-agents", k: "article" },
        { t: "Claude Agent SDK", u: "https://platform.claude.com/docs/en/agent-sdk/overview", k: "doc" },
        { t: "OpenAI Agents SDK", u: "https://openai.github.io/openai-agents-python/", k: "doc" },
        { t: "LangGraph", u: "https://docs.langchain.com/oss/python/langgraph/overview", k: "doc" }
      ],
      notes: ["Workflows vs agents", "Agent harness", "Agent memory", "Sub-agents"]
    },
    {
      id: "b-durable",
      track: "build",
      title: "Long-running and multi-agent systems",
      h: [12, 18],
      summary: "Agents that run for hours, survive restarts, wait for a human and hand work to other agents: durable execution, checkpoints, queues and agent-to-agent protocols.",
      needs: ["b-agents"],
      why: "The gap between a demo agent and a production one is mostly here: what happens when the process dies at step 37.",
      topics: [
        "Why agent runs fail midway: timeouts, deploys, rate limits, crashed tools",
        "Durable execution: checkpointing each step, replay, idempotent tools",
        "Workflow engines (Temporal and similar) and framework checkpointers",
        "Human-in-the-loop: approvals, interrupts, resuming with new input",
        "Background and asynchronous agents: queues, webhooks, status reporting",
        "Multi-agent patterns: orchestrator and workers, handoffs, shared state",
        "A2A for agents across teams or vendors, and how it relates to MCP",
        "Managed agent runtimes on the clouds and what they take off your hands",
        "Event-driven design with streams and queues (Kafka, NATS, SQS) rather than polling",
        "Agent platforms: the runtime, SDKs and shared patterns that let other teams build agents safely"
      ],
      questions: [
        "An agent crashes after calling a tool that sends an email but before recording the result. What happens on resume, and how do you design against it?",
        "What is the difference between persisting the conversation and persisting the execution position?",
        "Where would you place a human approval step in a deploy agent, and how is the pause implemented?",
        "MCP and A2A: what problem does each solve, and when would you need both?"
      ],
      exercises: [
        { t: "Make it survive a kill", env: "any", d: "Add step-level checkpointing to your agent (a workflow engine or a framework checkpointer). Kill the process mid-run and resume without repeating side effects." },
        { t: "Approval gate", env: "lab", d: "Give the homelab operator one write tool (restart a deployment) that pauses for approval and resumes on a yes. Log who approved what." },
        { t: "Queue-driven agent", env: "lab", d: "Trigger the agent from an event (an alert webhook) through a queue, run it as a background job on k3s, and post the result to a notification channel." }
      ],
      resources: [
        { t: "Temporal documentation", u: "https://docs.temporal.io/", k: "doc", n: "Durable execution concepts apply whichever engine you use" },
        { t: "LangGraph: durable execution", u: "https://docs.langchain.com/oss/python/langgraph/durable-execution", k: "doc" },
        { t: "How we built our multi-agent research system", u: "https://www.anthropic.com/engineering/multi-agent-research-system", k: "article" },
        { t: "A2A protocol", u: "https://a2a-protocol.org/latest/", k: "doc" }
      ],
      notes: ["Durable execution for agents", "Human-in-the-loop patterns", "MCP vs A2A"]
    },
    {
      id: "b-obs",
      track: "build",
      title: "Evals II: agents, tracing and production monitoring",
      h: [12, 18],
      summary: "Evaluating multi-step behaviour, instrumenting with traces, and closing the loop from production back to the eval set.",
      needs: ["b-evals", "b-agents"],
      topics: [
        "Traces and spans for LLM apps: what to record at each model call and tool call",
        "OpenTelemetry GenAI semantic conventions and why vendor-neutral traces matter",
        "Agent evaluation: end-state checks, trajectory checks, per-tool success, cost and step counts",
        "Building eval environments and tasks; resetting state between trials",
        "Online evaluation: sampling production traces, automated scorers, user feedback",
        "The improvement loop: production failure to trace to dataset example to fix to regression test",
        "Cost and latency observability: per-feature, per-user, per-model",
        "Tooling: Langfuse, Arize Phoenix, LangSmith, Braintrust; self-hosted vs SaaS",
        "Latency engineering for agents: caching, parallel tool calls, sub-agents, profiling where a run spends its time"
      ],
      questions: [
        "Why is grading only the final answer insufficient for an agent, and why is grading the exact trajectory too strict?",
        "What attributes would you put on a span for one LLM call?",
        "How do you turn a production incident into a permanent regression test?",
        "Tracing coverage is high but quality still regresses unnoticed. What is missing?",
        "How would you attribute monthly token spend to features and teams?"
      ],
      exercises: [
        { t: "Instrument everything", env: "lab", d: "Add OpenTelemetry tracing to the vault assistant and the homelab agent, following the GenAI conventions, exporting to a self-hosted trace backend." },
        { t: "Agent eval suite", env: "any", d: "Write 25 tasks for the homelab agent with programmatic end-state checks. Run each three times; report success rate, variance, tokens and steps." },
        { t: "Close the loop", env: "any", d: "Take three bad traces from real use, add them to the dataset, fix the cause and show the suite catching a reintroduced bug." }
      ],
      resources: [
        { t: "OpenTelemetry GenAI semantic conventions", u: "https://opentelemetry.io/docs/specs/semconv/gen-ai/", k: "doc" },
        { t: "Langfuse documentation", u: "https://langfuse.com/docs", k: "doc", n: "Open source and self-hostable" },
        { t: "Arize Phoenix", u: "https://arize.com/docs/phoenix", k: "tool", n: "Lighter to self-host for a lab" },
        { t: "Demystifying evals for AI agents", u: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents", k: "article" }
      ],
      notes: ["Tracing LLM applications", "Agent evaluation", "Online evals"]
    },
    {
      id: "b-security",
      track: "build",
      title: "Security and guardrails",
      h: [10, 14],
      summary: "Prompt injection, data exfiltration, excessive agency and the controls that actually help: least privilege, isolation, approvals and tested guardrails.",
      needs: ["b-agents"],
      topics: [
        "Direct and indirect prompt injection; why it is not solved by better prompts",
        "The dangerous combination: private data, untrusted content and an exfiltration channel",
        "OWASP Top 10 for LLM applications and for agentic systems",
        "Least privilege for agents: scoped credentials, read-only by default, per-tool permissions",
        "Sandboxing code execution and network egress control",
        "Input and output guardrails: classifiers, PII detection, policy checks; their false-positive cost",
        "MCP-specific risks: tool poisoning, confused deputy, over-broad tokens",
        "Red-teaming and adversarial test suites",
        "Data handling: retention, logging sensitive prompts, regulatory basics"
      ],
      questions: [
        "Explain indirect prompt injection with a concrete attack on your vault assistant or homelab agent.",
        "Which three capabilities must not be combined in one agent without controls, and how would you break the chain?",
        "Why is a guardrail model not a complete defence?",
        "What credentials does your homelab agent hold, and what is the worst it could do if fully hijacked?",
        "How should traces be handled when prompts contain personal data?"
      ],
      exercises: [
        { t: "Attack your own agent", env: "lab", d: "Plant an injection in a place the agent reads (a pod annotation, a log line, a note). Get it to misuse a tool. Then fix the design, not just the prompt, and retest." },
        { t: "Threat model", env: "any", d: "Write a one-page threat model for the homelab agent: assets, trust boundaries, entry points, mitigations, residual risk." },
        { t: "Adversarial suite", env: "any", d: "Run an automated red-team tool against the vault assistant and add the successful attacks to the eval suite as regression tests." }
      ],
      resources: [
        { t: "OWASP Top 10 for LLM applications", u: "https://genai.owasp.org/llm-top-10/", k: "doc" },
        { t: "The lethal trifecta for AI agents", u: "https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/", k: "article" },
        { t: "Prompt injection series (Simon Willison)", u: "https://simonwillison.net/series/prompt-injection/", k: "article" },
        { t: "promptfoo red teaming", u: "https://www.promptfoo.dev/docs/red-team/", k: "tool" },
        { t: "MCP security best practices", u: "https://modelcontextprotocol.io/specification/latest/basic/security_best_practices", k: "doc" }
      ],
      notes: ["Prompt injection", "Agent least privilege", "LLM guardrails"]
    },
    {
      id: "b-ship",
      track: "build",
      title: "Project: ship an agentic application",
      h: [30, 45],
      summary: "Turn the pieces into one product-quality service: API, background work, retrieval, agent, evals in CI, tracing, security controls and a cost budget.",
      needs: ["b-rag", "b-durable", "b-obs", "b-security"],
      project: true,
      topics: [
        "Service design: async FastAPI, streaming responses, background jobs and queues",
        "Model routing and fallbacks; a gateway in front of providers",
        "Rate limiting, per-user budgets and graceful degradation",
        "Configuration and secrets; prompt and model versions as deployable artefacts",
        "Release process: eval gate, canary, rollback",
        "Writing the design document and the runbook",
        "Enterprise integration: identity and SSO, acting on behalf of a user, audit trails, regulated-industry constraints"
      ],
      questions: [
        "Draw the request path for one user question, including every model call, and mark where it can fail.",
        "What is the p50 and p95 latency and the cost per request of your service, and what dominates each?",
        "What happens to users when your primary model provider has an outage?",
        "What would you have to change to serve 100 times the traffic?"
      ],
      exercises: [
        { t: "Homelab copilot", env: "lab", d: "One service on k3s combining the vault assistant and the homelab agent: chat UI or CLI, streaming, RAG over notes and runbooks, cluster tools through MCP with an approval gate for writes." },
        { t: "Quality gate", env: "any", d: "CI runs the eval suites on every change to prompts, tools or model version, and blocks on regression. Results are published with the build." },
        { t: "Operability", env: "lab", d: "Traces, a dashboard with latency, tokens, cost and error rate, an alert on failures, and a runbook. Kill a dependency and confirm the degradation is the one you designed." },
        { t: "Design document", env: "any", d: "Architecture, model choices with evidence, threat model, eval results, cost model, and what you would do differently. Publish the repo." }
      ],
      resources: [
        { t: "AI Engineering (Chip Huyen), chapters 9–10", u: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", k: "book", n: "Inference optimisation and architecture with user feedback" },
        { t: "FastAPI", u: "https://fastapi.tiangolo.com/", k: "doc" },
        { t: "LiteLLM", u: "https://docs.litellm.ai/", k: "tool", n: "Gateway for routing, fallbacks, budgets; revisited in Stage 4" },
        { t: "Patterns for building LLM-based systems and products", u: "https://eugeneyan.com/writing/llm-patterns/", k: "article" }
      ],
      notes: ["Homelab copilot design doc", "LLM gateway patterns", "Release process for LLM apps"]
    }
  ]
});
