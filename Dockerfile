# ─── Etapa 1: Build de React ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero (cache de capas)
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Variables de build — se inyectan desde docker-compose o --build-arg
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG REACT_APP_GOOGLE_MAPS_API_KEY

ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_GOOGLE_MAPS_API_KEY=$REACT_APP_GOOGLE_MAPS_API_KEY

# Build de producción
RUN npm run build

# ─── Etapa 2: Servir con Nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Configuración de Nginx para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el build desde la etapa anterior
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
