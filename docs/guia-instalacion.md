# Guía de Instalación - MeDico1

## 📋 Requisitos Previos

### Software Necesario

- **Node.js**: versión 18.0.0 o superior
- **npm**: versión 9.0.0 o superior (incluido con Node.js)
- **Git**: para clonar el repositorio
- **Editor de código**: Visual Studio Code (recomendado)

### Verificar Instalación

```bash
node --version  # Debe mostrar v18.0.0 o superior
npm --version   # Debe mostrar v9.0.0 o superior
git --version   # Cualquier versión reciente
```

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/jricica/MeDico1.git
cd MeDico1
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias definidas en `package.json`.

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Fine (Backend as a Service)
VITE_FINE_PROJECT_ID=your_project_id_here
VITE_FINE_API_KEY=your_api_key_here

# App Configuration
VITE_APP_NAME=MeDico1
VITE_APP_URL=http://localhost:5173

# Database (Fine handles this automatically)
VITE_DATABASE_URL=your_database_url_here
```

**⚠️ Importante**: Nunca compartas tu archivo `.env` ni lo subas a Git.

### 4. Configurar Base de Datos (Fine)

El proyecto usa Fine como Backend as a Service. Para configurarlo:

1. Ve a [Fine](https://fine.dev) y crea una cuenta
2. Crea un nuevo proyecto
3. Copia las credenciales del proyecto
4. Pégalas en tu archivo `.env`
5. Ejecuta las migraciones:

```bash
# Las migraciones están en backend/migrations/
# Ejecuta los scripts SQL en tu panel de Fine:
# - 20250615023009_initial_schema.sql
# - 20250615023010_seed_data.sql
```

### 5. Verificar Estructura de Datos

Asegúrate de que los archivos CSV estén en su lugar:

```
backend/data/surgeries/
├── Cardiovascular/
├── Digestivo/
├── Ortopedia/
└── ...
```

## 🏃 Ejecutar el Proyecto

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:5173`

### Modo Producción (Build)

```bash
# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## 🔧 Solución de Problemas

### Problema: `npm install` falla

**Solución**:
```bash
# Limpiar cache de npm
npm cache clean --force

# Eliminar node_modules y package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

### Problema: Error de permisos en Windows

**Solución**: Ejecuta PowerShell como Administrador

### Problema: Puerto 5173 ya está en uso

**Solución**:
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process

# Linux/Mac
lsof -ti:5173 | xargs kill
```

O cambia el puerto en `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3000, // Cambiar a otro puerto
  },
});
```

### Problema: Errores de TypeScript

**Solución**:
```bash
# Verificar configuración de TypeScript
npx tsc --noEmit

# Regenerar tipos
npm run build
```

### Problema: Errores de importación de módulos

**Solución**: Verifica que el alias `@` esté configurado en:
- `tsconfig.json`
- `tsconfig.app.json`
- `vite.config.ts`

## 📦 Dependencias Principales

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.30.0",
  "@tanstack/react-query": "^5.64.2",
  "@fine-dev/fine-js": "^0.0.19",
  "zustand": "^5.0.3",
  "tailwindcss": "^3.4.17"
}
```

## 🔄 Actualizar Dependencias

```bash
# Ver dependencias desactualizadas
npm outdated

# Actualizar todas las dependencias (con cuidado)
npm update

# Actualizar una dependencia específica
npm install <package>@latest
```

## 🧪 Verificar Instalación

Después de la instalación, verifica que todo funcione:

1. ✅ El servidor de desarrollo inicia sin errores
2. ✅ Puedes navegar a `http://localhost:5173`
3. ✅ La página de login se muestra correctamente
4. ✅ Puedes crear una cuenta nueva
5. ✅ Puedes iniciar sesión
6. ✅ El dashboard se carga con datos

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia el servidor de desarrollo

# Producción
npm run build            # Compila para producción
npm run preview          # Previsualiza el build de producción

# Calidad de Código
npm run lint             # Ejecuta ESLint
npm run lint:fix         # Corrige errores de ESLint automáticamente

# TypeScript
npm run type-check       # Verifica tipos de TypeScript
```

## 🌐 Configuración de IDE (VS Code)

### Extensiones Recomendadas

Instala estas extensiones en VS Code:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **TypeScript Vue Plugin** (`Vue.vscode-typescript-vue-plugin`)
- **Path Intellisense** (`christian-kohler.path-intellisense`)

### Configuración de VS Code

Crea `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## 🚀 Próximos Pasos

Una vez instalado correctamente:

1. Lee la [Guía de Desarrollo](./guia-desarrollo.md)
2. Familiarízate con la [Arquitectura](./arquitectura.md)
3. Revisa las [Convenciones de Código](./convenciones.md)
4. Explora los [Endpoints API](./endpoints.md)

## 💬 Soporte

Si encuentras problemas durante la instalación:

1. Revisa esta guía nuevamente
2. Busca en los [Issues de GitHub](https://github.com/jricica/MeDico1/issues)
3. Crea un nuevo issue si no encuentras solución
4. Contacta al equipo de desarrollo

## 🔐 Seguridad

- **Nunca** compartas tu archivo `.env`
- **Nunca** subas credenciales a Git
- Usa `.gitignore` para excluir archivos sensibles
- Cambia las credenciales si fueron expuestas accidentalmente
