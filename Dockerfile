# syntax=docker/dockerfile:1

# Stage 1: build the Vite app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve only the built static assets with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
