# Cobalto

Un editor de código oscuro y liviano, hecho con Electron, para escribir y ejecutar **Python** y **JavaScript**.
El editor de texto es Monaco (licencia MIT). Cobalto es un proyecto propio y no es un producto de Microsoft.

## Qué trae (versión 0.2.0)

- Pestañas, explorador de carpetas, barra de estado y paleta de comandos (F1).
- **Ejecutar con F5**: Python (`.py`) y JavaScript (`.js`). Las páginas `.html` se abren en tu navegador.
- **Terminal simple** abajo (Ctrl + Ñ), que parte en la carpeta que tengas abierta.
- **Buscar en toda la carpeta** (Ctrl + Shift + F).
- **4 temas de color**: Cobalto, Medianoche, Grafito y Claro (menú **Tema**).
- **Autoguardado** (menú Archivo, o clic en la barra de abajo).
- **Recuerda** tu carpeta, tus archivos abiertos, el tema y el tamaño de letra.

## Cómo abrirlo (solo la primera vez hay que instalar cosas)

1. **Instala Node.js** (versión "LTS") desde https://nodejs.org
2. **Instala Python** desde https://python.org y marca **"Add Python to PATH"**
   (solo lo necesitas para ejecutar programas de Python; JavaScript funciona sin instalar nada más).
3. **Abre una terminal dentro de esta carpeta.**
   En Windows: abre la carpeta, haz clic en la barra de direcciones, escribe `cmd` y presiona Enter.
4. Escribe esto y presiona Enter (tarda unos minutos):

   ```
   npm install
   ```

5. Abre la app con:

   ```
   npm start
   ```

La próxima vez solo necesitas el paso 5.

> Consejo: no pongas esta carpeta dentro de OneDrive (por ejemplo, el Escritorio). OneDrive se mete a sincronizar
> miles de archivos pequeños y puede bloquear `npm install`. Un buen lugar es `C:\cobalto`.

### Si algo falla

- **La ventana no aparece:** mira los mensajes en la ventana negra (empiezan con `[cobalto]` o `[pantalla]`).
  También prueba `npm run start:safe`.
- **La app abre pero hay un mensaje rojo sobre el editor:** falta correr `npm install`.
- **Para ver errores dentro de la app:** presiona **F12**.

## Atajos

| Qué hace                     | Atajo                       |
| ---------------------------- | --------------------------- |
| Archivo nuevo                | Ctrl + N                    |
| Abrir archivo                | Ctrl + O                    |
| Abrir carpeta                | Ctrl + Shift + O            |
| Guardar / Guardar como       | Ctrl + S / Ctrl + Shift + S |
| Cerrar pestaña               | Ctrl + W                    |
| Ejecutar / Detener           | F5 / Shift + F5             |
| Buscar en el archivo         | Ctrl + F                    |
| Reemplazar                   | Ctrl + H                    |
| Buscar en toda la carpeta    | Ctrl + Shift + F            |
| Terminal                     | Ctrl + Ñ (o Ctrl + `)       |
| Barra lateral                | Ctrl + B                    |
| Panel de abajo               | Ctrl + J                    |
| Todos los comandos           | F1                          |

Si tu programa usa `input()`, escribe la respuesta en la línea de abajo del panel **SALIDA** y presiona Enter.

La terminal es simple: sirve para comandos como `dir`, `pip install`, `git status` o `npm start`.
Los programas que necesitan una terminal "de verdad" (como `vim`) no funcionan en ella.

## Qué hay en cada archivo

- `main.js`: el "cerebro". Abre la ventana, lee y guarda archivos, busca, ejecuta programas y maneja la terminal.
- `preload.js`: el "guardia". Decide qué cosas puede pedirle la pantalla al cerebro (solo las necesarias).
- `renderer/`: todo lo que ves.
  - `index.html`: la estructura de la pantalla.
  - `styles.css`: los colores y los temas (están arriba del todo, en `:root`).
  - `app.js`: lo que hacen los botones, las pestañas, el explorador, la búsqueda y la salida.
- `build/`: el icono de la app (`icon.png` y `icon.ico`).
- `site/`: la página de descarga (para subir a Cloudflare Pages).
- `PUBLICAR.md`: la guía paso a paso para crear el instalador y publicarlo.

## Crear el instalador de Windows y publicarlo

```
npm run dist
```

El instalador queda en `dist\`. La guía completa (GitHub, VirusTotal, Cloudflare) está en **PUBLICAR.md**.

## Para que los antivirus no se asusten

- No ofuscar ni comprimir el código para "esconderlo". Cobalto es código abierto y simple, y eso ayuda.
- Publicar el código en GitHub.
- Firmar el instalador (la Microsoft Store lo firma por ti).
- Aun así, un programa nuevo puede recibir algún "falso positivo" en VirusTotal. Si pasa, se le avisa al antivirus y lo corrigen.
