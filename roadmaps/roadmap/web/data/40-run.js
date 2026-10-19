ROADMAP.stages.push({
  id: "stage-3",
  n: 3,
  level: "Intermediate",
  title: "Running models",
  tag: "Inference",
  index: "012-Inference",
  blurb: "The operations side on a single machine: GPUs, the maths of inference performance, engines, quantization, fine-tuning and benchmarking.",
  outcome: "given a model, a GPU and a latency target, you can predict whether it fits, choose an engine and precision, serve it, and prove the numbers with a load test.",
  modules: [
    {
      id: "r-gpu",
      track: "run",
      title: "GPUs and the software stack under them",
      h: [8, 12],
      summary: "What a GPU is good at and why, the memory that limits you, and the layers between PyTorch and the silicon: driver, CUDA, cuDNN, container runtime.",
      needs: ["f-pytorch", "o-lab"],
      topics: [
        "CPU vs GPU: throughput-oriented design, thousands of simple cores, SIMT execution",
        "VRAM, memory bandwidth and why LLM decoding is usually bandwidth-bound",
        "Tensor cores, supported precisions, and what generation of card supports what",
        "Host-to-device transfer, PCIe, pinned memory",
        "The Linux stack: kernel modules, user-space driver, CUDA runtime, cuBLAS/cuDNN, and version compatibility",
        "Reading `nvidia-smi` and `nvidia-smi dmon`: utilisation, memory, power, temperature, what 'GPU-Util 100%' does and does not mean",
        "Datacentre vs consumer cards; multi-GPU interconnects; other accelerators (AMD, Apple, TPUs) at a glance",
        "Accelerator economics: price per GPU-hour, tokens per second per dollar"
      ],
      questions: [
        "Why is a GPU faster than a CPU for matrix multiplication but not for branchy code?",
        "What does GPU utilisation in `nvidia-smi` measure, and why can it read 100% on an inefficient workload?",
        "Why is token generation speed for a single request closer to a memory-bandwidth problem than a compute problem?",
        "List the components between `import torch` and the GPU, and which ones live in the container versus on the host.",
        "What does your 4070 SUPER lack compared with a datacentre card, and which of those matter for inference?"
      ],
      exercises: [
        { t: "Know your card", env: "pc", d: "Record the 4070 SUPER's VRAM, memory bandwidth, tensor-core precisions, power limit and PCIe link. Explain what each number constrains." },
        { t: "Watch a workload", env: "pc", d: "Run your GPT training and a generation loop while logging `nvidia-smi dmon`. Explain the difference in utilisation, memory and power between the two." },
        { t: "Break and fix the stack", env: "pc", d: "In a container, deliberately run a CUDA build that mismatches the driver capability and read the error. Document the compatibility rule you learn." }
      ],
      resources: [
        { t: "Making Deep Learning Go Brrrr From First Principles", u: "https://horace.io/brrr_intro.html", k: "article", n: "Compute, memory bandwidth and overhead: the mental model for the whole stage" },
        { t: "CUDA compatibility", u: "https://docs.nvidia.com/deploy/cuda-compatibility/", k: "doc" },
        { t: "nvidia-smi documentation", u: "https://docs.nvidia.com/deploy/nvidia-smi/index.html", k: "doc" },
        { t: "GPU performance background (NVIDIA)", u: "https://docs.nvidia.com/deeplearning/performance/dl-performance-gpu-background/index.html", k: "doc" }
      ],
      notes: ["GPU architecture basics", "NVIDIA software stack", "Reading nvidia-smi"]
    },
    {
      id: "r-math",
      track: "run",
      title: "The performance model of LLM inference",
      h: [8, 12],
      summary: "The metrics, the memory arithmetic and the batching behaviour that let you predict capacity before buying or renting anything.",
      needs: ["f-generation", "r-gpu"],
      why: "Capacity planning questions ('will it fit, how many users, what will it cost') are answered with this arithmetic.",
      topics: [
        "Metrics: time to first token, inter-token latency, end-to-end latency, tokens per second, requests per second, goodput against an SLO",
        "Memory budget: weights at a given precision, KV cache per token, activation overhead",
        "Prefill is compute-bound and parallel; decode is sequential and bandwidth-bound",
        "Static, dynamic and continuous batching; why throughput rises with concurrency until latency breaks",
        "The latency-throughput curve and where to operate on it",
        "Prefix caching and why shared prompts are cheap",
        "Sizing: from workload shape (input and output lengths, concurrency) to GPUs needed",
        "Cost per million tokens for self-hosting vs an API, and the utilisation that makes self-hosting break even"
      ],
      questions: [
        "Will an 8B model at 4-bit with a 16k context for four concurrent users fit in 12 GB? Show the arithmetic.",
        "Why does continuous batching improve throughput so much over handling one request at a time?",
        "Why can average latency look fine while p99 time-to-first-token is terrible?",
        "At what utilisation does a rented GPU beat a hosted API on cost per token for a given model? What assumptions drive the answer?",
        "How do long prompts and long outputs stress the system differently?"
      ],
      exercises: [
        { t: "Sizing calculator", env: "any", d: "Write a small script or notebook: given model config, precision, context length and concurrency, output the memory budget. Validate it against measured numbers in the next modules and fix it until it is within 10%." },
        { t: "Break-even analysis", env: "any", d: "For one open-weight model, compare self-hosting on a rented GPU with a hosted API at 5%, 30% and 80% utilisation. State every assumption." }
      ],
      resources: [
        { t: "LLM Inference Handbook", u: "https://bentoml.com/llm/", k: "book", n: "Free, practical, covers metrics through to deployment patterns" },
        { t: "LLM inference performance engineering: best practices", u: "https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices", k: "article" },
        { t: "Transformer Inference Arithmetic", u: "https://kipp.ly/transformer-inference-arithmetic/", k: "article" },
        { t: "A guide to LLM inference and performance", u: "https://www.baseten.co/blog/llm-transformer-inference-guide/", k: "article" }
      ],
      notes: ["Inference metrics", "KV cache memory arithmetic", "Continuous batching", "Self-hosting break-even"]
    },
    {
      id: "r-local",
      track: "run",
      title: "Local inference: llama.cpp, GGUF and Ollama",
      h: [10, 14],
      summary: "The CPU-and-single-GPU end of serving. Run quantized models on the PC and on the phones, and learn what the convenient tools hide.",
      needs: ["r-math"],
      topics: [
        "llama.cpp architecture: GGML tensors, backends (CPU, CUDA, Vulkan, Metal), partial GPU offload",
        "The GGUF format: metadata, tokenizer, chat template, tensors in one file",
        "Quantization names in practice: Q4_K_M, Q5, Q8, imatrix quants",
        "Server mode: OpenAI-compatible endpoints, slots, parallel requests, context per slot",
        "Ollama as a packaging layer over llama.cpp: Modelfiles, the registry, defaults that surprise you",
        "CPU inference on ARM: threads, big.LITTLE cores, memory mapping, thermal throttling",
        "Where this stack stops being the right tool",
        "On-device runtimes for phone-class hardware (ExecuTorch, LiteRT, vendor NPU stacks) at a know-what-exists level"
      ],
      questions: [
        "What is inside a GGUF file, and why is a single file convenient for deployment?",
        "What does `-ngl` (GPU layers) control, and what happens to speed when only half the layers fit?",
        "Why can running more threads than performance cores make CPU inference slower on a phone?",
        "What are two Ollama defaults you should check before trusting a benchmark?",
        "Why is llama.cpp a poor choice for serving 50 concurrent users, mechanically?"
      ],
      exercises: [
        { t: "llama.cpp on the 4070", env: "pc", d: "Build llama.cpp with CUDA. Run the same model at Q4, Q6 and Q8 with full and partial offload. Record tokens per second and VRAM for each." },
        { t: "A model on a phone", env: "lab", d: "Deploy `llama-server` on k3s with a model around 1B parameters at 4-bit, pinned to one phone with resource limits. Measure prompt and generation speed and temperature under load. Tune threads to the performance cores." },
        { t: "Convert and quantize", env: "pc", d: "Take a safetensors model from the Hub, convert it to GGUF and quantize it yourself. Compare your file with a published quant." }
      ],
      resources: [
        { t: "llama.cpp", u: "https://github.com/ggml-org/llama.cpp", k: "code", n: "Read the server README and the build docs" },
        { t: "GGUF format", u: "https://github.com/ggml-org/ggml/blob/master/docs/gguf.md", k: "doc" },
        { t: "Ollama documentation", u: "https://docs.ollama.com/", k: "doc" },
        { t: "Hugging Face: GGUF on the Hub", u: "https://huggingface.co/docs/hub/gguf", k: "doc" }
      ],
      notes: ["llama.cpp", "GGUF format", "CPU inference on ARM"]
    },
    {
      id: "r-quant",
      track: "run",
      title: "Quantization and model compression",
      h: [12, 16],
      summary: "How fewer bits per weight works, what it costs in quality, and how to measure that cost instead of assuming it.",
      needs: ["r-local"],
      topics: [
        "Number formats: fp32, fp16, bf16, int8, int4; scale and zero-point",
        "Post-training quantization vs quantization-aware training",
        "Weight-only vs weight-and-activation quantization; calibration data",
        "Methods and formats you will meet: GPTQ, AWQ, bitsandbytes, GGUF k-quants, FP8",
        "Per-channel and group-wise schemes; outliers and why some layers are sensitive",
        "KV-cache quantization",
        "Pruning and distillation as alternatives",
        "Measuring the damage: perplexity, task evals, and why your own eval set is the real test",
        "Which formats each engine can serve, and at what speed"
      ],
      questions: [
        "Quantize the vector [0.1, -0.7, 1.2, 0.05] to 4-bit signed integers by hand and compute the reconstruction error.",
        "Why does 4-bit quantization usually cost little quality while 2-bit costs a lot?",
        "What is calibration data for, and what happens if it does not resemble your workload?",
        "When does quantization make inference faster, and when does it only save memory?",
        "A bigger model at 4-bit or a smaller model at 16-bit in the same VRAM: how would you decide?"
      ],
      exercises: [
        { t: "Quantize by hand", env: "pc", d: "Implement symmetric and asymmetric linear quantization for a weight tensor in PyTorch, per-tensor and per-channel. Plot error against bit width." },
        { t: "Quality vs bits", env: "pc", d: "For one model, produce fp16, 8-bit and 4-bit variants with two different methods. Run your Stage 2 eval suite on each and chart quality, VRAM and tokens per second." },
        { t: "Produce a servable quant", env: "pc", d: "Use llm-compressor to create an AWQ or FP8 checkpoint and confirm it loads in vLLM in the next module." }
      ],
      resources: [
        { t: "A Visual Guide to Quantization", u: "https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization", k: "article" },
        { t: "MIT 6.5940: TinyML and Efficient Deep Learning", u: "https://efficientml.ai/", k: "course", n: "Lectures on quantization, pruning and distillation" },
        { t: "llm-compressor", u: "https://github.com/vllm-project/llm-compressor", k: "code" },
        { t: "Transformers: quantization overview", u: "https://huggingface.co/docs/transformers/quantization/overview", k: "doc" }
      ],
      notes: ["Quantization fundamentals", "GPTQ vs AWQ vs k-quants", "Measuring quantization loss"]
    },
    {
      id: "r-vllm",
      track: "run",
      title: "vLLM in depth",
      h: [16, 24],
      summary: "The default production engine. Understand PagedAttention and continuous batching, then learn the configuration surface well enough to tune it for a workload.",
      needs: ["r-math", "r-quant"],
      why: "vLLM is the engine named most often in infrastructure postings. Knowing why its flags exist is the difference between running it and operating it.",
      topics: [
        "Architecture: API server, engine core, scheduler, workers",
        "PagedAttention: KV cache as paged blocks, why it removes fragmentation",
        "Continuous batching and the scheduler; chunked prefill",
        "Memory flags: `--gpu-memory-utilization`, `--max-model-len`, `--max-num-seqs`",
        "Automatic prefix caching",
        "Structured output backends and tool-call parsers; chat templates",
        "Serving LoRA adapters; multiple models; quantized checkpoints",
        "Tensor parallelism across GPUs and when it helps",
        "Speculative decoding",
        "The `/metrics` endpoint: queue time, TTFT, running and waiting requests, cache usage",
        "Startup time and model loading"
      ],
      questions: [
        "Explain PagedAttention using an operating-system analogy, and say what problem it solves.",
        "What does `--gpu-memory-utilization 0.9` reserve, and why does vLLM appear to use all VRAM even when idle?",
        "A request with a 30k-token prompt arrives while ten short chats are decoding. What does chunked prefill change?",
        "Which three vLLM metrics would you alert on, and what does each tell you?",
        "When does prefix caching help, and how should clients structure prompts to benefit?"
      ],
      exercises: [
        { t: "Serve and probe", env: "pc", d: "Run vLLM in a container on the 4070 with a model that fits. Hit it with your Stage 2 client. Scrape `/metrics` and identify every gauge that changes under load." },
        { t: "Tune for two workloads", env: "pc", d: "Configure once for a chat workload (short in, short out, many users) and once for a document workload (long in, short out). Justify each flag and show the measured difference." },
        { t: "Features tour", env: "pc", d: "Demonstrate, with measurements where they apply: prefix caching hit, guided JSON output, a tool call through the OpenAI API, and a LoRA adapter served alongside the base model." }
      ],
      resources: [
        { t: "vLLM documentation", u: "https://docs.vllm.ai/en/latest/", k: "doc" },
        { t: "Efficient Memory Management for LLM Serving with PagedAttention", u: "https://arxiv.org/abs/2309.06180", k: "paper" },
        { t: "vLLM source", u: "https://github.com/vllm-project/vllm", k: "code", n: "Skim the engine and scheduler now; Stage 5 reads it properly" },
        { t: "vLLM: optimisation and tuning", u: "https://docs.vllm.ai/en/latest/configuration/optimization.html", k: "doc" }
      ],
      notes: ["PagedAttention", "vLLM configuration", "vLLM metrics", "Prefix caching"]
    },
    {
      id: "r-bench",
      track: "run",
      title: "Benchmarking and load testing",
      h: [10, 14],
      summary: "Measure inference like an engineer: realistic workloads, open-loop load, percentile latencies, and conclusions that survive scrutiny.",
      needs: ["r-vllm"],
      topics: [
        "Workload modelling: input and output length distributions, arrival rate, concurrency",
        "Closed-loop vs open-loop load and why closed-loop hides queueing",
        "Latency percentiles, warm-up, run length, repeatability",
        "Throughput-latency curves and finding the knee",
        "Goodput: requests per second that meet the SLO",
        "Tools: GuideLLM, vLLM's benchmark scripts, `genai-perf`, k6 or Locust for the app layer",
        "Common mistakes: benchmarking with one prompt, ignoring output length, comparing different sampling settings",
        "Turning results into an SLO and a capacity number",
        "MLPerf Inference: scenarios, rules, and what an audited benchmark requires",
        "Cost per token as a first-class metric alongside latency"
      ],
      questions: [
        "Why does a closed-loop benchmark with fixed concurrency understate tail latency under real traffic?",
        "What is goodput, and why is it a better headline than tokens per second?",
        "Two engines are compared with different max output tokens. Why is the comparison invalid?",
        "From a throughput-latency curve, how do you decide the maximum safe load per replica?",
        "What would make you distrust a published benchmark?"
      ],
      exercises: [
        { t: "Benchmark harness", env: "pc", d: "Use GuideLLM or your own async script to sweep request rate against your vLLM server with a realistic prompt mix. Produce TTFT, inter-token latency and throughput at p50, p95, p99." },
        { t: "Find the knee", env: "pc", d: "Plot throughput against p95 latency, mark the point where a chosen SLO is breached, and state the capacity of one 4070 for that workload." },
        { t: "llama.cpp vs vLLM, fairly", env: "pc", d: "Same model family and precision as close as the formats allow, same prompts, same output cap, concurrency 1 through 32. Explain the shape of both curves." }
      ],
      resources: [
        { t: "GuideLLM", u: "https://github.com/vllm-project/guidellm", k: "tool" },
        { t: "vLLM benchmark suites", u: "https://docs.vllm.ai/en/latest/benchmarking/cli.html", k: "doc" },
        { t: "LLM Inference Handbook: performance benchmarks", u: "https://bentoml.com/llm/inference-optimization/llm-performance-benchmarks", k: "article" },
        { t: "How NOT to Measure Latency (Gil Tene)", u: "https://www.youtube.com/watch?v=lJ8ydIuPFeU", k: "video", n: "Coordinated omission; applies directly" },
        { t: "MLPerf Inference: Datacenter", u: "https://mlcommons.org/benchmarks/inference-datacenter/", k: "doc" }
      ],
      notes: ["Benchmarking LLM inference", "Open vs closed loop load", "Goodput and SLOs"]
    },
    {
      id: "r-engines",
      track: "run",
      title: "The engine landscape and how to choose",
      h: [10, 14],
      summary: "SGLang, TensorRT-LLM, Triton and Dynamo, and the specialised servers for embeddings and speech: what each is built for and how to pick without believing vendor charts.",
      needs: ["r-bench"],
      topics: [
        "SGLang: RadixAttention prefix reuse, structured output, fit for agent workloads",
        "TensorRT-LLM: ahead-of-time compiled engines, peak NVIDIA performance, operational cost",
        "Triton Inference Server: multi-framework serving, model repository, dynamic batching, ensembles",
        "NVIDIA Dynamo: distributed serving, disaggregated prefill and decode, KV-aware routing",
        "Text Generation Inference in maintenance mode and what replaced it",
        "Embedding and reranker servers (Text Embeddings Inference, Infinity); speech (faster-whisper)",
        "Non-NVIDIA paths: MLX on Apple silicon, ROCm, ONNX Runtime",
        "A decision procedure: workload shape, hardware, team capacity, features needed"
      ],
      questions: [
        "For an agent workload with long shared system prompts and heavy tool use, which engine property matters most and why?",
        "What does ahead-of-time engine compilation buy in TensorRT-LLM, and what does it cost operationally?",
        "When is Triton the right serving layer even though vLLM is faster for LLMs?",
        "What is disaggregated prefill and decode, and what kind of deployment benefits?",
        "Write your decision rules for choosing an engine in five lines."
      ],
      exercises: [
        { t: "SGLang against vLLM", env: "pc", d: "Serve the same model with SGLang and rerun your benchmark, including a workload with a long shared prefix. Report where each wins and by how much." },
        { t: "Serve the retrieval models", env: "pc", d: "Run an embedding model and a reranker under a dedicated server. Measure throughput at several batch sizes and swap them into the vault assistant." },
        { t: "Decision record", env: "any", d: "Write an architecture decision record choosing an engine for a described workload, with your own measurements as evidence." }
      ],
      resources: [
        { t: "SGLang documentation", u: "https://docs.sglang.ai/", k: "doc" },
        { t: "TensorRT-LLM", u: "https://github.com/NVIDIA/TensorRT-LLM", k: "code" },
        { t: "NVIDIA Dynamo", u: "https://github.com/ai-dynamo/dynamo", k: "code" },
        { t: "Triton Inference Server", u: "https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/index.html", k: "doc" },
        { t: "Text Embeddings Inference", u: "https://github.com/huggingface/text-embeddings-inference", k: "code" }
      ],
      notes: ["Inference engine comparison", "SGLang RadixAttention", "Triton Inference Server"]
    },
    {
      id: "r-multimodal",
      track: "run",
      title: "Speech, vision and real-time voice",
      h: [12, 18],
      summary: "Serving models that are not text chat: speech recognition, text-to-speech, vision-language models and embeddings on shared hardware, and the latency budget of a voice agent.",
      why: "Several postings ask for multi-model serving across text, voice, code and vision, and voice agents over telephony are a large share of agent work in India.",
      needs: ["r-engines"],
      topics: [
        "Model types and their serving shapes: ASR, TTS, vision-language, embeddings, rerankers",
        "Streaming audio in and out; chunking, endpointing and voice activity detection",
        "The voice-agent pipeline: speech to text, LLM, text to speech; cascaded vs speech-to-speech models",
        "A latency budget for conversation: where the first 800 ms goes",
        "Interruptions, turn-taking, and telephony integration (SIP, WebRTC)",
        "Serving vision-language models: image tokens, preprocessing cost, batching",
        "Co-locating several models on one GPU: memory planning, contention, priorities",
        "Multilingual and Indic workloads: tokenisation cost, model choice, evaluation",
        "On-device and edge inference: what changes on a phone-class CPU or NPU"
      ],
      questions: [
        "Break down the response latency of a cascaded voice agent and say which stage you would attack first.",
        "Why are ASR and TTS served differently from a chat LLM?",
        "How much VRAM do an ASR model, a 4B chat model and a TTS model need together on your card, and what happens under concurrent load?",
        "What does an image cost in tokens for a vision-language model, and what controls it?",
        "How do you evaluate a speech system in a language where benchmarks are thin?"
      ],
      exercises: [
        { t: "Three models, one GPU", env: "pc", d: "Serve an ASR model, a small chat model and a TTS model together on the 4070. Document the memory plan and measure each model's latency alone and under combined load." },
        { t: "Local voice agent", env: "pc", d: "Build a streaming voice loop with an open framework: microphone to ASR to LLM to TTS, with interruption handling. Instrument every stage and publish the latency breakdown." },
        { t: "Vision-language serving", env: "pc", d: "Serve a small vision-language model with vLLM and use it for page-image extraction from the documents module. Compare accuracy and cost with the OCR route." },
        { t: "Speech on a phone", env: "lab", d: "Run a small ASR model on one of the k3s phones on CPU. Report the real-time factor and what it would take to make it usable." }
      ],
      resources: [
        { t: "Hugging Face audio course", u: "https://huggingface.co/learn/audio-course/chapter0/introduction", k: "course" },
        { t: "faster-whisper", u: "https://github.com/SYSTRAN/faster-whisper", k: "code" },
        { t: "Pipecat", u: "https://docs.pipecat.ai/", k: "doc", n: "Open framework for real-time voice agents" },
        { t: "LiveKit Agents", u: "https://docs.livekit.io/agents/", k: "doc" },
        { t: "vLLM: multimodal inputs", u: "https://docs.vllm.ai/en/latest/features/multimodal_inputs.html", k: "doc" }
      ],
      notes: ["Voice agent latency budget", "Serving ASR and TTS", "Multi-model GPU co-location"]
    },
    {
      id: "r-finetune",
      track: "run",
      title: "Fine-tuning: LoRA, QLoRA and when to bother",
      h: [16, 24],
      summary: "Adapt a model to a task with parameter-efficient methods on a 12 GB card, evaluate it honestly against prompting, and serve the result.",
      needs: ["f-gpt", "b-evals", "r-quant"],
      topics: [
        "Deciding: prompting, RAG, fine-tuning or a smaller distilled model",
        "Full fine-tuning vs LoRA: low-rank updates, rank, alpha, target modules",
        "QLoRA: training adapters on a 4-bit base",
        "Data: sourcing, cleaning, formatting to the chat template, synthetic data and distillation from a larger model",
        "Training mechanics: sequence length, effective batch size, gradient accumulation and checkpointing, learning rate",
        "Overfitting and catastrophic forgetting; evaluating against the base model and a prompted baseline",
        "Merging adapters vs serving them separately",
        "Tooling: PEFT, TRL, Unsloth, Axolotl",
        "Tracking experiments",
        "Distillation: training a small model from a larger one's outputs"
      ],
      questions: [
        "Why can a low-rank update capture a task-specific change in a huge weight matrix?",
        "For a LoRA of rank 16 on the attention projections of a 4B model, roughly how many trainable parameters is that?",
        "When does fine-tuning beat a good prompt with retrieval, and when is it the wrong tool?",
        "How would you detect that your fine-tune memorised its training set?",
        "What are the trade-offs between merging an adapter and serving it dynamically?"
      ],
      exercises: [
        { t: "QLoRA on the 4070", env: "pc", d: "Fine-tune a 1–4B model for a narrow task with a real label (for example classifying or structuring your own logs or alerts). Build the dataset, hold out a test set, track the run." },
        { t: "Honest comparison", env: "pc", d: "Evaluate four systems on the held-out set: base model with a simple prompt, base model with your best prompt and few-shot, the fine-tune, and a hosted frontier model. Report quality, latency and cost." },
        { t: "Serve it", env: "pc", d: "Serve the adapter with vLLM alongside the base model, and separately as a merged quantized GGUF. Compare memory and speed." }
      ],
      resources: [
        { t: "LoRA: Low-Rank Adaptation of Large Language Models", u: "https://arxiv.org/abs/2106.09685", k: "paper" },
        { t: "PEFT documentation", u: "https://huggingface.co/docs/peft/index", k: "doc" },
        { t: "Unsloth documentation", u: "https://docs.unsloth.ai/", k: "doc", n: "The quickest route to a working run on a small card" },
        { t: "Practical tips for fine-tuning LLMs using LoRA", u: "https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms", k: "article" },
        { t: "AI Engineering (Chip Huyen), chapters 7–8", u: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", k: "book", n: "Fine-tuning and dataset engineering" }
      ],
      notes: ["LoRA and QLoRA", "When to fine-tune", "Fine-tuning dataset preparation"]
    },
    {
      id: "r-project",
      track: "run",
      title: "Project: a single-node inference service you can defend",
      h: [20, 30],
      summary: "Package everything from this stage into one reproducible deployment with a capacity statement backed by measurements.",
      needs: ["r-engines", "r-finetune"],
      project: true,
      topics: [
        "Reproducible deployment: pinned images, model revision pinning, configuration in git",
        "Model artefact handling: cache volumes, download time, integrity",
        "Health and readiness for a model server; startup probes for slow loads",
        "A capacity and cost statement"
      ],
      questions: [
        "What is the capacity of your service in concurrent users at your SLO, and what evidence supports it?",
        "What is the cold-start time from container start to first token, and where does the time go?",
        "If the workload doubled tomorrow, what are your options in order of cost?"
      ],
      exercises: [
        { t: "Model server on the PC", env: "pc", d: "A compose file or systemd unit running vLLM (chat model), an embedding server and a metrics exporter, with pinned versions and a documented model list." },
        { t: "Phones use the PC", env: "lab", d: "Point the homelab copilot at the PC's endpoint instead of a hosted API. Compare eval scores, latency and cost against the hosted model." },
        { t: "Capacity report", env: "any", d: "Two pages: workload definition, benchmark method, curves, the SLO, capacity per GPU, cost per million tokens including power, and limits of the analysis." }
      ],
      resources: [
        { t: "vLLM: deploying with Docker", u: "https://docs.vllm.ai/en/latest/deployment/docker.html", k: "doc" },
        { t: "LLM Inference Handbook: infrastructure and operations", u: "https://bentoml.com/llm/infrastructure-and-operations", k: "book" },
        { t: "DCGM exporter", u: "https://github.com/NVIDIA/dcgm-exporter", k: "tool" }
      ],
      notes: ["Single-node inference capacity report"]
    }
  ]
});
