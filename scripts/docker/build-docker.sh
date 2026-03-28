#!/bin/bash

# ==========================================
# LuLab Backend - Enhanced Docker Build Script
# ==========================================
# This script provides a comprehensive Docker build solution with:
# - Multi-environment support (dev/staging/production)
# - Pre-build validation (lint/test)
# - Environment variable handling
# - Multi-architecture support (amd64/arm64)
# - Build optimization with caching
# - Detailed logging and progress tracking
# - Post-build validation and health checks
#
# Usage:
#   ./build-docker.sh [OPTIONS]
#
# Examples:
#   ./build-docker.sh                                    # Build with defaults
#   ./build-docker.sh --env production --tag v1.0.0      # Production build
#   ./build-docker.sh --platform linux/amd64,linux/arm64 # Multi-arch build
#   ./build-docker.sh --with-lint --with-test            # Build with validation

set -e

# ==========================================
# Color Codes for Output
# ==========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==========================================
# Logging Functions
# ==========================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# ==========================================
# Default Configuration
# ==========================================
TAG="lulab-backend:latest"
DOCKERFILE="Dockerfile"
ENVIRONMENT="production"
PLATFORM=""
NO_CACHE=false
PUSH=false
REGISTRY=""
WITH_LINT=false
WITH_TEST=false
SKIP_VALIDATION=false
BUILD_ARGS=""
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# ==========================================
# Environment-specific Configurations
# ==========================================
get_env_config() {
    case "$ENVIRONMENT" in
        dev|development)
            echo "NODE_ENV=development"
            ;;
        staging)
            echo "NODE_ENV=staging"
            ;;
        prod|production)
            echo "NODE_ENV=production"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# ==========================================
# Parse Command Line Arguments
# ==========================================
print_usage() {
    cat << EOF
LuLab Backend - Enhanced Docker Build Script

Usage:
  $0 [OPTIONS]

Options:
  -t, --tag TAG              Image tag (default: lulab-backend:latest)
  -f, --dockerfile FILE      Dockerfile to use (default: Dockerfile)
  -e, --env ENVIRONMENT      Target environment (dev/staging/prod, default: production)
  -p, --platform PLATFORM    Target platform(s) (default: host platform)
                             Examples: linux/amd64, linux/arm64, linux/amd64,linux/arm64
  --no-cache                 Build without using cache
  --push                     Push image to registry after building
  --registry REGISTRY        Registry to push to (required with --push)
  --with-lint                Run lint before building
  --with-test                Run tests before building
  --skip-validation          Skip all pre-build validations
  --build-arg ARG=VALUE      Add build arguments (can be used multiple times)
  -h, --help                 Show this help message

Examples:
  $0                                          # Build with defaults
  $0 -t myapp:v1.0.0                          # Build with custom tag
  $0 -e staging -t lulab-backend:staging      # Build for staging
  $0 -p linux/amd64,linux/arm64 --push --registry myregistry.com
                                              # Multi-arch build and push
  $0 --with-lint --with-test                  # Build with full validation
  $0 --build-arg NODE_ENV=production          # Build with custom build arg

Environment-specific behaviors:
  - dev: Development build with debugging enabled
  - staging: Pre-production build with staging config
  - production: Optimized production build

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -f|--dockerfile)
                DOCKERFILE="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -p|--platform)
                PLATFORM="$2"
                shift 2
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --push)
                PUSH=true
                shift
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --with-lint)
                WITH_LINT=true
                shift
                ;;
            --with-test)
                WITH_TEST=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --build-arg)
                BUILD_ARGS="$BUILD_ARGS --build-arg $2"
                shift 2
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done
}

# ==========================================
# Validation Functions
# ==========================================
validate_arguments() {
    if [[ "$PUSH" == true && -z "$REGISTRY" ]]; then
        log_error "--registry is required when using --push"
        exit 1
    fi

    if [[ "$WITH_TEST" == true && "$WITH_LINT" == false ]]; then
        log_warning "Running tests without linting is unusual. Consider using --with-lint as well."
    fi
}

validate_environment() {
    log_step "Validating environment..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed or not in PATH"
        exit 1
    fi

    log_success "Environment validation passed"
}

validate_dockerfile() {
    log_step "Validating Dockerfile..."

    if [[ ! -f "$DOCKERFILE" ]]; then
        log_error "Dockerfile '$DOCKERFILE' not found in project root"
        exit 1
    fi

    log_success "Dockerfile found: $DOCKERFILE"
}

validate_source_code() {
    log_step "Validating source code..."

    if [[ ! -d "src" ]]; then
        log_error "Source directory 'src' not found"
        exit 1
    fi

    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found"
        exit 1
    fi

    log_success "Source code validation passed"
}

# ==========================================
# Pre-build Validation
# ==========================================
run_lint() {
    log_section "Running Lint Checks"

    log_info "Running ESLint..."
    if pnpm run lint; then
        log_success "Lint checks passed"
    else
        log_error "Lint checks failed"
        exit 1
    fi
}

run_tests() {
    log_section "Running Tests"

    log_info "Running test suite..."
    if pnpm run test:unit; then
        log_success "Tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

run_validation() {
    if [[ "$SKIP_VALIDATION" == true ]]; then
        log_warning "Skipping validation as requested"
        return
    fi

    if [[ "$WITH_LINT" == true ]]; then
        run_lint
    fi

    if [[ "$WITH_TEST" == true ]]; then
        run_tests
    fi
}

# ==========================================
# Build Functions
# ==========================================
prepare_build_context() {
    log_step "Preparing build context..."

    ENV_CONFIG=$(get_env_config)
    log_info "Environment configuration: $ENV_CONFIG"

    BUILD_ARGS="$BUILD_ARGS --build-arg $ENV_CONFIG"
}

build_docker_image() {
    log_section "Building Docker Image"

    local build_command="docker build"
    
    if [[ "$NO_CACHE" == true ]]; then
        build_command="$build_command --no-cache"
        log_info "Building without cache"
    fi

    if [[ -n "$PLATFORM" ]]; then
        build_command="$build_command --platform $PLATFORM"
        log_info "Target platform(s): $PLATFORM"
    fi

    build_command="$build_command -f $DOCKERFILE -t $TAG $BUILD_ARGS ."

    log_info "Build command: $build_command"
    echo ""

    if eval "$build_command"; then
        log_success "Docker image built successfully: $TAG"
    else
        log_error "Docker image build failed"
        exit 1
    fi
}

# ==========================================
# Post-build Validation
# ==========================================
validate_image() {
    log_section "Validating Built Image"

    log_info "Inspecting image..."
    docker inspect "$TAG" > /dev/null 2>&1
    if [[ $? -eq 0 ]]; then
        log_success "Image validation passed"
    else
        log_error "Image validation failed"
        exit 1
    fi

    log_info "Image details:"
    docker images "$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
}

# ==========================================
# Registry Functions
# ==========================================
push_to_registry() {
    log_section "Pushing to Registry"

    local registry_tag="$REGISTRY/$TAG"
    
    log_info "Tagging image for registry: $registry_tag"
    docker tag "$TAG" "$registry_tag"

    log_info "Pushing image to registry..."
    if docker push "$registry_tag"; then
        log_success "Image pushed to registry: $registry_tag"
    else
        log_error "Failed to push image to registry"
        exit 1
    fi
}

# ==========================================
# Summary Functions
# ==========================================
print_build_summary() {
    log_section "Build Summary"

    echo "Build Configuration:"
    echo "  Project Root: $PROJECT_ROOT"
    echo "  Dockerfile: $DOCKERFILE"
    echo "  Image Tag: $TAG"
    echo "  Environment: $ENVIRONMENT"
    echo "  Platform: ${PLATFORM:-host platform}"
    echo "  No Cache: $NO_CACHE"
    echo "  Pre-build Validation:"
    echo "    - Lint: $WITH_LINT"
    echo "    - Test: $WITH_TEST"
    echo "  Push to Registry: $PUSH"
    
    if [[ "$PUSH" == true ]]; then
        echo "  Registry: $REGISTRY"
    fi

    echo ""
    echo "Built Images:"
    docker images "$TAG" --format "  {{.Repository}}:{{.Tag}} ({{.Size}})"

    if [[ "$PUSH" == true ]]; then
        echo ""
        echo "Registry Images:"
        echo "  $REGISTRY/$TAG"
    fi

    echo ""
    echo "Quick Start Commands:"
    echo "  # Run the container"
    echo "  docker run -p 3000:3000 $TAG"
    echo ""
    echo "  # Run with environment variables"
    echo "  docker run -p 3000:3000 -e NODE_ENV=$ENVIRONMENT $TAG"
    echo ""
    echo "  # Run with custom configuration"
    echo "  docker run -p 3000:3000 -v \$(pwd)/.env:/app/.env $TAG"
}

# ==========================================
# Main Execution Flow
# ==========================================
main() {
    log_section "LuLab Backend Docker Build Script"

    parse_arguments "$@"
    validate_arguments

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

    cd "$PROJECT_ROOT"

    log_info "Project Root: $PROJECT_ROOT"
    log_info "Working Directory: $(pwd)"

    validate_environment
    validate_dockerfile
    validate_source_code

    run_validation

    prepare_build_context
    build_docker_image

    validate_image

    if [[ "$PUSH" == true ]]; then
        push_to_registry
    fi

    print_build_summary

    log_section "Build Completed Successfully!"
}

# Execute main function
main "$@"