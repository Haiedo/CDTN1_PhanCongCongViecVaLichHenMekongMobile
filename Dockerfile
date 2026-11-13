# Smart CRM – Mekong Mobile · L4 – API + web UI (Node 22). One image, two uses:
#   docker compose up -d --build        -> runs the server
#   docker compose exec app npm test    -> runs the test suite inside the same image
FROM node:22-alpine

WORKDIR /app

# Install dependencies first so this layer is cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only what the app and the tests need (see .dockerignore: no .env, no docs, no PDFs).
COPY --chown=node:node . .

# Never run as root inside the container.
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
