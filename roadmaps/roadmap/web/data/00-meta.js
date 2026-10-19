// ============================================================
// ROADMAP CONTENT — AI Engineering, build and run
//
// One file per stage; each pushes a stage onto ROADMAP.stages.
// Module shape:
//   id        stable, never reuse (progress is keyed on it)
//   track     foundations | build | run | platform | internals
//   h         [low, high] effort estimate in hours
//   summary   one or two sentences shown on the card
//   why       optional, why the topic earns its place
//   needs     ids of modules this builds on
//   topics    what to learn (checklist)
//   questions answered in the Obsidian vault, ticked here
//   exercises { t: title, env: any|pc|lab|cloud, d: what to do and what "done" looks like }
//   resources { t: title, u: url, k: video|course|book|doc|article|paper|code|tool, n: note }
//   notes     suggested vault note titles
//   project   true for milestone projects
// Checkbox progress is keyed on the item text, so rewording an item resets that one tick.
// ============================================================

window.ROADMAP = {
  meta: {
    title: "AI Engineering: build it and run it",
    subtitle: "Beginner to advanced · apps, inference, platform, GPU internals",
    version: "2.0-draft2",
    reviewed: "October 2026",
    description: "A depth-first path from how an LLM works to building agentic applications, serving open-weight models efficiently, running them on Kubernetes and the cloud, and writing GPU kernels. No deadline: every module ends in questions to answer from memory and something to build.",
    howTo: [
      "Work a module in this order: skim the topics, study from the resources, write atomic notes in the vault, then answer the questions without looking anything up.",
      "Do the hands-on work. A module is complete when the exercises run and you can explain the result, not when the videos are watched.",
      "Stages are ordered by dependency, not by calendar. After Stage 1 the Build and Run stages can be interleaved; the Platform and Internals stages assume both.",
      "Each exercise is tagged with where it runs: **Any** machine, the **GPU PC** (RTX 4070 SUPER, 12 GB), the **Homelab** k3s phones, or **Cloud**.",
      "This field moves quickly. Version numbers and product names here were checked in October 2026; treat the concepts as durable and re-check the tooling when you reach a module."
    ]
  },

  tracks: {
    foundations: { name: "Foundations", blurb: "How models work: neural networks, PyTorch, transformers" },
    build:       { name: "Build",       blurb: "Applications: prompting, retrieval, agents, evals" },
    run:         { name: "Run",         blurb: "Inference: GPUs, engines, quantization, fine-tuning" },
    platform:    { name: "Platform",    blurb: "Kubernetes, AWS, GCP, Terraform, observability, cost" },
    internals:   { name: "Internals",   blurb: "PyTorch internals, CUDA, kernels, compilers" }
  },

  envs: {
    any:   { name: "Any",     blurb: "Any machine, CPU is enough" },
    pc:    { name: "GPU PC",  blurb: "The workstation with the RTX 4070 SUPER (12 GB VRAM)" },
    lab:   { name: "Homelab", blurb: "The k3s cluster on the two phones (arm64, CPU only)" },
    cloud: { name: "Cloud",   blurb: "AWS or GCP: free tier, credits, or an approved work sandbox" }
  },

  stages: []
};
