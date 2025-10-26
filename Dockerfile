# Use an official, minimal Node.js 22 image
FROM node:22-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the files needed to install dependencies
COPY package.json package-lock.json ./

# Install *only* production dependencies
# This is faster, smaller, and more secure
RUN npm ci --omit=dev

# Copy your simplified relay server code
COPY relay-server.js .

# Your server.js will use 'process.env.PORT' (which Koyeb sets to 8000)
CMD ["node", "relay-server.js"]