ROADMAP.stages.push({
  id: "stage-4",
  n: 4,
  level: "Intermediate to advanced",
  title: "The AI platform",
  tag: "AI-Platform",
  index: "013-AI Platform",
  blurb: "From one node to a platform: GPUs on Kubernetes, inference-aware routing, autoscaling, AWS and GCP in depth, Terraform at scale, observability, security and cost. Kubernetes and cloud basics are assumed.",
  outcome: "you can design, provision with Terraform, and operate a multi-tenant inference platform on EKS or GKE, and explain every trade-off in its cost, latency and security.",
  modules: [
    {
      id: "p-gpu-k8s",
      track: "platform",
      title: "GPUs on Kubernetes",
      h: [12, 18],
      summary: "How a pod gets a GPU: device plugins and the GPU Operator, Dynamic Resource Allocation, sharing strategies, and node lifecycle for expensive hardware.",
      needs: ["r-gpu"],
      topics: [
        "The device plugin model and `nvidia.com/gpu` as an extended resource",
        "NVIDIA GPU Operator: driver, container toolkit, device plugin, feature discovery, DCGM exporter",
        "Dynamic Resource Allocation: ResourceClaims, DeviceClasses, selecting devices by attribute",
        "Sharing a GPU: time-slicing, MPS, MIG; isolation and performance of each",
        "Node Feature Discovery labels, taints and tolerations, node pools per GPU type",
        "Topology: NUMA, multi-GPU pods, why placement matters",
        "Image size, model weights and node startup time",
        "GPU node health: Xid errors, node problem detection, automated repair"
      ],
      questions: [
        "Trace what happens from a pod requesting `nvidia.com/gpu: 1` to the container seeing the device.",
        "What can Dynamic Resource Allocation express that the device plugin model cannot?",
        "Time-slicing, MPS and MIG: which gives memory isolation, which gives fault isolation, and when would you choose each?",
        "Why do GPU workloads make cluster autoscaling slower, and what are three ways to cut time-to-ready?",
        "What is an Xid error and what should the platform do about one?"
      ],
      exercises: [
        { t: "Join the PC as a GPU node", env: "pc", d: "Add the workstation to the k3s cluster as an agent with the NVIDIA runtime, taint it, deploy the device plugin (or GPU Operator) and run a CUDA pod scheduled from the phones' control plane." },
        { t: "Share the card", env: "pc", d: "Configure time-slicing so two pods share the 4070. Run two inference workloads, measure the interference, and document what isolation you do and do not have." },
        { t: "DRA on a real cluster", env: "cloud", d: "On a short-lived GKE or EKS cluster with one GPU node, request the device through a ResourceClaim instead of the extended resource. Tear down with Terraform." }
      ],
      resources: [
        { t: "NVIDIA GPU Operator", u: "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html", k: "doc" },
        { t: "Kubernetes: Dynamic Resource Allocation", u: "https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/", k: "doc" },
        { t: "GPU sharing in the GPU Operator (time-slicing)", u: "https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html", k: "doc" },
        { t: "k3s: NVIDIA container runtime support", u: "https://docs.k3s.io/advanced#alternative-container-runtime-support", k: "doc" }
      ],
      notes: ["Kubernetes device plugins", "Dynamic Resource Allocation", "GPU sharing: time-slicing, MPS, MIG"]
    },
    {
      id: "p-serve",
      track: "platform",
      title: "Model serving on Kubernetes",
      h: [12, 18],
      summary: "Running model servers as first-class workloads: KServe and its alternatives, model storage and caching, slow-start probes, multi-node serving and safe rollouts.",
      needs: ["p-gpu-k8s", "r-vllm"],
      topics: [
        "Plain Deployments vs KServe InferenceService and LLMInferenceService: what the abstraction adds",
        "Model weights: baked into images, init containers, object storage, OCI model artefacts, node-local caches",
        "Startup, readiness and liveness probes for servers that take minutes to load",
        "LeaderWorkerSet for multi-node and multi-GPU serving",
        "Rollouts when replicas are expensive: surge capacity, canary, blue-green, traffic splitting",
        "PodDisruptionBudgets, priority classes and preemption for inference vs batch",
        "Serving many models: one model per pod, LoRA adapters, model multiplexing",
        "The vLLM production stack and Helm charts as references"
      ],
      questions: [
        "Compare three ways of getting 20 GB of weights into a pod on startup time, cost and operational complexity.",
        "How would you roll out a new model version with zero dropped requests when you have exactly as many GPUs as replicas?",
        "What does KServe give you over a Deployment and Service for an LLM, and when is it overhead?",
        "When do you need LeaderWorkerSet?",
        "How should probes be configured for a server that takes four minutes to load?"
      ],
      exercises: [
        { t: "vLLM on the GPU node", env: "pc", d: "Deploy vLLM to the cluster on the PC node with a PVC model cache, correct probes, resource requests and a Service. Record cold and warm start times." },
        { t: "KServe side by side", env: "pc", d: "Install KServe and serve the same model through an InferenceService. Note what was generated for you and what you lost control of." },
        { t: "Zero-downtime swap", env: "pc", d: "Change the model revision under continuous load without failed requests, given only one GPU. Document the technique you used and its limits." }
      ],
      resources: [
        { t: "KServe documentation", u: "https://kserve.github.io/website/", k: "doc" },
        { t: "vLLM production stack", u: "https://github.com/vllm-project/production-stack", k: "code" },
        { t: "LeaderWorkerSet", u: "https://lws.sigs.k8s.io/docs/", k: "doc" },
        { t: "vLLM: deploying with Kubernetes", u: "https://docs.vllm.ai/en/latest/deployment/k8s.html", k: "doc" }
      ],
      notes: ["KServe", "Model weight distribution", "Rolling out model servers"]
    },
    {
      id: "p-operators",
      track: "platform",
      title: "Controllers, operators and platform APIs in Go",
      h: [20, 30],
      summary: "Move from using Kubernetes to extending it: custom resources, reconciliation loops and a self-service API that turns 'a model' into a running endpoint.",
      why: "AI platform postings ask for Kubernetes 'at the controller and internals level' and for a systems language. This is the largest gap between operating clusters and building platforms.",
      needs: ["p-serve"],
      topics: [
        "Enough Go to be productive: types, interfaces, errors, goroutines and channels, modules, testing",
        "The API machinery: resources, groups and versions, the watch mechanism, informers and caches",
        "Custom Resource Definitions: schema, validation, status and conditions, versioning",
        "The reconcile loop: level-triggered design, idempotency, requeues, finalizers, owner references",
        "Kubebuilder and controller-runtime; envtest for testing without a cluster",
        "Admission webhooks and validating admission policies",
        "Designing a platform API: what to expose, what to hide, sensible defaults, self-service",
        "The scheduler: the scheduling framework, plugins, and where custom logic belongs",
        "State machines and durable workflows for long operations (node bring-up, rollouts)",
        "Python operators with kopf, and when Go is worth it"
      ],
      questions: [
        "Why are controllers level-triggered rather than edge-triggered, and what bug does that prevent?",
        "What is a finalizer for, and what happens to a resource with a finalizer whose controller is gone?",
        "What belongs in spec and what belongs in status?",
        "Design the fields of a `ModelEndpoint` resource. What did you leave out on purpose?",
        "How do you test a controller without a real cluster, and what can that test not tell you?"
      ],
      exercises: [
        { t: "Go warm-up", env: "any", d: "Work through the Go tour, then write a small concurrent CLI that queries several model endpoints in parallel and reports latency percentiles, with tests." },
        { t: "ModelEndpoint operator", env: "lab", d: "With Kubebuilder, build an operator for a `ModelEndpoint` custom resource: given a model reference and size, it creates the Deployment, Service, probes and scaling object, and reports readiness in status conditions. Run it on k3s against llama.cpp." },
        { t: "Make it robust", env: "lab", d: "Add finalizers, a validating webhook that rejects unpinned model revisions, envtest coverage, and correct behaviour when the operator restarts mid-rollout." },
        { t: "Self-service front door", env: "lab", d: "Put a small CLI or API on top so a user can request, list and delete endpoints without writing YAML. Write the user documentation." }
      ],
      resources: [
        { t: "A Tour of Go", u: "https://go.dev/tour/", k: "course" },
        { t: "The Kubebuilder Book", u: "https://book.kubebuilder.io/", k: "book" },
        { t: "controller-runtime", u: "https://github.com/kubernetes-sigs/controller-runtime", k: "code" },
        { t: "Kubernetes API conventions", u: "https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md", k: "doc", n: "How spec, status and conditions are meant to be used" },
        { t: "kopf", u: "https://kopf.readthedocs.io/en/stable/", k: "doc", n: "Operators in Python" }
      ],
      notes: ["Kubernetes reconcile loop", "CRD design", "Go for platform engineers", "Platform API design"]
    },
    {
      id: "p-route",
      track: "platform",
      title: "Inference routing and LLM gateways",
      h: [12, 18],
      summary: "Round-robin is wrong for LLMs. Inference-aware load balancing with the Gateway API Inference Extension and llm-d, and application-level gateways for keys, budgets and fallbacks.",
      needs: ["p-serve"],
      why: "Two different layers both get called 'gateway'. Postings ask for both, and they solve different problems.",
      topics: [
        "Why request-count load balancing fails: variable cost per request, queue depth, cache locality",
        "Gateway API Inference Extension: InferencePool, the endpoint picker, routing on queue and cache metrics",
        "Prefix-cache-aware and LoRA-aware routing; session affinity",
        "llm-d: Kubernetes-native distributed inference built on these pieces",
        "Managed versions: GKE Inference Gateway and equivalents",
        "LLM gateways at the application layer: LiteLLM, Envoy AI Gateway, Portkey and similar",
        "Gateway responsibilities: virtual keys, per-team budgets, rate limits, fallbacks, model aliasing, audit logs",
        "Semantic caching and when it is safe",
        "Multi-tenancy: fairness, priority and flow control"
      ],
      questions: [
        "Give a concrete scenario in which round-robin sends a request to the worst possible replica.",
        "What signals does the endpoint picker use, and where do they come from?",
        "Inference-aware routing vs an LLM gateway: which problem does each solve, and where does each sit in the request path?",
        "How would you enforce a monthly token budget per team across hosted and self-hosted models?",
        "What are the risks of semantic caching?"
      ],
      exercises: [
        { t: "LiteLLM on the homelab", env: "lab", d: "Run a gateway on k3s in front of the PC's vLLM, the phone's llama.cpp and one hosted provider. Issue virtual keys with budgets, define a fallback chain, and move the copilot onto it." },
        { t: "Inference-aware routing", env: "cloud", d: "On a short-lived cluster with two model replicas (small GPUs or CPU-only replicas of a tiny model), install the inference extension with a compatible gateway. Compare tail TTFT against plain round-robin under a mixed workload." },
        { t: "Fairness test", env: "lab", d: "Have one tenant flood the gateway and show whether another tenant's latency is protected. Fix it with rate limits or priorities." }
      ],
      resources: [
        { t: "Gateway API Inference Extension", u: "https://gateway-api-inference-extension.sigs.k8s.io/", k: "doc" },
        { t: "llm-d", u: "https://llm-d.ai/", k: "doc" },
        { t: "About GKE Inference Gateway", u: "https://cloud.google.com/kubernetes-engine/docs/concepts/about-gke-inference-gateway", k: "doc" },
        { t: "LiteLLM proxy", u: "https://docs.litellm.ai/docs/simple_proxy", k: "doc" },
        { t: "Envoy AI Gateway", u: "https://aigateway.envoyproxy.io/", k: "doc" }
      ],
      notes: ["Inference-aware load balancing", "Gateway API Inference Extension", "LLM gateway responsibilities"]
    },
    {
      id: "p-scale",
      track: "platform",
      title: "Autoscaling and capacity",
      h: [10, 14],
      summary: "Scale model servers on the signals that reflect load, provision GPU nodes quickly, and decide when scale-to-zero is worth the cold start.",
      needs: ["p-route", "r-bench"],
      topics: [
        "Why CPU and GPU utilisation are poor scaling signals for LLM servers",
        "Scaling on queue depth, running requests, TTFT or KV-cache usage with KEDA or custom metrics",
        "Node provisioning: Karpenter, EKS Auto Mode, GKE node auto-provisioning; GPU instance selection",
        "Cold-start budget: node boot, image pull, weight load, warm-up",
        "Scale-to-zero and how to hide or accept the first-request delay",
        "Spot and preemptible GPUs: interruption handling, fallbacks",
        "Capacity is not guaranteed: quotas, reservations, capacity blocks",
        "Over-provisioning with placeholder pods; scheduled scaling",
        "Capacity pooling across clusters and regions; bin-packing and fragmentation of GPUs",
        "Multi-cluster job dispatch (MultiKueue) and hybrid cloud plus on-prem capacity"
      ],
      questions: [
        "Which metric would you scale a vLLM deployment on, and what target value would you start with?",
        "Break down a five-minute cold start into its parts and say how to shrink each.",
        "When is scale-to-zero the right decision for a GPU service?",
        "What happens to in-flight requests when a spot GPU node is reclaimed, and how do you limit the damage?",
        "Why can autoscaling fail even with correct configuration?"
      ],
      exercises: [
        { t: "Scale on the right signal", env: "lab", d: "Using CPU-only llama.cpp replicas on the phones, scale with KEDA on a queue or in-flight request metric from Prometheus. Drive load and show replicas following it." },
        { t: "GPU node autoscaling", env: "cloud", d: "On EKS with Karpenter or on GKE, scale a GPU deployment from zero nodes. Time each phase of the cold start, then reduce it with one concrete change (image streaming, pre-pulled images, weight cache)." },
        { t: "Spot drill", env: "cloud", d: "Run the server on spot capacity with an on-demand fallback and simulate an interruption under load." }
      ],
      resources: [
        { t: "KEDA", u: "https://keda.sh/docs/latest/", k: "doc" },
        { t: "Karpenter", u: "https://karpenter.sh/docs/", k: "doc" },
        { t: "Amazon EKS: autoscaling for ML inference", u: "https://docs.aws.amazon.com/eks/latest/userguide/ml-inference.html", k: "doc" },
        { t: "GKE: autoscale LLM workloads on GPUs", u: "https://cloud.google.com/kubernetes-engine/docs/best-practices/machine-learning/inference/autoscaling", k: "doc" }
      ],
      notes: ["Autoscaling LLM inference", "Cold start breakdown", "Spot GPUs"]
    },
    {
      id: "p-batch",
      track: "platform",
      title: "Batch, training and job scheduling",
      h: [10, 16],
      summary: "The other half of a GPU platform: queues, quotas and fair sharing with Kueue, distributed work with Ray, and pipelines for training and batch inference.",
      needs: ["p-gpu-k8s"],
      topics: [
        "Why the default scheduler is not enough: queueing, quotas, borrowing, gang scheduling",
        "Kueue: ClusterQueues, LocalQueues, cohorts, preemption, resource flavours",
        "Ray and KubeRay: tasks, actors, Ray Data for batch inference, Ray Serve, Ray Train",
        "Kubeflow Trainer and JobSet for distributed training jobs",
        "Workflow engines: Argo Workflows, and where Airflow still fits",
        "Batch inference patterns: offline queues, micro-batching, checkpointed progress",
        "Notebook and experiment environments for data scientists",
        "Slurm and why some teams still prefer it",
        "Volcano and commercial schedulers (Run:ai) as alternatives; topology-aware scheduling",
        "Data processing at scale: Spark and Ray Data for preparing training and embedding corpora",
        "Elastic and gang scaling for training; fine-tuning offered as a platform service"
      ],
      questions: [
        "What problem does Kueue solve that priority classes alone do not?",
        "How does a team borrow unused GPU quota from another team, and what happens when the owner wants it back?",
        "When would you use Ray rather than plain Kubernetes Jobs?",
        "How would you design a batch job that embeds ten million documents and survives node loss?",
        "What is gang scheduling, and which workloads break without it?"
      ],
      exercises: [
        { t: "Queues and quotas", env: "lab", d: "Install Kueue on k3s. Create two tenant queues with CPU quotas and borrowing, submit competing jobs, and demonstrate preemption and fair sharing." },
        { t: "Batch inference with Ray", env: "pc", d: "Use Ray Data to embed a large corpus with the GPU, with checkpointing. Kill it midway and resume." },
        { t: "A training pipeline", env: "pc", d: "Wrap your QLoRA fine-tune in a workflow: data prep, train, evaluate, register the adapter, with the eval gate deciding promotion." }
      ],
      resources: [
        { t: "Kueue", u: "https://kueue.sigs.k8s.io/docs/overview/", k: "doc" },
        { t: "KubeRay", u: "https://docs.ray.io/en/latest/cluster/kubernetes/index.html", k: "doc" },
        { t: "Ray Data: batch inference", u: "https://docs.ray.io/en/latest/data/batch_inference.html", k: "doc" },
        { t: "Argo Workflows", u: "https://argo-workflows.readthedocs.io/en/latest/", k: "doc" },
        { t: "Volcano", u: "https://volcano.sh/en/docs/", k: "doc" }
      ],
      notes: ["Kueue", "Ray on Kubernetes", "Batch inference patterns"]
    },
    {
      id: "p-network",
      track: "platform",
      title: "Networking for AI clusters",
      h: [12, 18],
      summary: "The cluster network as a performance component: CNI internals, high-speed fabrics, RDMA in pods, tenant segmentation and multi-cluster connectivity.",
      why: "Platform postings list CNI internals, RDMA and SR-IOV exposure into pods, InfiniBand and RoCE, and fabric-aware placement. None of it comes up in ordinary web workloads.",
      needs: ["p-gpu-k8s"],
      topics: [
        "CNI in detail: how a pod gets an interface; Cilium and eBPF, Calico; kube-proxy replacement",
        "Secondary networks with Multus; SR-IOV virtual functions in pods",
        "RDMA: why it bypasses the kernel, InfiniBand vs RoCE, what NCCL does with it",
        "The NVIDIA Network Operator and GPUDirect",
        "Fabric basics: leaf-spine, VLANs, BGP, and why a job's ranks should share a fabric island",
        "Topology-aware scheduling and placement",
        "Network policy and tenant segmentation at scale",
        "Service mesh and ingress for inference traffic: streaming, long-lived connections, timeouts",
        "Multi-cluster and hybrid connectivity",
        "Diagnosing network bottlenecks in training and distributed inference"
      ],
      questions: [
        "Trace a packet from one pod to another on a different node with your CNI. Which components touch it?",
        "What does RDMA avoid that TCP does not, and why does that matter for all-reduce?",
        "What is SR-IOV, and what do you give up when a pod uses a virtual function directly?",
        "Why can a streaming LLM response break behind a default ingress configuration?",
        "What does 'topology-aware placement' mean for a 16-GPU training job?"
      ],
      exercises: [
        { t: "CNI under the microscope", env: "lab", d: "On k3s, inspect the interfaces, routes and rules your CNI creates for a pod. Then swap flannel for Cilium on a test cluster or VM and observe traffic with Hubble." },
        { t: "Second network", env: "lab", d: "Attach a secondary interface to a pod with Multus (macvlan over the LAN) and benchmark it against the primary overlay network with iperf3." },
        { t: "Streaming through ingress", env: "lab", d: "Expose a model endpoint through Traefik with a hostname. Find and fix the timeout and buffering settings that break long streamed responses. This also gives you friendly names from your homelab list." },
        { t: "Soft RDMA", env: "pc", d: "Set up Soft-RoCE between two Linux machines or VMs and run an RDMA benchmark against TCP. No special hardware needed to learn the model." }
      ],
      resources: [
        { t: "Cilium documentation", u: "https://docs.cilium.io/en/stable/", k: "doc" },
        { t: "The Kubernetes Networking Guide", u: "https://www.tkng.io/", k: "book" },
        { t: "NVIDIA Network Operator", u: "https://github.com/Mellanox/network-operator", k: "doc" },
        { t: "Multus CNI", u: "https://github.com/k8snetworkplumbingwg/multus-cni", k: "code" }
      ],
      notes: ["CNI internals", "RDMA, InfiniBand and RoCE", "SR-IOV in Kubernetes", "Topology-aware placement"]
    },
    {
      id: "p-storage",
      track: "platform",
      title: "Storage and the data path",
      h: [10, 14],
      summary: "Getting bytes to GPUs fast enough: object storage, parallel filesystems, caching tiers, CSI drivers and data-locality-aware placement.",
      why: "Slow storage shows up as idle GPUs and long cold starts. Postings name parallel filesystems, Ceph and Rook, caching tiers and CSI explicitly.",
      needs: ["p-serve"],
      topics: [
        "Workload shapes: model weights (large, read-mostly), training data (many small reads), checkpoints (bursty writes)",
        "Object storage as the source of truth; FUSE mounts and their limits",
        "Parallel filesystems: Lustre, WEKA, BeeGFS and what 'parallel' buys",
        "Ceph with Rook: block, file and object from one cluster",
        "Caching layers: node-local NVMe caches, JuiceFS, Fluid, dataset warm-up",
        "CSI: provisioning, access modes, snapshots, topology",
        "Image and weight distribution: lazy pulling, OCI artefacts, peer-to-peer distribution",
        "Data locality in scheduling",
        "Measuring storage: throughput, IOPS, metadata operations, with `fio`"
      ],
      questions: [
        "Why can a GPU sit at 30% utilisation during training because of storage, and how would you prove it?",
        "Compare loading 40 GB of weights from object storage, a network filesystem and local NVMe. What dominates each?",
        "What does a parallel filesystem do that NFS does not?",
        "ReadWriteOnce, ReadOnlyMany, ReadWriteMany: which do model caches need, and what provides it?",
        "How would you make the second pod on a node start a model in seconds?"
      ],
      exercises: [
        { t: "Measure your disks", env: "lab", d: "Run `fio` profiles for sequential read, random read and metadata on the phones' storage, the NFS share between them and the PC's NVMe. Explain what each number means for model loading." },
        { t: "Model cache tier", env: "pc", d: "Serve weights three ways (download at start, shared network volume, node-local cache warmed in advance) and record cold-start time for each." },
        { t: "Object storage with a cache", env: "lab", d: "Run MinIO or another S3-compatible store on the homelab as the model registry backing store, and put a caching layer in front for the GPU node." }
      ],
      resources: [
        { t: "Kubernetes CSI documentation", u: "https://kubernetes-csi.github.io/docs/", k: "doc" },
        { t: "Rook", u: "https://rook.io/docs/rook/latest-release/Getting-Started/intro/", k: "doc" },
        { t: "JuiceFS", u: "https://juicefs.com/docs/community/introduction/", k: "doc" },
        { t: "fio", u: "https://fio.readthedocs.io/en/latest/", k: "tool" }
      ],
      notes: ["Storage for AI workloads", "Parallel filesystems", "Model weight caching"]
    },
    {
      id: "p-metal",
      track: "platform",
      title: "Bare metal and on-prem GPU fleets",
      h: [12, 18],
      summary: "Below the cloud API: provisioning physical servers, managing them out of band, rolling drivers and firmware, healing failed nodes, and running Slurm next to Kubernetes.",
      why: "GPU clouds and on-prem platforms hire for PXE, Redfish and BMC, node lifecycle state machines and Slurm. Your postmarketOS kernel port and phone cluster are closer to this work than most cloud experience is.",
      needs: ["p-operators"],
      topics: [
        "Server lifecycle: discovery, provisioning, validation, in service, drain, repair, decommission",
        "Network boot: DHCP, PXE and iPXE, image-based installs",
        "Out-of-band management: BMC, IPMI, Redfish",
        "Provisioning systems: Metal3, Tinkerbell, MAAS; Cluster API on metal",
        "Immutable OS images and node image management; driver, CUDA and firmware rollout",
        "GPU health validation and burn-in; automated drain and reintroduction",
        "Modelling the lifecycle as explicit, versioned states with idempotent transitions",
        "Slurm fundamentals: partitions, jobs, `srun` and `sbatch`, GRES for GPUs",
        "Slurm on Kubernetes (Slinky, SUNK) and why both schedulers coexist",
        "Power, cooling and rack-level constraints at a recognise-the-terms level"
      ],
      questions: [
        "Describe what happens from powering on an unprovisioned server to it joining a cluster.",
        "What can you do through a BMC that you cannot do through the operating system?",
        "Why model node lifecycle as a state machine rather than a set of scripts?",
        "How would you roll a GPU driver update across 500 nodes without stopping inference?",
        "Why do research teams keep asking for Slurm when Kubernetes exists?"
      ],
      exercises: [
        { t: "Network-boot a machine", env: "pc", d: "PXE or iPXE boot a virtual machine from a server you run, install an OS image unattended, and have it join k3s automatically." },
        { t: "Redfish without hardware", env: "pc", d: "Run a Redfish emulator in front of virtual machines and drive power, boot device and inventory through the API from a script." },
        { t: "Node lifecycle controller", env: "lab", d: "Extend your operator skills: a controller that watches node health signals (use the phones' battery and temperature), cordons and drains a bad node, and returns it to service when healthy. Explicit states, idempotent transitions." },
        { t: "Slurm next to Kubernetes", env: "pc", d: "Stand up a small Slurm cluster in containers or with the Slurm operator, submit a GPU job with GRES, and compare the user experience with a Kubernetes Job under Kueue." }
      ],
      resources: [
        { t: "Metal3", u: "https://metal3.io/", k: "doc" },
        { t: "Tinkerbell", u: "https://tinkerbell.org/", k: "doc" },
        { t: "Redfish (DMTF)", u: "https://www.dmtf.org/standards/redfish", k: "doc" },
        { t: "Slurm documentation", u: "https://slurm.schedmd.com/documentation.html", k: "doc" },
        { t: "Slinky: Slurm operator for Kubernetes", u: "https://github.com/SlinkyProject/slurm-operator", k: "code" }
      ],
      notes: ["Bare-metal provisioning", "Redfish and BMC", "Node lifecycle state machine", "Slurm basics"]
    },
    {
      id: "p-obs",
      track: "platform",
      title: "Observability and SLOs for AI platforms",
      h: [10, 14],
      summary: "One view from GPU to token to user: hardware metrics, engine metrics, traces and cost, with SLOs and alerts that reflect what users experience.",
      needs: ["p-serve", "b-obs"],
      topics: [
        "Three layers of signal: hardware (DCGM), engine (vLLM metrics), application (GenAI traces)",
        "DCGM exporter metrics that matter: utilisation, memory, power, temperature, Xid, throttling",
        "SLIs for inference: TTFT, inter-token latency, error rate, queue time; defining SLOs and error budgets",
        "OpenTelemetry Collector pipelines; correlating a slow user request to a saturated replica",
        "Token and cost accounting per tenant, model and feature",
        "Quality as an operational signal: online eval scores next to latency",
        "Dashboards that answer questions; alerting on symptoms, not causes",
        "Incident response for model services: bad model version, provider outage, capacity exhaustion"
      ],
      questions: [
        "Write an SLO for an interactive chat endpoint. Which SLIs, which thresholds, which window?",
        "A user reports slowness. Describe the path from their trace to the root cause across the three layers.",
        "Which GPU metrics indicate a hardware problem rather than load?",
        "How would you alert on a quality regression after a model update?",
        "What does a useful per-tenant cost report contain?"
      ],
      exercises: [
        { t: "Metrics stack on the homelab", env: "lab", d: "Run a light Prometheus and Grafana on k3s scraping vLLM, llama.cpp, the gateway and DCGM on the PC. This also delivers the metrics history from your homelab wishlist." },
        { t: "The inference dashboard", env: "lab", d: "Build one dashboard: request rate, TTFT and inter-token latency percentiles, queue depth, KV-cache use, GPU memory and power, tokens and cost per tenant." },
        { t: "SLO, alert and game day", env: "lab", d: "Define an SLO with a burn-rate alert routed to your phone. Saturate the server and confirm the alert, then write the incident review." }
      ],
      resources: [
        { t: "DCGM exporter", u: "https://github.com/NVIDIA/dcgm-exporter", k: "tool" },
        { t: "vLLM: production metrics", u: "https://docs.vllm.ai/en/latest/usage/metrics.html", k: "doc" },
        { t: "Google SRE Workbook: implementing SLOs", u: "https://sre.google/workbook/implementing-slos/", k: "book" },
        { t: "OpenTelemetry Collector", u: "https://opentelemetry.io/docs/collector/", k: "doc" }
      ],
      notes: ["SLOs for LLM inference", "DCGM metrics", "Token cost attribution"]
    },
    {
      id: "p-terraform",
      track: "platform",
      title: "Terraform for AI platforms",
      h: [12, 18],
      summary: "Beyond writing resources: module design, state and environment strategy, testing, policy and drift, applied to GPU clusters and model-serving infrastructure.",
      needs: ["o-lab"],
      topics: [
        "Module design: composition, interfaces, versioning, when not to write a module",
        "State: backends, locking, splitting state by blast radius, moving resources safely",
        "Environments: directories vs workspaces vs stacks; promotion between them",
        "Testing: `terraform test`, plan assertions, ephemeral environments in CI",
        "Policy as code and guardrails: OPA or Sentinel, cost checks before apply",
        "Drift detection and import of existing resources",
        "Layering: cloud foundation, cluster, cluster add-ons; Terraform vs Helm vs GitOps boundaries",
        "Secrets and ephemeral values; provider authentication with OIDC from CI",
        "OpenTofu and the licence split; Pulumi and Crossplane as alternatives"
      ],
      questions: [
        "How do you decide where to split Terraform state, and what does a bad split cost you?",
        "Where is the boundary between what Terraform manages and what Argo CD manages in a cluster, and why?",
        "How would you test a module that creates a GPU node pool without paying for a GPU on every pull request?",
        "A colleague changed a resource in the console. How do you find it and reconcile it?",
        "What stops someone merging a change that provisions eight large GPU instances by accident?"
      ],
      exercises: [
        { t: "Inference platform module", env: "cloud", d: "Write a reusable module that brings up a cluster with a scale-from-zero GPU node pool, on either EKS or GKE. Clean inputs and outputs, examples, `terraform test` coverage and a README." },
        { t: "Pipeline with guardrails", env: "cloud", d: "CI that plans on pull request, runs a policy check rejecting untagged or oversized GPU resources, and applies on merge using OIDC with no stored cloud keys." },
        { t: "Homelab as code", env: "lab", d: "Manage the k3s namespaces, quotas and Helm releases from this stage with Terraform or OpenTofu, with state stored somewhere that survives a phone dying." }
      ],
      resources: [
        { t: "Terraform: tests", u: "https://developer.hashicorp.com/terraform/language/tests", k: "doc" },
        { t: "Terraform: recommended practices and style", u: "https://developer.hashicorp.com/terraform/language/style", k: "doc" },
        { t: "Terraform Best Practices", u: "https://www.terraform-best-practices.com/", k: "book" },
        { t: "terraform-aws-eks", u: "https://github.com/terraform-aws-modules/terraform-aws-eks", k: "code", n: "Read it as an example of a mature module" },
        { t: "OpenTofu", u: "https://opentofu.org/docs/", k: "doc" }
      ],
      notes: ["Terraform state strategy", "Testing Terraform", "Terraform vs GitOps boundary"]
    },
    {
      id: "p-aws",
      track: "platform",
      title: "AWS for AI workloads",
      h: [18, 26],
      summary: "The AWS services an AI platform is built from: Bedrock and AgentCore, SageMaker, GPU compute on EKS, and the networking, storage and identity around them.",
      needs: ["p-terraform", "p-scale"],
      topics: [
        "Bedrock: model access, inference profiles and cross-region inference, provisioned throughput, batch, Guardrails, Knowledge Bases",
        "Bedrock AgentCore: runtime, memory, gateway, identity, observability for hosted agents",
        "SageMaker: endpoints (real-time, asynchronous, serverless), inference components, training jobs, when it beats EKS",
        "GPU compute: instance families, accelerated AMIs, EKS Auto Mode and Karpenter node pools, capacity reservations and capacity blocks",
        "Storage for models and data: S3, mount options, FSx for Lustre, EBS snapshots for fast starts",
        "Identity: IAM roles, EKS Pod Identity, least privilege for model invocation, cross-account access",
        "Private connectivity: VPC endpoints and PrivateLink for Bedrock and S3, egress control",
        "Event-driven inference: SQS, EventBridge, Step Functions, Lambda in front of models",
        "Encryption and audit: KMS, CloudTrail, model invocation logging",
        "Quotas and how to plan around them"
      ],
      questions: [
        "For a given model workload, how do you choose between Bedrock, a SageMaker endpoint and vLLM on EKS?",
        "What do cross-region inference profiles change about availability and data residency?",
        "Design the IAM so one application can invoke one specific model and nothing else.",
        "How do you keep model traffic off the public internet end to end?",
        "What does AgentCore run for you, and what remains your responsibility?",
        "How would you secure GPU capacity for a launch in three weeks?"
      ],
      exercises: [
        { t: "Bedrock with guardrails, privately", env: "cloud", d: "With Terraform: a least-privilege role, a VPC endpoint, a Guardrail, invocation logging to S3, and a small client that uses them. Verify that a direct public call from the workload is denied." },
        { t: "Asynchronous document pipeline", env: "cloud", d: "S3 upload triggers a queue-driven worker that calls a model and writes structured output, with retries, a dead-letter queue and cost tags. This mirrors a real AIOps posting." },
        { t: "vLLM on EKS, briefly", env: "cloud", d: "Use your module to bring up EKS with a spot GPU node pool, deploy vLLM with Pod Identity reading weights from S3, benchmark, record the hourly cost, destroy. Use a work sandbox only with approval." },
        { t: "Three-way comparison", env: "any", d: "Write up Bedrock vs SageMaker vs EKS for one workload with numbers from the exercises: cost at low and high utilisation, latency, operational burden." }
      ],
      resources: [
        { t: "Amazon Bedrock user guide", u: "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html", k: "doc" },
        { t: "Amazon Bedrock AgentCore", u: "https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html", k: "doc" },
        { t: "AI on EKS", u: "https://awslabs.github.io/ai-on-eks/", k: "code", n: "Reference blueprints for inference and training on EKS" },
        { t: "Amazon EKS: machine learning", u: "https://docs.aws.amazon.com/eks/latest/userguide/machine-learning-on-eks.html", k: "doc" },
        { t: "AWS Well-Architected: Generative AI Lens", u: "https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html", k: "doc" }
      ],
      notes: ["Amazon Bedrock", "Bedrock AgentCore", "GPU capacity on AWS", "Bedrock vs SageMaker vs EKS"]
    },
    {
      id: "p-gcp",
      track: "platform",
      title: "Google Cloud for AI workloads",
      h: [16, 24],
      summary: "The same map on GCP: Vertex AI and its agent platform, GKE as an inference platform, and the identity, networking and storage that differ from AWS.",
      needs: ["p-terraform", "p-scale"],
      topics: [
        "Vertex AI: Model Garden, Gemini and partner models, endpoints, provisioned throughput, batch prediction",
        "Agent tooling: Agent Development Kit, Agent Engine as the managed runtime, sessions and memory",
        "GKE for inference: GPU node pools, Autopilot, node auto-provisioning, Inference Gateway, Inference Quickstart recommendations",
        "Accelerators: GPU families on Compute Engine, TPUs and where they are usable",
        "Fast starts: image streaming, secondary boot disks, Cloud Storage FUSE, Hyperdisk ML",
        "Identity: service accounts, Workload Identity Federation for GKE, fine-grained IAM",
        "Private access: Private Service Connect, VPC Service Controls",
        "Cloud Run with GPUs as a serverless option",
        "Quotas, reservations, Dynamic Workload Scheduler and spot",
        "Mapping concepts across clouds",
        "Azure at a mapping level (Azure AI Foundry, Azure OpenAI, AKS) so a third cloud is not a surprise"
      ],
      questions: [
        "Map each AWS service from the previous module to its closest GCP equivalent and note one meaningful difference per pair.",
        "How does a GKE pod authenticate to Vertex AI without a key file?",
        "When would Cloud Run with a GPU be a better home for a model than GKE?",
        "What do VPC Service Controls protect against that IAM alone does not?",
        "What does the GKE Inference Gateway add on top of a normal Gateway?"
      ],
      exercises: [
        { t: "Vertex AI, privately and keyless", env: "cloud", d: "With Terraform: a GKE workload calling a Vertex AI model through Workload Identity with a least-privilege role. No service-account keys anywhere." },
        { t: "Inference on GKE, briefly", env: "cloud", d: "Bring up GKE with a spot GPU node pool using your module, serve a model with vLLM behind the Inference Gateway, benchmark, record cost, destroy." },
        { t: "Serverless GPU", env: "cloud", d: "Deploy a small model to Cloud Run with a GPU. Measure cold start and cost per request at low traffic, and compare with the GKE numbers." },
        { t: "Agent on a managed runtime", env: "cloud", d: "Deploy a small agent to a managed runtime on one cloud (Agent Engine or AgentCore). List what you no longer operate and what you can no longer control." }
      ],
      resources: [
        { t: "Vertex AI documentation", u: "https://cloud.google.com/vertex-ai/docs", k: "doc" },
        { t: "GKE: AI/ML orchestration", u: "https://cloud.google.com/kubernetes-engine/docs/integrations/ai-infra", k: "doc" },
        { t: "Agent Development Kit", u: "https://google.github.io/adk-docs/", k: "doc" },
        { t: "GKE: about GPUs", u: "https://cloud.google.com/kubernetes-engine/docs/concepts/gpus", k: "doc" },
        { t: "Cloud Run: GPU support", u: "https://cloud.google.com/run/docs/configuring/services/gpu", k: "doc" }
      ],
      notes: ["Vertex AI", "GKE for inference", "AWS to GCP concept map", "Workload Identity"]
    },
    {
      id: "p-delivery",
      track: "platform",
      title: "Delivery: GitOps, registries and the model lifecycle",
      h: [10, 16],
      summary: "Treat models, prompts and eval results as versioned artefacts with a promotion path, delivered by the same GitOps machinery as everything else.",
      needs: ["p-serve", "b-obs"],
      topics: [
        "What must be versioned together: code, prompt, model revision, adapter, engine version, eval dataset",
        "Model registries: MLflow, Hub repositories, OCI artefacts; lineage and model cards",
        "Experiment tracking for fine-tunes and evals",
        "GitOps with Argo CD or Flux: app-of-apps, environment promotion, progressive delivery with Argo Rollouts",
        "CI for AI changes: eval gates, performance regression benchmarks, artefact signing",
        "Canary and shadow deployments for models; rollback criteria that include quality",
        "Supply chain: pinned revisions, safetensors, scanning model files, SBOMs for images",
        "Classic MLOps you may still be asked about: feature stores, drift detection, retraining triggers"
      ],
      questions: [
        "A prompt change, a model upgrade and an engine upgrade all happened last week and quality dropped. How should your delivery process have made the cause obvious?",
        "What does promotion from staging to production mean for a model, and what evidence gates it?",
        "How do you canary a model when responses are non-deterministic?",
        "What are the supply-chain risks of pulling a model from a public hub, and how do you reduce them?",
        "Where does classic MLOps drift monitoring still apply in an LLM system?"
      ],
      exercises: [
        { t: "GitOps the homelab", env: "lab", d: "Install Argo CD on k3s and move the AI workloads under it. This also delivers the 'git for the manifests' item from your homelab list." },
        { t: "Registry and promotion", env: "lab", d: "Run MLflow on the homelab. Register your fine-tuned adapter with its eval results, and make promotion to 'production' a tracked, reversible step that changes what the cluster serves." },
        { t: "Canary with a quality gate", env: "pc", d: "Roll out a new model revision to a fraction of traffic with Argo Rollouts, gate on latency and an online eval score, and trigger an automatic rollback with a deliberately worse model." }
      ],
      resources: [
        { t: "Argo CD", u: "https://argo-cd.readthedocs.io/en/stable/", k: "doc" },
        { t: "MLflow documentation", u: "https://mlflow.org/docs/latest/", k: "doc" },
        { t: "Argo Rollouts", u: "https://argo-rollouts.readthedocs.io/en/stable/", k: "doc" },
        { t: "Designing Machine Learning Systems (Chip Huyen)", u: "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/", k: "book", n: "For the classic MLOps ground: data, drift, monitoring" }
      ],
      notes: ["Model registry and lineage", "Progressive delivery for models", "Model supply chain"]
    },
    {
      id: "p-secure",
      track: "platform",
      title: "Platform security, governance and multi-tenancy",
      h: [10, 14],
      summary: "Securing the platform rather than the prompt: tenant isolation, network policy, secrets, data handling, audit and the governance questions enterprises ask.",
      needs: ["p-aws", "p-gcp", "b-security"],
      topics: [
        "Tenant isolation on shared GPUs: namespaces, quotas, network policy, node isolation, what GPU sharing does not isolate",
        "Sandboxing agent workloads: gVisor, Kata, microVMs, egress allow-lists",
        "Secrets and keys: external secret stores, short-lived credentials, per-tenant provider keys",
        "Data controls: prompt and response logging policy, PII redaction, retention, residency",
        "Model governance: approved model lists, licence tracking, model cards, change approval",
        "Audit: who called which model with what data",
        "Regulation at a working level: EU AI Act risk tiers, NIST AI RMF, ISO 42001, and what they ask of a platform team",
        "Admission control and policy engines for AI workloads",
        "Responsible AI practices asked for in regulated industries: explainability, bias and fairness monitoring",
        "Self-service isolation tiers: exposing MIG, MPS and time-slicing as platform options with RBAC and audit logging"
      ],
      questions: [
        "Two teams share a GPU through time-slicing. What can one learn about or do to the other?",
        "Where would you run untrusted, agent-generated code, and what must that environment not be able to reach?",
        "What is your logging policy for prompts containing customer data, and how is it enforced technically?",
        "What would an auditor ask about your model platform, and which artefacts answer them?",
        "How do you stop a team deploying a model with a licence the company cannot use?"
      ],
      exercises: [
        { t: "Isolate two tenants", env: "lab", d: "Two namespaces on k3s with quotas, default-deny network policies and separate gateway keys. Prove that tenant A cannot reach tenant B's model endpoint or read its traces." },
        { t: "Sandbox for agent code", env: "pc", d: "Run agent-generated code in a sandboxed runtime with no network except an allow-list. Attempt an escape to the host network and to cloud metadata; document the result." },
        { t: "Policy gate", env: "lab", d: "An admission policy that rejects model-server pods whose model is not on an approved list or whose revision is not pinned." }
      ],
      resources: [
        { t: "NIST AI Risk Management Framework", u: "https://www.nist.gov/itl/ai-risk-management-framework", k: "doc" },
        { t: "OWASP Agentic Security Initiative", u: "https://genai.owasp.org/initiatives/agentic-security-initiative/", k: "doc" },
        { t: "Kubernetes: multi-tenancy", u: "https://kubernetes.io/docs/concepts/security/multi-tenancy/", k: "doc" },
        { t: "Kyverno", u: "https://kyverno.io/docs/", k: "tool" },
        { t: "gVisor", u: "https://gvisor.dev/docs/", k: "doc" }
      ],
      notes: ["Multi-tenant GPU isolation", "Sandboxing agent code", "AI governance for platform teams"]
    },
    {
      id: "p-finops",
      track: "platform",
      title: "Cost and capacity engineering",
      h: [8, 12],
      summary: "GPU economics as an engineering discipline: unit costs, utilisation, purchasing options, attribution and the optimisation backlog that follows.",
      needs: ["p-obs", "p-aws", "p-gcp"],
      topics: [
        "Unit economics: cost per million tokens, per request, per resolved task",
        "Utilisation as the main lever; measuring idle GPU-hours",
        "Purchasing: on-demand, spot, savings plans and committed use, reservations, specialised GPU clouds",
        "Hosted API cost levers: caching, batch, model tiering, routing cheap requests to small models",
        "Self-hosted cost levers: quantization, batching, right-sizing, consolidation, scale-to-zero",
        "Attribution and showback: OpenCost, labels, gateway usage data",
        "Capacity planning: forecasting from traffic and token growth",
        "Build vs buy at different scales"
      ],
      questions: [
        "What is the fully loaded cost per million output tokens of your self-hosted model, and what is in 'fully loaded'?",
        "Rank five cost optimisations for an LLM platform by expected saving and effort.",
        "When does a one-year GPU commitment make sense, and what is the risk?",
        "How would you produce a monthly cost report per team that the teams accept as fair?",
        "At what scale would you move from a hosted API to self-hosting, and what would have to be true?"
      ],
      exercises: [
        { t: "Cost model", env: "any", d: "A spreadsheet or notebook that takes traffic, token mix, model and hardware options and outputs monthly cost for hosted, self-hosted on-demand, spot and committed. Feed it your measured throughput." },
        { t: "Showback on the homelab", env: "lab", d: "Install OpenCost or build the equivalent from Prometheus and gateway data. Produce a per-tenant report with GPU time and tokens." },
        { t: "Optimisation backlog", env: "any", d: "For the homelab copilot, list every cost lever, estimate the saving, apply the top two and measure the real effect against the estimate." }
      ],
      resources: [
        { t: "OpenCost", u: "https://opencost.io/docs/", k: "tool" },
        { t: "FinOps for AI overview", u: "https://www.finops.org/wg/finops-for-ai-overview/", k: "article" },
        { t: "Amazon EC2 Capacity Blocks for ML", u: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-blocks.html", k: "doc" },
        { t: "AI Engineering (Chip Huyen), chapter 9", u: "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", k: "book" }
      ],
      notes: ["LLM unit economics", "GPU purchasing options", "Cost attribution"]
    }
  ]
});
