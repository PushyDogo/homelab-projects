// ============================================================
// ROADMAP DATA — AI Engineering
// Edit this file to add/update resources
// To add a resource: find the node by id, add an object to its resources array
// Resource types: "video" | "article" | "book" | "course" | "tool" | "github"
// Cost: "free" | "paid" | "free-tier"
// ============================================================

window.ROADMAP_DATA_AI = {
  id: "ai-engineer",
  meta: {
    title: "AI Engineering",
    subtitle: "Practical Roadmap",
    description: "Practical AI engineering roadmap focused on the skills current roles screen for first: Python/backend engineering, RAG, evaluation, observability, safe tool use, and cloud deployment. Includes a 30-day core plan plus continued depth.",
    version: "1.2"
  },
  phases: [
    // ========================================================
    // PHASE 1: 30-DAY CORE PLAN
    // ========================================================
    {
      id: "phase-1",
      title: "Phase 1",
      subtitle: "30-Day Core Plan",
      description: "A focused sprint through the core skills most AI engineering roles expect first: backend Python, RAG, evals, safe tooling, observability, deployment, and portfolio-ready projects.",
      granularity: "week",
      weeks: [
        // -------------------------------------------------
        // WEEK 1: Foundations
        // -------------------------------------------------
        {
          id: "week-1",
          title: "Week 1",
          subtitle: "Foundations — LLMs, Prompting, Python & AI App Basics",
          days: "Days 1–7",
          goal: "Understand how LLMs work, build strong prompting habits, and get comfortable with the Python and backend fundamentals used in AI applications",
          nodes: [
            {
              id: "w1-day1-2",
              type: "day",
              title: "Day 1–2: How LLMs Actually Work",
              shortTitle: "How LLMs Work",
              dayLabel: "Day 1–2",
              description: "You don't need to understand every detail of transformer math, but you need a working mental model of tokenization, the transformer architecture, next-token prediction, and the key parameters that control generation.",
              concepts: [
                "Tokenization: how text becomes numbers (BPE, SentencePiece)",
                "Transformer architecture at a high level (attention mechanism, encoder/decoder)",
                "Next-token prediction: LLMs predict the most probable next token",
                "Context windows: what they are, why they matter, cost implications",
                "Temperature, top-p, top-k: how sampling controls randomness",
                "Base models vs. instruction-tuned/chat models"
              ],
              resources: [
                {
                  id: "3b1b-nn",
                  title: "But what is a neural network? | Deep learning chapter 1",
                  url: "https://www.youtube.com/watch?v=aircAruvnKk",
                  type: "video",
                  cost: "free",
                  duration: "~29 min",
                  author: "3Blue1Brown",
                  note: "Great start for Neural Networks, which is the foundation for understanding LLMs"
                },
                {
                  id: "3b1b-gpt",
                  title: "3Blue1Brown — \"But what is a GPT?\"",
                  url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
                  type: "video",
                  cost: "free",
                  duration: "~25 min",
                  author: "3Blue1Brown",
                  note: "Best visual explanation of transformers, however, the whole series is encouraged as follow-up"
                },
                {
                  id: "NNDP",
                  title: "Michael Nielsen's Neural Networks and Deep Learning",
                  url: "https://neuralnetworksanddeeplearning.com/",
                  type: "book",
                  cost: "free",
                  duration: "~5 hours",
                  author: "Michael Nielsen",
                  note: "Great Book for fundamentals of neural networks, which underpin LLMs"
                },
                {
                  id: "karpathy-intro-llms",
                  title: "Andrej Karpathy — \"Intro to Large Language Models\"",
                  url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
                  type: "video",
                  cost: "free",
                  duration: "~1 hour",
                  author: "Andrej Karpathy",
                  note: "The single best 1-hour overview of LLMs"
                },
                {
                  id: "karpathy-build-gpt",
                  title: "Andrej Karpathy — \"Let's build GPT from scratch\"",
                  url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
                  type: "video",
                  cost: "free",
                  duration: "~2 hours",
                  author: "Andrej Karpathy",
                  note: "Optional but fantastic deep dive"
                },
                {
                  id: "chip-huyen-aie-ch1",
                  title: "AI Engineering by Chip Huyen — Chapter 1",
                  url: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
                  type: "book",
                  cost: "paid",
                  author: "Chip Huyen",
                  note: "Covers the AI engineering landscape and foundation models"
                }
              ]
            },
            {
              id: "w1-day3-4",
              type: "day",
              title: "Day 3–4: Prompt Engineering Mastery",
              shortTitle: "Prompt Engineering",
              dayLabel: "Day 3–4",
              description: "This is your bread and butter as an AI Engineer. Most of your daily work will involve designing, testing, and optimizing prompts. Master all major techniques from zero-shot to ReAct.",
              concepts: [
                "Zero-shot vs. few-shot prompting",
                "Chain-of-Thought (CoT) — making the model reason step by step",
                "ReAct pattern — combining reasoning with actions",
                "System prompts vs. user prompts vs. assistant messages",
                "Structured output (JSON mode, XML tags, schema enforcement)",
                "Prompt chaining — breaking complex tasks into sequential prompts",
                "Self-consistency — running the same prompt multiple times and aggregating",
                "Context engineering — providing the right context to the model"
              ],
              resources: [
                {
                  id: "deeplearning-prompt-eng",
                  title: "DeepLearning.AI — \"ChatGPT Prompt Engineering for Developers\"",
                  url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour",
                  author: "DeepLearning.AI"
                },
                {
                  id: "anthropic-prompt-guide",
                  title: "Anthropic Prompt Engineering Guide",
                  url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering",
                  type: "article",
                  cost: "free",
                  author: "Anthropic",
                  note: "Official, comprehensive"
                },
                {
                  id: "openai-prompt-guide",
                  title: "OpenAI Prompt Engineering Guide",
                  url: "https://platform.openai.com/docs/guides/prompt-engineering",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Practical and concise"
                },
                {
                  id: "promptingguide",
                  title: "Prompt Engineering Guide",
                  url: "https://www.promptingguide.ai/",
                  type: "article",
                  cost: "free",
                  note: "Community-maintained, covers 18+ techniques"
                }
              ],
              practicePrompt: "Take 3 real-world problems from your DevOps experience (incident triage, log analysis, runbook generation) and solve them with well-crafted prompts using Claude or ChatGPT."
            },
            {
              id: "w1-day5",
              type: "day",
              title: "Day 5: Structured Outputs, Eval Harness, Context Windows & Cost Awareness",
              shortTitle: "Structured Outputs & Evals",
              dayLabel: "Day 5",
              description: "Before building anything, learn how to make AI apps reliable and measurable. This day covers structured outputs, lightweight evaluation, prompt caching, and cost estimation so you build good habits from the start.",
              concepts: [
                "JSON mode: forcing the model to return valid JSON",
                "Pydantic models for output validation",
                "Tool/function calling: the model selects and populates a function signature",
                "Error handling for malformed outputs (retry logic, json-repair)",
                "Golden datasets: 10–30 representative prompts you run on every change",
                "Lightweight regression testing for prompts and structured outputs",
                "Track latency, token usage, cost, and failure rate from the first prototype",
                "Context windows: 8K to 200K+ tokens, cost implications",
                "Prompt caching: reduce cost by up to 90% (Anthropic & OpenAI)",
                "Context compression: summarizing earlier turns to stay within limits",
                "Cost estimation: tokens × price per token",
                "Always prototype with cheaper models (GPT-4o-mini, Claude Haiku)"
              ],
              resources: [
                {
                  id: "instructor-lib",
                  title: "Instructor Library — Structured LLM Outputs",
                  url: "https://python.useinstructor.com/",
                  type: "tool",
                  cost: "free",
                  note: "Best tool for structured LLM outputs with Pydantic"
                },
                {
                  id: "anthropic-prompt-caching",
                  title: "Anthropic Prompt Caching Guide",
                  url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching",
                  type: "article",
                  cost: "free",
                  author: "Anthropic"
                },
                {
                  id: "openai-pricing",
                  title: "OpenAI Pricing Calculator",
                  url: "https://openai.com/pricing",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Get comfortable estimating costs"
                },
                {
                  id: "openai-evals-guide",
                  title: "OpenAI Evals Guide",
                  url: "https://developers.openai.com/api/docs/guides/evals",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Use this to build a simple eval loop from day one"
                },
                {
                  id: "langsmith-eval-concepts",
                  title: "LangSmith — Evaluation Concepts",
                  url: "https://docs.langchain.com/langsmith/evaluation-concepts",
                  type: "article",
                  cost: "free-tier",
                  author: "LangChain",
                  note: "Clear mental model for dataset-based evaluation"
                },
                {
                  id: "promptfoo-intro",
                  title: "Promptfoo Documentation",
                  url: "https://www.promptfoo.dev/docs/intro/",
                  type: "article",
                  cost: "free",
                  note: "Open-source prompt and regression testing"
                }
              ]
            },
            {
              id: "w1-day6-7",
              type: "day",
              title: "Day 6–7: Python AI Ecosystem, FastAPI, Docker & LLM APIs",
              shortTitle: "Python, FastAPI & APIs",
              dayLabel: "Day 6–7",
              description: "You likely know Python basics from DevOps scripting. Now connect that to production AI app development: provider SDKs, async Python, FastAPI endpoints, streaming responses, retries, and simple stateful infrastructure.",
              concepts: [
                "OpenAI API — chat completions, function calling, structured outputs",
                "Anthropic API — messages API, tool use, prompt caching",
                "Google Gemini API",
                "FastAPI basics: request/response models, validation, dependency injection",
                "Async Python fundamentals: asyncio, concurrency, non-blocking API calls",
                "Docker basics: containerize your app and standardize local-to-cloud deployment",
                "Handling streaming responses",
                "Token counting and cost estimation",
                "Error handling, retries, and rate limiting",
                "Using pydantic for structured outputs",
                "Designing a thin application layer: env vars, config, logging, and provider abstraction",
                "When to add Postgres/pgvector and Redis to an AI app",
                "Pick one simple deployment path early: Cloud Run, Render, Fly.io, or your preferred cloud container service"
              ],
              resources: [
                {
                  id: "deeplearning-langchain",
                  title: "DeepLearning.AI — \"LangChain for LLM Application Development\"",
                  url: "https://www.deeplearning.ai/short-courses/langchain-for-llm-application-development/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour",
                  author: "Harrison Chase (LangChain creator)"
                },
                {
                  id: "openai-api-docs",
                  title: "OpenAI API Documentation",
                  url: "https://platform.openai.com/docs/api-reference",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Work through the quickstart"
                },
                {
                  id: "anthropic-api-docs",
                  title: "Anthropic API Documentation",
                  url: "https://docs.anthropic.com/",
                  type: "article",
                  cost: "free",
                  author: "Anthropic",
                  note: "Work through Claude's tool use"
                },
                {
                  id: "openai-cookbook",
                  title: "OpenAI Cookbook (GitHub)",
                  url: "https://github.com/openai/openai-cookbook",
                  type: "github",
                  cost: "free",
                  author: "OpenAI",
                  note: "Practical examples"
                },
                {
                  id: "fastapi-docs",
                  title: "FastAPI Documentation",
                  url: "https://fastapi.tiangolo.com/",
                  type: "article",
                  cost: "free",
                  author: "FastAPI",
                  note: "Best first backend framework for AI services"
                },
                {
                  id: "pydantic-docs",
                  title: "Pydantic Documentation",
                  url: "https://docs.pydantic.dev/latest/",
                  type: "article",
                  cost: "free",
                  author: "Pydantic",
                  note: "Validation and schema backbone for reliable AI apps"
                },
                {
                  id: "postgres-docs",
                  title: "PostgreSQL Documentation",
                  url: "https://www.postgresql.org/docs/",
                  type: "article",
                  cost: "free",
                  author: "PostgreSQL",
                  note: "Useful once you move beyond toy demos"
                },
                {
                  id: "redis-docs",
                  title: "Redis Documentation",
                  url: "https://redis.io/docs/latest/",
                  type: "article",
                  cost: "free",
                  author: "Redis",
                  note: "Great for caching, queues, and short-lived state"
                },
                {
                  id: "celery-docs",
                  title: "Celery Documentation",
                  url: "https://docs.celeryq.dev/en/stable/",
                  type: "article",
                  cost: "free",
                  author: "Celery",
                  note: "Good background-job model for ingestion and async processing"
                },
                {
                  id: "docker-docs",
                  title: "Docker Documentation",
                  url: "https://docs.docker.com/",
                  type: "article",
                  cost: "free",
                  author: "Docker",
                  note: "Container basics are still a core AI engineering skill in production"
                },
                {
                  id: "cloud-run-quickstart",
                  title: "Google Cloud Run — Deploy Container Quickstart",
                  url: "https://cloud.google.com/run/docs/quickstarts/deploy-container",
                  type: "article",
                  cost: "free-tier",
                  author: "Google Cloud",
                  note: "A fast path to deploying a containerized AI service"
                }
              ]
            },
            {
              id: "w1-project1",
              type: "project",
              title: "Project #1 — DevOps AI Assistant Service",
              shortTitle: "DevOps AI Assistant Service",
              dayLabel: "Days 6–7",
              isProject: true,
              projectNumber: 1,
              description: "Build a small but production-shaped AI service that takes an infrastructure problem, queries an LLM API to generate a diagnosis and solution, supports multiple providers, and exposes both a CLI and FastAPI endpoint.",
              concepts: [
                "Supports multiple providers (OpenAI, Anthropic) with a config flag",
                "Expose one FastAPI endpoint and one CLI entrypoint on top of the same core logic",
                "Handles errors, retries, and streaming output",
                "Outputs structured JSON for integration with ticketing systems",
                "Stores a small golden dataset for regression testing",
                "Logs latency, token usage, and estimated cost per request",
                "Demonstrates: API integration, error handling, structured outputs, backend fundamentals"
              ],
              resources: []
            }
          ]
        },
        // -------------------------------------------------
        // WEEK 2: RAG & Vector Databases
        // -------------------------------------------------
        {
          id: "week-2",
          title: "Week 2",
          subtitle: "RAG (Retrieval-Augmented Generation) & Vector Databases",
          days: "Days 8–14",
          goal: "Build production-quality RAG systems with strong ingestion, retrieval evaluation, and basic security thinking",
          nodes: [
            {
              id: "w2-day8-9",
              type: "day",
              title: "Day 8–9: Embeddings & Vector Databases",
              shortTitle: "Embeddings & Vector DBs",
              dayLabel: "Day 8–9",
              description: "Learn what embeddings are, how vector databases work, and when to use which vector DB. Start with pgvector or Chroma for practical ownership, then branch into managed options when you need them.",
              concepts: [
                "Embeddings: dense vector representations capturing semantic meaning",
                "Embedding models: OpenAI text-embedding-3, Cohere Embed, sentence-transformers, BGE",
                "Similarity metrics: cosine similarity, dot product, Euclidean distance",
                "Vector DB fundamentals: indexing (HNSW vs. IVF), metadata filtering",
                "Metadata schema design: source, freshness, product area, permissions",
                "Chroma (lightweight/local) and pgvector (best if you already know Postgres) as first choices",
                "When managed systems like Pinecone make sense"
              ],
              resources: [
                {
                  id: "deeplearning-vector-db",
                  title: "DeepLearning.AI — \"Vector Databases: from Embeddings to Applications\"",
                  url: "https://www.deeplearning.ai/short-courses/vector-databases-embeddings-applications/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour",
                  author: "DeepLearning.AI"
                },
                {
                  id: "james-briggs-yt",
                  title: "James Briggs YouTube Channel",
                  url: "https://www.youtube.com/@jamesbriggs",
                  type: "video",
                  cost: "free",
                  note: "Excellent Pinecone/vector DB tutorials"
                },
                {
                  id: "pinecone-learning",
                  title: "Pinecone Learning Center",
                  url: "https://www.pinecone.io/learn/",
                  type: "article",
                  cost: "free",
                  author: "Pinecone",
                  note: "Great conceptual guides on vector search"
                },
                {
                  id: "chroma-docs",
                  title: "Chroma Documentation",
                  url: "https://docs.trychroma.com/",
                  type: "article",
                  cost: "free",
                  note: "Simplest way to get started locally"
                },
                {
                  id: "pgvector-docs",
                  title: "pgvector (Postgres Vector Search)",
                  url: "https://github.com/pgvector/pgvector",
                  type: "github",
                  cost: "free",
                  note: "The most practical production path if you already think in Postgres"
                }
              ]
            },
            {
              id: "w2-day10-12",
              type: "day",
              title: "Day 10–12: Building RAG Pipelines",
              shortTitle: "Building RAG Pipelines",
              dayLabel: "Day 10–12",
              description: "Master the full RAG pipeline: document loading, chunking strategies, hybrid search, reranking, and evaluation. Chunking strategy matters enormously for retrieval quality.",
              concepts: [
                "Document loading: PDFs, web pages, markdown, databases",
                "Document normalization: stripping boilerplate, preserving headings, tables, and links",
                "Deduplication and content cleaning before embedding",
                "Metadata tagging during ingestion so retrieval can filter well",
                "Chunking strategies: fixed-size, semantic, recursive, hierarchical",
                "Chunk overlap and why it helps",
                "Full RAG pipeline: load → chunk → embed → store → retrieve → rerank → generate",
                "Hybrid search: combining dense (vector) and sparse (BM25/keyword) retrieval",
                "Reranking: using cross-encoders (Cohere Rerank, BGE Reranker)",
                "Answer grounding: citations and source snippets in every response",
                "Evaluation: retrieval metrics (precision@k, recall@k) and generation metrics"
              ],
              resources: [
                {
                  id: "deeplearning-chat-data",
                  title: "DeepLearning.AI — \"LangChain: Chat with Your Data\"",
                  url: "https://www.deeplearning.ai/short-courses/langchain-chat-with-your-data/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour",
                  note: "Covers RAG fundamentals"
                },
                {
                  id: "deeplearning-advanced-rag",
                  title: "DeepLearning.AI — \"Building and Evaluating Advanced RAG Applications\"",
                  url: "https://www.deeplearning.ai/short-courses/building-evaluating-advanced-rag/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour"
                },
                {
                  id: "llamaindex-docs",
                  title: "LlamaIndex Documentation",
                  url: "https://docs.llamaindex.ai/",
                  type: "article",
                  cost: "free",
                  note: "The go-to framework for RAG in 2026"
                },
                {
                  id: "llm-engineers-handbook",
                  title: "The LLM Engineer's Handbook",
                  url: "https://www.amazon.com/LLM-Engineers-Handbook-engineering-production/dp/1836200072",
                  type: "book",
                  cost: "paid",
                  author: "Paul Iusztin & Maxime Labonne",
                  note: "RAG architecture patterns"
                },
                {
                  id: "unstructured-io-early",
                  title: "Unstructured.io",
                  url: "https://unstructured.io/",
                  type: "tool",
                  cost: "free-tier",
                  note: "Useful for real ingestion pipelines over messy documents"
                }
              ]
            },
            {
              id: "w2-day13-14",
              type: "day",
              title: "Day 13–14: Advanced RAG Patterns, Retrieval Quality & Security",
              shortTitle: "Advanced RAG & Security",
              dayLabel: "Day 13–14",
              description: "Go beyond basic RAG. Learn advanced retrieval patterns, but also learn how RAG systems fail: poor chunking, stale data, prompt injection via retrieved content, and weak evaluation.",
              concepts: [
                "Multi-query RAG: generating multiple search queries from one user question",
                "RAG Fusion: combining results from multiple retrieval strategies",
                "Self-RAG: the model decides when it needs to retrieve",
                "Agentic RAG: agent decides retrieval strategy dynamically",
                "Parent-child chunking: retrieve small chunks but pass larger context",
                "Metadata filtering: narrow search by date, source, category",
                "Query routing: sending different question types to different data sources",
                "Retrieved-content trust boundaries: treat docs as untrusted input",
                "Prompt injection in RAG and how to defend against it",
                "Build a small benchmark set and inspect failed retrievals manually"
              ],
              resources: [
                {
                  id: "langchain-blog-rag",
                  title: "LangChain Blog — Advanced RAG Techniques",
                  url: "https://blog.langchain.dev/",
                  type: "article",
                  cost: "free",
                  author: "LangChain",
                  note: "Search for RAG articles"
                },
                {
                  id: "llamaindex-rag-guides",
                  title: "LlamaIndex RAG Advanced Guides",
                  url: "https://docs.llamaindex.ai/",
                  type: "article",
                  cost: "free",
                  note: "Covers advanced RAG patterns"
                },
                {
                  id: "ztm-rag-bootcamp",
                  title: "Zero to Mastery — RAG Bootcamp",
                  url: "https://zerotomastery.io/courses/ai-engineer-bootcamp-retrieval-augmented-generation/",
                  type: "course",
                  cost: "paid",
                  note: "Very thorough"
                },
                {
                  id: "owasp-rag-security",
                  title: "OWASP Top 10 for LLM Applications",
                  url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
                  type: "article",
                  cost: "free",
                  note: "Read the prompt injection and data exposure sections before shipping RAG"
                }
              ]
            },
            {
              id: "w2-project2",
              type: "project",
              title: "Project #2 — Production RAG System",
              shortTitle: "Production RAG System",
              dayLabel: "Days 10–14",
              isProject: true,
              projectNumber: 2,
              description: "Build a RAG application over technical documentation (Kubernetes docs, Terraform docs, or your company's runbooks). This should feel like a real internal tool, not a toy chatbot.",
              concepts: [
                "Ingest docs from multiple sources (web scraping, PDFs, markdown)",
                "Normalize documents, deduplicate them, and attach useful metadata",
                "Implement at least 2 chunking strategies and compare retrieval quality",
                "Vector database: pgvector or Chroma locally; move to managed only if needed",
                "Add hybrid search (vector + keyword) and a reranker",
                "Simple web UI (Streamlit or Gradio)",
                "Return citations for every answer",
                "Basic evaluation: track retrieval precision and answer faithfulness",
                "Add a small auth layer or per-user context if you can",
                "Deploy it (Docker container on a cloud instance) with logs and cost tracking"
              ],
              resources: []
            }
          ]
        },
        // -------------------------------------------------
        // WEEK 3: AI Agents & Frameworks
        // -------------------------------------------------
        {
          id: "week-3",
          title: "Week 3",
          subtitle: "Agentic Workflows, Safe Tooling & Deployment",
          days: "Days 15–21",
          goal: "Build production-shaped agentic workflows with safe tool use, state management, tracing, and cloud deployment",
          nodes: [
            {
              id: "w3-day15-16",
              type: "day",
              title: "Day 15–16: Tool Calling, Workflows & Guardrails",
              shortTitle: "Tool Calling & Guardrails",
              dayLabel: "Day 15–16",
              description: "Start with the practical core of modern agentic systems: tool calling, structured schemas, safe execution, approval flows, and stateful workflows. This is what current AI Engineer job descriptions are actually screening for.",
              concepts: [
                "What an agentic workflow is: a stateful application that combines model calls, tools, and decision steps",
                "Tool/function calling: strongly typed tool inputs, schema validation, retries, fallbacks",
                "Structured outputs and tool selection under failure",
                "The ReAct loop: Reason → Act → Observe → Repeat",
                "Tool/function calling: how LLMs invoke external functions",
                "Memory: short-term state, retrieval-backed memory, and when not to persist anything",
                "Planning strategies: single-step, multi-step, deterministic workflow orchestration",
                "Guardrails: preventing agents from taking destructive actions",
                "Approval gates for any side-effecting operation",
                "Tool design: idempotency, timeouts, retries, typed inputs, and auditability"
              ],
              resources: [
                {
                  id: "deeplearning-langgraph",
                  title: "DeepLearning.AI — \"AI Agents in LangGraph\"",
                  url: "https://www.deeplearning.ai/short-courses/ai-agents-in-langgraph/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour"
                },
                {
                  id: "deeplearning-tools-agents",
                  title: "DeepLearning.AI — \"Functions, Tools and Agents with LangChain\"",
                  url: "https://www.deeplearning.ai/short-courses/functions-tools-agents-langchain/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour"
                },
                {
                  id: "langgraph-docs",
                  title: "LangGraph Documentation",
                  url: "https://langchain-ai.github.io/langgraph/",
                  type: "article",
                  cost: "free",
                  note: "The leading agent framework in 2026"
                },
                {
                  id: "openai-responses-migration",
                  title: "OpenAI — Migrate to the Responses API",
                  url: "https://developers.openai.com/api/docs/guides/migrate-to-responses",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Current OpenAI guidance for new LLM applications and agentic primitives"
                },
                {
                  id: "openai-tools-guide",
                  title: "OpenAI — Using Tools",
                  url: "https://platform.openai.com/docs/guides/tools?api-mode=responses",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Official reference for tool use, built-in tools, and remote MCP support"
                }
              ]
            },
            {
              id: "w3-day17-18",
              type: "day",
              title: "Day 17–18: Stateful Orchestration & Agent Frameworks",
              shortTitle: "Orchestration & Frameworks",
              dayLabel: "Day 17–18",
              description: "Pick one primary framework and one secondary option. The real objective is not framework trivia; it is building a workflow you can debug, test, deploy, and improve.",
              concepts: [
                "Primary recommendation: LangGraph for durable state, conditional routing, and human-in-the-loop workflows",
                "Secondary option: OpenAI Agents SDK for fast prototyping and handoffs, or CrewAI if you specifically want role-based multi-agent patterns",
                "Avoid framework-driven design; start from workflow and failure modes",
                "When to use which: LangGraph for complex workflows, SDK for speed, CrewAI for explicit agent roles",
                "Tracing every tool call and workflow branch so failures are debuggable",
                "Prefer one robust agent over a premature multi-agent system"
              ],
              resources: [
                {
                  id: "langgraph-quickstart",
                  title: "LangGraph — Quick Start Tutorial",
                  url: "https://langchain-ai.github.io/langgraph/tutorials/introduction/",
                  type: "article",
                  cost: "free",
                  author: "LangChain"
                },
                {
                  id: "crewai-docs",
                  title: "CrewAI Documentation",
                  url: "https://docs.crewai.com/",
                  type: "article",
                  cost: "free",
                  author: "CrewAI"
                },
                {
                  id: "openai-agents-sdk",
                  title: "OpenAI Agents SDK (GitHub)",
                  url: "https://github.com/openai/openai-agents-python",
                  type: "github",
                  cost: "free",
                  author: "OpenAI"
                },
                {
                  id: "openai-agent-evals",
                  title: "OpenAI — Evaluate Agent Workflows",
                  url: "https://developers.openai.com/api/docs/guides/agent-evals",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Useful for building a real improvement loop instead of vibe-checking agents"
                },
                {
                  id: "matt-berman-yt",
                  title: "Matt Berman YouTube Channel",
                  url: "https://www.youtube.com/@matthew_berman",
                  type: "video",
                  cost: "free",
                  note: "Practical agent tutorials"
                },
                {
                  id: "ai-jason-yt",
                  title: "AI Jason YouTube Channel",
                  url: "https://www.youtube.com/@AIJasonZ",
                  type: "video",
                  cost: "free",
                  note: "Agent architecture breakdowns"
                }
              ]
            },
            {
              id: "w3-day19",
              type: "day",
              title: "Day 19: State, Auth, Queues & Persistence for AI Apps",
              shortTitle: "State, Auth & Persistence",
              dayLabel: "Day 19",
              description: "Most AI engineer interviews and real projects care more about shipping a reliable service than about protocol trivia. Learn the application patterns that make agents usable in production: auth, persistence, queues, and auditability.",
              concepts: [
                "Authentication basics for AI apps: API keys, user auth, service-to-service auth",
                "Per-user state and conversation persistence in Postgres or a document store",
                "Redis and queues for background ingestion, summarization, and tool work",
                "Audit logs and approval records for side-effecting actions",
                "Rate limiting, quotas, and per-user cost controls",
                "Use webhooks/background jobs when work exceeds request time budgets"
              ],
              resources: [
                {
                  id: "fastapi-security",
                  title: "FastAPI Security",
                  url: "https://fastapi.tiangolo.com/tutorial/security/",
                  type: "article",
                  cost: "free",
                  author: "FastAPI",
                  note: "Good practical baseline for auth in Python services"
                },
                {
                  id: "github-actions-basics",
                  title: "GitHub Actions Documentation",
                  url: "https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions",
                  type: "article",
                  cost: "free",
                  author: "GitHub",
                  note: "Use CI to run tests, evals, and deployments consistently"
                }
              ]
            },
            {
              id: "w3-day20-21",
              type: "day",
              title: "Day 20–21: Deployment, Tracing & Release Workflow",
              shortTitle: "Deployment & Tracing",
              dayLabel: "Day 20–21",
              description: "Ship your AI app like a service. Add tracing, basic online monitoring, automated checks, and deploy your container to one cloud path so your portfolio projects feel production-shaped.",
              concepts: [
                "Trace every model call, tool call, and latency bottleneck",
                "CI flow: tests, evals, prompt regression checks, container build, deployment",
                "Ship one deployment path end to end using Docker + Cloud Run or your preferred equivalent",
                "Set up online monitoring for cost, latency, error rate, and tool failures",
                "Add feedback capture so failures turn into new eval cases"
              ],
              resources: [
                {
                  id: "langsmith-observability",
                  title: "LangSmith Observability",
                  url: "https://docs.langchain.com/langsmith/observability",
                  type: "article",
                  cost: "free-tier",
                  author: "LangChain",
                  note: "Framework-agnostic tracing, monitoring, and debugging for LLM apps"
                },
                {
                  id: "openai-eval-best-practices",
                  title: "OpenAI — Evaluation Best Practices",
                  url: "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Current guidance for designing evals that are actually useful in production"
                },
                {
                  id: "cloud-run-deploying",
                  title: "Google Cloud Run — Deploying Container Images",
                  url: "https://cloud.google.com/run/docs/deploying",
                  type: "article",
                  cost: "free-tier",
                  author: "Google Cloud",
                  note: "A practical deployment target for portfolio AI services"
                }
              ]
            },
            {
              id: "w3-project3",
              type: "project",
              title: "Project #3 — DevOps Copilot Platform",
              shortTitle: "DevOps Copilot Platform",
              dayLabel: "Days 15–21",
              isProject: true,
              projectNumber: 3,
              description: "Extend your earlier projects into a single DevOps copilot platform with retrieval, tools, approval gates, tracing, and deployment. This should look like a production internal assistant rather than a generic autonomous agent demo.",
              concepts: [
                "Can query cloud APIs (AWS/GCP status, instance info)",
                "Can search through logs and documentation (using your RAG system)",
                "Can create and update tickets (mock Jira/Linear integration)",
                "Can execute safe diagnostic commands",
                "Has memory across conversations",
                "Guardrails: cannot delete resources, requires confirmation for changes",
                "Built primarily with LangGraph; add one secondary framework only if it adds clear value",
                "Expose as a FastAPI service and deploy it",
                "Add audit logs, role boundaries, and clear tool approval UX",
                "Add tracing, cost logging, and feedback capture",
                "Show end-to-end architecture from API layer to retrieval to tool execution"
              ],
              resources: []
            }
          ]
        },
        // -------------------------------------------------
        // WEEK 4: Production, Evaluation, Portfolio & Job Prep
        // -------------------------------------------------
        {
          id: "week-4",
          title: "Week 4",
          subtitle: "Production, Evaluation, Portfolio & Job Prep",
          days: "Days 22–30",
          goal: "Make everything production-grade, build your portfolio, and start applying",
          nodes: [
            {
              id: "w4-day22",
              type: "day",
              title: "Day 22: AI Security & Adversarial Testing",
              shortTitle: "AI Security",
              dayLabel: "Day 22",
              description: "AI systems have an entirely new attack surface. Learn prompt injection, jailbreaking, data exfiltration risks, and mitigation strategies including guardrail frameworks.",
              concepts: [
                "Prompt injection: direct (user overrides system) and indirect (via retrieved docs)",
                "Jailbreaking: techniques to bypass safety guardrails",
                "Data exfiltration: tricking the model into revealing system prompts or PII",
                "Denial of wallet: adversarial inputs that maximize token usage",
                "Input sanitization and validation",
                "Output filtering and content safety checks",
                "Guardrail frameworks: NeMo Guardrails, Guardrails AI",
                "Red teaming: systematically test for vulnerabilities"
              ],
              resources: [
                {
                  id: "owasp-llm-top10",
                  title: "OWASP Top 10 for LLM Applications",
                  url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
                  type: "article",
                  cost: "free",
                  note: "The security standard for AI apps"
                },
                {
                  id: "garak-tool",
                  title: "Garak — LLM Vulnerability Scanner",
                  url: "https://github.com/NVIDIA/garak",
                  type: "github",
                  cost: "free",
                  author: "NVIDIA"
                },
                {
                  id: "promptfoo-redteam",
                  title: "Promptfoo Adversarial Testing",
                  url: "https://www.promptfoo.dev/docs/red-team/",
                  type: "tool",
                  cost: "free",
                  note: "Red teaming for prompts"
                },
                {
                  id: "nemo-guardrails",
                  title: "NeMo Guardrails",
                  url: "https://github.com/NVIDIA/NeMo-Guardrails",
                  type: "github",
                  cost: "free",
                  author: "NVIDIA",
                  note: "Programmable guardrails"
                }
              ]
            },
            {
              id: "w4-day23-24",
              type: "day",
              title: "Day 23–24: LLMOps & Production AI Systems",
              shortTitle: "LLMOps & Production",
              dayLabel: "Day 23–24",
              description: "This is where your DevOps background becomes a superpower. Learn prompt versioning, LLM evaluation, monitoring, hallucination detection, and cost optimization.",
              concepts: [
                "Prompt versioning and management (LangSmith, Promptfoo)",
                "LLM evaluation: automated evals, human evals, LLM-as-judge",
                "Monitoring: latency, token usage, cost, error rates, quality metrics",
                "Hallucination detection and mitigation",
                "A/B testing prompts and models",
                "Caching strategies (semantic caching, prompt caching)",
                "Cost optimization: model routing, prompt compression",
                "Observability stack: LangSmith, Helicone, Weights & Biases",
                "CI for AI changes: run evals on every prompt, retrieval, or model change"
              ],
              resources: [
                {
                  id: "deeplearning-eval-debug",
                  title: "DeepLearning.AI — \"Evaluating and Debugging Generative AI\"",
                  url: "https://www.deeplearning.ai/short-courses/evaluating-debugging-generative-ai/",
                  type: "course",
                  cost: "free"
                },
                {
                  id: "langsmith-docs",
                  title: "LangSmith Documentation",
                  url: "https://docs.smith.langchain.com/",
                  type: "article",
                  cost: "free-tier",
                  note: "Tracing, evaluation, monitoring"
                },
                {
                  id: "promptfoo",
                  title: "Promptfoo — Open-Source LLM Evaluation",
                  url: "https://www.promptfoo.dev/",
                  type: "tool",
                  cost: "free"
                },
                {
                  id: "helicone",
                  title: "Helicone — LLM Observability Platform",
                  url: "https://helicone.ai/",
                  type: "tool",
                  cost: "free-tier"
                },
                {
                  id: "mlflow",
                  title: "MLflow Documentation",
                  url: "https://mlflow.org/docs/latest/index.html",
                  type: "article",
                  cost: "free",
                  note: "Experiment tracking and model registry"
                },
                {
                  id: "wandb",
                  title: "Weights & Biases",
                  url: "https://wandb.ai/",
                  type: "tool",
                  cost: "free-tier",
                  note: "ML experiment tracking"
                },
                {
                  id: "github-actions-docs",
                  title: "GitHub Actions Documentation",
                  url: "https://docs.github.com/en/actions",
                  type: "article",
                  cost: "free",
                  note: "Use this to wire prompt and eval regression checks into CI"
                }
              ]
            },
            {
              id: "w4-day24-25",
              type: "day",
              title: "Day 24–25: Portfolio Polish",
              shortTitle: "Portfolio Polish",
              dayLabel: "Day 24–25",
              description: "Take your three projects from weeks 1–3 and make them portfolio-ready with proper READMEs, Dockerfiles, evaluation metrics, and demo videos.",
              concepts: [
                "Write a clear README: problem statement, architecture diagram, tech stack, results",
                "Add proper error handling and logging",
                "Include Dockerfile and docker-compose for easy setup",
                "Add evaluation metrics and results",
                "Record a 2-minute demo video or create GIFs",
                "Deploy at least one project to a live URL",
                "Lead with outcomes: 'Reduced incident triage time by 60%'",
                "Show production thinking: monitoring, error handling, cost tracking"
              ],
              resources: []
            },
            {
              id: "w4-day26-27",
              type: "day",
              title: "Day 26–27: Resume, LinkedIn & Job Applications",
              shortTitle: "Resume & Job Applications",
              dayLabel: "Day 26–27",
              description: "Reframe your DevOps experience through an AI lens, update your LinkedIn, and start applying strategically.",
              concepts: [
                "Reframe DevOps experience: 'Managed infrastructure for ML model serving pipelines'",
                "Add 'AI Engineering Projects' section with portfolio projects",
                "AI-specific skills: LLMs, RAG, Vector Databases, LangGraph, Prompt Engineering, LLMOps",
                "LinkedIn: update headline to 'AI Engineer | DevOps → AI Engineering'",
                "Write a post about your transition journey — huge engagement",
                "Follow: Chip Huyen, Harrison Chase, Jerry Liu, Swyx, Simon Willison, Andrej Karpathy",
                "Target: AI product companies, AI-integrating SaaS, AI infra companies (W&B, Pinecone, Modal)"
              ],
              resources: []
            },
            {
              id: "w4-day28-30",
              type: "day",
              title: "Day 28–30: Interview Preparation",
              shortTitle: "Interview Prep",
              dayLabel: "Day 28–30",
              description: "Prepare for system design, coding, prompt engineering, and production thinking questions. Practice explaining your projects in 2 minutes each.",
              concepts: [
                "System design: design an AI-powered customer support system",
                "Coding: build a simple RAG pipeline or agent live",
                "Prompt engineering: write and iterate on prompts live",
                "Production thinking: monitoring, hallucination handling, cost management",
                "LLM fundamentals: transformers, embeddings vs. completions, explain RAG",
                "2-minute project pitches emphasizing outcomes and metrics",
                "Use Claude/ChatGPT as a mock interviewer"
              ],
              resources: [
                {
                  id: "careery-interview",
                  title: "AI Engineer Interview Questions (Careery)",
                  url: "https://careery.pro/blog/ai-careers/ai-engineer-interview-questions",
                  type: "article",
                  cost: "free",
                  note: "50+ questions with answers"
                },
                {
                  id: "ai-field-guide",
                  title: "AI Engineering Field Guide (GitHub)",
                  url: "https://github.com/alexeygrigorev/ai-engineering-field-guide",
                  type: "github",
                  cost: "free",
                  note: "Real interview assignments from companies"
                },
                {
                  id: "interviewquery",
                  title: "InterviewQuery — AI Engineer Questions",
                  url: "https://www.interviewquery.com/p/ai-engineer-interview-questions",
                  type: "article",
                  cost: "free"
                }
              ]
            }
          ]
        }
      ]
    },
    // ========================================================
    // PHASE 2: CONTINUED LEARNING
    // ========================================================
    {
      id: "phase-2",
      title: "Phase 2",
      subtitle: "Continued Learning (Months 2–6+)",
      description: "After the 30-day sprint, you have enough to land a job. Now go deeper into open-source models, fine-tuning, advanced agents, infrastructure, and choose your specialization path.",
      granularity: "month",
      months: [
        // -------------------------------------------------
        // MONTH 2
        // -------------------------------------------------
        {
          id: "month-2",
          title: "Month 2",
          subtitle: "Open-Source Models, Multimodal AI & Fine-Tuning",
          summary: "Learn local model inference with Ollama/vLLM, multimodal AI (vision, audio), ML foundations, PyTorch, GPU/CUDA, dataset handling, and fine-tuning with LoRA/QLoRA.",
          nodes: [
            {
              id: "m2-opensource",
              type: "topic",
              title: "Open-Source Models & Local Inference",
              shortTitle: "Open-Source & Local Models",
              description: "Enterprise customers often require private/local inference. Learn Ollama, LM Studio, vLLM, and quantization formats (GGUF, GPTQ/AWQ). Run your RAG project against local models.",
              concepts: [
                "Ollama: run models locally with a single command (\"Docker for LLMs\")",
                "LM Studio: GUI for running local models on Mac/Windows",
                "vLLM: high-performance model serving",
                "Quantization formats: GGUF (CPU/hybrid), GPTQ/AWQ (GPU inference)",
                "When to use local vs. API: privacy, latency, cost at scale, offline"
              ],
              resources: [
                {
                  id: "ollama",
                  title: "Ollama — Run Models Locally",
                  url: "https://ollama.com/",
                  type: "tool",
                  cost: "free",
                  note: "Download and run models in one command"
                },
                {
                  id: "hf-model-hub",
                  title: "Hugging Face Model Hub",
                  url: "https://huggingface.co/models",
                  type: "tool",
                  cost: "free",
                  note: "The GitHub of AI models; learn to read model cards"
                },
                {
                  id: "open-llm-leaderboard",
                  title: "Open LLM Leaderboard",
                  url: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard",
                  type: "article",
                  cost: "free",
                  note: "Compare model performance"
                },
                {
                  id: "technovangelist-yt",
                  title: "Matt Williams YouTube — Ollama Tutorials",
                  url: "https://www.youtube.com/@technovangelist",
                  type: "video",
                  cost: "free",
                  note: "Practical local model setup"
                }
              ]
            },
            {
              id: "m2-multimodal",
              type: "topic",
              title: "Multimodal AI (Vision, Audio, Documents)",
              shortTitle: "Multimodal AI",
              description: "By 2026, multimodal capabilities are standard. Work with vision (Claude Vision, GPT-4V), audio (Whisper, ElevenLabs), and multimodal RAG.",
              concepts: [
                "Image analysis with Claude Vision, GPT-4V, Gemini",
                "Document AI: extracting data from PDFs, invoices, screenshots",
                "Multimodal RAG: indexing and retrieving text and images",
                "Speech-to-text: OpenAI Whisper (open-source, local), Deepgram, AssemblyAI",
                "Text-to-speech: ElevenLabs, OpenAI TTS, Bark (open-source)",
                "Voice agents: building conversational systems with real-time voice",
                "A practical niche for your background: incident screenshots, dashboards, PDFs, and meeting transcripts"
              ],
              resources: [
                {
                  id: "anthropic-vision-docs",
                  title: "Anthropic Vision API Documentation",
                  url: "https://docs.anthropic.com/en/docs/build-with-claude/vision",
                  type: "article",
                  cost: "free",
                  author: "Anthropic"
                },
                {
                  id: "openai-whisper",
                  title: "OpenAI Whisper — Open-Source Speech Recognition",
                  url: "https://github.com/openai/whisper",
                  type: "github",
                  cost: "free",
                  author: "OpenAI"
                },
                {
                  id: "elevenlabs-docs",
                  title: "ElevenLabs Documentation",
                  url: "https://elevenlabs.io/docs",
                  type: "article",
                  cost: "free-tier",
                  note: "Voice synthesis"
                }
              ]
            },
            {
              id: "m2-ml-foundations",
              type: "topic",
              title: "Machine Learning Foundations",
              shortTitle: "ML Foundations",
              description: "You need enough ML knowledge to make informed decisions about when to train, fine-tune, or use off-the-shelf models. Cover supervised learning, neural networks, and the transformer architecture in depth.",
              concepts: [
                "Supervised vs. unsupervised learning",
                "Classification, regression, clustering",
                "Training/validation/test splits, cross-validation",
                "Overfitting, underfitting, regularization",
                "Loss functions and optimization (gradient descent)",
                "Neural network fundamentals: layers, activation functions, backpropagation",
                "The transformer architecture in depth"
              ],
              resources: [
                {
                  id: "stanford-cs229",
                  title: "Stanford CS229 — Machine Learning (Andrew Ng)",
                  url: "https://www.youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU",
                  type: "video",
                  cost: "free",
                  author: "Andrew Ng",
                  note: "The gold standard, free on YouTube"
                },
                {
                  id: "3b1b-neural-networks",
                  title: "3Blue1Brown — Neural Networks Series",
                  url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi",
                  type: "video",
                  cost: "free",
                  author: "3Blue1Brown",
                  note: "Beautiful visual explanations"
                },
                {
                  id: "hands-on-ml",
                  title: "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
                  url: "https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/",
                  type: "book",
                  cost: "paid",
                  author: "Aurelien Geron",
                  note: "Best practical ML book"
                },
                {
                  id: "fastai-course",
                  title: "Fast.ai — Practical Deep Learning for Coders",
                  url: "https://course.fast.ai/",
                  type: "course",
                  cost: "free",
                  note: "Free, practical, top-down approach"
                }
              ]
            },
            {
              id: "m2-datasets",
              type: "topic",
              title: "Datasets, Labeling & Data Curation",
              shortTitle: "Datasets & Labeling",
              description: "A lot of AI engineering work is really data engineering with feedback loops. Learn how to build eval datasets, fine-tuning datasets, labeling guidelines, and high-signal examples from production behavior.",
              concepts: [
                "Build small, representative eval datasets before large benchmark sets",
                "Labeling guidelines: consistency matters more than volume early on",
                "Turn user failures and edge cases into regression examples",
                "Separate training, evaluation, and red-team datasets",
                "Track dataset versions alongside prompts and code"
              ],
              resources: [
                {
                  id: "openai-evals-guide-m2",
                  title: "OpenAI Evals Guide",
                  url: "https://developers.openai.com/api/docs/guides/evals",
                  type: "article",
                  cost: "free",
                  author: "OpenAI",
                  note: "Strong practical starting point for eval dataset design"
                },
                {
                  id: "langsmith-eval-concepts-m2",
                  title: "LangSmith — Evaluation Concepts",
                  url: "https://docs.langchain.com/langsmith/evaluation-concepts",
                  type: "article",
                  cost: "free-tier",
                  author: "LangChain",
                  note: "Useful once you start collecting real examples and annotating them"
                },
                {
                  id: "hf-datasets-docs",
                  title: "Hugging Face Datasets Documentation",
                  url: "https://huggingface.co/docs/datasets/",
                  type: "article",
                  cost: "free",
                  author: "Hugging Face",
                  note: "Good for dataset versioning, preprocessing, and repeatable evaluation workflows"
                }
              ]
            },
            {
              id: "m2-pytorch",
              type: "topic",
              title: "PyTorch — The Framework Job Descriptions Require",
              shortTitle: "PyTorch Fundamentals",
              description: "PyTorch is the dominant deep learning framework and appears in most AI Engineer job postings. Build working PyTorch fluency: tensors, training loops, pretrained models from Hugging Face.",
              concepts: [
                "Tensors: creating, reshaping, moving between CPU and GPU",
                "Automatic differentiation: torch.autograd",
                "Building models with torch.nn.Module",
                "Training loop: forward pass → loss → backward → optimizer step",
                "DataLoaders and Datasets",
                "Saving and loading models: state_dict, checkpointing",
                "Using pretrained models from Hugging Face Transformers",
                "Mixed precision training: torch.cuda.amp"
              ],
              resources: [
                {
                  id: "pytorch-official-tutorial",
                  title: "PyTorch — Official \"Learn the Basics\" Tutorial",
                  url: "https://pytorch.org/tutorials/beginner/basics/intro.html",
                  type: "article",
                  cost: "free",
                  note: "Best starting point, hands-on and well-structured"
                },
                {
                  id: "freecodecamp-pytorch",
                  title: "freeCodeCamp — \"PyTorch for Deep Learning\"",
                  url: "https://www.youtube.com/watch?v=V_xro1bcAuQ",
                  type: "video",
                  cost: "free",
                  duration: "26 hours (focus on Chapters 0-4, ~8 hours)",
                  author: "freeCodeCamp",
                  note: "Full course on YouTube, focus on first 8 hours"
                },
                {
                  id: "learn-pytorch",
                  title: "Daniel Bourke — \"Learn PyTorch for Deep Learning\"",
                  url: "https://www.learnpytorch.io/",
                  type: "course",
                  cost: "free",
                  author: "Daniel Bourke",
                  note: "Free online book + YouTube companion"
                },
                {
                  id: "karpathy-zero-to-hero",
                  title: "Andrej Karpathy — \"Neural Networks: Zero to Hero\"",
                  url: "https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ",
                  type: "video",
                  cost: "free",
                  author: "Andrej Karpathy",
                  note: "Builds neural nets from scratch in PyTorch"
                },
                {
                  id: "hf-transformers-docs",
                  title: "Hugging Face Transformers Documentation",
                  url: "https://huggingface.co/docs/transformers/",
                  type: "article",
                  cost: "free",
                  note: "Built on PyTorch; tutorials teach both"
                }
              ]
            },
            {
              id: "m2-cuda",
              type: "topic",
              title: "CUDA & GPU Programming",
              shortTitle: "CUDA & GPU Programming",
              description: "Most AI Engineers need Tier 1 (GPU-aware engineering) and Tier 2 (infrastructure). Only AI Infrastructure Specialists need Tier 3 raw CUDA kernels.",
              concepts: [
                "Tier 1: GPU vs CPU, CUDA toolkit basics, device management in PyTorch, GPU memory management",
                "Tier 1: Batch size tuning, mixed precision (FP16/BF16), nvidia-smi proficiency",
                "Tier 2: Multi-GPU training (DataParallel vs DistributedDataParallel)",
                "Tier 2: GPU cluster management with Kubernetes, cloud GPU selection (A100/H100/L4)",
                "Tier 3: CUDA kernels, custom PyTorch operators, TensorRT (infra specialists only)"
              ],
              resources: [
                {
                  id: "nvidia-dli",
                  title: "NVIDIA Deep Learning Institute (DLI)",
                  url: "https://www.nvidia.com/en-us/training/",
                  type: "course",
                  cost: "free-tier",
                  author: "NVIDIA",
                  note: "Start with 'Fundamentals of Accelerated Computing with CUDA Python'"
                },
                {
                  id: "pytorch-cuda-docs",
                  title: "PyTorch CUDA Semantics Documentation",
                  url: "https://pytorch.org/docs/stable/notes/cuda.html",
                  type: "article",
                  cost: "free",
                  note: "Essential reference for GPU programming in PyTorch"
                },
                {
                  id: "lambda-gpu-benchmark",
                  title: "Lambda Labs GPU Benchmark",
                  url: "https://lambdalabs.com/gpu-benchmarks",
                  type: "article",
                  cost: "free",
                  note: "Compare GPU performance for ML workloads"
                },
                {
                  id: "openai-triton",
                  title: "OpenAI Triton — GPU Kernel Language",
                  url: "https://triton-lang.org/",
                  type: "tool",
                  cost: "free",
                  note: "Python-like language for writing GPU kernels (easier than raw CUDA)"
                }
              ]
            },
            {
              id: "m2-finetune",
              type: "topic",
              title: "Fine-Tuning LLMs with LoRA/QLoRA",
              shortTitle: "Fine-Tuning LLMs",
              description: "Learn when to fine-tune vs. RAG vs. prompting, and how to do it efficiently with LoRA and QLoRA (fine-tune 70B models on consumer GPUs).",
              concepts: [
                "When to fine-tune: consistent behavior/style, domain-specific language, format adherence",
                "When to use RAG: factual knowledge that changes, large knowledge bases",
                "LoRA: train ~0.1-1% of parameters with near-full-fine-tuning quality",
                "QLoRA: LoRA + 4-bit quantization — fine-tune 70B models on consumer GPUs",
                "Training data preparation: format, quality, diversity",
                "Supervised Fine-Tuning (SFT) vs. Preference Tuning (DPO, RLHF)"
              ],
              resources: [
                {
                  id: "deeplearning-finetune",
                  title: "DeepLearning.AI — \"Finetuning Large Language Models\"",
                  url: "https://www.deeplearning.ai/short-courses/finetuning-large-language-models/",
                  type: "course",
                  cost: "free",
                  duration: "~1 hour"
                },
                {
                  id: "unsloth",
                  title: "Unsloth Documentation",
                  url: "https://unsloth.ai/docs/",
                  type: "article",
                  cost: "free",
                  note: "Easiest way to fine-tune in 2026"
                },
                {
                  id: "hf-peft",
                  title: "Hugging Face PEFT Documentation",
                  url: "https://huggingface.co/docs/peft/en/index",
                  type: "article",
                  cost: "free",
                  note: "LoRA/QLoRA implementation"
                },
                {
                  id: "hf-nlp-course",
                  title: "Hugging Face NLP Course",
                  url: "https://huggingface.co/learn/nlp-course/",
                  type: "course",
                  cost: "free",
                  note: "Comprehensive, free"
                }
              ]
            },
            {
              id: "m2-project4",
              type: "project",
              title: "Project #4 — Fine-Tune a Model with QLoRA",
              shortTitle: "Fine-Tune a Model",
              isProject: true,
              projectNumber: 4,
              description: "Fine-tune an open-source model with QLoRA on a domain-specific dataset and compare performance against the base model and RAG.",
              concepts: [
                "Take an open-source model (Llama 3, Mistral, or Qwen)",
                "Fine-tune with QLoRA on DevOps Q&A or incident reports",
                "Compare against base model and RAG approach",
                "Document tradeoffs: cost, latency, quality, maintenance burden",
                "Use Unsloth or Hugging Face PEFT + Transformers"
              ],
              resources: []
            }
          ]
        },
        // -------------------------------------------------
        // MONTH 3
        // -------------------------------------------------
        {
          id: "month-3",
          title: "Month 3",
          subtitle: "Advanced Agents & Multi-Agent Systems",
          summary: "Deep agent architecture: planning algorithms, long-term memory, tool creation, self-reflection, multi-agent patterns (supervisor, debate, consensus). Build a complete multi-agent DevOps platform.",
          nodes: [
            {
              id: "m3-deep-agents",
              type: "topic",
              title: "Deep Agent Architecture",
              shortTitle: "Deep Agent Architecture",
              description: "Go beyond basic agents. Learn planning algorithms, long-term memory architectures, agents that create their own tools, self-reflection, and multi-agent orchestration patterns.",
              concepts: [
                "Planning: task decomposition, tree-of-thought, graph-of-thought",
                "Long-term memory: episodic, semantic, procedural",
                "Tool creation: agents that write their own tools",
                "Self-reflection: agents that evaluate and correct their own output",
                "Human-in-the-loop: approval gates, feedback loops",
                "Agent evaluation: measuring if an agent is actually good",
                "Multi-agent patterns: supervisor, debate, consensus, assembly line",
                "Model Context Protocol (MCP): when interoperable tool contracts are worth the added complexity",
                "Remote MCP servers and cross-client tool reuse as a post-30-day skill"
              ],
              resources: [
                {
                  id: "deeplearning-multi-agent-crewai",
                  title: "DeepLearning.AI — \"Multi AI Agent Systems with crewAI\"",
                  url: "https://www.deeplearning.ai/short-courses/multi-ai-agent-systems-with-crewai/",
                  type: "course",
                  cost: "free"
                },
                {
                  id: "deeplearning-autogen",
                  title: "DeepLearning.AI — \"AI Agentic Design Patterns with AutoGen\"",
                  url: "https://www.deeplearning.ai/short-courses/ai-agentic-design-patterns-with-autogen/",
                  type: "course",
                  cost: "free"
                },
                {
                  id: "langgraph-advanced",
                  title: "LangGraph Advanced Tutorials",
                  url: "https://langchain-ai.github.io/langgraph/tutorials/",
                  type: "article",
                  cost: "free"
                },
                {
                  id: "anthropic-agents-guide",
                  title: "Anthropic's Agents Guide",
                  url: "https://docs.anthropic.com/en/docs/build-with-claude/agents",
                  type: "article",
                  cost: "free",
                  author: "Anthropic"
                },
                {
                  id: "mcp-docs-m3",
                  title: "Model Context Protocol",
                  url: "https://modelcontextprotocol.io/",
                  type: "article",
                  cost: "free",
                  note: "Move this later unless your immediate project specifically needs cross-client tool interoperability"
                }
              ]
            },
            {
              id: "m3-project5",
              type: "project",
              title: "Project #5 — Multi-Agent DevOps Platform",
              shortTitle: "Multi-Agent DevOps Platform",
              isProject: true,
              projectNumber: 5,
              description: "Build a system with specialized agents for incident management: Incident Analyst, Runbook, Communication, and Post-Mortem agents with evaluation metrics.",
              concepts: [
                "Incident Analyst Agent: receives alerts, correlates with changes, suggests root cause",
                "Runbook Agent: retrieves and executes relevant runbooks",
                "Communication Agent: drafts Slack/email incident updates",
                "Post-Mortem Agent: generates post-mortem documents from incident data",
                "CrewAI or LangGraph for orchestration",
                "Evaluation metrics for each agent's output quality"
              ],
              resources: []
            }
          ]
        },
        // -------------------------------------------------
        // MONTH 4
        // -------------------------------------------------
        {
          id: "month-4",
          title: "Month 4",
          subtitle: "Data Engineering for AI, Evaluation & Safety",
          summary: "ETL pipelines for RAG at scale, data versioning with DVC, computer use & browser automation, LLM evaluation (LLM-as-judge, automated metrics), and AI safety & ethics.",
          nodes: [
            {
              id: "m4-data-engineering",
              type: "topic",
              title: "Data Engineering for AI",
              shortTitle: "Data Engineering for AI",
              description: "Your DevOps pipeline skills translate directly. AI systems need robust data pipelines. Learn ETL for RAG at scale, data quality, versioning, and privacy pipelines.",
              concepts: [
                "ETL pipelines for RAG: ingesting docs at scale from S3, databases, APIs",
                "Data quality for AI: deduplication, cleaning, format validation before embedding",
                "Data versioning: DVC (Data Version Control) — Git for data",
                "Batch vs. streaming ingestion: when to re-embed vs. incrementally update",
                "Handling unstructured data: PDFs, HTML, images, audio at scale",
                "Data lineage: tracking where your retrieval/training data came from",
                "Privacy pipelines: PII detection and redaction",
                "Build ingestion as a repeatable pipeline, not a one-off notebook"
              ],
              resources: [
                {
                  id: "apache-airflow",
                  title: "Apache Airflow",
                  url: "https://airflow.apache.org/",
                  type: "tool",
                  cost: "free",
                  note: "Orchestrate data pipelines"
                },
                {
                  id: "dvc",
                  title: "DVC (Data Version Control)",
                  url: "https://dvc.org/",
                  type: "tool",
                  cost: "free",
                  note: "Git for data"
                },
                {
                  id: "unstructured-io",
                  title: "Unstructured.io",
                  url: "https://unstructured.io/",
                  type: "tool",
                  cost: "free-tier",
                  note: "Go-to library for parsing diverse document formats"
                },
                {
                  id: "great-expectations",
                  title: "Great Expectations — Data Quality Validation",
                  url: "https://greatexpectations.io/",
                  type: "tool",
                  cost: "free"
                },
                {
                  id: "presidio",
                  title: "Microsoft Presidio",
                  url: "https://microsoft.github.io/presidio/",
                  type: "tool",
                  cost: "free",
                  note: "Useful for PII detection and redaction in AI data pipelines"
                }
              ]
            },
            {
              id: "m4-computer-use",
              type: "topic",
              title: "Computer Use & Browser Automation",
              shortTitle: "Computer Use & Browser AI",
              description: "An emerging capability in 2026: AI agents that interact with web browsers and desktop applications. Screenshot analysis, browser automation, and use cases like automated testing.",
              concepts: [
                "Screenshot analysis: using vision models to understand what's on screen",
                "Browser automation: AI agents that click, type, navigate, fill forms",
                "Anthropic's computer use API",
                "Frameworks: browser-use, Playwright + LLM integration",
                "Use cases: automated testing, data extraction from web UIs"
              ],
              resources: [
                {
                  id: "anthropic-computer-use",
                  title: "Anthropic Computer Use Documentation",
                  url: "https://docs.anthropic.com/en/docs/build-with-claude/computer-use",
                  type: "article",
                  cost: "free",
                  author: "Anthropic"
                },
                {
                  id: "browser-use",
                  title: "browser-use — AI Browser Automation Framework",
                  url: "https://github.com/browser-use/browser-use",
                  type: "github",
                  cost: "free"
                },
                {
                  id: "playwright",
                  title: "Playwright — Browser Automation",
                  url: "https://playwright.dev/",
                  type: "tool",
                  cost: "free",
                  note: "Pair with LLMs for AI-driven testing"
                }
              ]
            },
            {
              id: "m4-evaluation",
              type: "topic",
              title: "LLM Evaluation",
              shortTitle: "LLM Evaluation",
              description: "Learn automated evaluation metrics (BLEU, ROUGE, BERTScore), LLM-as-judge patterns, building evaluation datasets, A/B testing, and regression testing for AI systems.",
              concepts: [
                "Automated metrics: BLEU, ROUGE, BERTScore (and their limitations)",
                "LLM-as-judge: using one model to evaluate another",
                "Human evaluation: when and how to do it",
                "Building evaluation datasets and benchmarks",
                "A/B testing in production",
                "Red teaming: adversarial testing of AI systems",
                "Regression testing: ensuring new prompts don't break existing functionality"
              ],
              resources: [
                {
                  id: "hamel-blog",
                  title: "Hamel Husain's Blog on LLM Evaluation",
                  url: "https://hamel.dev/",
                  type: "article",
                  cost: "free",
                  note: "Practical production evaluation"
                },
                {
                  id: "promptfoo-docs",
                  title: "Promptfoo Documentation",
                  url: "https://www.promptfoo.dev/docs/intro/",
                  type: "article",
                  cost: "free",
                  note: "Open-source eval framework"
                },
                {
                  id: "deeplearning-quality-safety",
                  title: "DeepLearning.AI — \"Quality and Safety for LLM Applications\"",
                  url: "https://www.deeplearning.ai/short-courses/quality-safety-llm-applications/",
                  type: "course",
                  cost: "free"
                }
              ]
            },
            {
              id: "m4-safety",
              type: "topic",
              title: "AI Safety & Ethics",
              shortTitle: "AI Safety & Ethics",
              description: "Hallucination mitigation, bias detection, content filtering, responsible AI principles, the regulatory landscape (EU AI Act), and privacy in LLM systems.",
              concepts: [
                "Hallucination mitigation strategies",
                "Bias detection and mitigation",
                "Content filtering and guardrails",
                "Responsible AI principles",
                "Regulatory landscape: EU AI Act, emerging US regulations",
                "Privacy: PII handling in LLM systems, data retention"
              ],
              resources: [
                {
                  id: "anthropic-safety-research",
                  title: "Anthropic's Research on AI Safety",
                  url: "https://www.anthropic.com/research",
                  type: "article",
                  cost: "free",
                  author: "Anthropic"
                },
                {
                  id: "nemo-guardrails-m4",
                  title: "NeMo Guardrails (NVIDIA)",
                  url: "https://github.com/NVIDIA/NeMo-Guardrails",
                  type: "github",
                  cost: "free",
                  author: "NVIDIA",
                  note: "Programmable guardrails for LLM apps"
                }
              ]
            }
          ]
        },
        // -------------------------------------------------
        // MONTH 5
        // -------------------------------------------------
        {
          id: "month-5",
          title: "Month 5",
          subtitle: "Infrastructure, Scaling & LLMOps Mastery",
          summary: "vLLM/TGI model serving, GPU optimization, quantization for efficient inference, semantic caching, auto-scaling. Build a complete LLMOps pipeline with prompt versioning, model routing, and cost dashboards.",
          nodes: [
            {
              id: "m5-infrastructure",
              type: "topic",
              title: "LLM Infrastructure (Your DevOps Home Turf)",
              shortTitle: "LLM Infrastructure",
              description: "Model serving (vLLM, TGI, TensorRT-LLM), GPU management, quantization for efficient inference, batching strategies, caching layers, and auto-scaling.",
              concepts: [
                "Model serving: vLLM, TGI (Text Generation Inference), TensorRT-LLM",
                "GPU management and optimization",
                "Model quantization for efficient inference (GPTQ, AWQ, GGUF)",
                "Batching strategies for throughput",
                "Caching: semantic caching, KV-cache optimization",
                "Load balancing across model replicas",
                "Auto-scaling based on queue depth/latency"
              ],
              resources: [
                {
                  id: "vllm-docs",
                  title: "vLLM Documentation",
                  url: "https://docs.vllm.ai/",
                  type: "article",
                  cost: "free",
                  note: "Leading open-source inference engine"
                },
                {
                  id: "modal-docs",
                  title: "Modal Documentation",
                  url: "https://modal.com/docs",
                  type: "article",
                  cost: "free-tier",
                  note: "Serverless GPU infrastructure"
                },
                {
                  id: "together-ai",
                  title: "Together AI",
                  url: "https://together.ai/",
                  type: "tool",
                  cost: "free-tier",
                  note: "Inference API and fine-tuning platform"
                },
                {
                  id: "replicate",
                  title: "Replicate — Run Open-Source Models",
                  url: "https://replicate.com/",
                  type: "tool",
                  cost: "free-tier"
                }
              ]
            },
            {
              id: "m5-llmops",
              type: "topic",
              title: "Full LLMOps Pipeline",
              shortTitle: "Full LLMOps Pipeline",
              description: "Build a complete LLMOps pipeline: prompt versioning and A/B testing, automated evaluation, model routing, cost dashboards, alerting, and rollback mechanisms.",
              concepts: [
                "Prompt versioning and A/B testing",
                "Automated evaluation on every prompt change",
                "Model routing: cheap models for easy tasks, powerful for complex",
                "Cost dashboards with per-user/per-feature breakdowns",
                "Alerting on quality degradation, latency spikes, cost anomalies",
                "Rollback mechanisms for prompts and model versions"
              ],
              resources: [
                {
                  id: "langsmith-m5",
                  title: "LangSmith — Tracing, Evaluation & Monitoring",
                  url: "https://docs.smith.langchain.com/",
                  type: "article",
                  cost: "free-tier"
                },
                {
                  id: "helicone-m5",
                  title: "Helicone — LLM Observability",
                  url: "https://helicone.ai/",
                  type: "tool",
                  cost: "free-tier"
                },
                {
                  id: "wandb-prompts",
                  title: "Weights & Biases Prompts",
                  url: "https://wandb.ai/site/prompts",
                  type: "tool",
                  cost: "free-tier",
                  note: "Prompt tracking"
                }
              ]
            },
            {
              id: "m5-project6",
              type: "project",
              title: "Project #6 — LLMOps Platform",
              shortTitle: "LLMOps Platform",
              isProject: true,
              projectNumber: 6,
              description: "Build a complete LLMOps pipeline for one of your earlier projects with prompt versioning, model routing, cost dashboards, alerting, and A/B testing.",
              concepts: [
                "Prompt versioning with automated evaluation",
                "Model router: picks optimal model per request",
                "Cost and quality dashboard",
                "Alerting for quality drops and cost spikes",
                "A/B testing for prompt variants",
                "Architecture document and operational runbook"
              ],
              resources: []
            }
          ]
        },
        // -------------------------------------------------
        // MONTH 6+
        // -------------------------------------------------
        {
          id: "month-6",
          title: "Month 6+",
          subtitle: "Specialization & Thought Leadership",
          summary: "Choose your depth: AI Infrastructure Specialist, AI Application Architect, ML/Research-Adjacent Engineer, or AI DevOps/Platform Engineer. Build habits for staying current in a rapidly moving field.",
          nodes: [
            {
              id: "m6-specialization",
              type: "topic",
              title: "Choose Your Specialization Path",
              shortTitle: "Specialization Paths",
              description: "By now you're a solid AI Engineer. Pick one or two areas to go deep based on your interests and background.",
              concepts: [
                "Option A — AI Infrastructure Specialist: model serving, GPU optimization, inference at scale, CUDA, open-source contributions (vLLM, LitServe)",
                "Option B — AI Application Architect: complex multi-agent systems, vertical specialization (healthtech, fintech, devtools), evaluation frameworks",
                "Option C — ML/Research-Adjacent Engineer: ML theory, reading and implementing papers, fine-tuning, evaluation benchmarks, Stanford CS224N/CS231N",
                "Option D — AI DevOps/Platform Engineer (unique niche): ML platforms, feature stores, model registries, GPU clusters on Kubernetes, KubeFlow"
              ],
              resources: [
                {
                  id: "designing-ml-systems",
                  title: "Designing Machine Learning Systems",
                  url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/",
                  type: "book",
                  cost: "paid",
                  author: "Chip Huyen",
                  note: "For Option D: ML systems design, MLOps, production ML"
                },
                {
                  id: "fastai-foundations",
                  title: "Fast.ai — \"From the Foundations\"",
                  url: "https://course.fast.ai/Lessons/part2.html",
                  type: "course",
                  cost: "free",
                  note: "For Options A/C: deep foundations"
                },
                {
                  id: "papers-with-code",
                  title: "Papers With Code",
                  url: "https://paperswithcode.com/",
                  type: "article",
                  cost: "free",
                  note: "For Option C: ML research papers with implementations"
                }
              ]
            },
            {
              id: "m6-stay-current",
              type: "topic",
              title: "Staying Current in AI",
              shortTitle: "Staying Current",
              description: "AI moves faster than any other field. Build habits for staying updated: daily, weekly, monthly, and quarterly routines.",
              concepts: [
                "Daily (15 min): X/Twitter AI lists, Hacker News AI section",
                "Weekly (1-2 hours): Simon Willison, Hamel Husain, LangChain blog, one YouTube video",
                "Monthly: 1-2 research papers (Anthropic, OpenAI, Google DeepMind), try one new tool",
                "Quarterly: build a new project, contribute to open source, write a blog post",
                "Follow: Andrej Karpathy, Simon Willison, Chip Huyen, Swyx, Harrison Chase, Jerry Liu, Hamel Husain",
                "Newsletters: The Batch, Latent Space, ByteByteGo, Alpha Signal",
                "Podcasts: Latent Space, Practical AI, Gradient Dissent"
              ],
              resources: [
                {
                  id: "latent-space-podcast",
                  title: "Latent Space Podcast",
                  url: "https://www.latent.space/podcast",
                  type: "article",
                  cost: "free",
                  author: "Swyx & Alessio",
                  note: "The AI Engineer podcast"
                },
                {
                  id: "simon-willison-blog",
                  title: "Simon Willison's Blog",
                  url: "https://simonwillison.net/",
                  type: "article",
                  cost: "free",
                  note: "Practical LLM usage and tools, daily updates"
                },
                {
                  id: "the-batch-newsletter",
                  title: "The Batch Newsletter (Andrew Ng)",
                  url: "https://www.deeplearning.ai/the-batch/",
                  type: "article",
                  cost: "free",
                  note: "Weekly AI news"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
