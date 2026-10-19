# Senior Software Engineer - GPU Kernel Authoring & Optimization — CoreWeave

- Focus: infra
- Location: Sunnyvale, CA / Bellevue, WA
- Posted/updated: 2026-10-12
- Source: https://coreweave.com/careers/job?4697100006&board=coreweave&gh_jid=4697100006
- Retrieved: 2026-10-12 (verbatim text from the employer's job board)

---

CoreWeave is The Essential Cloud for AI™. Built for pioneers by pioneers, CoreWeave delivers a platform of technology, tools, and teams that enables innovators to build and scale AI with confidence. Trusted by leading AI labs, startups, and global enterprises, CoreWeave combines superior infrastructure performance with deep technical expertise to accelerate breakthroughs and turn compute into capability. Founded in 2017, CoreWeave became a publicly traded company (Nasdaq: CRWV) in March 2025. Learn more at www.coreweave.com.

### About the role:

CoreWeave is the top-rated AI-cloud for high-performance GPU infrastructure across AI/ML, visual effects, rendering, and real-time inference. Our stack is engineered for speed, scale, and cost-efficiency—an unmatched alternative to traditional hyperscalers. At CoreWeave, infrastructure is the product.

We're looking for a Senior Engineer for CoreWeave's Benchmarking & Performance team, focused on kernel authoring and optimization. You will write, profile, and tune the GPU kernels that sit on the critical path of large-scale model serving—squeezing maximum throughput and minimum latency out of every SM, tensor core, and byte of memory bandwidth. You will also aid us in achieving industry-leading end-to-end performance benchmarking publications such as MLPerf.

You will be an owner who leads designs, raises engineering standards, and delivers measurable improvements to latency, throughput, and reliability across our inference stack. You'll partner with product, orchestration, and hardware teams to turn kernel-level wins into end-to-end gains and meet strict P99 SLAs at scale.

- Author, profile, and optimize CUDA kernels—GEMMs, attention, MoE routing, quantization, KV-cache, and fused epilogues—on the critical path of LLM inference.

- Optimize for the hardware: exploit tensor cores and tune occupancy, memory coalescing, shared-memory/register usage, and overlap of compute with data movement.

- Use kernel-authoring DSLs and compilers to prototype and ship kernels quickly without sacrificing performance.

- Benchmark rigorously: build reproducible microbenchmarks and roofline analyses, and validate that kernel-level wins translate to end-to-end latency/throughput gains across model-serving stacks (vLLM, TensorRT-LLM, llm-d, SGLang).

- Implement and maintain benchmarking workflows for end-to-end MLPerf Inference (and Training) runs, including workload setup, cluster configuration, runbooks, and result validation.

- Lead design reviews and drive architecture within the team; decompose multi-service work into clear milestones.

- Mentor junior engineers; review cross-team designs and elevate coding/testing standards.

- Help ensure reproducible, well-documented benchmarking and kernel-optimization processes.

### Who You Are:

- 5+ years of experience building high-performance computing, GPU/accelerator software, or performance-critical systems.

- Hands-on CUDA experience is required—you have written and optimized custom kernels and are fluent with the CUDA programming and memory model.

- Deep understanding of GPU architecture and performance: tensor cores, warp/occupancy tuning, the memory hierarchy and bandwidth, NVLink/PCIe, and profiling with Nsight Compute/Systems.

- Strong coding in C++ and Python; comfortable reading and writing low-level, performance-sensitive code.

- Familiarity with model-serving stacks (vLLM, TensorRT-LLM, llm-d, SGLang) and the kernels that dominate their inference cost.

- Strong communicator comfortable collaborating with cross-functional teams and external partners.

### Preferred:

- Triton or Mojo for authoring custom GPU kernels — highly desired.

- CuTe DSL for Python-based kernel authoring on NVIDIA GPUs.

- JAX and its Pallas kernel language for authoring kernels on GPU/TPU.

- HIP / ROCm and AMD GPU experience.

- NCCL and collective-communication performance.

- Experience with alternative accelerators such as Google TPUs and Meta's MTIA.

- Familiarity with kernel-authoring DSLs and nano-compilers such as KNYFE and its Block DSL.

- Experience with Kubernetes at production scale.

- Experience with SUNK (Slurm on Kubernetes) / Slurm for scheduling large GPU jobs.

- Experience running MLPerf submissions or similar large-scale audited benchmarks.

- Contributions to OSS projects such as vLLM, SGLang, PyTorch, Triton, or CUTLASS.

Wondering if you're a good fit?

We believe in investing in our people, and value candidates who can bring their own diversified experiences to our teams – even if you aren't a 100% skill or experience match.

Why CoreWeave?

Help shape an industry-defining inference platform that enables teams to deploy generative AI and real-time applications at scale. If squeezing every last microsecond out of GPU kernels and delivering reliable model serving excites you, this is the place to build. We're in an exciting stage of hyper-growth that you will not want to miss out on. We're not afraid of a little chaos, and we're constantly learning. Our team cares deeply about how we build our product and how we work together, which is represented through our core values:

- Be Curious at Your Core

- Act Like an Owner

- Empower Employees

- Deliver Best-in-Class Client Experiences

- Achieve More Together

We support and encourage an entrepreneurial outlook and independent thinking. We foster an environment that encourages collaboration and enables the development of innovative solutions to complex problems. As we get set for takeoff, the organization's growth opportunities are constantly expanding. You will be surrounded by some of the best talent in the industry, who will want to learn from you, too. Come join us!

The base salary range for this role is $182,000 to $242,000. The starting salary will be determined based on job-related knowledge, skills, experience, and market location. We strive for both market alignment and internal equity when determining compensation. In addition to base salary, our total rewards package includes a discretionary bonus, equity awards, and a comprehensive benefits program (all based on eligibility). 
What We Offer

The range we’ve posted represents the typical compensation range for this role. To determine actual compensation, we review the market rate for each candidate which can include a variety of factors. These include qualifications, experience, interview performance, and location.

In addition to a competitive salary, we offer a variety of benefits to support your needs. The benefits below reflect our US-based offerings for full-time employees; for roles in other locations, benefits vary and are shared during the hiring process. These include:

- Medical, dental, and vision insurance - 100% paid for by CoreWeave

- Company-paid Life Insurance 

- Voluntary supplemental life insurance 

- Short and long-term disability insurance 

- Flexible Spending Account

- Health Savings Account

- Tuition Reimbursement 

- Ability to Participate in Employee Stock Purchase Program (ESPP)

- Mental Wellness Benefits through Spring Health 

- Family-Forming support provided by Carrot

- Paid Parental Leave 

- Flexible, full-service childcare support with Kinside

- 401(k) with a generous employer match

- Flexible PTO

- Catered lunch each day in our office and data center locations

- A casual work environment

- A work culture focused on innovative disruption

California Applicants

California Consumer Privacy Act 

Equal Opportunity & Accommodations

CoreWeave is an equal opportunity employer, committed to fostering an inclusive and supportive workplace. All qualified applicants and candidates will receive consideration for employment without regard to race, color, religion, sex, disability, age, sexual orientation, gender identity, national origin, veteran status, or genetic information.

As part of this commitment and consistent with the Americans with Disabilities Act (ADA), CoreWeave will ensure that qualified applicants and candidates with disabilities are provided reasonable accommodations for the hiring process, unless such accommodation would cause an undue hardship. If reasonable accommodation is needed, please contact: careers@coreweave.com.

Export Control Compliance

This position requires access to export controlled information. To conform to U.S. Government export regulations applicable to that information, applicant must either be (A) a U.S. person, defined as a (i) U.S. citizen or national, (ii) U.S. lawful permanent resident (green card holder), (iii) refugee under 8 U.S.C. § 1157, or (iv) asylee under 8 U.S.C. § 1158, (B) eligible to access the export controlled information without a required export authorization, or (C) eligible and reasonably likely to obtain the required export authorization from the applicable U.S. government agency. CoreWeave may, for legitimate business reasons, decline to pursue any export licensing process.
