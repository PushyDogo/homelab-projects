ROADMAP.stages.push({
  id: "stage-6",
  n: 6,
  level: "Capstones",
  title: "Prove it",
  tag: "AI-Engineering",
  index: null,
  blurb: "Three pieces of work, one per side of the role, each finished to the standard of something you would show in an interview or publish.",
  outcome: "each capstone has a public repository, a write-up with measurements, and a short demo.",
  modules: [
    {
      id: "c-platform",
      track: "platform",
      title: "Capstone: a self-hosted inference platform",
      h: [50, 80],
      summary: "A multi-tenant model platform, defined in code, that someone else could deploy: serving, routing, autoscaling, observability, delivery and a cost report.",
      needs: ["p-finops", "p-secure", "p-delivery"],
      project: true,
      topics: [
        "Scope: two models (chat and embedding), two tenants, one cloud plus the homelab",
        "Everything from a single `terraform apply` and a GitOps sync",
        "A written SLO, a load test proving it, and a cost per million tokens",
        "Runbooks for the three most likely incidents"
      ],
      questions: [
        "What are the three decisions in this design you would defend hardest, and what did you reject for each?",
        "What breaks first at ten times the load, and what would you change?",
        "What did the platform cost to run during testing, and how close was your estimate?"
      ],
      exercises: [
        { t: "Infrastructure", env: "cloud", d: "Terraform modules for network, cluster and a scale-from-zero spot GPU pool on EKS or GKE, with policy checks and tests in CI. Total spend capped and stated up front." },
        { t: "Serving and routing", env: "cloud", d: "vLLM for chat and an embedding server, inference-aware routing, an LLM gateway with per-tenant keys, budgets and fallback to a hosted model." },
        { t: "Operations", env: "cloud", d: "Autoscaling on queue metrics, dashboards from GPU to tenant cost, SLO burn-rate alerts, GitOps delivery with a quality-gated canary for model changes." },
        { t: "Evidence", env: "any", d: "Load-test report, cost report, threat model and architecture document. Then destroy the cloud resources and keep a reduced copy running on the homelab and PC." }
      ],
      resources: [
        { t: "AI on EKS", u: "https://awslabs.github.io/ai-on-eks/", k: "code", n: "Compare your design with the reference blueprints afterwards" },
        { t: "llm-d", u: "https://llm-d.ai/", k: "doc" },
        { t: "vLLM production stack", u: "https://github.com/vllm-project/production-stack", k: "code" }
      ],
      notes: ["Inference platform capstone: architecture", "Inference platform capstone: retrospective"]
    },
    {
      id: "c-app",
      track: "build",
      title: "Capstone: an agent that does real work",
      h: [50, 80],
      summary: "Extend the homelab copilot into an agent you rely on, running on your own platform, with evals strong enough that you would let it act unattended.",
      needs: ["b-ship", "r-project"],
      project: true,
      topics: [
        "A task with real stakes: on-call triage for the homelab or a sanitised version of a work workflow",
        "Runs on self-hosted models where they are good enough, with measured fallback to a hosted model",
        "Durable, observable, permissioned, and evaluated on at least 100 tasks",
        "A fine-tuned or distilled small model for one sub-task, justified by numbers"
      ],
      questions: [
        "What is the agent's task success rate, how was it measured, and what are the top remaining failure modes?",
        "Which sub-tasks run on a self-hosted model, and what evidence says that is good enough?",
        "What can the agent do without approval, and why is that safe?"
      ],
      exercises: [
        { t: "Task and eval definition", env: "any", d: "Write the task specification and a 100-task eval set with programmatic checks before extending the agent." },
        { t: "Build", env: "lab", d: "Event-triggered, durable agent with MCP tools, approval gates for writes, memory across incidents, and full tracing." },
        { t: "Model routing by evidence", env: "pc", d: "Evaluate self-hosted and hosted models per sub-task. Route each to the cheapest model that passes, and fine-tune a small model for one of them." },
        { t: "Run it for a month", env: "lab", d: "Let it handle real homelab events. Publish the results: success rate, interventions, cost, and what you changed along the way." }
      ],
      resources: [
        { t: "Building effective agents", u: "https://www.anthropic.com/engineering/building-effective-agents", k: "article" },
        { t: "LLM evals FAQ", u: "https://hamel.dev/blog/posts/evals-faq/", k: "article" }
      ],
      notes: ["Agent capstone: design and eval report"]
    },
    {
      id: "c-kernel",
      track: "internals",
      title: "Capstone: a measured performance win",
      h: [40, 70],
      summary: "Pick a real bottleneck in a model or engine, fix it at the kernel or engine level, and publish the investigation.",
      needs: ["d-source"],
      project: true,
      topics: [
        "A target with a baseline: an operator, a decoding path, a quantized format, a scheduler behaviour",
        "A reproducible benchmark and a profile that proves where the time goes",
        "An implementation in CUDA or Triton, or a change to an engine",
        "A write-up that a maintainer would take seriously"
      ],
      questions: [
        "What was the bottleneck, and what evidence identified it?",
        "What did you try that did not work, and why not?",
        "How does the speedup vary with batch size, sequence length and hardware?"
      ],
      exercises: [
        { t: "Pick and baseline", env: "pc", d: "Choose the target, write the benchmark, capture profiles, and state a hypothesis and a goal before changing anything." },
        { t: "Implement and iterate", env: "pc", d: "Reach a speedup or memory reduction you can reproduce, with correctness tests. Keep the optimisation log." },
        { t: "Publish", env: "any", d: "A technical post with method, profiles, code and results, and an upstream pull request or issue if the work applies to a public project." }
      ],
      resources: [
        { t: "GPU MODE lectures", u: "https://github.com/gpu-mode/lectures", k: "course" },
        { t: "Programming Massively Parallel Processors (4th ed.)", u: "https://shop.elsevier.com/books/programming-massively-parallel-processors/hwu/978-0-323-91231-0", k: "book" }
      ],
      notes: ["Kernel capstone: optimisation log"]
    },
    {
      id: "c-comm",
      track: "build",
      title: "Scoping, writing and working with stakeholders",
      h: [10, 16],
      summary: "The non-code half of senior and forward-deployed roles: turning a vague business problem into a scoped build with success criteria, and explaining results to engineers and executives.",
      why: "Every application posting in the October 2026 sweep asks for this: translating ambiguous needs into specifications, running proofs of concept, and communicating trade-offs to mixed audiences.",
      needs: ["b-ship"],
      topics: [
        "Discovery: finding the real workflow, the current cost of it, and what 'good' means to the people who do it",
        "Writing success criteria and an evaluation plan before building",
        "Proofs of concept: scoping for a convincing result in days, and being honest about what was not tested",
        "Design documents and architecture decision records",
        "Explaining non-determinism, evals and risk to non-technical stakeholders",
        "Estimating cost and latency before the build, and reporting against the estimate",
        "Technical writing: benchmark reports, incident reviews, public posts",
        "Mentoring and code review; setting a quality bar for a team",
        "Integrating into systems that were never designed for it: CRM, ticketing, telephony, core systems"
      ],
      questions: [
        "A stakeholder says 'we want an AI agent for support'. What are your first five questions?",
        "How do you explain to an executive why an agent that is right 92% of the time may or may not be shippable?",
        "What goes in a design document for an LLM feature that would not be in one for a CRUD service?",
        "When should you tell a customer that the answer is not an LLM?"
      ],
      exercises: [
        { t: "Scope a real problem", env: "any", d: "Pick a workflow at work or for someone you know. Write a two-page scoping document: the workflow today, the proposed system, success criteria, eval plan, risks, cost estimate. Have a non-engineer read it and tell you what they understood." },
        { t: "Two audiences", env: "any", d: "Present one capstone twice: a ten-minute technical walkthrough and a three-minute version for a business audience. Record both." },
        { t: "Publish", env: "any", d: "Turn one benchmark report or design document from this roadmap into a public post." }
      ],
      resources: [
        { t: "Design Docs at Google", u: "https://www.industrialempathy.com/posts/design-docs-at-google/", k: "article" },
        { t: "Technical Writing courses (Google)", u: "https://developers.google.com/tech-writing", k: "course" },
        { t: "Architecture decision records", u: "https://adr.github.io/", k: "doc" }
      ],
      notes: ["Scoping an AI project", "Explaining evals to stakeholders"]
    }
  ]
});
