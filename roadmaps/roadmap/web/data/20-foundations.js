ROADMAP.stages.push({
  id: "stage-1",
  n: 1,
  level: "Beginner",
  title: "How LLMs work",
  tag: "LLMs",
  index: "010-LLMs",
  blurb: "Build the model in your head, then in code: neural networks, PyTorch, tokens, attention, and a small GPT you train yourself.",
  outcome: "you can train a small GPT from a blank file, explain every tensor shape in its forward pass, and say what happens between sending a prompt and receiving the first token.",
  modules: [
    {
      id: "f-nn",
      track: "foundations",
      title: "Neural networks and backpropagation",
      h: [12, 18],
      summary: "What a neural network computes, how a loss measures it, and how backpropagation produces the gradients that training follows. Built from scratch before any framework.",
      why: "Everything later, from LoRA to quantization error to autograd internals, assumes you can reason about gradients.",
      topics: [
        "Neurons, layers, activations; a network as a composition of differentiable functions",
        "Loss functions: mean squared error, cross-entropy, and why cross-entropy for classification",
        "The chain rule and backpropagation over a computation graph",
        "Gradient descent, learning rate, mini-batches, SGD vs Adam at an intuitive level",
        "Overfitting, train/validation split, regularisation",
        "The minimum maths: vectors, matrices, dot products, partial derivatives, softmax, logarithms"
      ],
      questions: [
        "Derive by hand the gradient of a single neuron with a tanh activation for one input. What does each term mean?",
        "Why does backpropagation run in reverse, and what would the forward-mode alternative cost?",
        "What goes wrong when the learning rate is too high, and what does the loss curve look like?",
        "Why is cross-entropy paired with softmax, and what is the gradient of that pair with respect to the logits?",
        "What is the difference between a parameter, a gradient and an activation, and which of them need memory at inference time?"
      ],
      exercises: [
        { t: "Micrograd from a blank file", env: "any", d: "Follow Karpathy's micrograd lecture, then close it and re-implement the `Value` class with add, mul, tanh and backward from memory. Train a tiny MLP on a toy dataset and check your gradients against PyTorch." },
        { t: "MNIST in NumPy", env: "any", d: "Write a two-layer MLP with manual forward and backward passes in NumPy only. Reach above 95% test accuracy and plot train vs validation loss." }
      ],
      resources: [
        { t: "Neural networks (3Blue1Brown)", u: "https://www.3blue1brown.com/topics/neural-networks", k: "video", n: "Chapters 1–4 for intuition before any code" },
        { t: "Neural Networks: Zero to Hero", u: "https://karpathy.ai/zero-to-hero.html", k: "course", n: "Lecture 1 (micrograd) here; the rest carries through this stage" },
        { t: "micrograd", u: "https://github.com/karpathy/micrograd", k: "code" },
        { t: "Neural Networks and Deep Learning (Nielsen)", u: "http://neuralnetworksanddeeplearning.com/", k: "book", n: "Chapters 1–2 if you want the derivations written out" }
      ],
      notes: ["Backpropagation", "Gradient descent and optimisers", "Cross-entropy loss"]
    },
    {
      id: "f-classic",
      track: "foundations",
      title: "Classical ML and the data toolkit",
      h: [10, 14],
      summary: "The machine learning that predates LLMs and still runs most production models: regression, trees, evaluation metrics, and the pandas and scikit-learn workflow.",
      why: "MLOps and forward-deployed postings still ask for 'a solid understanding of ML algorithms' and name pandas, scikit-learn and PyTorch together. It is also the vocabulary data scientists use with you.",
      needs: ["f-nn"],
      topics: [
        "Supervised vs unsupervised learning; features, labels, train/validation/test splits, leakage",
        "Linear and logistic regression; decision trees, random forests, gradient boosting",
        "Metrics: accuracy, precision, recall, F1, ROC-AUC, confusion matrices; choosing one for the problem",
        "Bias and variance, cross-validation, hyperparameter search",
        "The workflow: pandas or Polars for data, scikit-learn pipelines, notebooks to scripts",
        "Clustering and dimensionality reduction at a working level (k-means, PCA, UMAP for looking at embeddings)",
        "Data quality: schemas, missing values, skew, distribution shift and drift",
        "When a small classical model beats an LLM on cost, latency and reliability"
      ],
      questions: [
        "A fraud model is 99% accurate. Why might it be useless, and which metric would show that?",
        "What is data leakage? Give an example that would pass a casual review.",
        "Why does gradient boosting usually beat a neural network on small tabular datasets?",
        "How would you detect that production data has drifted from the training data?",
        "Give a task where you would choose logistic regression on embeddings over an LLM call, and say why."
      ],
      exercises: [
        { t: "End-to-end tabular model", env: "any", d: "On a public tabular dataset, build a scikit-learn pipeline with preprocessing, a gradient-boosted model, cross-validation and a held-out test. Report the right metric for the problem and explain the confusion matrix." },
        { t: "Classifier on embeddings", env: "pc", d: "Label a few hundred of your own log lines or alerts. Compare logistic regression on embeddings with a zero-shot LLM prompt on accuracy, latency and cost per thousand items." },
        { t: "Drift check", env: "any", d: "Split a dataset by time, train on the early part, and measure how performance and feature distributions change on the late part." }
      ],
      resources: [
        { t: "Machine Learning Crash Course (Google)", u: "https://developers.google.com/machine-learning/crash-course", k: "course" },
        { t: "scikit-learn user guide", u: "https://scikit-learn.org/stable/user_guide.html", k: "doc" },
        { t: "pandas user guide", u: "https://pandas.pydata.org/docs/user_guide/index.html", k: "doc" },
        { t: "Practical Deep Learning for Coders (fast.ai)", u: "https://course.fast.ai/", k: "course", n: "Lessons on tabular data and random forests" }
      ],
      notes: ["Classification metrics", "Data leakage", "Gradient boosting", "Data drift"]
    },
    {
      id: "f-pytorch",
      track: "foundations",
      title: "PyTorch fundamentals",
      h: [12, 16],
      summary: "Tensors, autograd, modules, the training loop, devices and dtypes. The working language for the rest of the roadmap.",
      needs: ["f-nn"],
      topics: [
        "Tensors: shape, dtype, device, views vs copies, broadcasting",
        "Autograd: `requires_grad`, the graph, `backward()`, `no_grad` and `inference_mode`",
        "`nn.Module`, parameters and buffers, `state_dict`, saving and loading (safetensors vs pickle)",
        "The training loop: DataLoader, forward, loss, backward, optimiser step, zero grad",
        "Moving work to the GPU: `.to(device)`, pinned memory, why the first CUDA call is slow",
        "Precision: float32, float16, bfloat16, autocast and why mixed precision helps",
        "Reading shapes in other people's code: einsum and einops"
      ],
      questions: [
        "What is the difference between `view`, `reshape` and `contiguous`, and when does a copy happen?",
        "What exactly does `torch.no_grad()` change, and how is `inference_mode` different?",
        "Why can loading a pickled checkpoint run arbitrary code, and how do safetensors avoid that?",
        "A training step runs out of GPU memory. List what is holding memory and three ways to reduce it.",
        "What does bfloat16 trade away compared with float32, and why is it usually fine?"
      ],
      exercises: [
        { t: "Port the MLP", env: "pc", d: "Rewrite the NumPy MNIST network in PyTorch with a proper Dataset, DataLoader and training loop. Run it on CPU and GPU and explain the speed difference at batch sizes 32 and 4096." },
        { t: "Memory and precision probe", env: "pc", d: "For a model of a few hundred MB, record peak GPU memory (`torch.cuda.max_memory_allocated`) for inference vs training, and float32 vs autocast bfloat16. Write down where the memory goes." },
        { t: "Tensor drills", env: "any", d: "Without running the code first, predict output shapes for 20 broadcasting, indexing and einsum expressions, then check. Repeat until you get all of them right." }
      ],
      resources: [
        { t: "PyTorch tutorials: Learn the Basics", u: "https://docs.pytorch.org/tutorials/beginner/basics/intro.html", k: "doc" },
        { t: "Deep Learning with PyTorch: A 60 Minute Blitz", u: "https://docs.pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html", k: "doc" },
        { t: "Dive into Deep Learning", u: "https://d2l.ai/", k: "book", n: "Reference for anything that stays fuzzy; runnable PyTorch throughout" },
        { t: "einops", u: "https://einops.rocks/", k: "doc" }
      ],
      notes: ["PyTorch autograd", "Tensor memory layout and views", "Mixed precision"]
    },
    {
      id: "f-tokens",
      track: "foundations",
      title: "Tokenization and embeddings",
      h: [6, 9],
      summary: "How text becomes integers and integers become vectors. You already have vault notes on both: this module extends them with code.",
      needs: ["f-pytorch"],
      topics: [
        "Why subwords: characters vs words vs byte-pair encoding",
        "BPE training and encoding; special tokens; why token counts differ between models",
        "Tokenizer artefacts: `tokenizer.json`, vocab, merges, chat templates",
        "The embedding table as a lookup; tied input and output embeddings",
        "Positional information: learned, sinusoidal, RoPE at a conceptual level",
        "How tokenization affects cost, latency, context limits and odd failure cases (numbers, non-English text, whitespace)"
      ],
      questions: [
        "Walk through BPE training on a tiny corpus by hand for three merges.",
        "Why does the same sentence cost a different number of tokens on different models?",
        "What is in the embedding matrix before training, and what makes two tokens end up close together after it?",
        "Why can a model struggle to count the letters in a word, in terms of what it actually receives?",
        "What does a chat template do, and what goes wrong if you serve a model with the wrong one?"
      ],
      exercises: [
        { t: "Train a BPE tokenizer", env: "any", d: "Implement BPE train, encode and decode following minbpe, train it on a text of your choice, and compare its output with a production tokenizer on the same passages." },
        { t: "Token economics", env: "any", d: "Tokenize the same five documents (English prose, code, JSON, Hindi or another non-English text, a log file) with three different tokenizers. Tabulate tokens per character and explain the outliers." }
      ],
      resources: [
        { t: "Let's build the GPT Tokenizer", u: "https://www.youtube.com/watch?v=zduSFxRajkE", k: "video", n: "Karpathy; pairs with minbpe" },
        { t: "minbpe", u: "https://github.com/karpathy/minbpe", k: "code" },
        { t: "Hugging Face LLM course: tokenizers", u: "https://huggingface.co/learn/llm-course/chapter6/1", k: "course" },
        { t: "Tiktokenizer", u: "https://tiktokenizer.vercel.app/", k: "tool", n: "See token boundaries interactively" }
      ],
      notes: ["Tokenization (extend existing)", "Vector Embeddings (extend existing)", "Chat templates"]
    },
    {
      id: "f-transformer",
      track: "foundations",
      title: "Attention and the transformer",
      h: [14, 20],
      summary: "Self-attention, multi-head attention, the MLP block, residual connections and normalisation: the decoder-only transformer, one tensor shape at a time.",
      needs: ["f-tokens"],
      why: "Serving optimisations such as the KV cache, FlashAttention and quantization only make sense once you know what each block computes and costs.",
      topics: [
        "Scaled dot-product attention: queries, keys, values, the attention matrix",
        "Causal masking and why a decoder can be trained on every position at once",
        "Multi-head attention; head dimension; modern variants (grouped-query attention)",
        "The MLP block, residual stream, pre-norm, RMSNorm",
        "Rotary positional embeddings (RoPE)",
        "Parameter counting: where the weights of a 7B model actually are",
        "Compute cost: why attention is quadratic in sequence length and what that means for long contexts",
        "Encoder-only and encoder-decoder models, and where they still matter (embeddings, rerankers, speech)"
      ],
      questions: [
        "Write the attention equation and give the shape of every tensor for batch B, sequence T, heads H, model dimension D.",
        "What would break if you removed the causal mask during training? During inference?",
        "Why do residual connections make deep networks trainable?",
        "For a model with D=4096, 32 layers and a 32k vocabulary, estimate the parameter count and say which component dominates.",
        "Why does doubling the context length more than double the cost of a forward pass?"
      ],
      exercises: [
        { t: "Attention from scratch", env: "pc", d: "Implement single-head, then multi-head causal self-attention in PyTorch using only matmul, softmax and masking. Verify against `torch.nn.functional.scaled_dot_product_attention`." },
        { t: "Count the parameters", env: "any", d: "Load a small open-weight model's config and predict its parameter count from the config alone, per component. Compare with the real `state_dict`." },
        { t: "Look at attention", env: "pc", d: "Extract and plot attention maps from a small pretrained model for a few prompts. Find one head whose behaviour you can describe." }
      ],
      resources: [
        { t: "Attention in transformers, step by step (3Blue1Brown)", u: "https://www.3blue1brown.com/lessons/attention", k: "video" },
        { t: "The Illustrated Transformer", u: "https://jalammar.github.io/illustrated-transformer/", k: "article" },
        { t: "Attention Is All You Need", u: "https://arxiv.org/abs/1706.03762", k: "paper", n: "Read after the two above; it will be easy by then" },
        { t: "Transformer Explainer", u: "https://poloclub.github.io/transformer-explainer/", k: "tool", n: "Interactive GPT-2 in the browser" }
      ],
      notes: ["Self-attention", "Transformer block", "Positional encoding and RoPE"]
    },
    {
      id: "f-gpt",
      track: "foundations",
      title: "Build and train a GPT",
      h: [20, 30],
      summary: "Assemble the pieces into a working language model, train it on your own GPU, and watch the loss, the samples and the hardware as it learns.",
      needs: ["f-transformer"],
      project: true,
      topics: [
        "Data pipeline for language modelling: tokenise, chunk, batch, shift targets by one",
        "Initialisation, learning-rate warmup and decay, AdamW, gradient clipping",
        "Reading a loss curve; expected initial loss; overfitting a single batch as a sanity check",
        "Throughput: tokens per second, GPU utilisation, mixed precision, `torch.compile`",
        "Pre-training vs fine-tuning vs instruction tuning: what each stage adds",
        "Checkpointing and resuming"
      ],
      questions: [
        "What loss do you expect from an untrained model with vocabulary size V, and why?",
        "Your loss plateaus early. List the checks you would make, in order.",
        "Why do we warm up the learning rate?",
        "What turns a base model that only continues text into a chat model?",
        "Roughly how many tokens and GPU-hours did your model need, and how does that compare with a frontier model?"
      ],
      exercises: [
        { t: "GPT from an empty file", env: "pc", d: "After the lecture, write a decoder-only transformer and training loop without copying. Train a character-level model on a text you choose until its samples are recognisably in style." },
        { t: "Scale it up on the 4070", env: "pc", d: "Train a BPE-tokenised model in the 10–50M parameter range on TinyStories or similar. Log loss, tokens per second, GPU utilisation and memory. Apply mixed precision and `torch.compile` and record the speedup of each." },
        { t: "Write it up", env: "any", d: "A vault note with architecture, hyperparameters, curves, samples at three checkpoints and what you would change. This is the first portfolio artefact." }
      ],
      resources: [
        { t: "Let's build GPT: from scratch, in code", u: "https://www.youtube.com/watch?v=kCc8FmEb1nY", k: "video" },
        { t: "nanoGPT", u: "https://github.com/karpathy/nanoGPT", k: "code", n: "Reference implementation to compare with yours afterwards" },
        { t: "Build a Large Language Model (From Scratch)", u: "https://github.com/rasbt/LLMs-from-scratch", k: "book", n: "Raschka; slower and more thorough than the video, code is free" },
        { t: "Stanford CS336: Language Modeling from Scratch", u: "https://cs336.stanford.edu/", k: "course", n: "The deep version; assignments are worth doing later" }
      ],
      notes: ["Training a language model", "Learning-rate schedules", "Pre-training vs fine-tuning"]
    },
    {
      id: "f-generation",
      track: "foundations",
      title: "Generation: sampling, the KV cache and context",
      h: [8, 12],
      summary: "What happens at inference time: the autoregressive loop, sampling controls, why the KV cache exists, and what limits a context window.",
      needs: ["f-gpt"],
      why: "This is the bridge to the Run stage. Latency, throughput and memory in production all trace back to this loop.",
      topics: [
        "The decode loop: one forward pass per token",
        "Logits to tokens: temperature, top-k, top-p, min-p, repetition penalties, greedy vs sampling",
        "The KV cache: what is cached, how it turns quadratic work into linear, and what it costs in memory",
        "Prefill vs decode: two phases with different performance characteristics",
        "Stop conditions, max tokens, logprobs",
        "Constrained decoding: forcing valid JSON or a grammar by masking logits",
        "Reasoning models: thinking tokens, effort or budget controls, and what they cost",
        "Context windows: positional limits, memory, and why quality degrades in very long contexts"
      ],
      questions: [
        "Why is generating the 1000th token not 1000 times more expensive than the first, and what makes that true?",
        "Estimate the KV-cache memory for one 8k-token sequence on a 32-layer model with 8 KV heads of dimension 128 in fp16.",
        "What does temperature 0 guarantee, and what does it not guarantee?",
        "How does constrained decoding guarantee valid JSON, and what can it not guarantee?",
        "Why is time-to-first-token mostly a prefill number and tokens-per-second mostly a decode number?"
      ],
      exercises: [
        { t: "Add a KV cache", env: "pc", d: "Add KV caching to your GPT's generate function. Measure tokens per second with and without it at sequence lengths 128, 512 and 1024, and plot both." },
        { t: "Implement the samplers", env: "pc", d: "Implement temperature, top-k and top-p yourself on raw logits from a small pretrained model. Show sample outputs for a fixed prompt across settings." },
        { t: "Toy constrained decoder", env: "pc", d: "Force a model to emit only digits, then a fixed JSON shape, by masking logits at each step. Note where the output is valid but wrong." }
      ],
      resources: [
        { t: "Hugging Face: text generation strategies", u: "https://huggingface.co/docs/transformers/generation_strategies", k: "doc" },
        { t: "Transformers: KV cache strategies", u: "https://huggingface.co/docs/transformers/kv_cache", k: "doc" },
        { t: "Large Transformer Model Inference Optimization (Lilian Weng)", u: "https://lilianweng.github.io/posts/2023-01-10-inference-optimization/", k: "article", n: "Skim now, return in Stage 3" },
        { t: "Outlines: structured generation", u: "https://dottxt-ai.github.io/outlines/", k: "doc", n: "How constrained decoding is done in practice" }
      ],
      notes: ["KV cache", "Sampling strategies", "Constrained decoding", "Prefill vs decode"]
    },
    {
      id: "f-landscape",
      track: "foundations",
      title: "The model landscape and how to read it",
      h: [5, 8],
      summary: "Closed APIs and open weights, model sizes and families, licences, benchmarks and model cards: enough to choose a model for a job and defend the choice.",
      needs: ["f-generation"],
      topics: [
        "Hosted frontier models vs open-weight models: capability, cost, control, data residency",
        "Model families and size classes; what fits in 12 GB, 24 GB, 80 GB",
        "Reading a model card and config: context length, architecture, training data, licence terms",
        "Benchmarks and leaderboards: what they measure, contamination, why your own eval beats them",
        "Model types beyond chat: embedding, reranker, vision-language, speech, small specialised models",
        "Distillation and why small models keep getting better",
        "Hub formats: safetensors, GGUF, and what a repository contains"
      ],
      questions: [
        "For a document-extraction workload with strict data-residency rules, how would you decide between a hosted API and a self-hosted model?",
        "What three things would you check in a model's licence before using it commercially?",
        "Why is a public leaderboard score weak evidence for your use case?",
        "Which open-weight models can you run today on 12 GB of VRAM at useful quality, and at what precision?"
      ],
      exercises: [
        { t: "Model shortlist", env: "any", d: "Pick one realistic task from your work. Shortlist two hosted and two open-weight models and compare them on capability evidence, licence, context, cost per million tokens and hardware needed. One page in the vault." },
        { t: "Dissect a repository", env: "pc", d: "Download one small model from the Hub. Explain every file in the repo, load it with Transformers, and confirm the parameter count and dtype." }
      ],
      resources: [
        { t: "Hugging Face LLM course", u: "https://huggingface.co/learn/llm-course/chapter1/1", k: "course", n: "Chapters 1–3 for the ecosystem" },
        { t: "Hugging Face: model cards", u: "https://huggingface.co/docs/hub/model-cards", k: "doc" },
        { t: "Artificial Analysis", u: "https://artificialanalysis.ai/", k: "tool", n: "Independent quality, speed and price comparisons" },
        { t: "Intro to Large Language Models (Karpathy)", u: "https://www.youtube.com/watch?v=zjkBMFhNj_g", k: "video", n: "Good one-hour consolidation of the stage" }
      ],
      notes: ["Choosing a model", "Open-weight model families", "Reading benchmarks critically"]
    }
  ]
});
