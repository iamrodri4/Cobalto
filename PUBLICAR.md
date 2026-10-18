# Cómo publicar Cobalto (paso a paso)

Esta guía te lleva desde "funciona en mi computador" hasta "cualquiera lo puede descargar".
Hazlo en orden. Si un paso falla, copia el mensaje de error y pregúntame.

> **Importante sobre VirusTotal:** no se puede prometer "0 detecciones para siempre".
> Los programas nuevos a veces son marcados por error por algún antivirus (falso positivo).
> Lo que sí puedes hacer es publicar el código, no esconder nada y mostrar el análisis completo.
> Eso es lo que hace la página de descarga.

---

## 1. Crear el instalador (`.exe`)

En la carpeta de Cobalto, abre una terminal (barra de direcciones → escribe `cmd` → Enter) y escribe:

```
npm run dist
```

Tarda unos minutos la primera vez (descarga herramientas). Al final queda en la carpeta `dist`:

```
dist\Cobalto-Setup-0.2.0.exe
```

**Si sale un error que habla de "symbolic link" o "privilegio requerido":** es un problema conocido de Windows.
Tienes dos soluciones:

- Activa el **Modo de desarrollador**: Configuración → Sistema → Para programadores → "Modo de desarrollador".
- O abre la terminal como **Administrador** (clic derecho sobre "Símbolo del sistema" → Ejecutar como administrador).

Después vuelve a escribir `npm run dist`.

**Pruébalo:** abre el `.exe`, instala Cobalto y revisa que abra bien, que se vea el editor y que el botón Ejecutar funcione.
Esta es la parte más importante: si el instalador no abre bien, avísame antes de publicar.

---

## 2. Subir el código a GitHub

1. Crea una cuenta en https://github.com (si no tienes).
2. Crea un repositorio nuevo, **público**, llamado `cobalto`.
3. Sube los archivos de la carpeta de Cobalto. La forma más fácil es instalar **GitHub Desktop**
   (https://desktop.github.com), elegir "Add local repository", y publicar.
   - El archivo `.gitignore` ya evita subir `node_modules` y `dist` (son pesados y no hacen falta).
   - **No subas contraseñas ni claves.** Cobalto no usa ninguna, así que no deberías tener problemas.

Publicar el código es lo que más ayuda a que la gente (y los antivirus) confíen en el programa.

---

## 3. Publicar el instalador en GitHub (Release)

1. En tu repositorio: **Releases → Create a new release**.
2. En "tag" escribe `v0.2.0` (la misma versión que está en `package.json`).
3. Arrastra el archivo `dist\Cobalto-Setup-0.2.0.exe` a la zona de archivos.
4. Presiona **Publish release**.

---

## 4. Revisar el instalador con VirusTotal

1. Entra a https://www.virustotal.com y sube `Cobalto-Setup-0.2.0.exe`.
2. Cuando termine, **copia el link** de la página del análisis.
3. Si algún antivirus lo marca, no te asustes: mira cuál es. Si es uno solo y poco conocido, casi seguro es un falso positivo.
   Muchas empresas de antivirus tienen un formulario para enviar el archivo y pedir que lo revisen.

Para sacar la **huella SHA-256** (un código que identifica tu archivo), en una terminal escribe:

```
certutil -hashfile dist\Cobalto-Setup-0.2.0.exe SHA256
```

Copia la línea larga de letras y números (64 caracteres).

---

## 5. Publicar la página de descarga en Cloudflare

1. Abre `site\index.html` con el Bloc de notas (o con Cobalto 😄).
2. Busca el bloque que dice `CONFIGURACIÓN` y cambia solo estos datos:

   ```js
   const CONFIG = {
     repo: 'TU-USUARIO/cobalto',  // ← tu usuario de GitHub y el nombre del repositorio
     version: '0.2.0',            // ← la versión
     sha256: '',                  // ← la huella de arriba
     virustotal: '',              // ← el link de VirusTotal
     donate: '',                  // ← (opcional) tu link de donación; vacío = la sección no aparece
     donateName: ''               // ← (opcional) nombre de la plataforma, por ejemplo 'Ko-fi'
   };
   ```

3. En Cloudflare: **Workers & Pages → Create → Pages → Upload assets**.
   Sube la carpeta `site` completa (incluye `index.html` y `_headers`).
   - Si ya tienes un proyecto de Pages para esto, entra a él y usa **Create deployment**.
4. Abre el link que te da Cloudflare (`algo.pages.dev`) y prueba el botón de descarga.

Mientras `TU-USUARIO` siga en el texto, el botón dice "Próximamente" y no lleva a ningún lado. Es a propósito.

---

## 6. Cada vez que saques una versión nueva

1. Cambia el número en `package.json` (por ejemplo `0.2.1`) y en `CONFIG.version` de la página.
2. `npm run dist`.
3. Nueva Release en GitHub, nuevo análisis en VirusTotal, nueva huella en la página.

---

## 7. Aviso de Windows: "Windows protegió tu PC"

Es normal con programas nuevos o sin **firma digital**. Para quitarlo del todo hay que comprar un certificado
de firma de código (tiene costo anual) o publicar en la Microsoft Store (que firma por ti).
Mientras tanto, la página ya explica a la gente qué hacer y cómo comprobar la huella del archivo.

## 8. Microsoft Store (más adelante)

Es posible, pero es un proyecto aparte. Lo que se necesita:

- Una cuenta de desarrollador en **Partner Center** (pago único; revisa el precio y los requisitos de edad en el sitio oficial).
- Reservar el nombre "Cobalto" (puede estar tomado; conviene tener alternativas).
- Cambiar el formato del instalador a **MSIX/AppX** en la configuración de `electron-builder`.
- Una página de **política de privacidad** y capturas de pantalla reales de la app.
- Pasar la revisión de Microsoft, que puede pedir cambios.

Cuando llegues ahí, dime y lo preparamos juntos.

---

## 9. Donaciones (opcional)

La página ya trae una sección "Apoya el desarrollo de Cobalto". **No aparece hasta que pongas un link** en `CONFIG.donate`
(debe empezar con `https://`). Así nunca queda un botón roto.

**Cómo elegir dónde recibirlas.** Hay varias plataformas de "propinas" o donaciones (por ejemplo Ko-fi o Buy Me a Coffee,
GitHub Sponsors, o un link de pago como PayPal.me o el de Mercado Pago). Antes de elegir, revisa tres cosas en su sitio oficial:

- **Que esté disponible en tu país** para recibir dinero (no todas lo están).
- **Las comisiones** que cobran ellos y el medio de pago.
- **La edad mínima.** Casi todas piden ser mayor de edad y verificar tu identidad para retirar el dinero.
  Si todavía no tienes la edad, un adulto de confianza puede abrir la cuenta y encargarse de ella.

**Consejos para hacerlo bien:**

- **Pon solo el link de la plataforma.** No publiques en la página tu número de cuenta, tu RUT, tu dirección ni tu teléfono:
  cualquiera los vería y alguien podría usarlos mal.
- **Sé claro:** una donación es voluntaria y no es una compra. El texto de la página ya lo dice.
  No prometas funciones a cambio de dinero, para no quedar en deuda con nadie.
- **Mantén Cobalto gratis.** Es lo que hace que la gente confíe y lo descargue.
- **Impuestos:** según el país, el dinero que recibes puede tener que declararse. Cuando empiece a entrar dinero de verdad,
  consulta con un contador o con el sitio del servicio de impuestos de tu país. Yo no soy contador, así que no puedo decirte qué te corresponde.
