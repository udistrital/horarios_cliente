# MF Optimización de Horarios — SGA UD

Microfrontend del **módulo de Optimización de Horarios Académicos**, integrado al
Sistema de Gestión Académica (SGA) de la Universidad Distrital mediante **Single-SPA**.
Permite ejecutar la optimización (asignación de docentes, salones y estudiantes a
grupos mediante OptaPlanner en el backend) y consultar los resultados en cinco vistas.

## Stack

| Capa | Tecnología | Versión |
|------|------------|---------|
| Framework | Angular | **20.3** (standalone) |
| Integración MF | single-spa-angular | **20.1** |
| Builder | @angular-builders/custom-webpack | **20.0** (bundle UMD) |
| UI | Angular Material / CDK | 20.2 |
| i18n | @ngx-translate/core | 15 |
| Lenguaje | TypeScript | 5.8 |

## Requisitos

- **Node.js 24** (recomendado). Angular 20 admite `^20.19 || ^22.12 || >=24`.
- npm 8+.

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm start
```

Levanta el dev server en **http://localhost:4225**. El microfrontend se sirve como
`main.js` (bundle UMD) para que el root institucional lo cargue.

Para verlo integrado en el portal completo deben estar corriendo también el root
(`:4200`), el core (`:4201`) y el backend (`:8081`). Con todo arriba:
`http://localhost:4200/optimizacion_horarios/ejecutar-optimizacion`.

## Build

```bash
npm run build:prod    # configuración de producción (environment.production.ts)
npm run build:test    # configuración de pruebas    (environment.development.ts)
```

Los artefactos se generan en `dist/` (`main.js`, `index.html`, `favicon.ico`).

## Integración Single-SPA

| Dato | Valor |
|------|-------|
| Nombre del módulo | `@udistrital/sga-optimizacion-horarios-mf` |
| Ruta en el root | `/optimizacion_horarios` |
| Entry point | `src/main.single-spa.ts` |
| Puerto local | `4225` |

El root institucional registra el módulo en su *import map* apuntando a la URL donde
se sirva `main.js`. La URL del backend (`API_URL`) y el `deployUrl` quedan compilados
en el bundle según el `environment` elegido:

| Build | API_URL | Subdominio |
|-------|---------|-----------|
| `build:prod` | `https://sgaoptimizacionhorarios.portaloas.udistrital.edu.co/api` | producción |
| `build:test` | `https://pruebassgaoptimizacionhorarios.portaloas.udistrital.edu.co/api` | pruebas |
| local | `http://localhost:8081` | — |

## Docker

```bash
# Producción (por defecto)
docker build -t sga-optimizacion-horarios-mf .

# Pruebas
docker build --build-arg BUILD_SCRIPT=build:test -t sga-optimizacion-horarios-mf:test .

# Ejecutar (sirve los estáticos con Nginx en :80)
docker run --rm -p 4225:80 sga-optimizacion-horarios-mf
```

La imagen usa build multi-stage: **Node 24** compila el bundle → **Nginx** sirve
`dist/` con cabeceras CORS. No requiere variables de entorno en ejecución.

## Vistas

| Ruta | Descripción |
|------|-------------|
| `ejecutar-optimizacion` | Ejecuta los solvers (preview → guardar en BD) |
| `horario-docentes` | Grupos con su docente asignado |
| `disponibilidad-espacios` | Ocupación de salones por día |
| `horario-estudiantes` | Horario personal por estudiante |
| `distribucion-grupos` | Estudiantes asignados a cada grupo |

## Repositorio

`https://github.com/udistrital/horarios_cliente` — rama `develop`.
