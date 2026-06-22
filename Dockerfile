# ============================================================================
#  Dockerfile del microfrontend de Optimizacion de Horarios (Angular 17 +
#  Single-SPA). Construccion en dos etapas:
#    1) build   -> compila el bundle UMD (main.js) con Node + Angular CLI
#    2) runtime -> sirve los estaticos de dist/ con Nginx
#
#  Construir (configuracion de produccion, por defecto):
#    docker build -t sga-optimizacion-horarios-mf .
#
#  Construir apuntando al entorno de pruebas:
#    docker build --build-arg BUILD_SCRIPT=build:test -t sga-optimizacion-horarios-mf:test .
#
#  Correr:
#    docker run --rm -p 4225:80 sga-optimizacion-horarios-mf
# ============================================================================

# ---------- Etapa 1: COMPILAR el bundle Angular / Single-SPA ----------
FROM node:24-alpine AS build

WORKDIR /app

# Instalar dependencias en una capa cacheable: si package*.json no cambia,
# Docker reutiliza esta capa y no vuelve a bajar todo npm.
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el resto del codigo fuente y compilar.
COPY . .

# Configuracion de build:
#   build:prod -> environment.production.ts (subdominio de produccion)
#   build:test -> environment.development.ts (subdominio de pruebas)
# La URL del backend (API_URL) y el deployUrl quedan "horneados" aqui segun
# el environment elegido; no se inyectan en tiempo de ejecucion.
ARG BUILD_SCRIPT=build:prod
RUN npm run ${BUILD_SCRIPT}

# ---------- Etapa 2: SERVIR los estaticos con Nginx ----------
FROM nginx:1.27-alpine

# Configuracion propia de Nginx (incluye cabeceras CORS para que el root
# institucional pueda cargar main.js desde este subdominio).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el bundle compilado de la etapa anterior.
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
