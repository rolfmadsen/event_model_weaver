# Use an official, minimal Node.js 22 image
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
# Install *only* production dependencies (faster, smaller, more secure)
RUN npm ci --omit=dev
COPY relay-server.js .
# Koyeb provides PORT env var, CMD runs the server
CMD ["node", "relay-server.js"]