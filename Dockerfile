FROM node:20-alpine
WORKDIR /app

# Install essential packages for shell compatibility and development tools
RUN apk update && apk add --no-cache \
    openssh \
    git \
    bash \
    curl \
    wget \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Ensure bash is available as an alternative to sh and create proper symlinks
RUN ln -sf /bin/bash /usr/bin/bash || true && \
    ln -sf /bin/ash /usr/bin/ash || true && \
    ln -sf /bin/sh /usr/bin/sh || true

# Verify shell installations work
RUN echo "Testing bash:" && bash -c "echo 'bash works'" && \
    echo "Testing ash:" && ash -c "echo 'ash works'" && \
    echo "Testing sh:" && sh -c "echo 'sh works'" && \
    echo "Testing busybox:" && /bin/busybox sh -c "echo 'busybox works'"

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
