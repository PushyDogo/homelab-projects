ROADMAP.stages.push({
  id: "stage-5",
  n: 5,
  level: "Advanced",
  title: "Under the hood",
  tag: "GPU-Programming",
  index: "014-GPU Programming",
  blurb: "The layer most engineers never open: profiling, PyTorch internals, CUDA programming, writing and optimising GPU kernels, compilers, and multi-GPU systems.",
  outcome: "you can profile a model to find the real bottleneck, write a custom GPU kernel that beats the naive version, wire it into PyTorch, and read an inference engine's source with understanding.",
  modules: [
    {
      id: "d-profile",
      track: "internals",
      title: "Profiling: find the bottleneck before touching it",
      h: [10, 14],
      summary: "Measure where time and memory go in a PyTorch program across CPU, GPU and the boundary between them.",
      needs: ["r-gpu", "f-pytorch"],
      topics: [
        "Asynchronous GPU execution: why naive timing lies, `torch.cuda.synchronize`, CUDA events",
        "The three costs: compute, memory bandwidth, overhead (Python, dispatch, kernel launch)",
        "PyTorch profiler: operator view, CUDA time, memory, stack traces, traces in Perfetto",
        "System view: `nvidia-smi dmon`, `nvtop`, `py-spy`, `perf`",
        "Nsight Systems for timelines: kernel launches, memcpy, idle gaps",
        "Data-loading and host-side bottlenecks; GPU starvation",
        "Memory profiling: allocator behaviour, fragmentation, peak vs steady state",
        "A method: hypothesis, measurement, one change, re-measure"
      ],
      questions: [
        "Why does wrapping a GPU call in `time.time()` give the wrong answer?",
        "How would you tell from a profile whether a model is compute-bound, bandwidth-bound or overhead-bound?",
        "GPU utilisation oscillates between 0% and 100%. What are the likely causes?",
        "Why is `torch.cuda.memory_reserved` larger than `memory_allocated`, and when does that matter?",
        "For a small model, why can a larger batch give almost free throughput?"
      ],
      exercises: [
        { t: "Profile your GPT", env: "pc", d: "Profile training and generation of your Stage 1 model. Produce a table of the top operators by CUDA time and a trace. Name the bottleneck in each mode." },
        { t: "Fix what you find", env: "pc", d: "Make three measured optimisations from the profile (for example data loading, fused attention, compile, precision). Record the speedup of each on its own." },
        { t: "Timeline with Nsight", env: "pc", d: "Capture an Nsight Systems trace of the generation loop. Identify kernel launches, host-device copies and idle gaps, and explain one gap." }
      ],
      resources: [
        { t: "PyTorch profiler recipe", u: "https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html", k: "doc" },
        { t: "PyTorch performance tuning guide", u: "https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html", k: "doc" },
        { t: "Nsight Systems", u: "https://developer.nvidia.com/nsight-systems", k: "tool" },
        { t: "Making Deep Learning Go Brrrr From First Principles", u: "https://horace.io/brrr_intro.html", k: "article", n: "Re-read it now; it will land differently" }
      ],
      notes: ["Profiling PyTorch on GPU", "Compute vs bandwidth vs overhead"]
    },
    {
      id: "d-torch",
      track: "internals",
      title: "PyTorch internals",
      h: [14, 20],
      summary: "What happens between a line of Python and a GPU kernel: tensors and storage, the dispatcher, the autograd engine, the CUDA allocator and the compiler stack.",
      needs: ["d-profile"],
      topics: [
        "Tensor, storage, strides and views at the C++ level",
        "The dispatcher: dispatch keys, how one `add` becomes CPU, CUDA or autograd code",
        "Autograd engine: graph nodes, `grad_fn`, how backward functions are generated",
        "Operator definitions (`native_functions.yaml`) and where kernels live in the source tree",
        "The CUDA caching allocator and stream semantics",
        "`torch.compile`: TorchDynamo graph capture, guards, recompilation, backends, Inductor code generation",
        "`torch.export` and ahead-of-time graphs",
        "Channels-last, non-blocking transfers and other details that show up in profiles"
      ],
      questions: [
        "Follow `torch.add(a, b)` on two CUDA tensors that require grad from Python to the kernel. Which layers does it pass through?",
        "What is a guard in `torch.compile`, and what causes a recompilation?",
        "Why does the allocator keep memory that `nvidia-smi` shows as used after you delete a tensor?",
        "How does autograd know the derivative of an operator?",
        "What does Inductor generate for a GPU, and why does that matter for custom kernels?"
      ],
      exercises: [
        { t: "Read the path of one operator", env: "any", d: "Pick one operator (softmax or layer norm). Find its declaration, its derivative formula and its CUDA implementation in the PyTorch source. Write the tour up as a vault note with file paths." },
        { t: "Custom autograd function", env: "pc", d: "Implement a `torch.autograd.Function` with a hand-written backward for an operation of your choice, and verify it with `gradcheck`." },
        { t: "Inspect the compiler", env: "pc", d: "Run `torch.compile` on your GPT with logging enabled. Find the guards, trigger a recompile deliberately, and read a piece of the generated code." }
      ],
      resources: [
        { t: "PyTorch internals (Edward Yang)", u: "https://blog.ezyang.com/2019/05/pytorch-internals/", k: "article", n: "Older but still the best map of the codebase" },
        { t: "Let's talk about the PyTorch dispatcher", u: "https://blog.ezyang.com/2020/09/lets-talk-about-the-pytorch-dispatcher/", k: "article" },
        { t: "torch.compile tutorial", u: "https://docs.pytorch.org/tutorials/intermediate/torch_compile_tutorial.html", k: "doc" },
        { t: "CUDA semantics", u: "https://docs.pytorch.org/docs/stable/notes/cuda.html", k: "doc" },
        { t: "Deep Learning Systems (CMU)", u: "https://dlsyscourse.org/", k: "course", n: "Build a small framework yourself; excellent if you want the deep version" }
      ],
      notes: ["PyTorch dispatcher", "Autograd engine", "torch.compile internals", "CUDA caching allocator"]
    },
    {
      id: "d-cuda1",
      track: "internals",
      title: "CUDA programming I: the model and first kernels",
      h: [20, 30],
      summary: "Write C++ that runs on the GPU: kernels, threads, blocks and grids, the memory spaces, and the classic parallel patterns.",
      needs: ["d-profile"],
      why: "This is the 'modify kernels' goal. Start here even if you later write most kernels in Triton: the execution model is the same.",
      topics: [
        "Enough C++ to proceed: pointers, memory management, compiling and linking with `nvcc` and CMake",
        "Host and device; kernels; the launch syntax",
        "Threads, blocks, grids; indexing; choosing block size",
        "Memory spaces: global, shared, registers; `cudaMalloc`, `cudaMemcpy`, unified memory",
        "Hardware underneath: streaming multiprocessors, warps, SIMT, occupancy",
        "Patterns: map, stencil, reduction, prefix sum, histogram",
        "Matrix multiplication, naive to tiled",
        "Synchronisation and races: atomics, `__syncthreads`",
        "Error checking and debugging on the device"
      ],
      questions: [
        "Explain the thread, block and grid hierarchy, and how a thread computes its global index.",
        "What is a warp, and why does branch divergence within one cost performance?",
        "Why is a naive parallel sum wrong, and how does a tree reduction fix it?",
        "What limits the number of threads that can be resident on a streaming multiprocessor?",
        "When does copying data to the GPU cost more than the computation saves?"
      ],
      exercises: [
        { t: "First kernels", env: "pc", d: "Install the CUDA toolkit. Write and benchmark against a CPU baseline: vector add, SAXPY, RGB-to-greyscale, and a 2D stencil. Vary block size and explain the effect." },
        { t: "Matrix multiply, three ways", env: "pc", d: "Naive kernel, tiled kernel with shared memory, and cuBLAS. Measure GFLOP/s for each on several sizes and explain the gaps." },
        { t: "Reduction and softmax", env: "pc", d: "Implement a correct parallel reduction, then a row-wise softmax kernel. Validate both against PyTorch." }
      ],
      resources: [
        { t: "Programming Massively Parallel Processors (4th ed.)", u: "https://shop.elsevier.com/books/programming-massively-parallel-processors/hwu/978-0-323-91231-0", k: "book", n: "The standard text; chapters 1–6 for this module" },
        { t: "GPU MODE lectures", u: "https://github.com/gpu-mode/lectures", k: "course", n: "Community lecture series that follows PMPP and goes beyond it" },
        { t: "CUDA Programming Guide", u: "https://docs.nvidia.com/cuda/cuda-programming-guide/", k: "doc" },
        { t: "CUDA samples", u: "https://github.com/NVIDIA/cuda-samples", k: "code" },
        { t: "An Even Easier Introduction to CUDA", u: "https://developer.nvidia.com/blog/even-easier-introduction-cuda/", k: "article", n: "A gentle first hour" }
      ],
      notes: ["CUDA execution model", "Warps and SIMT", "CUDA memory spaces", "Parallel reduction"]
    },
    {
      id: "d-cuda2",
      track: "internals",
      title: "CUDA programming II: making kernels fast",
      h: [20, 30],
      summary: "Performance engineering on the GPU: memory access patterns, occupancy, tiling, mixed precision and tensor cores, and profiling at the kernel level.",
      needs: ["d-cuda1"],
      topics: [
        "Memory coalescing and structure-of-arrays layouts",
        "Shared-memory tiling and bank conflicts",
        "Occupancy, register pressure and launch configuration",
        "Avoiding divergence; warp-level primitives",
        "Vectorised loads, loop unrolling, fused multiply-add",
        "Half precision and tensor cores; what cuBLAS and cuDNN do that you do not",
        "Streams, asynchronous copies and overlapping transfer with compute",
        "Kernel-level profiling with Nsight Compute: roofline thinking, memory vs compute bound",
        "Kernel fusion: why one fused kernel beats three simple ones",
        "Reading generated assembly (PTX/SASS) when it matters",
        "GEMM as the kernel that dominates inference cost; CUTLASS and the CuTe DSL",
        "Roofline analysis and reproducible microbenchmarks; proving a kernel win survives end to end"
      ],
      questions: [
        "What makes a memory access pattern coalesced, and what does an uncoalesced one cost?",
        "How do you tell from Nsight Compute whether a kernel is limited by memory or by compute?",
        "Why does fusing elementwise operations into one kernel help so much on a bandwidth-bound workload?",
        "What is occupancy, and why is maximum occupancy not always fastest?",
        "Why is hand-written matrix multiplication still far behind cuBLAS after tiling?"
      ],
      exercises: [
        { t: "Optimise one kernel properly", env: "pc", d: "Take your softmax or a layer-norm kernel through at least four measured optimisation steps, profiling with Nsight Compute before each. Keep a log of hypothesis, change and result." },
        { t: "Fused vs unfused", env: "pc", d: "Implement `y = gelu(x * w + b)` as three kernels and as one. Measure both across tensor sizes and explain where the crossover is and why." },
        { t: "Overlap copy and compute", env: "pc", d: "Use streams and pinned memory to process a sequence of batches with transfers overlapping computation. Show the timeline in Nsight Systems." }
      ],
      resources: [
        { t: "Programming Massively Parallel Processors (4th ed.)", u: "https://shop.elsevier.com/books/programming-massively-parallel-processors/hwu/978-0-323-91231-0", k: "book", n: "Performance chapters and the later pattern chapters" },
        { t: "Nsight Compute", u: "https://developer.nvidia.com/nsight-compute", k: "tool" },
        { t: "CUDA C++ Best Practices Guide", u: "https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/", k: "doc" },
        { t: "GPU MODE lectures", u: "https://github.com/gpu-mode/lectures", k: "course", n: "Lectures on profiling, fusing kernels and CUTLASS" },
        { t: "CUTLASS", u: "https://github.com/NVIDIA/cutlass", k: "code", n: "NVIDIA's templates for high-performance GEMM; includes the CuTe DSL" }
      ],
      notes: ["Memory coalescing", "Shared memory tiling", "Kernel fusion", "Profiling with Nsight Compute"]
    },
    {
      id: "d-ops",
      track: "internals",
      title: "Custom operators: C++/CUDA extensions and Triton",
      h: [16, 24],
      summary: "Bring your own kernel into PyTorch, with gradients, two ways: a compiled C++/CUDA extension, and the Triton language that most modern custom kernels are written in.",
      needs: ["d-cuda2", "d-torch"],
      topics: [
        "Registering a custom operator so it works with autograd, `torch.compile` and export",
        "Building a C++/CUDA extension: the build, the binding, the backward",
        "Triton the language (not the inference server): blocks, programs, tiles, masked loads and stores",
        "Autotuning block sizes; how Triton maps to the CUDA concepts you know",
        "Integrating Triton kernels with `torch.library.triton_op`",
        "When to write a kernel at all: check `torch.compile` and existing fused operators first",
        "Numba CUDA and CuPy raw kernels for quick experiments",
        "Testing kernels: numerical correctness, gradient checks, edge shapes, determinism",
        "Other kernel-authoring routes to recognise: Mojo, JAX Pallas, HIP and ROCm on AMD"
      ],
      questions: [
        "What does PyTorch need from you for a custom operator to participate in autograd?",
        "How does a Triton program differ from a CUDA kernel in what you specify and what the compiler decides?",
        "When is a custom kernel justified over `torch.compile`? Give a rule you would apply.",
        "How would you test a kernel for correctness across dtypes and odd shapes?",
        "What breaks when a custom operator is not registered properly and you call `torch.compile`?"
      ],
      exercises: [
        { t: "C++/CUDA extension", env: "pc", d: "Package your optimised kernel as a PyTorch extension with a backward pass. Pass `gradcheck`, use it inside your GPT, and benchmark against the built-in operator." },
        { t: "The same kernel in Triton", env: "pc", d: "Rewrite it in Triton and register it with `triton_op`. Compare lines of code, development time and speed with the CUDA version." },
        { t: "Fused RMSNorm or rotary kernel", env: "pc", d: "Write a Triton kernel for a real LLM building block, fused with the adjacent operation. Show the profile before and after in the full model." }
      ],
      resources: [
        { t: "PyTorch custom operators", u: "https://docs.pytorch.org/tutorials/advanced/custom_ops_landing_page.html", k: "doc" },
        { t: "PyTorch C++/CUDA extension example", u: "https://github.com/pytorch/extension-cpp", k: "code" },
        { t: "Triton language tutorials", u: "https://triton-lang.org/main/getting-started/tutorials/index.html", k: "doc" },
        { t: "Using user-defined Triton kernels with torch.compile", u: "https://docs.pytorch.org/tutorials/recipes/torch_compile_user_defined_triton_kernel_tutorial.html", k: "doc" },
        { t: "Numba CUDA", u: "https://nvidia.github.io/numba-cuda/", k: "doc" }
      ],
      notes: ["PyTorch custom operators", "Triton language", "When to write a custom kernel"]
    },
    {
      id: "d-attention",
      track: "internals",
      title: "Attention kernels and LLM-specific optimisation",
      h: [16, 24],
      summary: "The kernels that make modern inference fast: FlashAttention, paged KV caches, quantized matrix multiplies and speculative decoding, read from the papers and the code.",
      needs: ["d-ops", "r-vllm"],
      topics: [
        "FlashAttention: tiling attention to stay in fast memory, avoiding the full attention matrix, the recomputation trick in the backward pass",
        "FlashAttention 2 and 3: better parallelism and hardware-specific scheduling",
        "Paged KV cache at the kernel level: block tables and gather",
        "Grouped-query and multi-query attention as memory optimisations",
        "Quantized inference kernels: integer and low-bit matmuls, dequantise-on-the-fly",
        "Speculative decoding and draft models; prompt lookup decoding",
        "Sampling and logit processing on the GPU",
        "What the engine does around the kernels: scheduling, batching and memory management",
        "Fused epilogues, mixture-of-experts routing kernels and KV-cache kernels as optimisation targets"
      ],
      questions: [
        "Standard attention materialises a T-by-T matrix. How does FlashAttention avoid that while producing the same result?",
        "Why is FlashAttention faster even though it does the same amount of arithmetic?",
        "How does a paged KV cache change the attention kernel's memory accesses?",
        "Under what conditions does speculative decoding speed up generation, and when does it slow it down?",
        "Why does a 4-bit model not run four times faster than a 16-bit one?"
      ],
      exercises: [
        { t: "Paper and code, side by side", env: "any", d: "Read the FlashAttention paper with the reference implementation open. Write a vault note mapping each idea in the paper to the lines that implement it." },
        { t: "A tiled attention kernel", env: "pc", d: "Write a simplified forward-only FlashAttention-style kernel in Triton. Validate against `scaled_dot_product_attention` and plot memory and time against sequence length for naive vs yours." },
        { t: "Speculative decoding experiment", env: "pc", d: "Enable speculative decoding in an engine with a small draft model. Measure acceptance rate and speedup on two different workloads, and explain the difference." }
      ],
      resources: [
        { t: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness", u: "https://arxiv.org/abs/2205.14135", k: "paper" },
        { t: "flash-attention", u: "https://github.com/Dao-AILab/flash-attention", k: "code" },
        { t: "GPU MODE lectures", u: "https://github.com/gpu-mode/lectures", k: "course", n: "Has sessions on FlashAttention and on Triton internals" },
        { t: "Accelerating Large Language Model Decoding with Speculative Sampling", u: "https://arxiv.org/abs/2302.01318", k: "paper" }
      ],
      notes: ["FlashAttention", "Speculative decoding", "Quantized inference kernels"]
    },
    {
      id: "d-compilers",
      track: "internals",
      title: "Model compilers and runtimes",
      h: [10, 16],
      summary: "How a model graph becomes optimised machine code: export formats, graph optimisation, TensorRT and ONNX Runtime, and the compiler projects underneath.",
      needs: ["d-torch"],
      topics: [
        "From eager code to a graph: tracing, `torch.export`, ONNX",
        "Graph-level optimisations: constant folding, operator fusion, layout and precision selection",
        "TensorRT: building an engine, optimisation profiles for dynamic shapes, precision calibration",
        "ONNX Runtime and execution providers; portability across hardware",
        "Ahead-of-time vs just-in-time compilation, and their operational consequences",
        "The landscape underneath: MLIR, TVM, XLA, IREE at a recognise-the-name level",
        "Compilation outside LLMs: vision, speech and embedding models where it still pays most",
        "Why compiled engines are tied to a GPU model and driver version"
      ],
      questions: [
        "What does a compiler know about a model that eager PyTorch does not, and what can it do with that?",
        "Why must a TensorRT engine be rebuilt for a different GPU?",
        "How are dynamic sequence lengths handled in an ahead-of-time compiled engine?",
        "When would you choose ONNX Runtime over a native PyTorch deployment?",
        "What operational problems does ahead-of-time compilation add to a deployment pipeline?"
      ],
      exercises: [
        { t: "Export and compile an encoder", env: "pc", d: "Export your embedding or reranker model and run it under ONNX Runtime with the CUDA provider and under TensorRT in fp16. Compare latency and throughput with eager PyTorch and with `torch.compile`." },
        { t: "Inspect the graph", env: "pc", d: "Visualise the exported graph before and after optimisation. Identify three fusions the compiler made." },
        { t: "Engine in the pipeline", env: "pc", d: "Add the compile step to your delivery workflow so an engine is rebuilt and cached per GPU type and model revision." }
      ],
      resources: [
        { t: "torch.export", u: "https://docs.pytorch.org/docs/stable/export.html", k: "doc" },
        { t: "TensorRT documentation", u: "https://docs.nvidia.com/deeplearning/tensorrt/latest/index.html", k: "doc" },
        { t: "ONNX Runtime", u: "https://onnxruntime.ai/docs/", k: "doc" },
        { t: "Machine Learning Compilation (MLC)", u: "https://mlc.ai/", k: "course", n: "Optional depth on how tensor compilers work" }
      ],
      notes: ["Model export and graph optimisation", "TensorRT engines", "AOT vs JIT compilation"]
    },
    {
      id: "d-distributed",
      track: "internals",
      title: "Multi-GPU and distributed systems",
      h: [12, 18],
      summary: "What changes beyond one GPU: data and tensor parallelism, distributed training, the communication libraries and networks underneath, and how large models are served across devices.",
      needs: ["d-profile", "p-batch"],
      topics: [
        "Data parallel training with DistributedDataParallel: processes, gradient synchronisation, samplers",
        "Sharded training with FSDP; DeepSpeed and ZeRO stages at a conceptual level",
        "NCCL and collective operations; all-reduce",
        "Interconnects: PCIe, NVLink, InfiniBand and RoCE, RDMA, and why network topology shows up in training speed",
        "Scaling efficiency: measuring it, and common causes of poor scaling",
        "Inference across GPUs: tensor parallelism, pipeline parallelism, and their latency costs",
        "Checkpointing and fault tolerance in long jobs",
        "Launchers and orchestration: torchrun, Ray Train, Kubeflow Trainer, Slurm"
      ],
      questions: [
        "In DDP, what is synchronised between GPUs and when?",
        "What does FSDP shard, and what does it trade for the memory saved?",
        "Two GPUs give 1.5x rather than 2x throughput. List the possible reasons and how to check each.",
        "For serving, when does splitting one model across two GPUs help, and when is two replicas better?",
        "Why does a slow network hurt training more than replicated inference?"
      ],
      exercises: [
        { t: "DDP on rented GPUs", env: "cloud", d: "For an hour on a multi-GPU spot instance, run your GPT training with DDP on 1, 2 and 4 GPUs. Measure scaling efficiency and profile the synchronisation cost. Budget and tear-down plan written before you start." },
        { t: "Distributed job on Kubernetes", env: "cloud", d: "Run the same job as a multi-pod training job through Kubeflow Trainer or Ray Train with checkpointing. Kill a worker and observe recovery." },
        { t: "Tensor-parallel serving", env: "cloud", d: "Serve one model with tensor parallelism across two GPUs and as two independent replicas. Compare latency and throughput and say when each wins." }
      ],
      resources: [
        { t: "PyTorch: distributed data parallel series", u: "https://docs.pytorch.org/tutorials/beginner/ddp_series_intro.html", k: "doc" },
        { t: "PyTorch: getting started with FSDP2", u: "https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html", k: "doc" },
        { t: "Ray Train", u: "https://docs.ray.io/en/latest/train/train.html", k: "doc" },
        { t: "NCCL", u: "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/index.html", k: "doc" }
      ],
      notes: ["Distributed training: DDP and FSDP", "GPU interconnects and RDMA", "Tensor parallel inference"]
    },
    {
      id: "d-scale",
      track: "internals",
      title: "Distributed inference at scale",
      h: [14, 22],
      summary: "Serving one very large model across many GPUs and nodes: disaggregated prefill and decode, KV-cache transfer, parallelism strategies and building your own speculator.",
      why: "The most senior inference postings ask for exactly this: a disaggregated prefill-decode stack, distributed KV transfer, tensor, pipeline and expert parallelism, and speculative decoding you trained yourself.",
      needs: ["d-attention", "d-distributed", "p-route"],
      topics: [
        "Why disaggregate: prefill and decode want different batching, hardware and scaling",
        "KV-cache transfer between workers; distributed KV stores and tiered caches",
        "KV-cache internals: block tables, copy-on-write, prefix sharing, fragmentation",
        "Tensor, pipeline and expert parallelism, and how each interacts with the scheduler",
        "Mixture-of-experts models: routing, uneven expert load, serving implications",
        "Long-context serving: memory growth, chunked prefill, cache offload",
        "Cross-node routing with cache awareness (Dynamo, llm-d)",
        "Speculative decoding in depth: draft models, EAGLE-style heads, distillation, acceptance rate on a real distribution",
        "Multi-tenant co-location and isolation at this scale",
        "Owning an inference SLO on call: what pages you and what you do first"
      ],
      questions: [
        "What does disaggregating prefill and decode cost, and under what traffic does it pay off?",
        "How does copy-on-write in the KV cache make prefix sharing safe?",
        "Why does expert parallelism create load imbalance, and how do engines handle it?",
        "What determines the acceptance rate in speculative decoding, and why must it be measured on your traffic?",
        "A 128k-token request arrives. Which parts of the stack are stressed and what protects the other tenants?"
      ],
      exercises: [
        { t: "Paper to code", env: "any", d: "Read a disaggregated-serving paper and then the corresponding code path in Dynamo or llm-d. Write a vault note tracing a request through prefill worker, KV transfer and decode worker." },
        { t: "Disaggregation in miniature", env: "cloud", d: "On two GPUs for an hour (or two processes sharing the 4070 with a small model), run a disaggregated prefill and decode setup. Compare tail time-to-first-token with an aggregated setup under mixed long and short prompts." },
        { t: "Train a speculator", env: "pc", d: "Distil a draft model or train a lightweight speculation head for a small target model. Measure acceptance rate and end-to-end speedup on two different workloads." }
      ],
      resources: [
        { t: "DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving", u: "https://arxiv.org/abs/2401.09670", k: "paper" },
        { t: "NVIDIA Dynamo documentation", u: "https://github.com/ai-dynamo/dynamo/tree/main/docs", k: "doc" },
        { t: "Mooncake", u: "https://github.com/kvcache-ai/Mooncake", k: "code", n: "Distributed KV-cache transfer" },
        { t: "EAGLE", u: "https://github.com/SafeAILab/EAGLE", k: "code", n: "Speculative decoding with a trained head" },
        { t: "llm-d", u: "https://llm-d.ai/", k: "doc" }
      ],
      notes: ["Disaggregated prefill and decode", "KV cache internals", "Expert parallelism", "Training a speculator"]
    },
    {
      id: "d-source",
      track: "internals",
      title: "Reading and changing an inference engine",
      h: [16, 26],
      summary: "Read a production engine's source end to end for one request, then make a real change: a fix, a metric, a sampler or a kernel, and take it upstream if it holds up.",
      needs: ["d-attention"],
      topics: [
        "A method for reading large codebases: follow one request, draw the call graph, ignore the rest",
        "vLLM internals: request lifecycle, scheduler, KV block manager, model executor, sampler",
        "llama.cpp internals: the compute graph, backends, the sampler chain, the server loop",
        "Where kernels live in each project and how they are selected",
        "Building from source, running the tests, benchmarking a change properly",
        "Contributing: finding a first issue, writing a reproducible report, review etiquette",
        "Modifying core paths: the scheduler, the KV allocator, a forked runtime kept in step with upstream"
      ],
      questions: [
        "Trace one chat completion through vLLM from HTTP handler to token stream. Which components does it touch?",
        "Where does the scheduler decide which requests join the next batch, and on what basis?",
        "How is the KV block table laid out and updated as a sequence grows?",
        "What evidence does a performance pull request need to be credible?"
      ],
      exercises: [
        { t: "Request trace write-up", env: "pc", d: "Build vLLM from source. With a debugger or logging, trace one request and document the path with file and function names in the vault." },
        { t: "Make a change", env: "pc", d: "Add something small but real: a new metric, a logit processor, a scheduling tweak or a kernel swap. Benchmark before and after with your Stage 3 harness." },
        { t: "Go upstream", env: "any", d: "Fix a documentation gap or a small issue in vLLM, llama.cpp or a related project and open a pull request. A merged contribution to an inference engine is strong evidence for the roles this roadmap targets." }
      ],
      resources: [
        { t: "vLLM source", u: "https://github.com/vllm-project/vllm", k: "code" },
        { t: "vLLM: architecture overview", u: "https://docs.vllm.ai/en/latest/design/arch_overview.html", k: "doc" },
        { t: "vLLM: contributing", u: "https://docs.vllm.ai/en/latest/contributing/index.html", k: "doc" },
        { t: "llama.cpp source", u: "https://github.com/ggml-org/llama.cpp", k: "code" }
      ],
      notes: ["vLLM request lifecycle", "vLLM scheduler and block manager", "Contributing to an inference engine"]
    }
  ]
});
