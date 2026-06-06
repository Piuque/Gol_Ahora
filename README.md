# Gol Ahora - Servidor API y Base de Datos PostgreSQL

Este es el backend de gestión para el complejo deportivo **"El buen deporte"**, diseñado con arquitectura RESTful y conectado directamente a una base de datos relacional **PostgreSQL** con todos los endpoints y la especificación Swagger traducidos al **español**.

---

## Estructura del Proye cto

* **`server.js`**: Servidor Node.js que expone los endpoints y sirve Swagger UI.
* **`db.js`**: Conexión nativa a PostgreSQL con inicialización de tablas automática.
* **`openapi.yaml`**: Especificación OpenAPI 3.0 (en español) con los 93 requerimientos del sistema.
* **`index.html`**: Visor interactivo premium de Swagger UI.
* **`.env`**: Archivo local para almacenar tu cadena de conexión a la base de datos (ignorado por Git).
* **`.gitignore`**: Define qué archivos se omiten al subir a GitHub (node_modules, .env).

---

## Guía de Configuración Local (PostgreSQL)

1. **Obtener PostgreSQL**: Puedes crear una base de datos PostgreSQL gratuita en la nube usando [Neon.tech](https://neon.tech) en menos de 1 minuto.
2. **Configurar el entorno**: Abre el archivo `.env` en la raíz del proyecto y reemplaza la dirección con tu cadena de conexión obtenida:
   ```env
   DATABASE_URL=postgresql://usuario:contraseña@host:puerto/nombre_bd?sslmode=require
   ```
3. **Iniciar el servidor**:
   ```bash
   npm start
   ```

---

## Guía Paso a Paso para Desplegar en Render.com (Sin Repositorio Previo)

Como ya tienes `git` instalado en tu máquina y tu cuenta en Render.com lista, sigue estos pasos desde la consola para subir el proyecto a GitHub y desplegarlo en la nube:

### Paso 1: Crear tu repositorio en GitHub
1. Abre tu navegador y entra a [GitHub](https://github.com).
2. Haz clic en el botón verde **New** (Nuevo repositorio) en la parte superior izquierda.
3. Configura las siguientes opciones:
   - **Repository name**: `gol-ahora-api`
   - **Public/Private**: Elige según tu preferencia (ambos funcionan en Render).
   - **NO** marques las opciones de agregar README, gitignore ni licencia (ya los tenemos en la carpeta).
4. Haz clic en **Create repository**.
5. Copia la URL del repositorio que aparecerá (tiene el formato `https://github.com/tu-usuario/gol-ahora-api.git`).

### Paso 2: Inicializar Git y subir tu código local
Abre PowerShell o tu terminal de preferencia, asegúrate de estar parado en la carpeta del proyecto (`C:\Users\Piuque\.gemini\antigravity\scratch\gol-ahora-api`) y ejecuta los siguientes comandos uno por uno:

```powershell
# 1. Inicializar el repositorio Git local
git init

# 2. Agregar todos los archivos al área de preparación (ignora node_modules y .env de forma automática)
git add .

# 3. Hacer el primer commit
git commit -m "primer commit: api Gol Ahora en espanol con PostgreSQL"

# 4. Cambiar el nombre de la rama principal a 'main'
git branch -M main

# 5. Enlazar tu carpeta local con tu repositorio de GitHub (Reemplaza por la URL que copiaste en el Paso 1)
git remote add origin https://github.com/tu-usuario/gol-ahora-api.git

# 6. Subir el código a GitHub
git push -u origin main
```

### Paso 3: Conectar GitHub a Render.com
1. Ve a tu panel de [Render.com](https://dashboard.render.com).
2. Haz clic en **New +** y selecciona **Web Service**.
3. En la lista de repositorios, haz clic en **Connect** al lado de tu repositorio `gol-ahora-api` (si no te aparece, puedes vincular tu cuenta de GitHub a Render en ese mismo paso).
4. Configura el Web Service:
   - **Name**: `gol-ahora-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (Gratuito)
5. Ve a la pestaña **Environment** en el menú de Render y agrega la variable:
   - **Key**: `DATABASE_URL`
   - **Value**: *Pega aquí la cadena de conexión de tu base de datos de PostgreSQL en la nube.*
6. Presiona **Save Changes** (Guardar Cambios).

Render comenzará el despliegue automático del servidor de Swagger en español y su base de datos.
