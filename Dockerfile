# Stage 1: build
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve (non-root)
FROM docker.io/nginxinc/nginx-unprivileged:alpine
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 nginx.conf     /etc/nginx/conf.d/default.conf
COPY --chown=101:101 security.conf  /etc/nginx/snippets/security.conf
EXPOSE 8080

LABEL org.opencontainers.image.source="https://github.com/eliothkrahler/portfolio"
LABEL org.opencontainers.image.description="portfolio.krahler.com — static site on nginx"
LABEL org.opencontainers.image.licenses="MIT"
