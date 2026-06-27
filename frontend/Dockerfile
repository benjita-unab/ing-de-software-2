# ===== STAGE: Development (hot reload) =====
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3001
ENV WDS_SOCKET_PORT=3001
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

EXPOSE 3001

CMD ["npm", "start"]

# ===== STAGE: Builder =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_URL=http://localhost:3000
ARG REACT_APP_GOOGLE_MAPS_API_KEY=
ARG REACT_APP_MQTT_BROKER_URL=ws://localhost:9001
ARG REACT_APP_DEMO_EMAIL=
ARG REACT_APP_DEMO_PASSWORD=

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_MAPS_API_KEY=$REACT_APP_GOOGLE_MAPS_API_KEY
ENV REACT_APP_MQTT_BROKER_URL=$REACT_APP_MQTT_BROKER_URL
ENV REACT_APP_DEMO_EMAIL=$REACT_APP_DEMO_EMAIL
ENV REACT_APP_DEMO_PASSWORD=$REACT_APP_DEMO_PASSWORD

RUN npm run build

# ===== STAGE: Production =====
FROM nginx:1.25-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
