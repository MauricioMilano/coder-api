FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
RUN apk add --no-cache openssh git
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/server.js"]
