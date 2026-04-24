# Plan: Iteration 0008 - CI/CD, Security Scanning & Deployment Orchestration (Phase 7)

## Objective
Transition the ORY-VAULT DMS from a local Docker Compose environment to a production-ready state by establishing an automated Continuous Integration/Continuous Deployment (CI/CD) pipeline. This iteration focuses on code quality assurance, security vulnerability scanning, and preparing deployment manifests (e.g., Kubernetes/Helm).

## Proposed Tasks

### 1. Continuous Integration Pipeline (e.g., GitHub Actions)
- **Go Backend Pipeline**: 
  - Implement linting (`golangci-lint`).
  - Run unit and integration tests (`go test`).
  - Enforce a minimum test coverage threshold (e.g., 70%).
- **Next.js Frontend Pipeline**: 
  - Implement linting (`eslint`) and type checking (`tsc --noEmit`).
  - Build the Next.js standalone application.
- **Config Validation**: Add a step to lint and validate all YAML configurations (Ory services and Oathkeeper rules) using `yamllint` or similar tools.

### 2. Security Scanning & Container Builds
- **Static Application Security Testing (SAST)**: 
  - Integrate `gosec` for the Go backend to detect hardcoded credentials or unsafe patterns.
  - Integrate `npm audit` or `yarn audit` for the Next.js frontend to catch vulnerable dependencies.
- **Container Image Scanning**: 
  - Automatically build the `vault-backend` and `vault-ui` Docker images on successful PR merges.
  - Scan the built images using tools like `Trivy` or `Grype` before pushing them to a container registry (e.g., GitHub Container Registry, Docker Hub).

### 3. Deployment Orchestration (Kubernetes/Helm Preparation)
- **Kubernetes Manifests**: Translate the local `docker-compose.yaml` into foundational Kubernetes manifests (Deployments, Services, ConfigMaps, Secrets, Ingress).
- **Secret Management Strategy**: Define how Kratos and Oathkeeper secrets (e.g., `cookie_secret`, `cipher_secret`) will be injected in production (e.g., via Kubernetes Secrets or external vault integration), explicitly avoiding hardcoded values in YAML.
- **Ingress Controller Configuration**: Convert the `vault-gateway` (Nginx) configuration into a Kubernetes Ingress resource with appropriate annotations for TLS termination and cookie handling.

## Validation Strategy
1. **Pipeline Execution**: Open a dummy Pull Request. Verify that the CI pipeline triggers automatically, runs all linting, testing, and SAST steps, and accurately reports pass/fail status.
2. **Security Gate**: Temporarily introduce a vulnerable dependency in `dms-ui/package.json`. Confirm that the pipeline correctly fails and blocks the merge during the SAST/Audit step.
3. **Manifest Dry Run**: Run `kubectl apply --dry-run=client -k ./k8s` (or `helm lint`) against the generated deployment manifests to ensure there are no syntax or structural errors in the Kubernetes configurations.
