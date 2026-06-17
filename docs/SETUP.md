# Setup

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar Supabase

Crea un proyecto en Supabase y copia los valores en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
```

## 3. Crear la tabla

En Supabase, entra en SQL Editor y ejecuta el contenido de:

```txt
supabase/schema.sql
```

## 4. Permisos

Como esta primera versión no tiene login, la tabla `entries` necesita permisos para leer, crear y borrar registros desde la app.

## 5. Arrancar

```bash
npm run dev
```

Luego abre:

```txt
http://localhost:3000
```

## Tarifas

Labeling:

- Localized: $1.50 por DR
- DenseFusion: $2.60 por DR
- Textualization: $2.00 por DR

Reviewing:

- Todos los proyectos: $25 por hora
