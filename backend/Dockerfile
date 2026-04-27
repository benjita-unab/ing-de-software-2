# ===== STAGE 1: Builder =====
FROM node:20-alpine AS builder

WORKDIR /build

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# ===== STAGE 2: Runtime =====
FROM node:20-alpine

WORKDIR /app

# Instalar dumb-init para manejar señales correctamente
RUN apk add --no-cache dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar package*.json
COPY --from=builder /build/package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar código compilado desde builder
COPY --from=builder /build/dist ./dist

# Cambiar permisos al usuario nodejs
RUN chown -R nodejs:nodejs /app

# Cambiar al usuario nodejs
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Usar dumb-init para ejecutar el proceso
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "dist/main"]
