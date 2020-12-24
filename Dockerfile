# Builder
FROM node:12-alpine as builder

WORKDIR /app

# Copy files required to build
COPY package*.json tsconfig.json ./ 
COPY webpack.config.js .babelrc jest.config.js ./
COPY .env ./
COPY @app/ ./@app/
COPY @services/ ./@services/
COPY @plugins/ ./@plugins/
COPY @frontend ./@frontend/

RUN npm install && npm run build

RUN npm prune --production

# Build for production
FROM node:12-alpine as production

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public