# 🚀 Guía de Instalación Completa - MéDico1

Esta guía te llevará paso a paso por todo el proceso de instalación y configuración de MéDico1.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#-prerrequisitos)
2. [Instalación de Software Base](#-instalación-de-software-base)
3. [Configuración del Proyecto](#-configuración-del-proyecto)
4. [Configuración de Base de Datos](#-configuración-de-base-de-datos)
5. [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
6. [Migraciones y Datos Iniciales](#-migraciones-y-datos-iniciales)
7. [Primer Inicio](#-primer-inicio)
8. [Verificación](#-verificación)
9. [Problemas Comunes](#-problemas-comunes)

---

## ✅ Prerrequisitos

Antes de comenzar, necesitas tener instalado:

- **Python 3.12+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Git**

---

## 🛠️ Instalación de Software Base

### 1. Python

#### Windows
1. Descarga Python desde [python.org](https://www.python.org/downloads/)
2. **IMPORTANTE**: Marca la casilla "Add Python to PATH" durante la instalación
3. Verifica la instalación:
```cmd
python --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3.12 python3.12-venv python3-pip
python3 --version
```

#### macOS
```bash
brew install python@3.12
python3 --version
```

---

### 2. Node.js

#### Windows
1. Descarga el instalador desde [nodejs.org](https://nodejs.org/)
2. Ejecuta el instalador (incluye npm automáticamente)
3. Verifica la instalación:
```cmd
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

#### macOS
```bash
brew install node@18
node --version
npm --version
```

---

### 3. PostgreSQL

#### Windows
1. Descarga el instalador desde [postgresql.org](https://www.postgresql.org/download/windows/)
2. Ejecuta el instalador
3. **IMPORTANTE**: Anota la contraseña que configures para el usuario `postgres`
4. Deja el puerto por defecto (5432)
5. Verifica que el servicio esté corriendo:
```cmd
# PowerShell
Get-Service postgresql*
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

---

### 4. Git

#### Windows
1. Descarga Git desde [git-scm.com](https://git-scm.com/download/win)
2. Ejecuta el instalador (opciones por defecto están bien)
3. Verifica:
```cmd
git --version
```

#### Linux
```bash
sudo apt install git
```

#### macOS
```bash
brew install git
```

---

## 📦 Configuración del Proyecto

### 1. Clonar el Repositorio

```bash
# Clonar
git clone https://github.com/jricica/MeDico1.git

# Entrar al directorio
cd MeDico1
```

---

### 2. Configurar Entorno Virtual de Python

#### Windows (PowerShell)
```powershell
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\activate

# Deberías ver (venv) al inicio de tu prompt
```

#### Windows (CMD)
```cmd
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
venv\Scripts\activate.bat
```

#### Linux/macOS
```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Deberías ver (venv) al inicio de tu prompt
```

**✅ Verificar que el entorno esté activo:**
Tu prompt debería verse así:
```
(venv) C:\MeDico\MeDico1>        # Windows
(venv) user@computer:~/MeDico1$  # Linux/Mac
```

---

### 3. Instalar Dependencias de Python

Con el entorno virtual **activado**:

```bash
# Actualizar pip (recomendado)
python -m pip install --upgrade pip

# Instalar todas las dependencias
pip install -r requirements.txt

# Esto puede tardar 2-3 minutos...
```

**✅ Verificar instalación exitosa:**
```bash
pip list
# Deberías ver Django, djangorestframework, etc.
```

---

### 4. Instalar Dependencias de Node.js

En la misma carpeta del proyecto:

```bash
# Instalar dependencias (puede tardar 3-5 minutos)
npm install

# Si encuentras errores, intenta:
npm cache clean --force
npm install
```

**✅ Verificar instalación exitosa:**
```bash
npm list --depth=0
# Deberías ver react, vite, typescript, etc.
```

---

## 🗄️ Configuración de Base de Datos

### 1. Acceder a PostgreSQL

#### Windows
```cmd
# PowerShell (como Administrador)
psql -U postgres

# Te pedirá la contraseña que configuraste durante la instalación
```

#### Linux
```bash
sudo -u postgres psql
```

#### macOS
```bash
psql postgres
```

---

### 2. Crear Base de Datos y Usuario

Una vez dentro de psql (`postgres=#`):

```sql
-- Crear la base de datos
CREATE DATABASE MeDico;

-- Crear usuario (opcional, puedes usar 'postgres')
CREATE USER medico_user WITH PASSWORD 'tu_password_seguro';

-- Dar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE MeDico TO medico_user;

-- Listar bases de datos para verificar
\l

-- Salir de psql
\q
```

**✅ Deberías ver `MeDico` en la lista de bases de datos**

---

## ⚙️ Configuración de Variables de Entorno

### 1. Copiar el Archivo de Ejemplo

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/macOS
cp .env.example .env
```

---

### 2. Editar el Archivo `.env`

Abre el archivo `.env` con tu editor favorito (VS Code, Notepad++, nano, vim, etc.)

**Configuración MÍNIMA necesaria:**

```env
# ========================================
# BASE DE DATOS (EDITAR ESTO)
# ========================================
DB_NAME=MeDico
DB_USER=postgres                    # O 'medico_user' si creaste uno
DB_PASSWORD=TU_PASSWORD_REAL_AQUI   # ⚠️ CAMBIA ESTO
DB_HOST=localhost
DB_PORT=5432

# ========================================
# DJANGO (EDITAR ESTO)
# ========================================
# Genera una en: https://djecrety.ir/
DJANGO_SECRET_KEY=GENERA_UNA_KEY_SEGURA_AQUI  # ⚠️ CAMBIA ESTO

DJANGO_SETTINGS_MODULE=core.settings.dev
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# ========================================
# CORS
# ========================================
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ========================================
# JWT
# ========================================
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1

# ========================================
# EMAIL (Opcional - puede quedarse así)
# ========================================
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**⚠️ IMPORTANTE:**
1. Reemplaza `TU_PASSWORD_REAL_AQUI` con tu contraseña de PostgreSQL
2. Genera y reemplaza `DJANGO_SECRET_KEY` en https://djecrety.ir/
3. Guarda el archivo

---

## 🔄 Migraciones y Datos Iniciales

### 1. Aplicar Migraciones

Con el entorno virtual **activado** y el archivo `.env` configurado:

```bash
# Aplicar migraciones
python manage.py migrate

# Deberías ver muchas líneas como:
# Applying auth.0001_initial... OK
# Applying contenttypes.0001_initial... OK
# etc.
```

**✅ Si ves "OK" en todas las migraciones, ¡perfecto!**

---

### 2. Crear Superusuario (Admin)

```bash
python manage.py createsuperuser
```

Te preguntará:
```
Username: admin                    # Elige un username
Email: admin@example.com          # Tu email
Password: ********                # Elige un password seguro
Password (again): ********        # Confirma el password
```

**✅ Deberías ver:** `Superuser created successfully.`

---

### 3. (Opcional) Cargar Datos de Prueba

Si tienes fixtures o datos de prueba:

```bash
python manage.py loaddata initial_data.json
```

---

## 🎉 Primer Inicio

### Iniciar la Aplicación

Con el entorno virtual **activado**:

```bash
python manage.py runserver
```

Deberías ver:
```
Starting Vite dev server in background...
Vite dev server started successfully
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

**🎊 ¡La aplicación ya está corriendo!**

---

## ✅ Verificación

### 1. Verificar Backend (Django)

Abre tu navegador y visita:

- **Admin Django:** http://127.0.0.1:8000/admin
  - Usa el username/password que creaste con `createsuperuser`
  - Deberías poder iniciar sesión

- **API:** http://127.0.0.1:8000/api/v1/
  - Deberías ver la lista de endpoints disponibles

---

### 2. Verificar Frontend (React)

- **Aplicación:** http://127.0.0.1:8000
  - Deberías ver la página principal de MéDico1
  - La interfaz debería cargar sin errores

---

### 3. Verificar Carga de Cirugías

1. Ve a: http://127.0.0.1:8000
2. Navega a "Operaciones" o "Cirugías"
3. Deberías ver las 6,894 cirugías cargadas
4. Intenta expandir una especialidad (ej: Ortopedia)
5. Deberías ver las subcategorías y cirugías

---

### 4. Verificar Calculadora

1. Ve a la sección "Calculadora"
2. Selecciona una cirugía
3. Ingresa valores de prueba
4. El cálculo debería funcionar correctamente

---

## 🐛 Problemas Comunes

### ❌ "python: command not found"
**Causa:** Python no está en PATH
**Solución:** 
- Windows: Reinstala Python marcando "Add to PATH"
- Linux/Mac: Usa `python3` en lugar de `python`

---

### ❌ "pip: command not found"
**Causa:** pip no está instalado
**Solución:**
```bash
python -m ensurepip --upgrade
# o
sudo apt install python3-pip  # Linux
```

---

### ❌ "psycopg2 installation error"
**Causa:** Falta librerías de desarrollo de PostgreSQL
**Solución:**
```bash
# Linux
sudo apt-get install libpq-dev python3-dev

# Windows: usa psycopg2-binary (ya está en requirements.txt)

# macOS
brew install postgresql
```

---

### ❌ "django.db.utils.OperationalError: FATAL: password authentication failed"
**Causa:** Contraseña incorrecta en .env
**Solución:**
1. Verifica tu archivo `.env`
2. Asegúrate que `DB_PASSWORD` sea correcto
3. Prueba conectarte manualmente: `psql -U postgres -d MeDico`

---

### ❌ "django.core.exceptions.ImproperlyConfigured: Set the DJANGO_SECRET_KEY"
**Causa:** Falta configurar DJANGO_SECRET_KEY en .env
**Solución:**
1. Ve a https://djecrety.ir/
2. Copia la key generada
3. Pégala en `.env` en la línea `DJANGO_SECRET_KEY=...`

---

### ❌ "Port 8000 is already in use"
**Causa:** Ya hay algo corriendo en el puerto 8000
**Solución:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <número> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9

# O usa otro puerto
python manage.py runserver 8001
```

---

### ❌ "npm ERR! code ENOENT"
**Causa:** Node.js o npm no instalados correctamente
**Solución:**
```bash
# Verifica versiones
node --version
npm --version

# Si fallan, reinstala Node.js
```

---

### ❌ "Vite no inicia automáticamente"
**Causa:** Permisos o error en middleware
**Solución:**
```bash
# Ver logs
type vite.log  # Windows
cat vite.log   # Linux/Mac

# Iniciar Vite manualmente en otra terminal
npm run dev
```

---

### ❌ Las cirugías no cargan (aparece 0)
**Causa:** Archivos CSV no encontrados o mal path
**Solución:**
1. Verifica que exista `public/surgeries/`
2. Verifica que haya archivos .csv dentro
3. Revisa la consola del navegador (F12) para ver errores
4. Revisa `src/shared/utils/csvLoader.ts`

---

### ❌ "(venv) no aparece en mi terminal"
**Causa:** Entorno virtual no activado
**Solución:**
```bash
# Windows PowerShell
.\venv\Scripts\activate

# Windows CMD
venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

---

## 🆘 Obtener Ayuda

Si sigues teniendo problemas:

1. **Revisa los logs:**
   ```bash
   # Django
   # Los errores aparecen en la terminal donde ejecutaste runserver
   
   # Vite
   type vite.log  # Windows
   cat vite.log   # Linux/Mac
   ```

2. **Busca en Issues de GitHub:**
   - https://github.com/jricica/MeDico1/issues

3. **Crea un nuevo Issue:**
   - Incluye el error completo
   - Menciona tu sistema operativo
   - Menciona las versiones (Python, Node, PostgreSQL)

---

## ✅ Checklist Final

Usa este checklist para asegurarte de tener todo:

- [ ] Python 3.12+ instalado
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 14+ instalado y corriendo
- [ ] Git instalado
- [ ] Proyecto clonado
- [ ] Entorno virtual creado y activado
- [ ] `pip install -r requirements.txt` ejecutado sin errores
- [ ] `npm install` ejecutado sin errores
- [ ] PostgreSQL: Base de datos "MeDico" creada
- [ ] Archivo `.env` creado y configurado
- [ ] `python manage.py migrate` ejecutado exitosamente
- [ ] Superusuario creado con `createsuperuser`
- [ ] `python manage.py runserver` inicia sin errores
- [ ] http://127.0.0.1:8000/admin abre correctamente
- [ ] http://127.0.0.1:8000 muestra la aplicación
- [ ] Las 6,894 cirugías se cargan correctamente

**Si marcaste todos, ¡FELICIDADES! 🎉 Ya tienes MéDico1 funcionando.**

---

## 🚀 Próximos Pasos

Ahora que tienes todo funcionando:

1. **Explora la aplicación:**
   - Navega por las diferentes secciones
   - Prueba la calculadora
   - Agrega favoritos
   - Revisa el historial

2. **Lee el código:**
   - Revisa `src/pages/` para ver las páginas
   - Revisa `src/shared/components/` para los componentes
   - Revisa `apps/` para el backend Django

3. **Haz cambios:**
   - Crea una nueva rama: `git checkout -b mi-feature`
   - Haz tus cambios
   - Commitea: `git commit -m "feat: mi nueva feature"`
   - Pushea: `git push origin mi-feature`

4. **Lee la documentación:**
   - [README.md](README.md) - Documentación general
   - [Django Docs](https://docs.djangoproject.com/)
   - [React Docs](https://react.dev/)

---

<div align="center">

**¡Disfruta desarrollando con MéDico1! 💙**

¿Preguntas? Abre un [Issue en GitHub](https://github.com/jricica/MeDico1/issues)

</div>
