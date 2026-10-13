FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npx prisma generate && npm run build
USER node
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
