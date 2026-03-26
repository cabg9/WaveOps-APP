# 🐙 Configuración de GitHub para WaveOps

## Paso 1: Crear cuenta de GitHub (si no tienes)

1. Ve a https://github.com/signup
2. Ingresa tu email, crea una contraseña, elige nombre de usuario: **cabg9**
3. Verifica tu email
4. Completa el setup

## Paso 2: Crear repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name:** `waveops`
3. **Description:** `Sistema de Gestión Operativa`
4. Selecciona **"Private"** (privado)
5. **NO** marques "Initialize this repository with a README"
6. Click en **"Create repository"**

## Paso 3: Subir el proyecto desde tu computadora

Abre la terminal y ejecuta estos comandos uno por uno:

```bash
# 1. Ir a la carpeta del proyecto
cd /mnt/okcomputer/output/app

# 2. Configurar tu nombre y email en git
git config --global user.name "cabg9"
git config --global user.email "tu-email@ejemplo.com"

# 3. Inicializar git
git init

# 4. Agregar todos los archivos
git add .

# 5. Crear el primer commit
git commit -m "V1.0.0.0 - WaveOps - Initial Release"

# 6. Renombrar la rama a main
git branch -M main

# 7. Conectar con GitHub
git remote add origin https://github.com/cabg9/waveops.git

# 8. Subir todo a GitHub
git push -u origin main
```

## Paso 4: Verificar que funcionó

1. Ve a https://github.com/cabg9/waveops
2. Debes ver todos los archivos del proyecto
3. El commit debe decir "V1.0.0.0 - WaveOps - Initial Release"

## 🔄 Para futuras actualizaciones

Cuando hagas cambios y quieras subirlos:

```bash
# Ir a la carpeta
cd /mnt/okcomputer/output/app

# Ver qué archivos cambiaron
git status

# Agregar cambios
git add .

# Crear commit con versión
git commit -m "V1.3.11.0 - Descripción del cambio"

# Subir a GitHub
git push origin main
```

## 🏷️ Crear versiones con tags

Para marcar versiones importantes:

```bash
# Crear tag
git tag -a v1.0.0.0 -m "Version 1.0.0.0 - Initial Release"

# Subir tags
git push origin --tags
```

## ❓ Si tienes problemas

### Error: "fatal: not a git repository"
```bash
cd /mnt/okcomputer/output/app
git init
```

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/cabg9/waveops.git
```

### Error: "failed to push"
```bash
git pull origin main --rebase
git push origin main
```

## 📞 Ayuda

Si tienes problemas, escríbeme y te ayudo paso a paso.
