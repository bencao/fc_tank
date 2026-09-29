# syntax=docker/dockerfile:1

# Stage 1: build the Vite app
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve only the built static assets with nginx. The api/ functions
# (enemy guide, leaderboard) run on Vercel, not here; without them the game
# falls back to its built-in enemy AI and plays on without the leaderboard.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
