#!/bin/bash

# ==========================================
# LuLab Backend Docker Build Script
# ==========================================
# This script provides a convenient way to build Docker images
# for the LuLab Backend application with different configurations
#
# Usage:
#   ./build-docker.sh [OPTIONS]
#
# Options:
#   -t, --tag TAG         Image tag (default: lulab-backend:latest)
#   -f, --dockerfile FILE Dockerfile to use (default: Dockerfile)
#   --aliyun              Use Dockerfile.aliyun instead of default Dockerfile
#   --no-cache            Build without using cache
#   --push                Push image to registry after building
#   --registry REGISTRY   Registry to push to (required with --push)
#   -h, --help            Show this help message
#
# Examples:
#   ./scripts/build-docker.sh                       # Build with default settings
#   ./scripts/build-docker.sh -t myapp:v1.0.0           # Build with custom tag
#   ./scripts/build-docker.sh --aliyun                  # Build using Aliyun Dockerfile
#   ./scripts/build-docker.sh --no-cache                # Build without cache
#   ./scripts/build-docker.sh --push --registry myregistry.com   # Build and push

set -e

# Default values
TAG="lulab-backend:latest"
DOCKERFILE="Dockerfile"
NO_CACHE=""
PUSH=false
REGISTRY=""

# Parse command line arguments
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
        --aliyun)
            DOCKERFILE="Dockerfile.aliyun"
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
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
        -h|--help)
            echo "LuLab Backend Docker Build Script"
            echo ""
            echo "Usage:"
            echo "  $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG         Image tag (default: lulab-backend:latest)"
            echo "  -f, --dockerfile FILE Dockerfile to use (default: Dockerfile)"
            echo "  --aliyun              Use Dockerfile.aliyun instead of default Dockerfile"
            echo "  --no-cache            Build without using cache"
            echo "  --push                Push image to registry after building"
            echo "  --registry REGISTRY   Registry to push to (required with --push)"
            echo "  -h, --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Build with default settings"
            echo "  $0 -t myapp:v1.0.0           # Build with custom tag"
            echo "  $0 --aliyun                  # Build using Aliyun Dockerfile"
            echo "  $0 --no-cache                # Build without cache"
            echo "  $0 --push --registry myregistry.com   # Build and push"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Validate arguments
if [[ "$PUSH" == true && -z "$REGISTRY" ]]; then
    echo "Error: --registry is required when using --push"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root directory
cd "$PROJECT_ROOT"

# Check if Dockerfile exists
if [[ ! -f "$DOCKERFILE" ]]; then
    echo "Error: Dockerfile '$DOCKERFILE' not found in project root"
    exit 1
fi

# Display build information
echo "=========================================="
echo "Building Docker Image"
echo "=========================================="
echo "Project Root: $PROJECT_ROOT"
echo "Dockerfile: $DOCKERFILE"
echo "Image Tag: $TAG"
echo "No Cache: ${NO_CACHE:-false}"
echo "Push to Registry: ${PUSH:-false}"
if [[ "$PUSH" == true ]]; then
    echo "Registry: $REGISTRY"
fi
echo ""

# Build the Docker image
echo "Building Docker image..."
docker build $NO_CACHE -f "$DOCKERFILE" -t "$TAG" .

# Check if build was successful
if [[ $? -eq 0 ]]; then
    echo "✅ Docker image built successfully: $TAG"
else
    echo "❌ Docker image build failed"
    exit 1
fi

# Push to registry if requested
if [[ "$PUSH" == true ]]; then
    # Create registry tag
    REGISTRY_TAG="$REGISTRY/$TAG"
    echo "Tagging image for registry: $REGISTRY_TAG"
    docker tag "$TAG" "$REGISTRY_TAG"
    
    echo "Pushing image to registry..."
    docker push "$REGISTRY_TAG"
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Image pushed to registry: $REGISTRY_TAG"
    else
        echo "❌ Failed to push image to registry"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo "Local image: $TAG"
if [[ "$PUSH" == true ]]; then
    echo "Registry image: $REGISTRY_TAG"
fi
echo ""
echo "To run the container:"
echo "  docker run -p 3000:3000 $TAG"
echo ""
echo "To run with environment variables:"
echo "  docker run -p 3000:3000 -e NODE_ENV=production $TAG"