# Microfrontend: Optimización de Horarios
**Sistema de Gestión Académica — Universidad Distrital Francisco José de Caldas**

---

## 1. Contexto del Proyecto

El SGA (Sistema de Gestión Académica) de la UD utiliza una arquitectura **Single-SPA** compuesta por múltiples microfrontends Angular independientes, orquestados por un root config central. Este microfrontend (`optimizacion_horarios_mf`) se integra a ese ecosistema para exponer las vistas de horarios generados por un motor de optimización basado en **OptaPlanner**.

---

## 2. Arquitectura del Sistema

```
Browser
 └── sga_cliente_root (Single-SPA Root Config — puerto 4200)
      ├── core_mf_cliente (sidebar, autenticación, menú — puerto 4201)
      └── sga_cliente_optimizacion_horarios_mf (este MF — puerto 4225)
           └── consume API REST
                └── optaplanner-quickstarts (backend Quarkus — puerto 8080)
```

### 2.1 ¿Qué es Single-SPA?

Single-SPA es un framework que permite ejecutar múltiples aplicaciones SPA (Angular, React, Vue) en la misma página. Cada aplicación es un **microfrontend** con su propio ciclo de vida (`bootstrap`, `mount`, `unmount`). El root config define en qué ruta se activa cada uno.

### 2.2 Registro del microfrontend en el Root

**Archivo:** `sga_cliente_root/src/microfrontend-layout.html`
```xml
<route path="optimizacion_horarios">
  <application name="@udistrital/sga-optimizacion-horarios-mf"></application>
</route>
```

**Archivos de entorno del root** (`environment.ts`, `environment.development.ts`, `environment.production.ts`):
```typescript
"@udistrital/sga-optimizacion-horarios-mf": "//localhost:4225/main.js"
```
Estas entradas dicen a SystemJS (el module loader de Single-SPA) dónde descargar el bundle del MF.

---

## 3. Motor de Optimización: OptaPlanner

OptaPlanner es un motor de planificación de restricciones (Constraint Satisfaction Problem solver) de código abierto. Dado un conjunto de entidades y reglas, encuentra la asignación óptima.

### 3.1 Entidades del Dominio

| Entidad | Descripción | Rol en OptaPlanner |
|---------|-------------|-------------------|
| `Timeslot` | Franja horaria (día + hora inicio + hora fin) | Problem Fact — no cambia durante la optimización |
| `Room` | Espacio físico (aula, laboratorio) | Problem Fact — no cambia durante la optimización |
| `Lesson` | Clase que debe asignarse (materia + docente + grupo) | Planning Entity — sus campos `timeslot` y `room` son las **variables de planificación** |
| `TimeTable` | Contenedor de la solución completa | Planning Solution |

### 3.2 Variables de Planificación

OptaPlanner modifica estas dos propiedades de cada `Lesson` para encontrar la asignación óptima:

- `Lesson.timeslot` → en qué franja horaria se dicta la clase
- `Lesson.room` → en qué espacio físico se dicta

### 3.3 Restricciones del Solver (`TimeTableConstraintProvider`)

**Restricciones DURAS** (Hard Constraints) — no pueden violarse jamás:

| Restricción | Descripción |
|-------------|-------------|
| `roomConflict` | Una sala no puede tener dos clases en el mismo timeslot |
| `teacherConflict` | Un docente no puede dictar dos clases en el mismo timeslot |
| `studentGroupConflict` | Un grupo no puede asistir a dos clases en el mismo timeslot |

**Restricciones SUAVES** (Soft Constraints) — se minimizan para mejorar calidad:

| Restricción | Descripción |
|-------------|-------------|
| `teacherRoomStability` | Los docentes prefieren enseñar siempre en la misma sala |
| `teacherTimeEfficiency` | Los docentes prefieren clases consecutivas (sin huecos grandes) |
| `studentGroupSubjectVariety` | Los grupos evitan tener la misma materia en franjas consecutivas |

### 3.4 Puntuación (Score)

OptaPlanner asigna un `HardSoftScore` a cada solución:
- `hardScore = 0` → todas las restricciones duras cumplidas (solución válida)
- `softScore` → entre más alto, mejor calidad de horario

### 3.5 Endpoints REST del Backend

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/timeTable` | Obtiene el estado actual del horario con su puntuación y `solverStatus` |
| `POST` | `/timeTable/solve` | Inicia la optimización asíncrona |
| `POST` | `/timeTable/stopSolving` | Detiene la optimización antes de que termine |
| `GET` | `/lessons` | Lista todas las lecciones |
| `GET` | `/rooms` | Lista todos los espacios físicos |
| `GET` | `/timeslots` | Lista todas las franjas horarias |

El campo `solverStatus` puede ser:
- `NOT_SOLVING` — el solver está inactivo
- `SOLVING_SCHEDULED` — la optimización está en cola
- `SOLVING_ACTIVE` — la optimización está en curso

---

## 4. Estructura del Microfrontend

```
sga_cliente_optimizacion_horarios_mf/
├── src/
│   ├── main.single-spa.ts          ← Punto de entrada Single-SPA (lifecycles)
│   ├── single-spa/
│   │   └── single-spa-props.ts     ← Canal de comunicación con el root
│   ├── environments/
│   │   ├── environment.ts          ← Local: API en localhost:8080
│   │   ├── environment.development.ts  ← Entorno de pruebas UD
│   │   └── environment.production.ts   ← Entorno de producción UD
│   └── app/
│       ├── app.component.ts        ← Shell: toolbar + navegación + control solver
│       ├── app.routes.ts           ← Definición de rutas Angular
│       ├── app.config.ts           ← Providers (router, httpclient, animations)
│       ├── models/
│       │   ├── timeslot.model.ts   ← Interface TypeScript para Timeslot
│       │   ├── room.model.ts       ← Interface TypeScript para Room
│       │   ├── lesson.model.ts     ← Interface TypeScript para Lesson
│       │   └── timetable.model.ts  ← Interface TypeScript para TimeTable + Score
│       ├── services/
│       │   └── timetable.service.ts ← Cliente HTTP para la API OptaPlanner
│       ├── horario-docentes/       ← Vista: horario agrupado por docente
│       ├── disponibilidad-espacios/ ← Vista: ocupación de aulas por franja
│       └── horario-estudiantes/    ← Vista: horario agrupado por grupo
├── extra-webpack.config.js         ← Configuración Webpack Single-SPA Angular
├── angular.json                    ← Proyecto con builder custom-webpack (UMD)
└── package.json                    ← Scripts de build/serve por entorno
```

---

## 5. Integración con Single-SPA

### 5.1 Punto de entrada (`main.single-spa.ts`)

En lugar del `main.ts` estándar de Angular, Single-SPA requiere exportar tres funciones de ciclo de vida:

```typescript
const lifecycles = singleSpaAngular({
  bootstrapFunction: singleSpaProps => {
    singleSpaPropsSubject.next(singleSpaProps);
    return bootstrapApplication(AppComponent, appConfig);  // standalone Angular 17
  },
  template: '<app-root />',
  Router,
  NavigationStart,
  NgZone,
});

export const bootstrap = lifecycles.bootstrap;  // Se llama una vez al cargar el MF
export const mount = lifecycles.mount;          // Se llama al navegar a /optimizacion_horarios
export const unmount = lifecycles.unmount;      // Se llama al salir de /optimizacion_horarios
```

### 5.2 Build como librería UMD (`angular.json`)

El builder `@angular-builders/custom-webpack:browser` con la configuración `customWebpackConfig` produce un bundle UMD en lugar del bundle estándar de Angular:

```json
"customWebpackConfig": {
  "path": "extra-webpack.config.js",
  "libraryName": "sga-optimizacion-horarios-mf",
  "libraryTarget": "umd"
}
```

Esto es necesario para que SystemJS (el module loader de Single-SPA) pueda cargar el MF dinámicamente en runtime.

### 5.3 Configuraciones por entorno

| Configuración | Puerto | `deployUrl` | Environment |
|---------------|--------|-------------|-------------|
| `local` | 4225 | `http://localhost:4225/` | `environment.ts` |
| `development` | servidor UD | `https://pruebassgaoptimizacionhorarios...` | `environment.development.ts` |
| `production` | servidor UD | `https://sgaoptimizacionhorarios...` | `environment.production.ts` |

---

## 6. Vistas del Microfrontend

### 6.1 Horario por Docente (`/horario-docentes`)

Muestra una tabla donde:
- **Filas** = docentes
- **Columnas** = franjas horarias (día + hora)
- **Celda** = materia y aula asignada al docente en esa franja

Permite visualizar la carga académica de cada docente e identificar solapamientos (que no deberían existir si el score hard = 0).

### 6.2 Disponibilidad de Espacios Físicos (`/disponibilidad-espacios`)

Muestra una tabla donde:
- **Filas** = franjas horarias
- **Columnas** = espacios físicos (aulas/laboratorios)
- **Celda verde** = espacio disponible en esa franja
- **Celda roja** = espacio ocupado (muestra la materia que lo ocupa)

Permite a administradores visualizar la utilización de espacios en tiempo real y planificar asignaciones manuales.

### 6.3 Horario por Grupo de Estudiantes (`/horario-estudiantes`)

Muestra una tabla donde:
- **Filas** = grupos de estudiantes
- **Columnas** = franjas horarias
- **Celda** = materia, docente y aula del grupo en esa franja

El tooltip al pasar el cursor muestra información adicional (docente + aula).

### 6.4 Control del Solver (toolbar superior)

- Botón **Optimizar** → envía `POST /timeTable/solve` e inicia polling cada 2 segundos
- Botón **Detener** → envía `POST /timeTable/stopSolving`
- Barra de progreso → visible mientras el solver está activo
- Score en tiempo real → `Hard: X / Soft: Y` actualizado con cada poll

---

## 7. Flujo de Datos

```
1. ngOnInit → GET /timeTable
      ↓
2. Recibe TimeTable { timeslotList, roomList, lessonList, score, solverStatus }
      ↓
3. buildGrid() → agrupa lessons por docente/grupo/franja
      ↓
4. Renderiza tabla con Material Table

[Usuario presiona "Optimizar"]
      ↓
5. POST /timeTable/solve
      ↓
6. pollUntilSolved() → interval(2000) + GET /timeTable
      ↓
7. Actualiza tabla cada 2s mientras solverStatus !== 'NOT_SOLVING'
      ↓
8. Al completar, muestra score final
```

---

## 8. Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Levantar en modo local (puerto 4225)
npm start

# Build para pruebas (entorno UD pruebas)
npm run build:test

# Build para producción
npm run build:prod
```

Para ejecutar el MF integrado, también deben estar corriendo:
```bash
# Root config (puerto 4200)
cd sga_cliente_root && npm start

# Backend OptaPlanner (puerto 8080)
cd optaplanner-quickstarts/use-cases/school-timetabling && ./mvnw quarkus:dev
```

---

## 9. Integración con el Sistema de Menús del SGA

El sidebar del SGA es gestionado por `core_mf_cliente`. El menú se carga dinámicamente desde el backend de configuración basándose en los roles del usuario.

**Configuración en el portal CORE:**

| Campo | Valor |
|-------|-------|
| Nombre | `optimizacion_horarios` |
| URL | `/optimizacion_horarios/` |
| Aplicación | `SGA` |
| Tipo | `Menú` |
| Rol | `ADMIN_HORARIOS` |

Solo los usuarios con el rol `ADMIN_HORARIOS` verán este menú en el sidebar.

---

## 10. Tecnologías Utilizadas

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Angular | 17.3.x | Framework frontend |
| Single-SPA | 6.x | Orquestador de microfrontends |
| single-spa-angular | 9.x | Adaptador Angular para Single-SPA |
| Angular Material | 17.3.x | Componentes UI |
| Webpack (custom) | vía `@angular-builders/custom-webpack` | Generación de bundle UMD |
| OptaPlanner | 8.45.x | Motor de optimización de restricciones |
| Quarkus | 2.16.x | Framework backend Java |
| RxJS | 7.8.x | Programación reactiva (polling, streams) |
