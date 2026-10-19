ROADMAP.stages.push({
  id: "stage-0",
  n: 0,
  level: "Setup",
  title: "Orientation and lab",
  tag: "AI-Engineering",
  index: null,
  blurb: "Know what the role asks for now, and get the three environments you will learn in ready: the GPU PC, the homelab and a cloud sandbox.",
  outcome: "you have a skills gap list from current job descriptions, a GPU container running on the PC, a namespace for experiments on the homelab, and cloud budget alerts in place.",
  modules: [
    {
      id: "o-role",
      track: "build",
      title: "The AI engineer role in 2026",
      h: [3, 5],
      summary: "The role has split into two overlapping jobs: building AI applications, and running the platforms that serve models. This roadmap covers both; decide where you want depth.",
      why: "Job descriptions changed a lot in a year: evals, MCP and agent harnesses on the app side; vLLM, GPU scheduling and inference routing on the platform side.",
      topics: [
        "Application AI engineer vs AI platform / inference engineer vs ML engineer: what each owns",
        "What current postings ask for on the build side: agents, MCP servers, RAG, evals, guardrails, cost control",
        "What they ask for on the run side: vLLM, quantization, KV-cache and batching, GPU scheduling on Kubernetes, Terraform, OpenTelemetry",
        "Where a platform background is an advantage, and which gaps it leaves (ML fundamentals, evaluation, GPU internals)",
        "How to keep current: release notes, engineering blogs, papers, and what to ignore"
      ],
      questions: [
        "In your own words, what does an AI engineer do that a backend engineer calling an LLM API does not?",
        "Which five skills appear most often in the job descriptions you collected, and how would you rate yourself on each?",
        "Which parts of your current job already exercise skills from this roadmap, and which never do?",
        "What would you need to show, concretely, to be credible for a senior AI platform role?"
      ],
      exercises: [
        { t: "Read the skills matrix", env: "any", d: "Read `JDs/2026-10/SKILLS-MATRIX.md`: fourteen postings from October 2026 tallied by skill and mapped to modules, with the gaps that remain. Mark the five skills you most want to be hired for." },
        { t: "Repeat the sweep", env: "any", d: "Every four to six months, save 8–10 fresh postings to a new dated folder in `JDs/`, half application-focused and half infrastructure-focused, and update the matrix. Anything uncovered is a gap in this roadmap: add it." },
        { t: "Baseline self-assessment", env: "any", d: "For every module in this roadmap give yourself a 0–3 score before starting. Keep it in the vault; you will repeat it after each stage." }
      ],
      resources: [
        { t: "AI Engineering (Chip Huyen), chapter 1", u: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", k: "book", n: "The best single book for the application side; used throughout Stage 2" },
        { t: "What we learned from a year of building with LLMs", u: "https://applied-llms.org/", k: "article", n: "Practitioner lessons that have aged well" },
        { t: "State of Agent Engineering", u: "https://www.langchain.com/state-of-agent-engineering", k: "article", n: "Survey data on what teams run in production; vendor-run, read critically" }
      ],
      notes: ["AI Engineer role map", "My skills gap list"]
    },
    {
      id: "o-lab",
      track: "platform",
      title: "Lab setup: GPU PC, homelab, cloud sandbox",
      h: [6, 10],
      summary: "Prepare the places the exercises run: a reproducible Python and GPU container setup on the PC, an experiments namespace on the k3s phones, and cloud accounts with spending limits.",
      why: "Every later exercise assumes these work. Doing it once, in code, also gives you a repo to grow into the capstones.",
      topics: [
        "Python tooling with `uv`: projects, lockfiles, per-project virtualenvs",
        "The NVIDIA stack on Linux: kernel driver, user-space libraries, CUDA toolkit, and which versions must match",
        "GPU containers: Podman or Docker with the NVIDIA Container Toolkit and CDI",
        "Hugging Face Hub basics: tokens, the model cache, gated models, disk usage",
        "What the phones can do (CPU inference of small models, gateways, observability) and cannot do (CUDA)",
        "Cloud hygiene: a separate sandbox account or project, budgets and alerts, tagging, tearing everything down with Terraform",
        "Using a work cloud for learning: get explicit approval, stay inside a sandbox, never touch production data"
      ],
      questions: [
        "Which component breaks when the NVIDIA kernel driver and user-space libraries are different versions, and how do you check?",
        "How does a container get access to the GPU without the driver being inside the image?",
        "What is the difference between the CUDA toolkit installed on the host and the CUDA runtime bundled with a PyTorch wheel?",
        "What stops a forgotten GPU instance from costing you money for a month?"
      ],
      exercises: [
        { t: "One repo for all lab work", env: "pc", d: "Create an `ai-lab` git repository with `uv`, a directory per stage, and a README log. Every later exercise lands here." },
        { t: "GPU in a container", env: "pc", d: "Install Podman and the NVIDIA Container Toolkit, generate the CDI spec, and run `nvidia-smi` inside a CUDA base image. Then run a PyTorch container and confirm `torch.cuda.is_available()`." },
        { t: "Experiments namespace on k3s", env: "lab", d: "Create an `ai` namespace with a ResourceQuota and LimitRange so an experiment cannot starve Jellyfin. Keep the manifests in git next to the existing homelab ones." },
        { t: "Cloud guardrails as code", env: "cloud", d: "With Terraform, create a budget with email alerts in AWS and in GCP (a few dollars each). Add a default tag/label policy so every lab resource is attributable. Confirm `terraform destroy` leaves nothing behind." }
      ],
      resources: [
        { t: "uv documentation", u: "https://docs.astral.sh/uv/", k: "doc" },
        { t: "NVIDIA Container Toolkit: install and CDI", u: "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/index.html", k: "doc" },
        { t: "Hugging Face Hub: download and cache", u: "https://huggingface.co/docs/huggingface_hub/guides/download", k: "doc" },
        { t: "AWS Budgets", u: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html", k: "doc" }
      ],
      notes: ["NVIDIA driver stack on Linux", "GPU containers and CDI"]
    }
  ]
});
