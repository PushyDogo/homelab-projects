# Performance Engineer, Inference — Sarvam AI

- Focus: infra
- Location: Bengaluru
- Posted/updated: 2026-08-10
- Source: https://jobs.ashbyhq.com/sarvam/7d2faba2-21a1-4a8a-aff5-f708a6959195
- Retrieved: 2026-10-12 (verbatim text from the employer's job board)

---

### Performance Engineer, Inference
Part of Sarvam's Performance Engineering team. We are hiring two specialized performance roles - Inference (this posting) and Kernels (companion posting). They are a vertical stack: the kernels team authors the µs-level GPU code, and the inference team integrates it into a running serving stack and owns the system-level numbers. If your depth genuinely spans both, apply to either and tell us - but most candidates are strongest in one, and we hire for that depth.

Location: [Bengaluru / Chennai / Hybrid / On-site] · Team: Performance Engineering · Level: Senior

### About the team
Sarvam serves multiple model families - small and large LLMs, Mixture-of-Experts, Indic ASR & TTS, streaming models and multimodal models - across a multi-node, multi-tenant fleet of Hoppers and Blackwells. The Performance Engineering team owns the numbers the rest of the company plans against: how fast we serve, how much it costs, and how much we get out of every GPU. This team works at the intersection of the serving runtime, the kernel layer, and the SRE org that keeps the fleet alive.

### About the role
You will own Sarvam's production serving path for large distributed models end to end. You should be source-level fluent in at least one of SGLang, vLLM, NVIDIA Dynamo, or TensorRT-LLM - able to read and modify it where stock behavior does not fit our workloads - and you should operate and extend a distributed-serving stack at depth: disaggregated prefill-decode across nodes, distributed KV/cache transfer, and the routing and scheduling that span them. You will integrate artifacts from the model and kernel teams into a running multi-node, multi-tenant stack, and you will build and train your own speculators - draft models, distillation from the target, acceptance-rate tuning against the live serving distribution - rather than only wiring in stock implementations. You will produce, and defend, the latency and throughput numbers the company plans against, and you will spend significant time in cross-team work with architecture co-design, the kernels team, the model team, and SRE.

Your scoreboard: TTFT (p50 / p95 / p99), TPOT, throughput, GPU utilization, and cost per million tokens.

### What we're looking for

- 5+ years in ML systems, with 2+ years on inference serving at production scale. Your record shows concrete outcomes - tokens per day, throughput wins, p99 reductions - rather than "deployed a model."

- Experience serving 100B+ parameter models in production across multi-node tensor, pipeline, or expert parallelism.

- Source-level fluency in one of SGLang, vLLM, Dynamo, or TensorRT-LLM - you have modified the scheduler, the KV allocator, or the disaggregation path - and reading-level familiarity with the other three.

- Distributed serving at operating-and-extending depth: a disaggregated prefill-decode stack, distributed KV/cache transfer (Mooncake or equivalent), and cross-node routing and scheduling. You have run one of these in production and modified it where it didn't fit.

- Speculative decoding as a build-and-train competency: you have trained your own draft models or speculators (EAGLE / DFlash or otherwise), distilled them from a target model, measured and tuned acceptance rate against a real serving distribution, and composed speculation with the rest of the stack - not only integrated a stock implementation.

- Deep understanding of KV cache internals: block tables, copy-on-write, prefix sharing, and fragmentation.

- Working command of TP / PP / EP, NCCL primitives, and how they interact with the scheduler.

- Multi-tenant serving: model co-location and MIG / MPS isolation.

- Profiling fluency with Nsight Systems, framework tracing, and py-spy / perf.

- C++ and CUDA at a read-and-modify level.

- On-call ownership of an inference SLO.

### Strong pluses

- Upstream contributions to SGLang, vLLM, Dynamo, llm-d, TensorRT-LLM, or LMDeploy on non-trivial code paths.

- Direct production experience with Dynamo or llm-d at scale.

- Having operated a forked runtime in production.

- Published or shipped speculator work - a draft model or speculative-decoding technique you trained and measured.

- MoE serving at scale, long-context (128K+), multi-model serving, or Indic and multilingual workloads.
