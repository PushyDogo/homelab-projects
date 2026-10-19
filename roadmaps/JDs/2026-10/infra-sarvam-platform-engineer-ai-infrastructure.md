# Platform Engineer - AI Infrastructure — Sarvam AI

- Focus: infra
- Location: Bengaluru
- Posted/updated: 2026-06-29
- Source: https://jobs.ashbyhq.com/sarvam/fcb15601-6440-41f7-aa79-b9992057a4b2
- Retrieved: 2026-10-12 (verbatim text from the employer's job board)

---

Platform Engineer - AI Infrastructure
About Sarvam
Sarvam is building the bedrock of Sovereign AI for India. The company is developing India’s full-stack sovereign AI platform, building across research, models, infrastructure and applications with a singular focus on making AI genuinely work for India. Sarvam works with leading enterprises and public institutions and is backed by Lightspeed, Peak XV, and Khosla Ventures. Sarvam partners with India’s leading brands, including Tata Capital, SBI Life, CRED, IDFC, and LIC.
About the Role
Sarvam runs a large, multi-vendor GPU fleet that serves two demanding workloads on the same physical infrastructure: training jobs that span hundreds of GPUs, and inference services that must hold a flat p99 under production load. This role builds the platform that sits on top of that fleet - the scheduling, scaling, multi-tenancy, serving, and self-service layers that let our ML teams use thousands of GPUs without a human in the loop for every job.
This is the build side of infrastructure, not the operate side. Our SREs keep the fleet reliable and carry the pager; you build the systems that make the fleet usable - and that make it break less in the first place. The work is heavy software engineering: you will design and ship control-plane services, scheduler integrations, autoscaling controllers, the inference-serving platform, RBAC and quota systems, observability and cost tooling, and the CLI and APIs ML engineers touch every day. You will treat the platform as a product and its internal users as customers.
You should be a strong systems engineer who is fluent in Kubernetes at the controller and internals level, comfortable in Go or Python, and literate in the GPU-specific constraints - MIG and GPU sharing, gang scheduling, topology-aware placement, RDMA - that make this different from a generic cloud platform.
What You’ll Do
This is the surface area of the platform. You won't own all of it at once - you'll take a capability and build it end to end - but you should be excited by most of it.

- The serving platform. The control plane that turns a model artifact into a scalable, multi-tenant endpoint: intelligent routing and load balancing across replicas, rollout machinery (canary, blue-green, rollback), traffic splitting, model-version integration etc.

- The scaling and elasticity layer. Autoscaling for both training (elastic and gang scaling, scale-to-fit) and serving (queue-depth and utilization-driven), capacity pooling across clusters, burst handling, preemption and reclaim, and efficient bin-packing across GPUs etc.

- Scheduling and orchestration. The scheduler layer itself - Kueue, Volcano, Slurm-on-Kubernetes, or custom controllers - with gang scheduling, priority and preemption, queue fairness, quota enforcement, and topology-aware placement that keeps a job's ranks on the same fabric island.

- Multi-tenancy, RBAC, and isolation. The tenant model and namespacing, RBAC and policy, quota and fair-share enforcement, MIG / MPS / time-slicing exposed as self-service tiers, secrets and credential management, and audit logging.

- Networking components. Platform-level network plumbing - CNI configuration and custom components, ingress and service routing, RDMA / SR-IOV exposure into pods, tenant network policy and segmentation, and multi-cluster connectivity.

- Observability and cost tooling. The metrics, logging, and tracing pipeline as a platform feature with cardinality managed at fleet scale.

- The storage and data path. Abstractions over the parallel filesystem, caching tiers, volume provisioning, and data-locality-aware placement.

- Developer experience and self-service. The layer ML engineers actually touch - CLI, SDK, and APIs, job-submission abstractions and inner-loop tooling.

- Provisioning and infrastructure-as-code. The control plane that stands clusters up reproducibly - Terraform, Crossplane, or operators; node lifecycle and image management; driver and firmware rollout automation; and multi-vendor cluster bring-up.

What We're Looking For

- 5+ years building infrastructure or platform software, with a track record of systems you designed and shipped - not scripts and glue, but services and control planes that others built on.

- Strong software engineering in Go or Python, with the judgment to build maintainable systems and the depth to debug them in production.

- Kubernetes at the controller and internals level - you have written operators or controllers, understand the scheduler and API machinery, and know where its abstractions leak.

- Working literacy in the GPU-specific platform constraints: MIG and GPU sharing, gang scheduling, topology- and fabric-aware placement, and why training and serving contend for the same hardware.

- A product mindset toward internal users - you design APIs and abstractions people want to use, and you measure the platform by adoption and self-service, not by tickets closed.

- The range to own a capability end to end, from design through rollout to the documentation that makes it self-serve.

Bonus Points

- Having built a serving or inference or training platform - routing, autoscaling, and rollout for model endpoints at scale, fine-tuning as a service etc.

- Experience with GPU scheduling systems (Kueue, Volcano, Slurm, Run:ai, or custom schedulers) in multi-tenant production.

- Multi-tenant isolation (MIG, MPS, time-slicing) shipped as a self-service platform capability rather than a one-off configuration.

- Deep Kubernetes networking - CNI internals, custom network components, or RDMA / SR-IOV in pods.

- On-premise GPU platform work, including multi-vendor or Indian NCP environments.

- Open-source contributions to Kubernetes, scheduling, or GPU-platform projects.

Why Sarvam?
Sarvam is a fast-moving, high talent-density team building full-stack AI for India, working on problems that push the frontiers of AI with real population-scale impact.
Work alongside researchers, engineers, builders, and business leaders who move fast and hold each other to a very high bar
High ownership and high impact, from day one
Everything we do is AI-first, from the way we build and ship to the way we think about problems
You can work on problems that could change how an entire country learns, works, and communicates
If you want to work on problems at the frontier of AI in India, Sarvam is the place to be.
