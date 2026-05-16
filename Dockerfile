# ==========================================
# LuLab Backend - Multi-stage Docker Build
# ==========================================
# This Dockerfile uses multi-stage build to optimize image size
# Stage 1: Build environment with all dependencies
# Stage 2: Production environment with only runtime dependencies

# ==========================================
# Build Stage
# ==========================================
FROM node:22-alpine AS build

# Enable Corepack for modern package manager support (pnpm/yarn)
# This allows using pnpm as the package manager in the container
RUN corepack enable

# Set working directory for the build process
WORKDIR /usr/src/app

# Copy package manager files first for better layer caching
# This allows Docker to cache the dependency installation layer
# when only source code changes
COPY package*.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies)
# --no-frozen-lockfile allows minor lockfile updates if needed
RUN pnpm install --no-frozen-lockfile

# Copy source code after dependencies are installed
COPY . .

# Generate Prisma client, build application, and prune dev dependencies
# This multi-command RUN reduces layer count and image size
RUN pnpm run db:generate && \
    pnpm run build && \
    find dist -type f -name "*.map" -delete && \
    pnpm prune --production

# ==========================================
# Production Stage
# ==========================================
FROM node:22-alpine AS production

# Set working directory for the production application
WORKDIR /usr/src/app

# Set Node.js environment to production
# This optimizes dependencies and disables development features
ENV NODE_ENV=production

# Copy built application artifacts from build stage
# Only copy necessary files to minimize image size
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
COPY --from=build --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/package.json ./package.json

# Switch to non-root user for security
# 'node' user is created by the official Node.js Alpine image
USER node

# Expose application port
EXPOSE 3000

# Define the command to run the application
# Using array format for proper signal handling
CMD ["node", "dist/src/main.js"]