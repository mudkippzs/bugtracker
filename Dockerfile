# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Default environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/projects || exit 1

# Run the application
CMD ["node", "build"]
