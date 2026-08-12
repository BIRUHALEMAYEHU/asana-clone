FROM node:20-slim

# Prisma's query engine needs OpenSSL
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (for caching). `npm ci` respects package-lock.json,
# so the image gets the pinned prisma/@prisma/client versions.
COPY package.json package-lock.json ./
RUN npm ci

# Copy application files
COPY . .

# Builds the Prisma client and the frontend into dist/
RUN npm run build

# tsx and the Prisma CLI are runtime dependencies, so `npm start` finds them.
# NODE_ENV is set only after the build so `npm ci` above still installs vite/typescript.
ENV NODE_ENV=production
ENV PORT=3001
# Persist the SQLite file outside the image layer
ENV DATABASE_URL=file:/data/dev.db
VOLUME ["/data"]

EXPOSE 3001
CMD ["npm", "start"]
