// ============================================================
// ROADMAP DATA - MLOps Engineering
// Reworked from local JDs in /JDs for fast interview readiness.
// Node IDs are prefixed with "mlops-" to avoid collisions.
// ============================================================

window.ROADMAP_DATA_DEVOPS = {
  id: "senior-devops-mlops",
  meta: {
    title: "MLOps Engineering",
    subtitle: "Interview Readiness Roadmap",
    description: "A JD-driven MLOps and AI infrastructure sprint focused on Python services, ML pipelines, Kubernetes, GPU workloads, Ray/KubeRay, MLflow/Kubeflow, model serving, LLMOps, observability, cloud security, and interview practice.",
    version: "2.0"
  },
  phases: [
    {
      id: "mlops-phase-1",
      title: "Phase 1",
      subtitle: "30-Day Interview Sprint",
      description: "Prioritize the skills that appeared repeatedly in the JDs: production Python, Docker/Kubernetes, ML lifecycle tooling, GPU scheduling, distributed training, model serving, async inference, observability, CI/CD, IaC, and cloud security.",
      granularity: "week",
      weeks: [
        {
          id: "mlops-week-1",
          title: "Week 1",
          subtitle: "Production MLOps Foundations",
          days: "Days 1-7",
          goal: "Build the core mental model interviewers expect: ML lifecycle, Python service quality, Docker, Kubernetes basics, CI/CD, MLflow, and pipeline debugging.",
          nodes: [
            {
              id: "mlops-w1-day1",
              type: "day",
              title: "Day 1: JD Map, ML Lifecycle & Interview Baseline",
              shortTitle: "JD Map & ML Lifecycle",
              dayLabel: "Day 1",
              description: "Convert the JDs into a concrete skill map and refresh the end-to-end ML lifecycle: data ingestion, feature engineering, training, evaluation, registry, deployment, monitoring, drift, and retraining.",
              concepts: [
                "MLOps role boundaries: data scientist vs ML engineer vs platform engineer vs AI infrastructure engineer",
                "End-to-end ML lifecycle: data, training, evaluation, registry, serving, monitoring, retraining",
                "Batch vs real-time inference and when each is used",
                "Model artifacts, datasets, environments, configs, metrics, and lineage",
                "Common failure path: data quality issue becomes model quality issue becomes production incident",
                "Interview framing: explain systems in terms of reliability, latency, cost, and rollback"
              ],
              practicePrompt: "Create a one-page skill matrix from the JDs: must-have, useful, and post-interview depth. Mark your current confidence from 1-5 for each skill.",
              assignment: {
                title: "Draw the production ML system",
                time: "45-60 min",
                objective: "Sketch a system that trains a model, registers it, deploys real-time inference, runs batch inference, and monitors drift.",
                steps: [
                  "Draw the data path, training path, serving path, and monitoring path.",
                  "Add failure points: schema change, bad model, slow inference, GPU pressure, bad deployment.",
                  "Write a 2-minute explanation you can say in an interview."
                ],
                pitfalls: [
                  "Interviewers often ask where validation happens. Do not put all validation after training.",
                  "Be ready to explain rollback: previous model version, previous image, previous feature pipeline, or traffic shift.",
                  "A strong answer separates model metrics from system metrics."
                ]
              },
              resources: [
                {
                  id: "mlops-ml-system-design",
                  title: "Designing Machine Learning Systems",
                  url: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/",
                  type: "book",
                  cost: "paid",
                  author: "Chip Huyen"
                },
                {
                  id: "mlops-google-rules",
                  title: "Rules of Machine Learning",
                  url: "https://developers.google.com/machine-learning/guides/rules-of-ml",
                  type: "article",
                  cost: "free",
                  author: "Google"
                }
              ]
            },
            {
              id: "mlops-w1-day2",
              type: "day",
              title: "Day 2: Production Python, FastAPI & Async Inference",
              shortTitle: "Python, FastAPI & Async",
              dayLabel: "Day 2",
              description: "The JDs repeatedly expect strong Python, FastAPI, async patterns, and backend services around ML systems. Focus on clean interfaces, concurrency, retries, timeouts, and operational behavior.",
              concepts: [
                "Production Python structure: modules, config, logging, typing, tests",
                "FastAPI request/response models with Pydantic",
                "asyncio basics for non-blocking inference and IO",
                "Timeouts, retries, circuit breakers, and graceful degradation",
                "Background jobs for slow work: queues, workers, and idempotency",
                "API contracts for model inference: request schema, response schema, error schema"
              ],
              practicePrompt: "Explain when an inference endpoint should be synchronous, asynchronous, or queue-backed.",
              assignment: {
                title: "Build a small inference API",
                time: "90 min",
                objective: "Create a FastAPI endpoint that loads a fake model, validates input, returns predictions, logs latency, and handles timeout/error cases.",
                steps: [
                  "Use Pydantic models for request and response.",
                  "Add structured logs with request id, latency, and model version.",
                  "Add one async endpoint and one background-job style function.",
                  "Write three tests: valid request, bad schema, model failure."
                ],
                pitfalls: [
                  "Interviewers may ask what happens when model loading is slow. Load at startup or use a lifecycle hook.",
                  "Do not block the event loop with CPU-heavy work inside async handlers.",
                  "Always make model version visible in responses and logs."
                ]
              },
              resources: [
                {
                  id: "mlops-fastapi",
                  title: "FastAPI Documentation",
                  url: "https://fastapi.tiangolo.com/",
                  type: "article",
                  cost: "free",
                  author: "FastAPI"
                },
                {
                  id: "mlops-pydantic",
                  title: "Pydantic Documentation",
                  url: "https://docs.pydantic.dev/latest/",
                  type: "article",
                  cost: "free",
                  author: "Pydantic"
                },
                {
                  id: "mlops-python-asyncio",
                  title: "asyncio - Python Documentation",
                  url: "https://docs.python.org/3/library/asyncio.html",
                  type: "article",
                  cost: "free",
                  author: "Python"
                }
              ]
            },
            {
              id: "mlops-w1-day3",
              type: "day",
              title: "Day 3: Docker, Images & Reproducible Runtime",
              shortTitle: "Docker & Runtime",
              dayLabel: "Day 3",
              description: "Containerization appears in every JD. Learn how ML containers differ from normal backend containers: large artifacts, CUDA images, model cache, startup time, and environment reproducibility.",
              concepts: [
                "Dockerfile basics: base image, layers, build context, cache, entrypoint",
                "CPU vs CUDA images and why driver/runtime compatibility matters",
                "Model artifact handling: bake into image vs download on startup vs mount from object storage",
                "Image size, cold start, dependency pinning, and vulnerability scanning",
                "Reproducibility: requirements lock, image tags, dataset version, model version",
                "Common issue: works locally but fails in cluster due to missing runtime, env vars, or permissions"
              ],
              practicePrompt: "Explain why `latest` tags are dangerous in model-serving deployments.",
              assignment: {
                title: "Containerize the inference API",
                time: "60-90 min",
                objective: "Build a Docker image for the Day 2 API with health checks and environment-driven configuration.",
                steps: [
                  "Create a slim CPU image first.",
                  "Add `/healthz` and `/readyz` endpoints.",
                  "Run the container locally with an environment variable for model version.",
                  "Document image size and startup time."
                ],
                pitfalls: [
                  "Interviewers ask about readiness vs liveness. Readiness should fail when the model is not loaded.",
                  "Do not put secrets in Docker images.",
                  "For GPU images, know the difference between NVIDIA driver on host and CUDA runtime in container."
                ]
              },
              resources: [
                {
                  id: "mlops-docker",
                  title: "Docker Documentation",
                  url: "https://docs.docker.com/",
                  type: "article",
                  cost: "free",
                  author: "Docker"
                },
                {
                  id: "mlops-nvidia-container-toolkit",
                  title: "NVIDIA Container Toolkit",
                  url: "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/index.html",
                  type: "article",
                  cost: "free",
                  author: "NVIDIA"
                }
              ]
            },
            {
              id: "mlops-w1-day4",
              type: "day",
              title: "Day 4: Kubernetes for ML Workloads",
              shortTitle: "Kubernetes for ML",
              dayLabel: "Day 4",
              description: "Refresh Kubernetes through the MLOps lens: Deployments, Jobs, CronJobs, Services, ConfigMaps, Secrets, probes, requests/limits, and debugging failed workloads.",
              concepts: [
                "Deployment vs Job vs CronJob for serving, training, and batch inference",
                "Requests and limits for CPU, memory, ephemeral storage, and GPU",
                "ConfigMaps, Secrets, ServiceAccounts, RBAC, and image pull secrets",
                "Probes: startup, readiness, and liveness for model services",
                "Debugging: describe, logs, events, exec, resource pressure, CrashLoopBackOff, ImagePullBackOff",
                "Horizontal Pod Autoscaler basics and why GPU autoscaling is harder"
              ],
              practicePrompt: "Prepare a 90-second answer for: 'A model-serving pod is CrashLoopBackOff. How do you debug it?'",
              assignment: {
                title: "Deploy the inference API to Kubernetes",
                time: "90 min",
                objective: "Run your container on kind/minikube with a Deployment, Service, probes, resource requests, and config.",
                steps: [
                  "Create Deployment, Service, ConfigMap, and Secret manifests.",
                  "Add resource requests and readiness/liveness probes.",
                  "Break the image tag and practice debugging ImagePullBackOff.",
                  "Break the readiness endpoint and observe service routing behavior."
                ],
                pitfalls: [
                  "A pod can be running but not ready. Interviewers expect you to know the difference.",
                  "OOMKilled often means memory limit, not just an application bug.",
                  "A model may require longer startup probes than a normal web service."
                ]
              },
              resources: [
                {
                  id: "mlops-k8s-workloads",
                  title: "Kubernetes Workloads",
                  url: "https://kubernetes.io/docs/concepts/workloads/",
                  type: "article",
                  cost: "free",
                  author: "Kubernetes"
                },
                {
                  id: "mlops-k8s-debug",
                  title: "Debug Pods",
                  url: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/",
                  type: "article",
                  cost: "free",
                  author: "Kubernetes"
                }
              ]
            },
            {
              id: "mlops-w1-day5",
              type: "day",
              title: "Day 5: MLflow, Model Registry & Experiment Tracking",
              shortTitle: "MLflow & Registry",
              dayLabel: "Day 5",
              description: "MLflow or equivalent appears across the JDs. Learn how experiment tracking, model registry, artifact storage, and promotion workflows connect to deployment.",
              concepts: [
                "Experiment tracking: params, metrics, artifacts, tags, source version",
                "Model registry: versions, stages, aliases, approvals, lineage",
                "Artifact store vs metadata store",
                "Promotion workflow: dev -> staging -> prod",
                "Reproducibility: code version, data version, environment, random seed",
                "Common regulated-industry angle: approval evidence and traceability"
              ],
              practicePrompt: "Explain the difference between an experiment run, a model artifact, and a registered model version.",
              assignment: {
                title: "Track and register a toy model",
                time: "90 min",
                objective: "Train a small sklearn/PyTorch model, log it to MLflow, register it, and load it from the registry in your API.",
                steps: [
                  "Log params, metrics, confusion matrix or sample output, and model artifact.",
                  "Register two model versions.",
                  "Change the API to load a model by alias or version.",
                  "Write a rollback note: how would you return to the previous version?"
                ],
                pitfalls: [
                  "Interviewers ask how you reproduce a model. Metrics alone are not enough.",
                  "Registry is not deployment by itself; it feeds deployment.",
                  "Know what happens if artifact storage is unavailable during startup."
                ]
              },
              resources: [
                {
                  id: "mlops-mlflow",
                  title: "MLflow Documentation",
                  url: "https://mlflow.org/docs/latest/index.html",
                  type: "article",
                  cost: "free",
                  author: "MLflow"
                },
                {
                  id: "mlops-dvc",
                  title: "DVC Documentation",
                  url: "https://dvc.org/doc",
                  type: "article",
                  cost: "free",
                  author: "DVC"
                }
              ]
            },
            {
              id: "mlops-w1-day6",
              type: "day",
              title: "Day 6: CI/CD for ML and GitOps Basics",
              shortTitle: "ML CI/CD",
              dayLabel: "Day 6",
              description: "The JDs expect CI/CD across backend services and ML workflows. Focus on test gates, image builds, model validation gates, and controlled rollout patterns.",
              concepts: [
                "CI for ML: unit tests, data checks, training smoke tests, model evaluation gates",
                "CD for services: build image, scan image, push image, deploy manifest",
                "GitHub Actions, GitLab CI, Jenkins, Argo CD, and Argo Workflows roles",
                "Canary and blue/green deployment strategies for model services",
                "Model validation gate before traffic shift",
                "Rollback triggers: error rate, latency, business metric, model quality metric"
              ],
              practicePrompt: "Answer: 'What checks would you run before promoting a new model to production?'",
              assignment: {
                title: "Create a model deployment pipeline design",
                time: "60 min",
                objective: "Write a CI/CD flow that builds the API image, runs tests, validates a model, and deploys to staging.",
                steps: [
                  "List pipeline stages and required artifacts.",
                  "Define one automated model-quality gate.",
                  "Define one manual approval gate.",
                  "Write rollback criteria for canary deployment."
                ],
                pitfalls: [
                  "Interviewers dislike vague 'we monitor it' answers. Name exact metrics.",
                  "Canary for model quality may need shadow traffic or delayed labels.",
                  "Separate code rollback from model rollback."
                ]
              },
              resources: [
                {
                  id: "mlops-github-actions",
                  title: "GitHub Actions Documentation",
                  url: "https://docs.github.com/en/actions",
                  type: "article",
                  cost: "free",
                  author: "GitHub"
                },
                {
                  id: "mlops-argocd",
                  title: "Argo CD Documentation",
                  url: "https://argo-cd.readthedocs.io/",
                  type: "article",
                  cost: "free",
                  author: "Argo"
                }
              ]
            },
            {
              id: "mlops-w1-project",
              type: "project",
              title: "Project #1 - Minimal Production ML Service",
              shortTitle: "Production ML Service",
              dayLabel: "Day 7",
              isProject: true,
              projectNumber: 1,
              description: "Combine the first week into a small but interview-ready service: FastAPI, Docker, Kubernetes manifests, MLflow tracking, and a CI/CD design.",
              concepts: [
                "FastAPI inference endpoint with request validation",
                "Docker image with health/readiness endpoints",
                "Kubernetes Deployment, Service, ConfigMap, Secret, probes, and resource requests",
                "MLflow model version loaded by config",
                "Latency and model-version logging",
                "README with architecture diagram, failure modes, and rollback plan"
              ],
              practicePrompt: "Record a 3-minute walkthrough explaining how this service moves from local training to production serving.",
              assignment: {
                title: "Interview demo package",
                time: "2-3 hours",
                objective: "Package the service so you can explain it during interviews without live debugging.",
                steps: [
                  "Add a README architecture diagram.",
                  "Add commands for local run, Docker run, and Kubernetes deploy.",
                  "Add a troubleshooting section for ImagePullBackOff, CrashLoopBackOff, readiness failure, and bad model version."
                ],
                pitfalls: [
                  "A good demo includes operational failure handling, not just a happy path.",
                  "Be ready to answer where metrics, logs, artifacts, and configs live."
                ]
              },
              resources: []
            }
          ]
        },
        {
          id: "mlops-week-2",
          title: "Week 2",
          subtitle: "GPU Kubernetes, Distributed Training & ML Platforms",
          days: "Days 8-14",
          goal: "Get interview-ready for the GPU-heavy parts of the JDs: CUDA basics, GPU scheduling, device plugins, Ray/KubeRay, Kubeflow, Kueue/Volcano, and distributed training.",
          nodes: [
            {
              id: "mlops-w2-day8",
              type: "day",
              title: "Day 8: GPU Fundamentals for MLOps",
              shortTitle: "GPU Fundamentals",
              dayLabel: "Day 8",
              description: "You do not need to write CUDA kernels for most MLOps roles, but you must understand GPU memory, utilization, batching, drivers, CUDA runtime, and why accelerators change scheduling and cost.",
              concepts: [
                "GPU vs CPU: parallelism, throughput, memory bandwidth, and accelerator economics",
                "CUDA driver vs CUDA runtime vs framework build compatibility",
                "GPU memory: model weights, activations, batch size, KV cache, fragmentation",
                "Compute utilization vs memory utilization vs memory bandwidth bottlenecks",
                "nvidia-smi basics: utilization, memory, processes, power, temperature",
                "Common cost issue: allocated GPU but low utilization"
              ],
              practicePrompt: "Prepare a simple answer for: 'Why is my GPU allocated but utilization is near 0%?'",
              assignment: {
                title: "Read GPU telemetry",
                time: "45 min",
                objective: "Use `nvidia-smi` output examples or a real GPU machine to identify memory pressure, idle GPUs, and overloaded GPUs.",
                steps: [
                  "Capture or find sample `nvidia-smi` outputs.",
                  "Label memory used, GPU utilization, process id, and power usage.",
                  "Write three likely causes for low utilization."
                ],
                pitfalls: [
                  "Low GPU utilization can be caused by CPU preprocessing, data loading, small batch size, or network/storage bottlenecks.",
                  "GPU memory full does not mean GPU compute is busy.",
                  "Driver/runtime mismatch is a common deployment failure."
                ]
              },
              resources: [
                {
                  id: "mlops-cuda-c-programming-guide",
                  title: "CUDA C++ Programming Guide",
                  url: "https://docs.nvidia.com/cuda/cuda-c-programming-guide/",
                  type: "article",
                  cost: "free",
                  author: "NVIDIA"
                },
                {
                  id: "mlops-nvidia-smi",
                  title: "NVIDIA System Management Interface",
                  url: "https://developer.nvidia.com/system-management-interface",
                  type: "article",
                  cost: "free",
                  author: "NVIDIA"
                }
              ]
            },
            {
              id: "mlops-w2-day9",
              type: "day",
              title: "Day 9: GPUs on Kubernetes",
              shortTitle: "GPU K8s",
              dayLabel: "Day 9",
              description: "The JDs strongly emphasize GPU clusters on Kubernetes. Learn NVIDIA device plugin, GPU Operator, node labels, taints/tolerations, requests, scheduling, and basic troubleshooting.",
              concepts: [
                "NVIDIA device plugin exposes `nvidia.com/gpu` resources",
                "GPU Operator installs driver, toolkit, device plugin, DCGM exporter, and related components",
                "GPU node pools, labels, taints, tolerations, and node affinity",
                "GPU requests and limits: why GPUs are scheduled as integer extended resources",
                "MIG basics: partitioning supported NVIDIA GPUs for smaller workloads",
                "Troubleshooting: missing device plugin, unschedulable pods, driver mismatch, CUDA unavailable"
              ],
              practicePrompt: "Answer: 'A GPU pod is Pending even though the cluster has GPU nodes. What do you check?'",
              assignment: {
                title: "Write GPU scheduling manifests",
                time: "90 min",
                objective: "Create Kubernetes YAML for a GPU workload with node selector, toleration, resource request, and basic startup command.",
                steps: [
                  "Write a pod or Job requesting `nvidia.com/gpu: 1`.",
                  "Add nodeSelector/affinity for GPU nodes.",
                  "Add tolerations for a GPU node taint.",
                  "Add a debugging checklist for Pending and CUDA unavailable."
                ],
                pitfalls: [
                  "If the device plugin is not running, the scheduler does not see GPUs.",
                  "Requests for GPUs must normally equal limits.",
                  "Node labels and taints are separate concepts; interviewers often test this."
                ]
              },
              resources: [
                {
                  id: "mlops-k8s-gpu-scheduling",
                  title: "Kubernetes - Schedule GPUs",
                  url: "https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/",
                  type: "article",
                  cost: "free",
                  author: "Kubernetes"
                },
                {
                  id: "mlops-nvidia-device-plugin",
                  title: "NVIDIA k8s-device-plugin",
                  url: "https://github.com/NVIDIA/k8s-device-plugin",
                  type: "github",
                  cost: "free",
                  author: "NVIDIA"
                },
                {
                  id: "mlops-gpu-operator",
                  title: "NVIDIA GPU Operator",
                  url: "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html",
                  type: "article",
                  cost: "free",
                  author: "NVIDIA"
                }
              ]
            },
            {
              id: "mlops-w2-day10",
              type: "day",
              title: "Day 10: Distributed Training with PyTorch, DeepSpeed & Ray",
              shortTitle: "Distributed Training",
              dayLabel: "Day 10",
              description: "Several JDs call out PyTorch DDP/FSDP, DeepSpeed, Megatron, Ray Train, and multi-node GPU workloads. Learn the concepts enough to debug platform issues and explain tradeoffs.",
              concepts: [
                "Data parallelism vs model parallelism vs pipeline parallelism",
                "PyTorch DDP and FSDP basics",
                "DeepSpeed ZeRO stages and memory optimization motivation",
                "Ray Train and why Ray is common for distributed ML workloads",
                "NCCL, network bandwidth, storage throughput, and checkpointing bottlenecks",
                "Failure modes: stragglers, OOM, bad rendezvous config, slow dataloaders, checkpoint stalls"
              ],
              practicePrompt: "Answer: 'Training scales poorly from 1 GPU to 8 GPUs. What bottlenecks do you investigate?'",
              assignment: {
                title: "Distributed training debug plan",
                time: "60 min",
                objective: "Write a diagnostic checklist for a slow or failing distributed training job.",
                steps: [
                  "List metrics to capture: GPU utilization, memory, network, storage IO, dataloader time, step time.",
                  "List logs/configs to inspect: world size, rank, rendezvous endpoint, NCCL settings, checkpoint path.",
                  "Write a short explanation of DDP vs FSDP."
                ],
                pitfalls: [
                  "More GPUs can make training slower if input pipeline or network is the bottleneck.",
                  "OOM can come from activations, optimizer state, batch size, or fragmentation.",
                  "Checkpointing to slow storage can dominate training time."
                ]
              },
              resources: [
                {
                  id: "mlops-pytorch-distributed",
                  title: "PyTorch Distributed Overview",
                  url: "https://pytorch.org/tutorials/beginner/dist_overview.html",
                  type: "article",
                  cost: "free",
                  author: "PyTorch"
                },
                {
                  id: "mlops-deepspeed",
                  title: "DeepSpeed Documentation",
                  url: "https://www.deepspeed.ai/",
                  type: "article",
                  cost: "free",
                  author: "Microsoft"
                },
                {
                  id: "mlops-ray-train",
                  title: "Ray Train Documentation",
                  url: "https://docs.ray.io/en/latest/train/train.html",
                  type: "article",
                  cost: "free",
                  author: "Anyscale/Ray"
                }
              ]
            },
            {
              id: "mlops-w2-day11",
              type: "day",
              title: "Day 11: Ray, KubeRay, Kueue & Volcano",
              shortTitle: "Ray & Batch Scheduling",
              dayLabel: "Day 11",
              description: "The kAIgentic JD explicitly mentions Ray/KubeRay, Argo, Kueue, and Volcano. Learn how distributed jobs are scheduled, queued, autoscaled, and isolated on Kubernetes.",
              concepts: [
                "Ray cluster: head node, worker nodes, autoscaling, runtime environments",
                "KubeRay operator and RayJob/RayService concepts",
                "Batch scheduling vs service scheduling",
                "Kueue: queueing, quotas, cohorts, admission control for batch workloads",
                "Volcano: gang scheduling and ML/HPC batch workload support",
                "Common platform problem: fair GPU sharing across teams"
              ],
              practicePrompt: "Explain when you would use Kubernetes Jobs, RayJob, Argo Workflow, Kueue, or Volcano.",
              assignment: {
                title: "Design a GPU job queue",
                time: "75 min",
                objective: "Design a shared GPU training platform for three data science teams with quotas and queued jobs.",
                steps: [
                  "Define namespaces, quotas, and queue names.",
                  "Describe how jobs are admitted when GPUs are scarce.",
                  "Add one priority rule and one fairness rule.",
                  "Write the failure mode when a team submits too many jobs."
                ],
                pitfalls: [
                  "Without queueing, GPU clusters become first-come-first-served and hard to govern.",
                  "Gang scheduling matters when a distributed job needs all workers together.",
                  "Autoscaling GPU nodes is slower and more expensive than CPU autoscaling."
                ]
              },
              resources: [
                {
                  id: "mlops-kuberay",
                  title: "KubeRay Documentation",
                  url: "https://docs.ray.io/en/latest/cluster/kubernetes/index.html",
                  type: "article",
                  cost: "free",
                  author: "Ray"
                },
                {
                  id: "mlops-kueue",
                  title: "Kueue Documentation",
                  url: "https://kueue.sigs.k8s.io/",
                  type: "article",
                  cost: "free",
                  author: "Kubernetes SIG Scheduling"
                },
                {
                  id: "mlops-volcano",
                  title: "Volcano Documentation",
                  url: "https://volcano.sh/en/docs/",
                  type: "article",
                  cost: "free",
                  author: "Volcano"
                }
              ]
            },
            {
              id: "mlops-w2-day12",
              type: "day",
              title: "Day 12: Kubeflow, Argo Workflows & JupyterHub",
              shortTitle: "ML Platform Tools",
              dayLabel: "Day 12",
              description: "The JDs mention Kubeflow, Argo/Airflow, MLflow, and JupyterHub. Learn the platform pattern: self-service notebooks, repeatable pipelines, experiment tracking, and controlled promotion.",
              concepts: [
                "Kubeflow components at a high level: pipelines, notebooks, training operators, model serving",
                "Argo Workflows as Kubernetes-native workflow execution",
                "JupyterHub for self-service data science environments",
                "Pipeline steps: data validation, training, evaluation, registration, deployment",
                "Artifact passing, parameterization, caching, and retries",
                "Multi-team platform concerns: RBAC, namespaces, quotas, templates, golden paths"
              ],
              practicePrompt: "Answer: 'How would you build a self-service ML platform for data scientists without giving everyone cluster-admin?'",
              assignment: {
                title: "Design a self-service ML platform",
                time: "90 min",
                objective: "Create a platform design with notebooks, pipelines, MLflow, artifact storage, and deployment controls.",
                steps: [
                  "Draw the user workflow from notebook experiment to production deployment.",
                  "Define namespace/RBAC boundaries.",
                  "List required templates: training job, pipeline, model service, dashboard.",
                  "Define who approves production promotion."
                ],
                pitfalls: [
                  "Self-service does not mean no guardrails.",
                  "Notebook environments need reproducibility and dependency control.",
                  "Interviewers expect platform thinking: templates, quotas, and golden paths."
                ]
              },
              resources: [
                {
                  id: "mlops-kubeflow",
                  title: "Kubeflow Documentation",
                  url: "https://www.kubeflow.org/docs/",
                  type: "article",
                  cost: "free",
                  author: "Kubeflow"
                },
                {
                  id: "mlops-argo-workflows",
                  title: "Argo Workflows Documentation",
                  url: "https://argo-workflows.readthedocs.io/",
                  type: "article",
                  cost: "free",
                  author: "Argo"
                },
                {
                  id: "mlops-jupyterhub",
                  title: "JupyterHub Documentation",
                  url: "https://jupyterhub.readthedocs.io/",
                  type: "article",
                  cost: "free",
                  author: "Jupyter"
                }
              ]
            },
            {
              id: "mlops-w2-day13",
              type: "day",
              title: "Day 13: Data Pipelines, Quality & Feature/Vector Stores",
              shortTitle: "Data Quality & Stores",
              dayLabel: "Day 13",
              description: "The JDs emphasize data engineering, data quality, schema management, feature stores, vector databases, and document AI pipelines. Learn the minimum production patterns.",
              concepts: [
                "Data validation: schema, nulls, ranges, distributions, freshness, duplicates",
                "Training-serving skew and how it appears in production",
                "Batch pipelines with Airflow/Argo and streaming/event pipelines with Kafka/SQS",
                "Feature stores: offline store, online store, point-in-time correctness",
                "Vector stores for retrieval systems: pgvector, Pinecone, Weaviate",
                "Document AI ingestion: extraction, chunking, metadata, retries, dead-letter queues"
              ],
              practicePrompt: "Answer: 'A model suddenly performs poorly but the service is healthy. What do you check?'",
              assignment: {
                title: "Add data quality gates",
                time: "75 min",
                objective: "Design validation checks that run before training and before batch inference.",
                steps: [
                  "Define five schema or quality checks.",
                  "Define one drift or distribution check.",
                  "Define what happens on validation failure.",
                  "Add a dead-letter queue plan for bad documents or records."
                ],
                pitfalls: [
                  "Schema validity does not guarantee model usefulness.",
                  "Feature leakage and training-serving skew are common interview topics.",
                  "Vector DB issues often come from bad chunking or metadata, not the DB itself."
                ]
              },
              resources: [
                {
                  id: "mlops-gx",
                  title: "Great Expectations Documentation",
                  url: "https://docs.greatexpectations.io/",
                  type: "article",
                  cost: "free",
                  author: "Great Expectations"
                },
                {
                  id: "mlops-feast",
                  title: "Feast Documentation",
                  url: "https://docs.feast.dev/",
                  type: "article",
                  cost: "free",
                  author: "Feast"
                },
                {
                  id: "mlops-pgvector",
                  title: "pgvector",
                  url: "https://github.com/pgvector/pgvector",
                  type: "github",
                  cost: "free",
                  author: "pgvector"
                }
              ]
            },
            {
              id: "mlops-w2-project",
              type: "project",
              title: "Project #2 - GPU ML Platform Design",
              shortTitle: "GPU Platform Design",
              dayLabel: "Day 14",
              isProject: true,
              projectNumber: 2,
              description: "Create the architecture and manifests for a shared GPU ML platform using Kubernetes, GPU scheduling, Ray/KubeRay, MLflow, and queued training workloads.",
              concepts: [
                "GPU node pool with labels, taints, and tolerations",
                "NVIDIA device plugin or GPU Operator",
                "Ray/KubeRay training workload path",
                "MLflow experiment and registry path",
                "Kueue/Volcano style quota and queueing model",
                "Dashboard metrics: GPU utilization, memory, queue time, job success rate"
              ],
              practicePrompt: "Present the platform in 5 minutes as if the interviewer asked: 'How would you build distributed training infrastructure on EKS?'",
              assignment: {
                title: "Build an interview architecture packet",
                time: "2-3 hours",
                objective: "Prepare a diagram, core YAML snippets, and a troubleshooting checklist for a GPU training platform.",
                steps: [
                  "Draw platform components and data/artifact flow.",
                  "Write sample GPU Job or RayJob YAML.",
                  "Write a GPU scheduling troubleshooting checklist.",
                  "Add cost controls: quotas, idle GPU alerts, and scale-down policy."
                ],
                pitfalls: [
                  "Interviewers may ask what breaks first at scale: queueing, storage throughput, network, or GPU availability.",
                  "Be ready to explain GPU underutilization with evidence, not guesses."
                ]
              },
              resources: []
            }
          ]
        },
        {
          id: "mlops-week-3",
          title: "Week 3",
          subtitle: "Model Serving, LLMOps & Observability",
          days: "Days 15-21",
          goal: "Cover the serving and LLMOps requirements from the JDs: KServe/Seldon/FastAPI, vLLM/TGI/Ollama, async queues, model gateways, guardrails, observability, drift, and cost.",
          nodes: [
            {
              id: "mlops-w3-day15",
              type: "day",
              title: "Day 15: Model Serving Patterns",
              shortTitle: "Model Serving",
              dayLabel: "Day 15",
              description: "Learn serving choices that appear in interviews: FastAPI, KServe, Seldon, BentoML, batch inference, real-time APIs, canary, shadow, and blue/green.",
              concepts: [
                "Real-time serving vs batch inference vs async inference",
                "FastAPI for custom services and KServe/Seldon for Kubernetes-native model serving",
                "Autoscaling based on QPS, latency, queue length, CPU/GPU utilization",
                "Canary, blue/green, shadow traffic, and model rollback",
                "Model warmup, cold start, artifact download, and readiness",
                "Common SLOs: p95 latency, error rate, availability, cost per prediction"
              ],
              practicePrompt: "Answer: 'When would you choose KServe over a custom FastAPI deployment?'",
              assignment: {
                title: "Serving tradeoff matrix",
                time: "60 min",
                objective: "Compare FastAPI, KServe, Seldon, and batch jobs for four serving scenarios.",
                steps: [
                  "Score each option for control, speed, platform complexity, autoscaling, and rollback.",
                  "Pick one option for a low-latency API and one for nightly batch inference.",
                  "Define the production SLOs."
                ],
                pitfalls: [
                  "KServe does not remove the need to understand containers, metrics, and rollout safety.",
                  "Batch inference failures need retry/idempotency semantics.",
                  "Shadow traffic may not give immediate labels for quality comparison."
                ]
              },
              resources: [
                {
                  id: "mlops-kserve",
                  title: "KServe Documentation",
                  url: "https://kserve.github.io/website/latest/",
                  type: "article",
                  cost: "free",
                  author: "KServe"
                },
                {
                  id: "mlops-seldon",
                  title: "Seldon Core Documentation",
                  url: "https://docs.seldon.ai/",
                  type: "article",
                  cost: "free",
                  author: "Seldon"
                },
                {
                  id: "mlops-bentoml",
                  title: "BentoML Documentation",
                  url: "https://docs.bentoml.com/",
                  type: "article",
                  cost: "free",
                  author: "BentoML"
                }
              ]
            },
            {
              id: "mlops-w3-day16",
              type: "day",
              title: "Day 16: LLM Serving with vLLM, TGI & Ollama",
              shortTitle: "LLM Serving",
              dayLabel: "Day 16",
              description: "The JDs call out self-hosted LLMs with vLLM, TGI, Ollama, and GPU orchestration. Learn the serving internals that interviewers now test.",
              concepts: [
                "vLLM, Text Generation Inference, and Ollama roles",
                "Continuous batching and why it improves throughput",
                "KV cache: memory impact, concurrency, context length, and eviction pressure",
                "Quantization: FP16/BF16/INT8/INT4 tradeoffs",
                "Speculative decoding, tensor parallelism, and model sharding at a high level",
                "Throughput vs latency tradeoff for LLM inference"
              ],
              practicePrompt: "Answer: 'Why does increasing context length reduce concurrency on the same GPU?'",
              assignment: {
                title: "LLM serving sizing exercise",
                time: "75 min",
                objective: "Estimate how batch size, context length, and model size affect GPU memory and throughput.",
                steps: [
                  "Pick a 7B or 8B model.",
                  "List memory components: weights, KV cache, activations/overhead.",
                  "Write how you would test max concurrency safely.",
                  "Define metrics to track during load testing."
                ],
                pitfalls: [
                  "GPU OOM during LLM serving is often KV cache pressure, not just model weights.",
                  "Higher batching can improve throughput while hurting tail latency.",
                  "Quantization saves memory but may affect quality and compatibility."
                ]
              },
              resources: [
                {
                  id: "mlops-vllm",
                  title: "vLLM Documentation",
                  url: "https://docs.vllm.ai/",
                  type: "article",
                  cost: "free",
                  author: "vLLM"
                },
                {
                  id: "mlops-tgi",
                  title: "Text Generation Inference",
                  url: "https://huggingface.co/docs/text-generation-inference/index",
                  type: "article",
                  cost: "free",
                  author: "Hugging Face"
                },
                {
                  id: "mlops-ollama",
                  title: "Ollama Documentation",
                  url: "https://github.com/ollama/ollama/tree/main/docs",
                  type: "github",
                  cost: "free",
                  author: "Ollama"
                }
              ]
            },
            {
              id: "mlops-w3-day17",
              type: "day",
              title: "Day 17: Async Inference, Queues & Micro-Batching",
              shortTitle: "Async Inference",
              dayLabel: "Day 17",
              description: "AIOps and document AI JDs emphasize SQS/SNS, Kafka, EventBridge, Step Functions, async processing, and micro-batching. Learn how to make slow AI workflows reliable.",
              concepts: [
                "Queue-backed inference for long-running or bursty workloads",
                "SQS/SNS, Kafka, EventBridge, and Step Functions roles",
                "Micro-batching: latency/throughput tradeoff",
                "Idempotency keys, retries, visibility timeout, dead-letter queues",
                "Backpressure and autoscaling workers based on queue depth",
                "Document AI pipeline: upload, parse, chunk, embed, infer, store, notify"
              ],
              practicePrompt: "Answer: 'How do you prevent duplicate processing in a queue-based inference system?'",
              assignment: {
                title: "Design async document inference",
                time: "90 min",
                objective: "Design an async pipeline for document ingestion and model inference with retries and dead-letter handling.",
                steps: [
                  "Draw queue, worker, object storage, metadata DB, and callback/status API.",
                  "Define retry policy and DLQ behavior.",
                  "Define autoscaling metric.",
                  "Define idempotency strategy."
                ],
                pitfalls: [
                  "At-least-once delivery means duplicate work is normal unless you design for idempotency.",
                  "Visibility timeout must exceed expected processing time or messages can be processed twice.",
                  "Micro-batching can improve GPU utilization but increases latency."
                ]
              },
              resources: [
                {
                  id: "mlops-sqs",
                  title: "Amazon SQS Documentation",
                  url: "https://docs.aws.amazon.com/sqs/",
                  type: "article",
                  cost: "free",
                  author: "AWS"
                },
                {
                  id: "mlops-step-functions",
                  title: "AWS Step Functions Documentation",
                  url: "https://docs.aws.amazon.com/step-functions/",
                  type: "article",
                  cost: "free",
                  author: "AWS"
                },
                {
                  id: "mlops-kafka",
                  title: "Apache Kafka Documentation",
                  url: "https://kafka.apache.org/documentation/",
                  type: "article",
                  cost: "free",
                  author: "Apache Kafka"
                }
              ]
            },
            {
              id: "mlops-w3-day18",
              type: "day",
              title: "Day 18: LLM Gateways, Routing, Guardrails & Governance",
              shortTitle: "LLM Gateways",
              dayLabel: "Day 18",
              description: "The AIOps JD mentions LiteLLM/Portkey, model governance, guardrails, usage controls, and hallucination monitoring. Learn the gateway and governance layer.",
              concepts: [
                "LLM gateway responsibilities: routing, auth, rate limits, budgets, audit logs",
                "Model routing: cost, latency, quality, fallback, and tenant policy",
                "LiteLLM and Portkey style control planes",
                "Guardrails: prompt injection, PII, unsafe output, hallucination checks",
                "Responsible AI basics: explainability, bias/fairness monitoring, model validation",
                "Audit requirements in regulated or client-facing environments"
              ],
              practicePrompt: "Answer: 'What belongs in an LLM gateway instead of every application team reimplementing it?'",
              assignment: {
                title: "Design an LLM gateway policy",
                time: "60 min",
                objective: "Define routing, budget, logging, and guardrail policies for three internal AI applications.",
                steps: [
                  "Define model routing rules.",
                  "Add per-team budget and rate limits.",
                  "List audit fields to log.",
                  "Define one PII and one prompt-injection guardrail."
                ],
                pitfalls: [
                  "Guardrails reduce risk but do not prove correctness.",
                  "Do not log sensitive prompts without retention and access policies.",
                  "Fallback models can change answer quality and must be evaluated."
                ]
              },
              resources: [
                {
                  id: "mlops-litellm",
                  title: "LiteLLM Documentation",
                  url: "https://docs.litellm.ai/",
                  type: "article",
                  cost: "free",
                  author: "LiteLLM"
                },
                {
                  id: "mlops-portkey",
                  title: "Portkey Documentation",
                  url: "https://portkey.ai/docs",
                  type: "article",
                  cost: "free",
                  author: "Portkey"
                },
                {
                  id: "mlops-owasp-llm",
                  title: "OWASP Top 10 for LLM Applications",
                  url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
                  type: "article",
                  cost: "free",
                  author: "OWASP"
                }
              ]
            },
            {
              id: "mlops-w3-day19",
              type: "day",
              title: "Day 19: Observability for ML, LLMs & GPUs",
              shortTitle: "AI Observability",
              dayLabel: "Day 19",
              description: "The JDs repeatedly mention Prometheus, Grafana, OpenTelemetry, X-Ray, drift, latency, token usage, inference quality, and GPU utilization. Build a metrics taxonomy you can explain.",
              concepts: [
                "System metrics: latency, error rate, saturation, availability, queue depth",
                "Model metrics: accuracy, drift, data quality, calibration, business KPIs",
                "LLM metrics: tokens, cost, context length, refusal rate, hallucination signal, eval score",
                "GPU metrics: utilization, memory, power, temperature, SM occupancy, idle allocation",
                "OpenTelemetry traces across API, queue, worker, vector DB, and model server",
                "Alert design: symptom alerts, SLO burn rate, and actionable runbooks"
              ],
              practicePrompt: "Answer: 'What dashboard would you build for a production LLM inference service?'",
              assignment: {
                title: "Build an observability checklist",
                time: "75 min",
                objective: "Define dashboards and alerts for real-time model serving, async document inference, and GPU training.",
                steps: [
                  "List golden signals for each workload.",
                  "Define three Prometheus-style alert rules in plain English.",
                  "Add trace spans for API, queue, model call, and storage.",
                  "Define drift and quality monitoring inputs."
                ],
                pitfalls: [
                  "Do not alert only on CPU for GPU workloads.",
                  "Model quality often has delayed labels, so use proxy metrics and offline evals.",
                  "High average latency can hide p95/p99 failures."
                ]
              },
              resources: [
                {
                  id: "mlops-opentelemetry",
                  title: "OpenTelemetry Documentation",
                  url: "https://opentelemetry.io/docs/",
                  type: "article",
                  cost: "free",
                  author: "OpenTelemetry"
                },
                {
                  id: "mlops-prometheus",
                  title: "Prometheus Documentation",
                  url: "https://prometheus.io/docs/introduction/overview/",
                  type: "article",
                  cost: "free",
                  author: "Prometheus"
                },
                {
                  id: "mlops-dcgm-exporter",
                  title: "NVIDIA DCGM Exporter",
                  url: "https://github.com/NVIDIA/dcgm-exporter",
                  type: "github",
                  cost: "free",
                  author: "NVIDIA"
                },
                {
                  id: "mlops-evidently",
                  title: "Evidently Documentation",
                  url: "https://docs.evidentlyai.com/",
                  type: "article",
                  cost: "free",
                  author: "Evidently"
                }
              ]
            },
            {
              id: "mlops-w3-day20",
              type: "day",
              title: "Day 20: AWS/GCP AI Infrastructure & Security",
              shortTitle: "Cloud AI Infra",
              dayLabel: "Day 20",
              description: "The JDs mention AWS heavily: EC2, EKS, S3, Lambda, Bedrock, SageMaker, API Gateway, EventBridge, SQS/SNS, KMS, IAM, VPC endpoints, and CloudTrail. Learn the interview-level architecture.",
              concepts: [
                "AWS AI stack: EKS, EC2 GPU nodes, S3, ECR, SQS/SNS, Lambda, Step Functions, Bedrock, SageMaker",
                "GCP equivalents: GKE, Cloud Storage, Pub/Sub, Vertex AI, Cloud Run",
                "Terraform or CloudFormation for repeatable infrastructure",
                "IAM least privilege, KMS encryption, VPC endpoints, private networking",
                "CloudTrail/audit logs and production access controls",
                "Cost controls: right-sizing, autoscaling, spot/preemptible instances, idle GPU alerts"
              ],
              practicePrompt: "Answer: 'How would you secure an ML platform running on AWS EKS?'",
              assignment: {
                title: "Design secure AWS LLM infrastructure",
                time: "90 min",
                objective: "Create an AWS architecture for self-hosted LLM inference with private networking, queues, storage, and audit controls.",
                steps: [
                  "Place API, queue, workers, model server, S3, and observability components.",
                  "Define IAM roles and least-privilege boundaries.",
                  "Add KMS, VPC endpoints, and CloudTrail.",
                  "Add cost controls for GPU nodes."
                ],
                pitfalls: [
                  "Do not give pods broad node-instance-role permissions; use workload identity where possible.",
                  "Private networking affects access to model artifacts and package repositories.",
                  "GPU spot interruptions need graceful drain or checkpointing."
                ]
              },
              resources: [
                {
                  id: "mlops-eks",
                  title: "Amazon EKS Documentation",
                  url: "https://docs.aws.amazon.com/eks/",
                  type: "article",
                  cost: "free",
                  author: "AWS"
                },
                {
                  id: "mlops-sagemaker",
                  title: "Amazon SageMaker Documentation",
                  url: "https://docs.aws.amazon.com/sagemaker/",
                  type: "article",
                  cost: "free",
                  author: "AWS"
                },
                {
                  id: "mlops-terraform",
                  title: "Terraform Documentation",
                  url: "https://developer.hashicorp.com/terraform/docs",
                  type: "article",
                  cost: "free",
                  author: "HashiCorp"
                }
              ]
            },
            {
              id: "mlops-w3-project",
              type: "project",
              title: "Project #3 - Production LLMOps Serving Platform",
              shortTitle: "LLMOps Serving Platform",
              dayLabel: "Day 21",
              isProject: true,
              projectNumber: 3,
              description: "Design and partially implement a production LLM serving platform with self-hosted inference, async queues, gateway policy, observability, and GPU cost controls.",
              concepts: [
                "vLLM or TGI model server behind a gateway",
                "FastAPI status API for async jobs",
                "SQS/Kafka style queue and worker pattern",
                "Prometheus/Grafana and OpenTelemetry tracing design",
                "GPU dashboard with utilization, memory, queue depth, and cost",
                "Guardrails, audit logs, model routing, and fallback policy"
              ],
              practicePrompt: "Present this as a 6-minute system design answer for an AIOps or AI Infrastructure Engineer interview.",
              assignment: {
                title: "LLMOps interview packet",
                time: "3-4 hours",
                objective: "Prepare a system design document with architecture, metrics, failure modes, security controls, and scaling plan.",
                steps: [
                  "Draw request path, async path, and observability path.",
                  "Define autoscaling signals for API, queue workers, and GPU model server.",
                  "Write a runbook for GPU OOM, latency spike, bad model output, and queue backlog.",
                  "Add cost and security controls."
                ],
                pitfalls: [
                  "Interviewers will ask how you know whether the bottleneck is API, queue, GPU, storage, or downstream service.",
                  "Be ready to explain how batching helps throughput and hurts latency.",
                  "Do not ignore governance: budgets, audit logs, and model access policy matter."
                ]
              },
              resources: []
            }
          ]
        },
        {
          id: "mlops-week-4",
          title: "Week 4",
          subtitle: "Interview Systems, Debugging & Portfolio",
          days: "Days 22-30",
          goal: "Convert skills into interview performance: system design, debugging drills, behavioral stories, portfolio packaging, and focused mock interviews.",
          nodes: [
            {
              id: "mlops-w4-day22-23",
              type: "day",
              title: "Day 22-23: MLOps System Design Drills",
              shortTitle: "System Design Drills",
              dayLabel: "Day 22-23",
              description: "Practice the exact architecture prompts these JDs imply: distributed training platform, document AI platform, model-serving platform, and ML CI/CD platform.",
              concepts: [
                "Design an end-to-end ML platform for data scientists",
                "Design self-hosted LLM inference on Kubernetes with GPU autoscaling",
                "Design async document AI processing with queues and observability",
                "Design model CI/CD with validation gates and canary rollout",
                "Discuss tradeoffs: managed service vs Kubernetes, FastAPI vs KServe, Ray vs plain Jobs",
                "Make every design measurable: latency, throughput, utilization, cost, reliability"
              ],
              practicePrompt: "Pick one design prompt and record yourself answering it in 8 minutes using a diagram.",
              assignment: {
                title: "Four design one-pagers",
                time: "2-3 hours",
                objective: "Write one-page designs for the four highest-probability interview scenarios.",
                steps: [
                  "For each design, include requirements, components, data flow, scaling, observability, security, and failure handling.",
                  "Add three tradeoffs per design.",
                  "Add two interviewer follow-up questions per design."
                ],
                pitfalls: [
                  "Do not start with tools. Start with workload shape and requirements.",
                  "Always explain how deployment, rollback, and monitoring work.",
                  "If GPUs are involved, discuss utilization and queueing."
                ]
              },
              resources: [
                {
                  id: "mlops-system-design-primer",
                  title: "Machine Learning System Design",
                  url: "https://github.com/chiphuyen/machine-learning-systems-design",
                  type: "github",
                  cost: "free",
                  author: "Chip Huyen"
                }
              ]
            },
            {
              id: "mlops-w4-day24-25",
              type: "day",
              title: "Day 24-25: Debugging and Incident Drills",
              shortTitle: "Debugging Drills",
              dayLabel: "Day 24-25",
              description: "Interviewers often test how you debug production issues. Practice crisp, layered debugging for Kubernetes, ML pipelines, GPU workloads, queues, and model quality.",
              concepts: [
                "Kubernetes incidents: Pending, CrashLoopBackOff, OOMKilled, bad readiness, failed rollout",
                "Pipeline incidents: schema break, missing artifact, failed training, data drift",
                "GPU incidents: low utilization, OOM, unavailable CUDA, bad node scheduling",
                "Serving incidents: latency spike, error spike, bad model version, queue backlog",
                "LLM incidents: hallucination spike, cost spike, safety failure, context overflow",
                "Incident communication: impact, timeline, mitigation, root cause, follow-up"
              ],
              practicePrompt: "Practice this answer: 'p95 inference latency doubled after deployment. Walk me through your debugging process.'",
              assignment: {
                title: "Write five incident runbooks",
                time: "2 hours",
                objective: "Create concise runbooks for the five most likely interview debugging scenarios.",
                steps: [
                  "Write detection signals.",
                  "Write first five commands or dashboards to check.",
                  "Write likely root causes.",
                  "Write mitigation and long-term fix."
                ],
                pitfalls: [
                  "A senior answer separates symptom, mitigation, root cause, and prevention.",
                  "Do not jump to redeploy before checking metrics and recent changes.",
                  "For ML issues, system health can be green while model output is wrong."
                ]
              },
              resources: [
                {
                  id: "mlops-k8s-troubleshoot",
                  title: "Kubernetes Troubleshooting Applications",
                  url: "https://kubernetes.io/docs/tasks/debug/debug-application/",
                  type: "article",
                  cost: "free",
                  author: "Kubernetes"
                },
                {
                  id: "mlops-sre-book",
                  title: "Site Reliability Engineering",
                  url: "https://sre.google/sre-book/table-of-contents/",
                  type: "book",
                  cost: "free",
                  author: "Google"
                }
              ]
            },
            {
              id: "mlops-w4-day26",
              type: "day",
              title: "Day 26: Coding and YAML Interview Prep",
              shortTitle: "Coding & YAML",
              dayLabel: "Day 26",
              description: "Drill the practical artifacts interviewers ask for: Python scripts, FastAPI endpoints, Dockerfiles, Kubernetes YAML, Terraform snippets, and pipeline configs.",
              concepts: [
                "Python: parse logs, call APIs, retry failed jobs, validate records",
                "FastAPI: endpoint with validation, error handling, and metrics",
                "Dockerfile: slim image, non-root user, health checks, pinned dependencies",
                "Kubernetes: Deployment, Job, Service, HPA, ConfigMap, Secret, GPU Job",
                "Terraform: module inputs, remote state, IAM role, EKS node group",
                "CI/CD: build-test-push-deploy pipeline with environment gates"
              ],
              practicePrompt: "Write a Kubernetes GPU Job from memory, then compare it with docs.",
              assignment: {
                title: "Artifact speed run",
                time: "2 hours",
                objective: "Create six small snippets you can explain in an interview.",
                steps: [
                  "Write one Python utility.",
                  "Write one FastAPI endpoint.",
                  "Write one Dockerfile.",
                  "Write one Kubernetes Deployment.",
                  "Write one GPU Job.",
                  "Write one GitHub Actions pipeline outline."
                ],
                pitfalls: [
                  "YAML interviews test whether you know probes, resources, labels/selectors, and service wiring.",
                  "For GPU YAML, forgetting `nvidia.com/gpu` is a common miss.",
                  "For Terraform, be clear about state, variables, outputs, and least privilege."
                ]
              },
              resources: []
            },
            {
              id: "mlops-w4-day27",
              type: "day",
              title: "Day 27: Behavioral and Leadership Stories",
              shortTitle: "Behavioral Stories",
              dayLabel: "Day 27",
              description: "These roles expect ownership, independent delivery, collaboration with data scientists, and incident maturity. Prepare stories that prove those behaviors.",
              concepts: [
                "Ownership story: ambiguous platform problem you drove to completion",
                "Incident story: outage, mitigation, root cause, prevention",
                "Collaboration story: worked with data scientists/researchers/product/backend",
                "Tradeoff story: cost vs performance, managed vs self-hosted, speed vs safety",
                "Mentoring/story: raised platform quality or created reusable patterns",
                "Client-facing or regulated environment story if relevant"
              ],
              practicePrompt: "Prepare STAR answers for: incident ownership, technical tradeoff, cross-functional conflict, and platform improvement.",
              assignment: {
                title: "Build your story bank",
                time: "90 min",
                objective: "Write six STAR stories aligned to the JDs.",
                steps: [
                  "Write situation, task, action, result for each story.",
                  "Add concrete metrics where possible.",
                  "Map each story to JD keywords.",
                  "Practice each answer under 2 minutes."
                ],
                pitfalls: [
                  "Avoid tool-only stories. Explain business or reliability impact.",
                  "Senior interviews expect tradeoffs and ownership, not just task execution.",
                  "Metrics make stories credible: latency, cost, deployment time, incident count, uptime."
                ]
              },
              resources: []
            },
            {
              id: "mlops-w4-day28",
              type: "day",
              title: "Day 28: Resume, Portfolio & JD Alignment",
              shortTitle: "Resume & Portfolio",
              dayLabel: "Day 28",
              description: "Package the work so recruiters and interviewers see direct alignment with AI infrastructure and MLOps roles.",
              concepts: [
                "Resume keywords: Kubernetes, EKS/GKE, GPU, Ray/KubeRay, MLflow, Kubeflow, KServe, vLLM, Terraform, Prometheus, OpenTelemetry",
                "Project framing: production problem, architecture, metrics, failure handling, cost controls",
                "GitHub README: diagram, quickstart, tradeoffs, runbooks, screenshots",
                "JD-specific tailoring: MLOps, AI Infrastructure, AIOps/LLMOps versions",
                "Portfolio demo: 3-minute and 8-minute versions",
                "Evidence: snippets, diagrams, dashboards, logs, manifests, pipeline screenshots"
              ],
              practicePrompt: "Rewrite three resume bullets to include scale, reliability, automation, or cost impact.",
              assignment: {
                title: "Portfolio polish",
                time: "2 hours",
                objective: "Turn the three projects into an interview-ready portfolio packet.",
                steps: [
                  "Create a README index linking all three projects.",
                  "Add architecture diagrams and runbooks.",
                  "Add a JD alignment table.",
                  "Prepare a short demo script."
                ],
                pitfalls: [
                  "A project without metrics feels like a toy.",
                  "A diagram without failure modes feels junior.",
                  "Do not hide your DevOps background; map it to AI infrastructure outcomes."
                ]
              },
              resources: []
            },
            {
              id: "mlops-w4-day29-30",
              type: "day",
              title: "Day 29-30: Mock Interviews and Final Gap Closure",
              shortTitle: "Mocks & Gaps",
              dayLabel: "Day 29-30",
              description: "Run focused mock interviews using the JD scenarios. Close only the highest-risk gaps instead of adding new tools.",
              concepts: [
                "Mock 1: GPU Kubernetes and distributed training",
                "Mock 2: LLMOps serving platform and async inference",
                "Mock 3: ML pipeline, model registry, and CI/CD",
                "Mock 4: debugging incident and behavioral follow-up",
                "Gap triage: high probability, high weakness, fast to improve",
                "Final interview checklist: architecture, commands, metrics, tradeoffs, stories"
              ],
              practicePrompt: "Use the JDs as prompts: ask a friend or LLM to interview you for each role for 30 minutes.",
              assignment: {
                title: "Final readiness loop",
                time: "3-4 hours",
                objective: "Complete four mocks and produce a short list of final weak spots.",
                steps: [
                  "Record or take notes during each mock.",
                  "Score yourself on correctness, clarity, tradeoffs, and operational depth.",
                  "Rewrite weak answers.",
                  "Review only the top five weak topics before interviews."
                ],
                pitfalls: [
                  "Do not spend the final days learning new frameworks from scratch.",
                  "Interviewers reward clear debugging sequence more than tool name-dropping.",
                  "When uncertain, state assumptions and design a validation path."
                ]
              },
              resources: []
            }
          ]
        }
      ]
    },
    {
      id: "mlops-phase-2",
      title: "Phase 2",
      subtitle: "Post-Interview Depth",
      description: "Use this after the first interview sprint. These topics are useful, but they should not delay readiness for the roles represented by the JDs.",
      granularity: "month",
      months: [
        {
          id: "mlops-month-2",
          title: "Month 2",
          subtitle: "Advanced GPU and Inference Optimization",
          summary: "Go deeper on CUDA profiling, Triton kernels, quantization, tensor parallelism, serving benchmarks, and GPU cost engineering.",
          nodes: [
            {
              id: "mlops-m2-gpu-perf",
              type: "topic",
              title: "GPU Performance Engineering",
              shortTitle: "GPU Performance",
              description: "Deepen from operational GPU knowledge into profiling, bottleneck analysis, and inference optimization.",
              concepts: [
                "CUDA streams, memory transfers, pinned memory, and kernel launch overhead",
                "NVIDIA Nsight Systems and Nsight Compute basics",
                "Triton language for custom kernels at a high level",
                "Quantization and serving benchmarks",
                "MIG, MPS, multi-tenancy, and workload isolation",
                "Cost per 1K tokens or cost per prediction"
              ],
              resources: [
                {
                  id: "mlops-nsight",
                  title: "NVIDIA Nsight Systems",
                  url: "https://developer.nvidia.com/nsight-systems",
                  type: "tool",
                  cost: "free",
                  author: "NVIDIA"
                },
                {
                  id: "mlops-triton",
                  title: "Triton Language Documentation",
                  url: "https://triton-lang.org/main/index.html",
                  type: "article",
                  cost: "free",
                  author: "OpenAI/Triton"
                }
              ]
            }
          ]
        },
        {
          id: "mlops-month-3",
          title: "Month 3",
          subtitle: "Platform Engineering and Multi-Team Governance",
          summary: "Deepen self-service platforms, Backstage, Crossplane, policy-as-code, cost allocation, compliance, and regulated model governance.",
          nodes: [
            {
              id: "mlops-m3-platform",
              type: "topic",
              title: "Self-Service ML Platform",
              shortTitle: "Self-Service Platform",
              description: "Move from interview-level platform design to a real internal developer platform for data scientists and ML engineers.",
              concepts: [
                "Backstage templates for training jobs, model services, and pipelines",
                "Crossplane or Terraform modules for cloud resources",
                "Policy-as-code with OPA/Gatekeeper or Kyverno",
                "Cost allocation by team, project, model, and environment",
                "Governance workflows for regulated ML",
                "Platform product thinking: golden paths, docs, support, and adoption metrics"
              ],
              resources: [
                {
                  id: "mlops-backstage",
                  title: "Backstage Software Templates",
                  url: "https://backstage.io/docs/features/software-templates/",
                  type: "article",
                  cost: "free",
                  author: "Backstage"
                },
                {
                  id: "mlops-kyverno",
                  title: "Kyverno Documentation",
                  url: "https://kyverno.io/docs/",
                  type: "article",
                  cost: "free",
                  author: "Kyverno"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
