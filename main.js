'use strict';

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const IS_WIN = process.platform === 'win32';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const HIDDEN_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'venv']);
const THEME_KEYS = new Set(['cobalto', 'medianoche', 'grafito', 'claro']);

const SEARCH_MAX_RESULTS = 500;
const SEARCH_MAX_FILES = 4000;
const SEARCH_MAX_FILE_BYTES = 1024 * 1024; // 1 MB

let win = null;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

// Cierra un programa y todo lo que haya abierto (en Windows hace falta taskkill).
function killTree(p) {
  if (!p) return;
  try {
    if (IS_WIN && p.pid) {
      spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { windowsHide: true });
    } else {
      p.kill();
    }
  } catch (_) {
    /* ya estaba cerrado */
  }
}

// ---------------------------------------------------------------- ventana

function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');

  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: '#0c0d10',
    title: 'Cobalto',
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0c0d10', symbolColor: '#a7abb5', height: 40 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Mensajes de la pantalla: aparecen en la ventana negra para poder encontrar errores.
  const wc = win.webContents;
  wc.on('console-message', (...args) => {
    const first = args[0];
    const msg = first && first.message !== undefined ? first.message : args[2];
    console.log('[pantalla]', msg);
  });
  wc.on('did-fail-load', (_e, _code, desc, url) => console.log('[pantalla] no pudo cargar:', desc, url));
  wc.on('render-process-gone', (_e, details) => console.log('[pantalla] se cayó:', details.reason));
  wc.on('preload-error', (_e, file, err) => console.log('[preload] error en', file, err));
  wc.on('did-finish-load', () => console.log('[cobalto] la pantalla cargó bien'));

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Los links externos se abren en el navegador, nunca dentro de la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  // F12 abre las herramientas de desarrollo (útil para encontrar errores).
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });

  // Si hay cambios sin guardar, preguntamos antes de cerrar.
  win.webContents.on('will-prevent-unload', (e) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Salir sin guardar', 'Cancelar'],
      defaultId: 1,
      cancelId: 1,
      title: 'Cobalto',
      message: 'Tienes cambios sin guardar.',
      detail: 'Si sales ahora, se van a perder.',
    });
    if (choice === 0) e.preventDefault(); // ignora el aviso y cierra
  });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
    );
  } else {
    Menu.setApplicationMenu(null);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopRun(false);
  stopTerminal(false);
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopRun(false);
  stopTerminal(false);
});

// El color de los botones de la ventana (minimizar, cerrar) sigue al tema elegido.
ipcMain.handle('window:titlebar', (_e, o) => {
  try {
    const hex = /^#[0-9a-f]{6}$/i;
    if (win && o && hex.test(o.color) && hex.test(o.symbolColor)) {
      if (typeof win.setTitleBarOverlay === 'function') {
        win.setTitleBarOverlay({ color: o.color, symbolColor: o.symbolColor, height: 40 });
      }
      win.setBackgroundColor(o.color);
    }
  } catch (_) {
    /* en algunos sistemas no existe; no pasa nada */
  }
  return true;
});

// ---------------------------------------------------------------- archivos

function readTextFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return { error: 'Eso no es un archivo.' };
    if (stat.size > MAX_FILE_BYTES) return { error: 'El archivo es muy grande (más de 5 MB).' };
    const buf = fs.readFileSync(filePath);
    if (buf.subarray(0, 8000).includes(0)) {
      return { error: 'Este archivo no es de texto (parece una imagen o un programa).' };
    }
    return { content: buf.toString('utf8') };
  } catch (err) {
    return { error: 'No pude abrir el archivo: ' + err.message };
  }
}

ipcMain.handle('dialog:openFile', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
  if (r.canceled) return [];
  return r.filePaths.map((p) => ({ path: p, name: path.basename(p), ...readTextFile(p) }));
});

ipcMain.handle('dialog:openFolder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  return { path: r.filePaths[0], name: path.basename(r.filePaths[0]) || r.filePaths[0] };
});

ipcMain.handle('fs:readDir', (_e, dirPath) => {
  try {
    const items = fs
      .readdirSync(String(dirPath), { withFileTypes: true })
      .filter((d) => !(d.isDirectory() && HIDDEN_DIRS.has(d.name)))
      .map((d) => ({ name: d.name, path: path.join(String(dirPath), d.name), dir: d.isDirectory() }));
    items.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    return items;
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:readFile', (_e, filePath) => readTextFile(String(filePath)));

ipcMain.handle('fs:save', (_e, filePath, content) => {
  try {
    fs.writeFileSync(String(filePath), String(content), 'utf8');
    return { path: filePath, name: path.basename(filePath) };
  } catch (err) {
    return { error: 'No pude guardar: ' + err.message };
  }
});

ipcMain.handle('fs:saveAs', async (_e, content, suggestedName) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: String(suggestedName || 'sin-titulo.py'),
    filters: [
      { name: 'Python', extensions: ['py'] },
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  if (r.canceled || !r.filePath) return null;
  try {
    fs.writeFileSync(r.filePath, String(content), 'utf8');
    return { path: r.filePath, name: path.basename(r.filePath) };
  } catch (err) {
    return { error: 'No pude guardar: ' + err.message };
  }
});

// ------------------------------------------------- buscar en toda la carpeta
// La búsqueda va de a poco y le "cede el turno" a la app cada cierto tiempo,
// para que la ventana no se congele cuando la carpeta es grande.

const SEARCH_SKIP_DIRS = new Set([...HIDDEN_DIRS, 'dist', 'out', 'release', 'win-unpacked', '.next', '.cache']);
const SEARCH_MAX_MS = 15000;
const BINARY_EXT = new Set([
  '.exe', '.dll', '.pak', '.asar', '.bin', '.dat', '.zip', '.7z', '.rar', '.gz', '.tar', '.png', '.jpg', '.jpeg',
  '.gif', '.webp', '.ico', '.bmp', '.mp3', '.mp4', '.wav', '.avi', '.mov', '.pdf', '.woff', '.woff2', '.ttf',
  '.otf', '.eot', '.so', '.dylib', '.node', '.blockmap', '.pyc', '.class', '.jar', '.lib', '.obj', '.o', '.a', '.psd',
]);

let searchCounter = 0;
const tick = () => new Promise((resolve) => setImmediate(resolve));

async function searchFolder(root, query, caseSensitive, id) {
  const results = [];
  let scanned = 0;
  let truncated = false;
  let sinceYield = 0;
  const startedAt = Date.now();
  const needle = caseSensitive ? query : query.toLowerCase();
  const stack = [root];

  outer: while (stack.length) {
    if (id !== searchCounter) return { cancelled: true }; // empezó una búsqueda más nueva
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    const subdirs = [];

    for (const d of entries) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (!SEARCH_SKIP_DIRS.has(d.name)) subdirs.push(full);
        continue;
      }
      if (!d.isFile()) continue;
      if (BINARY_EXT.has(path.extname(d.name).toLowerCase())) continue;
      if (++scanned > SEARCH_MAX_FILES || Date.now() - startedAt > SEARCH_MAX_MS) {
        truncated = true;
        break outer;
      }
      if (++sinceYield >= 40) {
        sinceYield = 0;
        await tick();
        if (id !== searchCounter) return { cancelled: true };
      }

      let buf;
      try {
        const stat = await fs.promises.stat(full);
        if (stat.size > SEARCH_MAX_FILE_BYTES) continue;
        buf = await fs.promises.readFile(full);
      } catch (_) {
        continue;
      }
      if (buf.subarray(0, 8000).includes(0)) continue; // no es de texto

      const lines = buf.toString('utf8').split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        const hay = caseSensitive ? text : text.toLowerCase();
        let from = 0;
        let idx;
        while ((idx = hay.indexOf(needle, from)) !== -1) {
          const start = Math.max(0, idx - 40);
          results.push({
            path: full,
            rel: path.relative(root, full),
            line: i + 1,
            col: idx + 1,
            len: needle.length,
            pre: idx - start,
            preview: text.slice(start, idx + needle.length + 80),
          });
          from = idx + needle.length;
          if (results.length >= SEARCH_MAX_RESULTS) {
            truncated = true;
            break outer;
          }
        }
      }
    }

    for (let i = subdirs.length - 1; i >= 0; i--) stack.push(subdirs[i]);
  }

  results.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line || a.col - b.col);
  return { results, scanned, truncated };
}

ipcMain.handle('fs:search', async (_e, folder, query, caseSensitive) => {
  try {
    const q = String(query || '');
    if (!q.trim() || q.length > 200) return { error: 'Escribe algo para buscar (máximo 200 letras).' };
    const root = String(folder || '');
    if (!root || !fs.statSync(root).isDirectory()) return { error: 'Primero abre una carpeta.' };
    const id = ++searchCounter;
    return await searchFolder(root, q, !!caseSensitive, id);
  } catch (err) {
    return { error: 'No pude buscar: ' + err.message };
  }
});

// ------------------------------------------- ejecutar Python y JavaScript

let runProcess = null;
let runCounter = 0;
let currentRun = 0; // solo se muestra lo que viene de la ejecución actual

// Manda un mensaje a la pantalla, pero solo si todavía es la ejecución actual.
function sendRun(run, channel, payload) {
  if (run === currentRun) send(channel, payload);
}

function stopRun(notify) {
  const p = runProcess;
  currentRun = 0; // lo que siga llegando del proceso viejo se ignora
  if (!p) return false;
  runProcess = null;
  killTree(p);
  if (notify) send('run:exit', { stopped: true });
  return true;
}

function candidatesFor(kind, file) {
  if (kind === 'javascript') {
    // Electron puede funcionar como Node: así no hace falta tener Node instalado.
    return [{ cmd: process.execPath, args: [file], env: { ELECTRON_RUN_AS_NODE: '1' } }];
  }
  const py = (cmd, pre = []) => ({ cmd, args: [...pre, '-u', file], env: {} });
  return IS_WIN ? [py('py', ['-3']), py('python'), py('python3')] : [py('python3'), py('python')];
}

function startRun(run, kind, file, cwd, candidates, index) {
  if (run !== currentRun) return;

  if (index >= candidates.length) {
    const text =
      kind === 'python'
        ? 'No encontré Python en este computador.\nInstálalo desde python.org (marca la casilla "Add Python to PATH") y vuelve a intentar.\n'
        : 'No pude encontrar con qué ejecutar JavaScript.\n';
    sendRun(run, 'run:data', { type: 'err', text });
    sendRun(run, 'run:exit', { code: -1, notFound: true });
    return;
  }

  const cand = candidates[index];
  let started = false;

  const p = spawn(cand.cmd, cand.args, {
    cwd,
    windowsHide: true,
    env: { ...process.env, ...cand.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  runProcess = p;

  p.once('spawn', () => {
    started = true;
  });

  // Si el programa ya terminó y le escriben algo, no queremos que la app se caiga.
  p.stdin.on('error', () => {});

  p.on('error', (err) => {
    if (runProcess === p) runProcess = null;
    if (run !== currentRun) return;
    if (!started && err.code === 'ENOENT') {
      startRun(run, kind, file, cwd, candidates, index + 1); // probamos el siguiente nombre
    } else {
      sendRun(run, 'run:data', { type: 'err', text: 'No pude iniciar el programa: ' + err.message + '\n' });
      sendRun(run, 'run:exit', { code: -1 });
    }
  });

  p.stdout.on('data', (d) => sendRun(run, 'run:data', { type: 'out', text: d.toString('utf8') }));
  p.stderr.on('data', (d) => sendRun(run, 'run:data', { type: 'err', text: d.toString('utf8') }));

  p.on('close', (code, signal) => {
    if (!started) return;
    if (runProcess === p) runProcess = null;
    sendRun(run, 'run:exit', { code, signal });
  });
}

ipcMain.handle('run:start', (_e, opts) => {
  stopRun(false);
  const run = ++runCounter;
  currentRun = run;
  try {
    const kind = opts && opts.kind === 'javascript' ? 'javascript' : 'python';
    let file = opts && opts.filePath ? String(opts.filePath) : null;
    if (!file) {
      // Archivo sin guardar: lo copiamos a una carpeta temporal para poder ejecutarlo.
      const dir = path.join(os.tmpdir(), 'cobalto');
      fs.mkdirSync(dir, { recursive: true });
      file = path.join(dir, kind === 'python' ? 'sin-titulo.py' : 'sin-titulo.js');
      fs.writeFileSync(file, String((opts && opts.content) || ''), 'utf8');
    }
    startRun(run, kind, file, path.dirname(file), candidatesFor(kind, file), 0);
    return true;
  } catch (err) {
    sendRun(run, 'run:data', { type: 'err', text: 'No pude preparar el archivo: ' + err.message + '\n' });
    sendRun(run, 'run:exit', { code: -1 });
    return false;
  }
});

ipcMain.handle('run:stop', () => {
  stopRun(true);
  return true;
});

ipcMain.handle('run:input', (_e, text) => {
  if (runProcess && runProcess.stdin && !runProcess.stdin.destroyed) {
    runProcess.stdin.write(String(text));
    return true;
  }
  return false;
});

// ----------------------------------------------- vista previa de páginas HTML

ipcMain.handle('preview:html', async (_e, opts) => {
  try {
    let file = opts && opts.filePath ? String(opts.filePath) : null;
    if (file && !/\.html?$/i.test(file)) return { error: 'Solo puedo mostrar archivos .html' };
    if (!file) {
      const dir = path.join(os.tmpdir(), 'cobalto');
      fs.mkdirSync(dir, { recursive: true });
      file = path.join(dir, 'vista-previa.html');
      fs.writeFileSync(file, String((opts && opts.content) || ''), 'utf8');
    }
    const problem = await shell.openPath(file); // abre tu navegador
    return problem ? { error: 'No pude abrir la página: ' + problem } : { ok: true };
  } catch (err) {
    return { error: 'No pude abrir la página: ' + err.message };
  }
});

// ----------------------------------------------------------------- terminal
// Es una terminal simple: sirve para comandos como "dir", "pip install", "git status"
// o "npm start". Los programas que necesitan una terminal "de verdad" (como vim) no andan.

let termProcess = null;
let termCounter = 0;
let currentTerm = 0;

function sendTerm(id, channel, payload) {
  if (id === currentTerm) send(channel, payload);
}

function stopTerminal(notify) {
  const p = termProcess;
  currentTerm = 0;
  if (!p) return false;
  termProcess = null;
  killTree(p);
  if (notify) send('term:exit', { stopped: true });
  return true;
}

ipcMain.handle('term:start', (_e, cwdArg) => {
  stopTerminal(false);
  const id = ++termCounter;
  currentTerm = id;

  let cwd = os.homedir();
  try {
    if (cwdArg && fs.statSync(String(cwdArg)).isDirectory()) cwd = String(cwdArg);
  } catch (_) {
    /* usamos la carpeta personal */
  }

  const shellPath = IS_WIN ? process.env.ComSpec || 'cmd.exe' : process.env.SHELL || '/bin/sh';
  const p = spawn(shellPath, IS_WIN ? ['/Q'] : [], {
    cwd,
    windowsHide: true,
    env: { ...process.env, TERM: 'dumb', NO_COLOR: '1', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  termProcess = p;

  p.stdin.on('error', () => {});
  p.on('error', (err) => {
    if (termProcess === p) termProcess = null;
    sendTerm(id, 'term:data', { text: 'No pude abrir la terminal: ' + err.message + '\n' });
    sendTerm(id, 'term:exit', { code: -1 });
  });
  p.stdout.on('data', (d) => sendTerm(id, 'term:data', { text: d.toString('utf8') }));
  p.stderr.on('data', (d) => sendTerm(id, 'term:data', { text: d.toString('utf8') }));
  p.on('close', (code) => {
    if (termProcess === p) termProcess = null;
    sendTerm(id, 'term:exit', { code });
  });

  // En Windows, esto hace que las tildes y la ñ se vean bien.
  if (IS_WIN) p.stdin.write('chcp 65001>nul\r\n');
  return true;
});

ipcMain.handle('term:input', (_e, text) => {
  const p = termProcess;
  if (p && p.stdin && !p.stdin.destroyed) {
    p.stdin.write(String(text) + (IS_WIN ? '\r\n' : '\n'));
    return true;
  }
  return false;
});

ipcMain.handle('term:stop', () => {
  stopTerminal(true);
  return true;
});

// ------------------------------------------- recordar lo que tenías abierto

function sessionFile() {
  return path.join(app.getPath('userData'), 'session.json');
}

function sanitizeSession(d) {
  if (!d || typeof d !== 'object') return null;
  const str = (v) => (typeof v === 'string' && v.length > 0 && v.length < 1000 ? v : null);
  return {
    folder: str(d.folder),
    files: Array.isArray(d.files) ? d.files.map(str).filter(Boolean).slice(0, 30) : [],
    active: str(d.active),
    theme: THEME_KEYS.has(d.theme) ? d.theme : 'cobalto',
    autosave: d.autosave === true,
    fontSize: Number.isFinite(d.fontSize) ? Math.min(28, Math.max(10, Math.round(d.fontSize))) : 14,
  };
}

ipcMain.handle('session:load', () => {
  try {
    return sanitizeSession(JSON.parse(fs.readFileSync(sessionFile(), 'utf8')));
  } catch (_) {
    return null;
  }
});

ipcMain.handle('session:save', (_e, data) => {
  try {
    const clean = sanitizeSession(data);
    if (!clean) return false;
    fs.mkdirSync(path.dirname(sessionFile()), { recursive: true });
    fs.writeFileSync(sessionFile(), JSON.stringify(clean), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
});
