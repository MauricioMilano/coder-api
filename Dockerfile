
FROM node:22-alpine
WORKDIR /app

# Install essential packages for shell compatibility and development tools
RUN apk update && apk add --no-cache \
    bash \
    busybox \
    openssh \
    git \
    curl \
    wget \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Ensure /bin/bash and /usr/bin/bash exist and are executable
RUN [ -x /bin/bash ] || (echo "bash not found or not executable!" && exit 1)
RUN ln -sf /bin/bash /usr/bin/bash
RUN ln -sf /bin/ash /usr/bin/ash
RUN ln -sf /bin/sh /usr/bin/sh

# Verify shell installations
RUN bash -c "echo 'bash works'" && \
    ash -c "echo 'ash works'" && \
    sh -c "echo 'sh works'" && \
    /bin/busybox sh -c "echo 'busybox works'"

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

EXPOSE 3000

# Use exec form to avoid shell interpretation issues
CMD ["node", "dist/server.js"]
