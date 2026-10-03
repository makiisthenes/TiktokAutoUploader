# Multi-stage: Node builds the Vite bundle, nginx serves it.
FROM node:20-alpine AS build
WORKDIR /app
COPY web/frontend/package.json web/frontend/package-lock.json ./
RUN npm ci
COPY web/frontend/ .
RUN npm run build

FROM nginx:1.27-alpine
COPY web/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
