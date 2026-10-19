# Skills matrix — October 2026 job-posting sweep

Fourteen postings, all open on the employer's own job board on 12 October 2026 and saved verbatim in this folder. Seven are application-focused, seven infrastructure-focused. Four are based in India. The five older postings in `JDs/` (collected before the first roadmap) are included as a cross-check.

Tallies are from reading each posting; a posting counts for a skill when it names it as a responsibility, requirement or preferred qualification.

## Postings

| Code | Role | Company | Location | Posted or updated |
|---|---|---|---|---|
| A1 | Applied AI Architect | Anthropic | Bangalore | 2026-10-09 |
| A2 | Forward Deployed Engineer, Agentic Platform | Cohere | United States | 2026-09-01 |
| A3 | AI Engineer, Forward Deployed Engineering | Databricks | United States | 2026-10-06 |
| A4 | Senior Software Engineer, Agents | Harvey | New York | 2026-07-22 |
| A5 | Agentic AI Engineer (AVP/VP) | iCapital | Jaipur | 2026-09-28 |
| A6 | Lead Applied AI Engineer | LangChain | New York | 2026-09-04 |
| A7 | Agent Engineer | Sarvam AI | Bengaluru | 2026-08-20 |
| I1 | Senior Software Engineer, GPU Kernel Authoring & Optimization | CoreWeave | Sunnyvale / Bellevue | 2026-10-12 |
| I2 | Platform Engineer, AI/ML Infrastructure (Kubernetes & Terraform) | Deepgram | Remote, USA | 2026-07-03 |
| I3 | Staff AI Platform Engineer, Inference & Agentic Systems | Paytm | Toronto | 2026-04-17 |
| I4 | Senior ML Systems Engineer, Inference | Runpod | Remote, USA | 2026-10-01 |
| I5 | Performance Engineer, Inference | Sarvam AI | Bengaluru | 2026-08-10 |
| I6 | Platform Engineer, AI Infrastructure | Sarvam AI | Bengaluru | 2026-06-29 |
| I7 | Software Engineer, Inference / Compute Infrastructure | Together AI | India | 2026-10-08 |

Older set: O1 AI Infrastructure Engineer (AIFiesta), O2 AIOps Engineer (Parspec), O3 ML Ops Engineer (DataZymes), O4 DevOps/ML Engineer (KnowDis), O5 MLOps Engineer (kAIgentic).

Status key: **Covered** was already in the first draft. **Added** was a gap, now a new module or new topics. **Partial** and **Not covered** are listed again at the end.

## Application side

| Skill | Postings | n/14 | Roadmap module(s) | Status |
|---|---|---|---|---|
| Evaluation: frameworks, metrics, regression suites, telling signal from noise | A1 A2 A3 A4 A5 A6 A7 I3 | 8 | `b-evals`, `b-obs` | Covered |
| Agents: multi-step, tool-using, planning (ReAct, plan-and-execute) | A2 A3 A4 A5 A6 A7 I3 | 7 | `b-tools`, `b-agents` | Covered |
| Customer-facing work: discovery, scoping, proofs of concept, explaining to executives | A1 A2 A3 A4 A6 A7 | 6 | `c-comm` | **Added** (new module) |
| Production Python, clean and testable | A2 A4 A6 A7 I3 I4 I6 I7 | 8 | `b-ship`, assumed throughout | Covered |
| Agent observability, monitoring, instrumentation | A4 A5 A6 A7 I3 | 5 | `b-obs` | Covered |
| Context and prompt engineering | A4 A5 A6 A7 | 4 | `b-context` | Covered |
| RAG, retrieval, vector databases | A2 A3 A6, O2 | 3 | `b-retrieval`, `b-rag` | Covered |
| Multi-agent systems, sub-agents | A3 A4 I3 | 3 | `b-agents`, `b-durable` | Covered |
| Integration into enterprise systems (CRM, ticketing, telephony, core banking), auditability | A1 A5 A7 A2 | 4 | `b-ship`, `c-comm` | **Added** (topics) |
| Regulated-industry constraints, security and compliance for AI | A2 A5 I3, O3 | 3 | `b-security`, `p-secure` | Covered |
| Frameworks: LangChain/LangGraph, Hugging Face, agent SDKs | A1 A3 A6 A7 | 4 | `b-agents` | Covered |
| Model selection across providers and modalities; open and closed models | A4 A6 A7 I3 | 4 | `f-landscape`, `b-api` | Covered |
| Mentoring, setting a technical bar, design reviews | A6 A7 I1 I3 | 4 | `c-comm` | **Added** (topic) |
| Durable workflows and orchestration (Temporal, Airflow, Prefect) | A5 I3 I7 | 3 | `b-durable` | Covered |
| Cost, latency and reliability tuning under real load | A7 I3 I4 | 3 | `b-api`, `r-math`, `p-finops` | Covered |
| Fine-tuning, LoRA | A3 I3 | 2 | `r-finetune` | Covered |
| TypeScript alongside Python | A6 I3 | 2 | `b-agents` | **Added** (exercise) |
| Tool design, skill writing, context-window management | A4 | 1 | `b-tools`, `b-agents`, `b-context` | Covered; skills topic added |
| Structured outputs, memory | A7 | 1 | `b-api`, `b-agents` | Covered |
| Low-latency agent execution: caching, parallel tool calls, sub-agents | A4 | 1 | `b-obs` | **Added** (topic) |
| Scenario coverage designed up front | A7 | 1 | `b-evals` | **Added** (topic) |
| Document intake, classification, extraction, validation, routing | A5, O2 | 1 | `b-data` | **Added** (new module) |
| Text-to-SQL; DSPy | A3 | 1 | `b-data` | **Added** (new module) |
| Classical data science: pandas, scikit-learn, ML algorithms | A3 A5, O3 O4 | 2 | `f-classic` | **Added** (new module) |
| Guardrails, permissioning, sandboxing, human-in-the-loop | I3 | 1 | `b-security`, `b-durable`, `p-secure` | Covered |
| Agentic security: prompt injection, privilege escalation, data leakage | I3 | 1 | `b-security` | Covered |
| MCP and agent communication standards | I3 (nice to have) | 1 | `b-tools`, `b-durable` | Covered |
| Voice, telephony, vision | A7 I3 A6 | 3 | `r-multimodal` | **Added** (new module) |
| Building an agent platform for other teams: runtime, SDKs, standards | I3 | 1 | `b-durable` | **Added** (topic) |
| Cloud deployment on AWS, Azure or GCP | A1 A3 A7 I3 | 4 | `p-aws`, `p-gcp` | Covered for AWS and GCP; Azure partial |
| Spark and the Databricks platform | A3, O3 | 1 | `p-batch` (Spark topic) | Partial |
| Frontend when the problem needs it | A2 A4 | 2 | — | Not covered |

## Infrastructure side

| Skill | Postings | n/14 | Roadmap module(s) | Status |
|---|---|---|---|---|
| Serving engines: vLLM, SGLang, TensorRT-LLM, Triton, Dynamo, llm-d | I1 I3 I4 I5, O1 O2 | 4 | `r-vllm`, `r-engines`, `d-source` | Covered |
| Kubernetes at production scale | I1 I2 I3 I6, O1–O5 | 4 | Stage 4 (basics assumed) | Covered |
| Open-source contributions to inference or platform projects | A6 I1 I4 I5 I6 | 5 | `d-source` | Covered |
| Multi-node GPU systems: tensor/pipeline/expert parallelism, NCCL | I1 I4 I5 I7, O1 O5 | 4 | `d-distributed`, `d-scale` | Covered; expert parallelism added |
| High-speed and cluster networking: InfiniBand/RoCE, RDMA, SR-IOV, CNI internals, BGP, service mesh | I1 I2 I4 I6 I7 | 5 | `p-network` | **Added** (new module) |
| Self-service platform APIs, SDKs, CLIs; platform as a product | I2 I3 I6 I7 | 4 | `p-operators` | **Added** (new module) |
| Benchmarking rigour: TTFT, inter-token latency, throughput, cost per token | I1 I4 I5 | 3 | `r-math`, `r-bench` | Covered |
| Quantization | I1 I3 I4 | 3 | `r-quant` | Covered |
| CUDA kernels, GPU architecture (tensor cores, occupancy, coalescing) | I1 I4 I5, O1 | 3 | `d-cuda1`, `d-cuda2` | Covered |
| GPU and system profiling: Nsight, py-spy, perf | I1 I4 I5 | 3 | `d-profile`, `d-cuda2` | Covered |
| Systems language: Go, Rust or C++ | I1 I2 I5 I6 I7, O1 | 5 | `p-operators` (Go), `d-cuda1` (C++) | **Added** for Go; Rust not covered |
| Schedulers: Kueue, Volcano, Slurm, Slurm-on-Kubernetes, gang and topology-aware scheduling | I1 I2 I6, O5 | 3 | `p-batch`, `p-metal` | Kueue covered; Slurm and Volcano **added** |
| Bare metal: PXE, Redfish/IPMI/BMC, MAAS, node lifecycle, driver and firmware rollout, self-healing | I2 I6 I7 | 3 | `p-metal` | **Added** (new module) |
| Observability stack: metrics, logs, traces | I2 I3 I6, O1 O2 | 3 | `p-obs` | Covered |
| CI/CD, GitOps, Argo CD | I2 I3 I7, O2 O4 | 3 | `p-delivery` | Covered |
| FinOps, cost per token, cost tooling | I2 I4 I6 | 3 | `p-finops` | Covered |
| Kubernetes controllers and operators, reconciliation, API machinery | I6 I7 | 2 | `p-operators` | **Added** (new module) |
| GPU sharing and isolation: MIG, MPS, time-slicing; multi-tenancy, RBAC, quotas | I5 I6 | 2 | `p-gpu-k8s`, `p-secure` | Covered; self-service tiers topic added |
| Speculative decoding, including training your own draft model | I4 I5 | 2 | `d-attention`, `d-scale` | Covered; training a speculator **added** |
| KV-cache internals: block tables, copy-on-write, prefix sharing | I1 I5 | 2 | `r-vllm`, `d-scale`, `d-source` | Covered; internals **added** |
| Kernel-authoring DSLs: Triton, CuTe, Pallas, Mojo; CUTLASS | I1 I4 | 2 | `d-ops`, `d-cuda2` | Triton covered; others **added** as topics |
| Storage: parallel filesystems, Ceph/Rook, CSI, caching tiers, S3 | I2 I6 | 2 | `p-storage` | **Added** (new module) |
| Infrastructure as code: Terraform, Crossplane, operators | I2 I6, O1 O2 O4 | 2 | `p-terraform` | Covered |
| Hybrid, multi-region, multi-cluster, on-prem | I2 I6 | 2 | `p-scale`, `p-network`, `p-metal` | **Added** (topics) |
| Event-driven systems: Kafka, NATS, SQS | I3 I7, O2 | 2 | `b-durable`, `p-aws` | Covered; streams topic added |
| Multi-model serving across text, voice, code, vision | I3 I5 | 2 | `r-multimodal` | **Added** (new module) |
| Disaggregated prefill/decode, distributed KV transfer, cross-node routing | I5 I4 | 2 | `d-scale`, `p-route` | **Added** (new module) |
| Mixture-of-experts and long-context serving | I1 I5 | 2 | `d-scale` | **Added** (new module) |
| Serving platform control plane: routing, canary, blue-green, traffic splitting, model lifecycle | I3 I6, O5 | 2 | `p-serve`, `p-route`, `p-delivery` | Covered |
| Autoscaling, capacity pooling, bin-packing, preemption | I6 | 1 | `p-scale` | Covered; pooling topic added |
| Owning an inference SLO on call | I5 | 1 | `p-obs`, `d-scale` | Covered |
| MLPerf and audited benchmarks, roofline analysis | I1 | 1 | `r-bench`, `d-cuda2` | **Added** (topics) |
| Other accelerators: AMD ROCm/HIP, TPUs, custom silicon | I1 | 1 | `r-gpu`, `d-ops` | Partial |
| Distributed training frameworks, training platforms | I6, O1 O5 | 1 | `p-batch`, `d-distributed` | Covered |
| Experiment tracking, registries: MLflow, Kubeflow, DVC | O2 O3 O4 O5 | 0 | `p-delivery`, `p-batch` | Covered |
| Responsible AI: explainability, bias, fairness | O3 | 0 | `p-secure` | **Added** (topic) |

## What changed in the roadmap because of this sweep

Nine new modules: `f-classic`, `b-data`, `r-multimodal`, `p-operators`, `p-network`, `p-storage`, `p-metal`, `d-scale`, `c-comm`. Twenty-four topics, one exercise and three resources were added to existing modules. The roadmap went from 53 to 62 modules.

## Still open

These appear in the postings and are not, or only partly, covered. They are listed so the omission is a choice rather than an oversight.

| Gap | Seen in | Why it is not in the roadmap yet |
|---|---|---|
| Frontend / full-stack ability | A2, A4 | Outside the scope you set. Worth a small module if you target forward-deployed roles. |
| Rust | I7 (and O1) | Go was chosen as the one systems language because the Kubernetes ecosystem is written in it. Rust is named as an alternative, not a requirement, in every posting that lists it. |
| Azure in depth | A3 (and O4) | You asked for AWS and GCP. Azure is covered as a concept mapping only. |
| Databricks, Snowflake, Spark in depth | A3 (and O3) | Vendor platforms; Spark appears as a topic only. |
| Non-NVIDIA accelerators in depth | I1 | No hardware to practise on; covered at recognition level. |
| Serving 100B+ parameter models across nodes | I5 | Needs hardware a lab cannot provide. `d-scale` covers the concepts and a miniature version; the production experience has to come from a job. |
| Years of customer-facing or on-call track record | A1, I5 | Not learnable from a roadmap; `c-comm` and `p-obs` build the underlying skills. |

## Observations

- **Evals are the most requested application skill** (8 of 14, and all 7 application postings). Several postings describe it in detail: regression suites, versioned prompts, "moving well beyond trial and error".
- **MCP is named in only one of these fourteen**, as a nice-to-have. Search summaries and blog guides give it more weight than the postings themselves do. Tool design and integration, which MCP serves, appear far more often.
- **The infrastructure postings split into three kinds**: inference performance (I1, I4, I5), platform control plane (I3, I6), and physical fleet (I2, I7). The first draft of the roadmap served the first kind well, the second partly, and the third not at all.
- **Every application posting asks for customer or stakeholder work.** None of the first draft addressed it.
- **Limits of this sweep**: fourteen postings is a small sample, weighted toward AI-native companies with public job boards. Large Indian services firms and enterprises that post only on LinkedIn or Naukri are not represented, and those tend to ask for more classic MLOps and cloud-vendor skills. Repeat the sweep every few months; `o-role` has this as a standing exercise.
