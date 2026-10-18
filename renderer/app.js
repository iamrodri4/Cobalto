'use strict';

/* ------------------------------------------------------------------
   Cobalto — la pantalla principal.
   Aquí vive todo lo que ves: pestañas, explorador, editor, búsqueda,
   salida de programas y terminal.
------------------------------------------------------------------- */
(() => {
  const api = window.cobalto;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const baseName = (p) => String(p).split(/[\\/]/).filter(Boolean).pop() || String(p);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  // ------------------------------------------------------------- temas
  // Para agregar un tema nuevo: copia uno de estos, cámbiale los colores,
  // y agrega su nombre en THEME_KEYS, en styles.css y en main.js.

  const THEME_KEYS = ['cobalto', 'medianoche', 'grafito', 'claro'];

  const THEMES = {
    cobalto: {
      label: 'Cobalto (oscuro)', base: 'vs-dark', bar: '#0c0d10', sym: '#a7abb5',
      p: { bg: '#121317', fg: '#d4d7de', ln: '#454955', lnA: '#a7abb5', hl: '#171920', sel: '#264f7866', sel2: '#264f7840', cursor: '#3d9bff', guide: '#22252c', guideA: '#3a3f4b', widget: '#181a20', widgetBorder: '#2a2d36', suggest: '#22406d', input: '#0f1014', slider: '#ffffff14', sliderH: '#ffffff26', sliderA: '#ffffff33' },
    },
    medianoche: {
      label: 'Medianoche (azulado)', base: 'vs-dark', bar: '#080c16', sym: '#8f9bbd',
      p: { bg: '#0d1322', fg: '#d0d8ee', ln: '#3c4764', lnA: '#9aa7c9', hl: '#131b30', sel: '#2a5aa166', sel2: '#2a5aa140', cursor: '#5aa9ff', guide: '#1c2540', guideA: '#34426b', widget: '#111a30', widgetBorder: '#24305a', suggest: '#24407a', input: '#0a1020', slider: '#ffffff14', sliderH: '#ffffff26', sliderA: '#ffffff33' },
    },
    grafito: {
      label: 'Grafito (gris)', base: 'vs-dark', bar: '#181818', sym: '#a0a0a0',
      p: { bg: '#1f1f1f', fg: '#d4d4d4', ln: '#5a5a5a', lnA: '#c6c6c6', hl: '#262626', sel: '#264f7899', sel2: '#3a3d41', cursor: '#aeafad', guide: '#333333', guideA: '#4a4a4a', widget: '#252526', widgetBorder: '#3a3a3a', suggest: '#094771', input: '#1a1a1a', slider: '#ffffff14', sliderH: '#ffffff26', sliderA: '#ffffff33' },
    },
    claro: {
      label: 'Claro', base: 'vs', bar: '#ececf0', sym: '#4a4f5c',
      p: { bg: '#ffffff', fg: '#2b2e36', ln: '#b4b8c2', lnA: '#4a4f5c', hl: '#f3f5fa', sel: '#add6ff99', sel2: '#add6ff55', cursor: '#1f6feb', guide: '#e6e8ee', guideA: '#c4c8d2', widget: '#f6f7fa', widgetBorder: '#d9dbe1', suggest: '#cfe2ff', input: '#ffffff', slider: '#00000022', sliderH: '#00000040', sliderA: '#00000055' },
    },
  };

  const RULES_DARK = [
    { token: 'comment', foreground: '5d6472', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'string', foreground: 'a5e075' },
    { token: 'string.escape', foreground: '7fdbca' },
    { token: 'number', foreground: 'f78c6c' },
    { token: 'type', foreground: 'ffcb6b' },
    { token: 'type.identifier', foreground: 'ffcb6b' },
    { token: 'tag', foreground: 'f07178' },
    { token: 'attribute.name', foreground: 'ffcb6b' },
    { token: 'delimiter', foreground: '89ddff' },
    { token: 'operator', foreground: '89ddff' },
    { token: 'predefined', foreground: '82aaff' },
  ];
  const RULES_LIGHT = [
    { token: 'comment', foreground: '8a90a0', fontStyle: 'italic' },
    { token: 'keyword', foreground: '7c3aed' },
    { token: 'string', foreground: '1a7f37' },
    { token: 'string.escape', foreground: '0b7285' },
    { token: 'number', foreground: 'c2410c' },
    { token: 'type', foreground: 'b45309' },
    { token: 'type.identifier', foreground: 'b45309' },
    { token: 'tag', foreground: 'cf222e' },
    { token: 'attribute.name', foreground: 'b45309' },
    { token: 'delimiter', foreground: '0b6aa8' },
    { token: 'operator', foreground: '0b6aa8' },
    { token: 'predefined', foreground: '0550ae' },
  ];

  const monacoColors = (p) => ({
    'editor.background': p.bg,
    'editor.foreground': p.fg,
    'editorLineNumber.foreground': p.ln,
    'editorLineNumber.activeForeground': p.lnA,
    'editor.lineHighlightBackground': p.hl,
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': p.sel,
    'editor.inactiveSelectionBackground': p.sel2,
    'editorCursor.foreground': p.cursor,
    'editorIndentGuide.background1': p.guide,
    'editorIndentGuide.activeBackground1': p.guideA,
    'editorWhitespace.foreground': p.guide,
    'editorWidget.background': p.widget,
    'editorWidget.border': p.widgetBorder,
    'editorSuggestWidget.background': p.widget,
    'editorSuggestWidget.border': p.widgetBorder,
    'editorSuggestWidget.selectedBackground': p.suggest,
    'editorHoverWidget.background': p.widget,
    'input.background': p.input,
    'scrollbarSlider.background': p.slider,
    'scrollbarSlider.hoverBackground': p.sliderH,
    'scrollbarSlider.activeBackground': p.sliderA,
    'minimap.background': p.bg,
  });

  // ------------------------------------------------------------ estado

  const state = {
    tabs: [],            // pestañas abiertas
    active: null,        // pestaña activa
    folder: null,        // carpeta abierta en el explorador
    expanded: new Set(), // carpetas desplegadas
    running: false,
    stopping: false,
    fontSize: 14,
    untitled: 0,
    theme: 'cobalto',
    autosave: false,
    view: 'files',       // 'files' o 'search'
    panelTab: 'out',     // 'out' o 'term'
    termRunning: false,
    booted: false,
  };

  let monaco = null;
  let editor = null;

  if (api && api.platform === 'darwin') document.body.classList.add('mac');

  function paintBar(key) {
    const t = THEMES[key];
    if (t && api.setTitleBar) api.setTitleBar({ color: t.bar, symbolColor: t.sym });
  }

  // Pedimos lo que tenías abierto ya mismo, así el tema se pinta antes de que cargue el editor.
  const sessionPromise = (async () => {
    try {
      return await api.loadSession();
    } catch (_) {
      return null;
    }
  })();
  sessionPromise.then((s) => {
    if (s && THEMES[s.theme]) {
      document.documentElement.dataset.theme = s.theme;
      paintBar(s.theme);
    }
  });

  // ------------------------------------------------------------ avisos

  let toastTimer = null;
  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
  }

  function showFatal(message) {
    const node = $('#fatal');
    node.textContent = message;
    node.hidden = false;
  }

  // ---------------------------------------------------------- lenguajes

  function langFor(name) {
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
    const langs = monaco.languages.getLanguages();
    const hit =
      langs.find((l) => (l.extensions || []).includes(ext)) ||
      langs.find((l) => (l.filenames || []).includes(name));
    return hit ? hit.id : 'plaintext';
  }

  const EXT_COLORS = {
    '.py': '#5aa7ff', '.js': '#e8c547', '.ts': '#4a8fe0', '.json': '#c9a64a',
    '.html': '#f0784f', '.css': '#6b9cf0', '.md': '#9aa4b5', '.txt': '#7b808c',
  };
  function badgeColor(name) {
    const dot = name.lastIndexOf('.');
    return EXT_COLORS[dot >= 0 ? name.slice(dot).toLowerCase() : ''] || '#5b606c';
  }

  // ------------------------------------------------- recordar la sesión

  let sessionTimer = null;
  function scheduleSession() {
    if (!state.booted) return;
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(saveSession, 400);
  }

  function saveSession() {
    if (!state.booted) return;
    api.saveSession({
      folder: state.folder ? state.folder.path : null,
      files: state.tabs.filter((t) => t.path).map((t) => t.path),
      active: state.active && state.active.path ? state.active.path : null,
      theme: state.theme,
      autosave: state.autosave,
      fontSize: state.fontSize,
    });
  }

  async function restoreSession(s) {
    if (!s) {
      applyTheme('cobalto');
      return;
    }
    applyTheme(s.theme);
    state.fontSize = clamp(s.fontSize || 14, 10, 28);
    editor.updateOptions({ fontSize: state.fontSize });
    state.autosave = s.autosave === true;
    updateAutoLabel();

    if (s.folder) {
      const entries = await api.readDir(s.folder);
      if (Array.isArray(entries)) {
        state.folder = { path: s.folder, name: baseName(s.folder) };
        state.expanded = new Set([s.folder]);
        await refreshTree();
      }
    }
    for (const p of s.files || []) {
      const res = await api.readFile(p);
      if (!res.error) openDoc({ path: p, name: baseName(p), content: res.content });
    }
    const wanted = state.tabs.find((t) => t.path === s.active);
    if (wanted) activate(wanted);
  }

  // ----------------------------------------------------------- pestañas

  const isDirty = (tab) => tab.model.getAlternativeVersionId() !== tab.saved;

  function openDoc({ path, name, content }) {
    const existing = path && state.tabs.find((t) => t.path === path);
    if (existing) {
      activate(existing);
      return existing;
    }

    const model = monaco.editor.createModel(content, langFor(name));
    const tab = { path: path || null, name, model, saved: model.getAlternativeVersionId(), viewState: null, wasDirty: false, autoTimer: null };
    model.onDidChangeContent(() => {
      const dirty = isDirty(tab);
      if (dirty !== tab.wasDirty) {
        tab.wasDirty = dirty;
        renderTabs();
        updateTitle();
      }
      if (state.autosave && tab.path) scheduleAutosave(tab);
    });
    state.tabs.push(tab);
    activate(tab);
    return tab;
  }

  function activate(tab) {
    if (state.active && state.active !== tab) state.active.viewState = editor.saveViewState();
    state.active = tab;
    if (tab) {
      editor.setModel(tab.model);
      if (tab.viewState) editor.restoreViewState(tab.viewState);
      $('#welcome').hidden = true;
      editor.focus();
    } else {
      editor.setModel(null);
      $('#welcome').hidden = false;
    }
    renderTabs();
    updateStatus();
    updateTitle();
    markActiveInTree();
    scheduleSession();
  }

  function renderTabs() {
    const box = $('#tabs');
    box.textContent = '';
    for (const tab of state.tabs) {
      const div = el('div', 'tab' + (tab === state.active ? ' active' : '') + (isDirty(tab) ? ' dirty' : ''));
      div.title = tab.path || tab.name;
      div.setAttribute('role', 'tab');
      div.append(el('span', 't-name', tab.name));

      const close = el('button', 't-close');
      close.title = 'Cerrar (Ctrl+W)';
      close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab);
      });
      div.append(close);

      div.addEventListener('click', () => activate(tab));
      div.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tab);
        }
      });
      box.append(div);
    }
    const current = $('.tab.active', box);
    if (current) current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function closeTab(tab) {
    if (isDirty(tab) && !window.confirm(`"${tab.name}" tiene cambios sin guardar.\n\n¿Cerrar y perder los cambios?`)) return;
    clearTimeout(tab.autoTimer);
    const index = state.tabs.indexOf(tab);
    const wasActive = state.active === tab;
    state.tabs.splice(index, 1);
    if (wasActive) {
      state.active = null; // así no guardamos la vista de un modelo que vamos a destruir
      activate(state.tabs[index] || state.tabs[index - 1] || null);
    } else {
      renderTabs();
      scheduleSession();
    }
    tab.model.dispose();
  }

  function closeActive() {
    if (state.active) closeTab(state.active);
  }

  function cycleTabs(step) {
    if (state.tabs.length < 2) return;
    const i = state.tabs.indexOf(state.active);
    activate(state.tabs[(i + step + state.tabs.length) % state.tabs.length]);
  }

  // ---------------------------------------------------------- archivos

  function newFile() {
    state.untitled += 1;
    openDoc({
      path: null,
      name: `sin-titulo-${state.untitled}.py`,
      content: '# Archivo nuevo\nprint("Hola desde Cobalto")\n',
    });
  }

  async function openFiles() {
    const files = await api.openFiles();
    for (const f of files) {
      if (f.error) toast(`${f.name}: ${f.error}`);
      else openDoc(f);
    }
  }

  async function openFromPath(filePath, name) {
    const existing = state.tabs.find((t) => t.path === filePath);
    if (existing) {
      activate(existing);
      return existing;
    }
    const res = await api.readFile(filePath);
    if (res.error) {
      toast(res.error);
      return null;
    }
    return openDoc({ path: filePath, name, content: res.content });
  }

  async function saveTab(tab, asNew) {
    const content = tab.model.getValue();
    const version = tab.model.getAlternativeVersionId();
    const res = tab.path && !asNew ? await api.save(tab.path, content) : await api.saveAs(content, tab.name);
    if (!res) return false; // cancelaron el diálogo
    if (res.error) {
      toast(res.error);
      return false;
    }
    tab.path = res.path;
    tab.name = res.name;
    tab.saved = version;
    tab.wasDirty = isDirty(tab);
    monaco.editor.setModelLanguage(tab.model, langFor(tab.name));
    renderTabs();
    updateStatus();
    updateTitle();
    markActiveInTree();
    if (state.folder) refreshTree();
    scheduleSession();
    return true;
  }

  function saveActive() {
    if (!state.active) return toast('No hay ningún archivo abierto.');
    return saveTab(state.active, false);
  }
  function saveActiveAs() {
    if (!state.active) return toast('No hay ningún archivo abierto.');
    return saveTab(state.active, true);
  }

  // ------------------------------------------------------- autoguardado

  function scheduleAutosave(tab) {
    clearTimeout(tab.autoTimer);
    tab.autoTimer = setTimeout(() => autosaveTab(tab), 1000);
  }

  async function autosaveTab(tab) {
    if (!state.tabs.includes(tab) || !tab.path || !isDirty(tab)) return;
    const version = tab.model.getAlternativeVersionId();
    const res = await api.save(tab.path, tab.model.getValue());
    if (res && res.error) {
      toast(res.error);
      return;
    }
    tab.saved = version;
    tab.wasDirty = isDirty(tab);
    renderTabs();
    updateTitle();
  }

  function updateAutoLabel() {
    $('#st-auto').textContent = state.autosave ? 'Autoguardado: sí' : 'Autoguardado: no';
  }

  function toggleAutosave() {
    state.autosave = !state.autosave;
    updateAutoLabel();
    toast(state.autosave ? 'Autoguardado activado: guardo solo cada vez que dejas de escribir.' : 'Autoguardado desactivado.');
    if (state.autosave) state.tabs.forEach((t) => t.path && isDirty(t) && scheduleAutosave(t));
    scheduleSession();
  }

  // -------------------------------------------------------- explorador

  async function openFolder() {
    const folder = await api.openFolder();
    if (!folder) return;
    state.folder = folder;
    state.expanded = new Set([folder.path]);
    $('#search-results').textContent = '';
    $('#search-info').textContent = 'Escribe algo y presiona Enter.';
    showView('files');
    await refreshTree();
    scheduleSession();
  }

  function closeFolder() {
    if (!state.folder) return toast('No hay ninguna carpeta abierta.');
    state.folder = null;
    state.expanded = new Set();
    $('#search-results').textContent = '';
    searchInfo('Escribe algo y presiona Enter.');
    refreshTree();
    scheduleSession();
    toast('Carpeta cerrada. Los archivos que tenías abiertos siguen en sus pestañas.');
  }

  async function refreshTree() {
    const tree = $('#tree');
    const empty = $('#tree-empty');
    const label = $('#folder-label');
    $('#sb-closefolder').hidden = !state.folder;
    tree.textContent = '';
    if (!state.folder) {
      empty.hidden = false;
      label.hidden = true;
      return;
    }
    empty.hidden = true;
    label.hidden = false;
    label.textContent = state.folder.name.toUpperCase();
    label.title = state.folder.path;
    await renderDir(tree, state.folder.path, 0);
    markActiveInTree();
  }

  async function renderDir(container, dirPath, depth) {
    const entries = await api.readDir(dirPath);
    if (!Array.isArray(entries)) {
      container.append(el('div', 'tree-msg', 'No pude leer esta carpeta.'));
      return;
    }
    for (const ent of entries) {
      const row = el('div', 'row');
      row.dataset.path = ent.path;
      row.title = ent.path;
      row.style.paddingLeft = 12 + depth * 14 + 'px';

      if (ent.dir) {
        const open = state.expanded.has(ent.path);
        if (open) row.classList.add('open');
        row.innerHTML = '<svg class="chev ico" aria-hidden="true"><use href="#i-chevron"/></svg>';
        row.append(el('span', 'r-name', ent.name));
        const kids = el('div', 'kids');
        container.append(row, kids);
        if (open) await renderDir(kids, ent.path, depth + 1);
        row.addEventListener('click', async () => {
          if (state.expanded.has(ent.path)) {
            state.expanded.delete(ent.path);
            row.classList.remove('open');
            kids.textContent = '';
          } else {
            state.expanded.add(ent.path);
            row.classList.add('open');
            await renderDir(kids, ent.path, depth + 1);
            markActiveInTree();
          }
        });
      } else {
        row.append(el('span', 'spacer'));
        const badge = el('span', 'badge');
        badge.style.background = badgeColor(ent.name);
        row.append(badge, el('span', 'r-name', ent.name));
        container.append(row);
        row.addEventListener('click', () => openFromPath(ent.path, ent.name));
      }
    }
  }

  function markActiveInTree() {
    const current = state.active && state.active.path;
    $$('#tree .row').forEach((row) => row.classList.toggle('active', !!current && row.dataset.path === current));
  }

  // -------------------------------------------------- buscar en la carpeta

  function searchInfo(text) {
    $('#search-info').textContent = text;
  }

  async function runSearch() {
    const query = $('#search-input').value;
    const box = $('#search-results');
    if (!query.trim()) return searchInfo('Escribe algo y presiona Enter.');
    if (!state.folder) {
      box.textContent = '';
      return searchInfo('Primero abre una carpeta (Ctrl+Shift+O).');
    }
    searchInfo('Buscando…');
    const data = await api.search(state.folder.path, query, $('#search-case').checked);
    box.textContent = '';
    if (data && data.cancelled) return; // ya hay una búsqueda más nueva en marcha
    if (!data || data.error) return searchInfo((data && data.error) || 'No pude buscar.');
    if (!data.results.length) return searchInfo('No encontré nada.');

    const groups = new Map();
    for (const r of data.results) {
      if (!groups.has(r.path)) groups.set(r.path, []);
      groups.get(r.path).push(r);
    }
    const more = data.truncated ? '+' : '';
    searchInfo(`${data.results.length}${more} resultado(s) en ${groups.size} archivo(s)` + (data.truncated ? ' · hay más, prueba con algo más específico' : ''));

    for (const [filePath, list] of groups) {
      const head = el('div', 'res-file');
      head.title = list[0].rel;
      head.append(el('span', 'res-name', baseName(filePath)), el('span', 'res-count', String(list.length)));
      const group = el('div', 'res-group');
      head.addEventListener('click', () => {
        group.hidden = !group.hidden;
      });

      for (const m of list) {
        const row = el('div', 'res-line');
        row.title = `${m.rel}:${m.line}`;
        row.append(el('span', 'res-ln', String(m.line)));
        const text = el('span', 'res-text');
        text.append(
          document.createTextNode(m.preview.slice(0, m.pre).trimStart()),
          el('mark', '', m.preview.slice(m.pre, m.pre + m.len)),
          document.createTextNode(m.preview.slice(m.pre + m.len))
        );
        row.append(text);
        row.addEventListener('click', () => goToMatch(m));
        group.append(row);
      }
      box.append(head, group);
    }
  }

  async function goToMatch(m) {
    const tab = await openFromPath(m.path, baseName(m.path));
    if (!tab) return;
    editor.revealLineInCenter(m.line);
    editor.setSelection(new monaco.Range(m.line, m.col, m.line, m.col + m.len));
    editor.focus();
  }

  // ------------------------------------------------ barras y paneles

  function refreshActivity() {
    const sidebarOn = !$('#sidebar').classList.contains('hidden');
    const panelOn = !$('#panel').classList.contains('hidden');
    $('#ab-files').classList.toggle('active', sidebarOn && state.view === 'files');
    $('#ab-search').classList.toggle('active', sidebarOn && state.view === 'search');
    $('#ab-term').classList.toggle('active', panelOn && state.panelTab === 'term');
  }

  function toggleSidebar(force) {
    const sidebar = $('#sidebar');
    const hide = force === undefined ? !sidebar.classList.contains('hidden') : !force;
    sidebar.classList.toggle('hidden', hide);
    $('#sb-resizer').classList.toggle('hidden', hide);
    refreshActivity();
  }

  function showView(which) {
    state.view = which;
    $('#view-files').hidden = which !== 'files';
    $('#view-search').hidden = which !== 'search';
    toggleSidebar(true);
    if (which === 'search') {
      const input = $('#search-input');
      input.focus();
      input.select();
    }
  }

  function toggleView(which) {
    const visible = !$('#sidebar').classList.contains('hidden');
    if (visible && state.view === which) toggleSidebar(false);
    else showView(which);
  }

  function togglePanel(force) {
    const panel = $('#panel');
    const hide = force === undefined ? !panel.classList.contains('hidden') : !force;
    panel.classList.toggle('hidden', hide);
    $('#panel-resizer').classList.toggle('hidden', hide);
    if (!hide && state.panelTab === 'term') ensureTerminal();
    refreshActivity();
  }

  function showPanelTab(which) {
    state.panelTab = which;
    $('#pane-out').hidden = which !== 'out';
    $('#pane-term').hidden = which !== 'term';
    $('#ptab-out').classList.toggle('active', which === 'out');
    $('#ptab-term').classList.toggle('active', which === 'term');
    $('#btn-run').hidden = which !== 'out';
    $('#btn-stop').hidden = which !== 'out';
    $('#btn-term-restart').hidden = which !== 'term';
    refreshActivity();
  }

  function openPanelTab(which) {
    showPanelTab(which);
    togglePanel(true);
    if (which === 'term') {
      ensureTerminal();
      $('#term-input').focus();
    } else {
      $('#stdin').focus();
    }
  }

  function togglePanelTab(which) {
    const visible = !$('#panel').classList.contains('hidden');
    if (visible && state.panelTab === which) togglePanel(false);
    else openPanelTab(which);
  }

  function dragResizer(handle, onMove) {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handle.classList.add('drag');
      const up = () => {
        handle.classList.remove('drag');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', up);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', up);
    });
  }

  // ------------------------------------------- salida de los programas

  const MAX_OUTPUT_NODES = 2000;

  function appendTo(selector, text, cls) {
    const out = $(selector);
    const stick = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
    out.append(el('span', cls || '', text));
    while (out.childNodes.length > MAX_OUTPUT_NODES) out.removeChild(out.firstChild);
    if (stick) out.scrollTop = out.scrollHeight;
  }
  const appendOut = (text, cls) => appendTo('#output', text, cls);
  const appendTerm = (text, cls) => appendTo('#term-output', text, cls);

  function clearCurrentPanel() {
    $(state.panelTab === 'term' ? '#term-output' : '#output').textContent = '';
  }

  function updateRunUi() {
    $('#btn-stop').disabled = !state.running;
    $('#st-run').classList.toggle('running', state.running);
    $('#st-run-text').textContent = state.running ? 'Ejecutando…' : 'Listo';
  }

  function runKind(tab) {
    const id = tab.model.getLanguageId();
    return id === 'python' || id === 'javascript' || id === 'html' ? id : null;
  }

  async function runActive() {
    const tab = state.active;
    if (!tab) return toast('Abre o crea un archivo primero.');
    const kind = runKind(tab);
    if (!kind) return toast('Puedo ejecutar Python (.py) y JavaScript (.js), y mostrar páginas HTML (.html).');

    if (tab.path && isDirty(tab)) {
      const saved = await saveTab(tab, false);
      if (!saved) return;
    }

    if (kind === 'html') {
      const res = await api.previewHtml({ filePath: tab.path, content: tab.path ? null : tab.model.getValue() });
      toast(res && res.error ? res.error : 'Abrí la página en tu navegador.');
      return;
    }

    openPanelTab('out');
    clearCurrentPanel();
    appendOut(`▶ ${kind === 'python' ? 'python' : 'node'} ${tab.name}\n`, 'sys');
    state.running = true;
    state.stopping = false;
    updateRunUi();
    await api.run({ kind, filePath: tab.path, content: tab.path ? null : tab.model.getValue() });
  }

  async function stopRun() {
    if (!state.running) return;
    state.stopping = true;
    await api.stopRun();
  }

  function wireRun() {
    api.onRunData(({ type, text }) => appendOut(text, type === 'err' ? 'err' : ''));

    api.onRunExit(({ code, signal, stopped, notFound }) => {
      state.running = false;
      updateRunUi();
      if (stopped || state.stopping) {
        state.stopping = false;
        appendOut('\n■ Detenido\n', 'sys');
      } else if (notFound) {
        // el mensaje ya se mostró
      } else if (signal) {
        appendOut(`\n■ El programa se cerró (${signal})\n`, 'sys');
      } else if (code === 0) {
        appendOut('\n✓ Terminó sin errores\n', 'ok');
      } else {
        appendOut(`\n■ Terminó con error (código ${code})\n`, 'err');
        if ([9009, 103, 127].includes(code)) {
          appendOut('Parece que Python no está instalado o no está en el PATH. Instálalo desde python.org.\n', 'sys');
        }
      }
    });

    $('#input-row').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#stdin');
      const text = input.value;
      input.value = '';
      if (!state.running) return toast('No hay ningún programa corriendo.');
      appendOut(text + '\n', 'in');
      await api.sendInput(text + '\n');
    });
  }

  // ------------------------------------------------------------ terminal

  // Quita los códigos de colores que a veces mandan los programas.
  const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g;

  async function ensureTerminal() {
    if (state.termRunning) return;
    state.termRunning = true;
    appendTerm('Terminal simple de Cobalto. Escribe un comando y presiona Enter.\n', 'sys');
    await api.termStart(state.folder ? state.folder.path : null);
  }

  async function restartTerminal() {
    await api.termStop();
    state.termRunning = false;
    appendTerm('\n— Terminal reiniciada —\n', 'sys');
    await ensureTerminal();
  }

  function wireTerminal() {
    api.onTermData(({ text }) => appendTerm(String(text).replace(ANSI, '')));

    api.onTermExit(({ code, stopped }) => {
      state.termRunning = false;
      if (!stopped) appendTerm(`\n■ La terminal se cerró (código ${code}). Presiona ↻ para abrirla de nuevo.\n`, 'sys');
    });

    $('#term-row').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#term-input');
      const text = input.value;
      input.value = '';
      if (/^\s*(cls|clear)\s*$/i.test(text)) {
        $('#term-output').textContent = '';
        return;
      }
      if (!state.termRunning) await ensureTerminal();
      appendTerm(text + '\n', 'in');
      await api.termInput(text);
    });
  }

  // ------------------------------------------------------ barra de estado

  function updateStatus() {
    const tab = state.active;
    if (!tab || !editor) {
      $('#st-pos').textContent = '';
      $('#st-lang').textContent = '';
      return;
    }
    const pos = editor.getPosition();
    $('#st-pos').textContent = pos ? `Ln ${pos.lineNumber}, Col ${pos.column}` : '';
    const id = tab.model.getLanguageId();
    const lang = monaco.languages.getLanguages().find((l) => l.id === id);
    $('#st-lang').textContent = lang && lang.aliases && lang.aliases[0] ? lang.aliases[0] : id;
  }

  function updateTitle() {
    const tab = state.active;
    const text = tab ? `${tab.name}${isDirty(tab) ? ' ●' : ''} — Cobalto` : 'Cobalto';
    $('#pill-text').textContent = text;
    document.title = text;
  }

  // -------------------------------------------------------------- temas

  function defineThemes() {
    for (const key of THEME_KEYS) {
      const t = THEMES[key];
      monaco.editor.defineTheme('cb-' + key, {
        base: t.base,
        inherit: true,
        rules: t.base === 'vs' ? RULES_LIGHT : RULES_DARK,
        colors: monacoColors(t.p),
      });
    }
  }

  function applyTheme(key) {
    const theme = THEMES[key] ? key : 'cobalto';
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    monaco.editor.setTheme('cb-' + theme);
    paintBar(theme);
    scheduleSession();
  }

  // -------------------------------------------------------------- menús

  const trigger = (actionId) => {
    if (!editor || !state.active) return;
    editor.focus();
    editor.trigger('menu', actionId, null);
  };

  function palette() {
    if (!state.active) return toast('Abre un archivo para usar la paleta de comandos.');
    trigger('editor.action.quickCommand');
  }

  function zoom(step) {
    state.fontSize = clamp(state.fontSize + step, 10, 28);
    editor.updateOptions({ fontSize: state.fontSize });
    scheduleSession();
  }

  const showAbout = () => {
    $('#modal').hidden = false;
  };
  const hideAbout = () => {
    $('#modal').hidden = true;
  };

  function menuDefinitions() {
    const mark = (on) => (on ? '✓  ' : '  ');
    return {
      Archivo: [
        ['Archivo nuevo', 'Ctrl+N', newFile],
        ['Abrir archivo…', 'Ctrl+O', openFiles],
        ['Abrir carpeta…', 'Ctrl+Shift+O', openFolder],
        ['Cerrar carpeta', '', closeFolder],
        null,
        ['Guardar', 'Ctrl+S', saveActive],
        ['Guardar como…', 'Ctrl+Shift+S', saveActiveAs],
        [mark(state.autosave) + 'Autoguardado', '', toggleAutosave],
        null,
        ['Cerrar pestaña', 'Ctrl+W', closeActive],
      ],
      Editar: [
        ['Deshacer', 'Ctrl+Z', () => trigger('undo')],
        ['Rehacer', 'Ctrl+Y', () => trigger('redo')],
        null,
        ['Buscar en el archivo', 'Ctrl+F', () => trigger('actions.find')],
        ['Reemplazar', 'Ctrl+H', () => trigger('editor.action.startFindReplace')],
        ['Buscar en la carpeta', 'Ctrl+Shift+F', () => showView('search')],
      ],
      Ver: [
        ['Barra lateral', 'Ctrl+B', () => toggleSidebar()],
        ['Panel de abajo', 'Ctrl+J', () => togglePanel()],
        ['Terminal', 'Ctrl+Ñ', () => togglePanelTab('term')],
        null,
        ['Acercar letra', 'Ctrl++', () => zoom(1)],
        ['Alejar letra', 'Ctrl+-', () => zoom(-1)],
      ],
      Tema: THEME_KEYS.map((key) => [mark(state.theme === key) + THEMES[key].label, '', () => applyTheme(key)]),
      Ejecutar: [
        ['Ejecutar', 'F5', runActive],
        ['Detener', 'Shift+F5', stopRun],
      ],
      Ayuda: [['Acerca de Cobalto', '', showAbout]],
    };
  }

  function buildMenubar() {
    const bar = $('#menubar');
    let openName = null;

    const closeMenus = () => {
      $$('.menu').forEach((m) => m.remove());
      $$('.menu-btn.open').forEach((b) => b.classList.remove('open'));
      openName = null;
    };

    const openMenu = (name, button) => {
      closeMenus();
      openName = name;
      button.classList.add('open');
      const menu = el('div', 'menu');
      for (const item of menuDefinitions()[name]) {
        if (!item) {
          menu.append(el('div', 'menu-sep'));
          continue;
        }
        const [label, keys, action] = item;
        const row = el('div', 'menu-item');
        row.append(el('span', '', label), el('span', 'keys', keys));
        row.addEventListener('click', () => {
          closeMenus();
          action();
        });
        menu.append(row);
      }
      const rect = button.getBoundingClientRect();
      menu.style.left = rect.left + 'px';
      menu.style.top = rect.bottom + 2 + 'px';
      document.body.append(menu);
    };

    for (const name of Object.keys(menuDefinitions())) {
      const button = el('button', 'menu-btn', name);
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openName === name) closeMenus();
        else openMenu(name, button);
      });
      button.addEventListener('mouseenter', () => {
        if (openName && openName !== name) openMenu(name, button);
      });
      bar.append(button);
    }
    document.addEventListener('click', closeMenus);
    window.addEventListener('blur', closeMenus);
  }

  // ------------------------------------------------------------- arranque

  async function boot() {
    defineThemes();

    editor = monaco.editor.create($('#editor'), {
      model: null,
      theme: 'cb-cobalto',
      automaticLayout: true,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
      fontSize: state.fontSize,
      fontLigatures: true,
      tabSize: 4,
      insertSpaces: true,
      minimap: { enabled: true, renderCharacters: false },
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      padding: { top: 12, bottom: 12 },
      scrollBeyondLastLine: false,
      bracketPairColorization: { enabled: true },
      guides: { indentation: true },
      renderLineHighlight: 'line',
      wordWrap: 'off',
    });
    editor.onDidChangeCursorPosition(updateStatus);

    buildMenubar();
    wireRun();
    wireTerminal();

    // botones de la pantalla
    $('#btn-toggle-sidebar').addEventListener('click', () => toggleSidebar());
    $('#btn-toggle-panel').addEventListener('click', () => togglePanel());
    $('#ab-files').addEventListener('click', () => toggleView('files'));
    $('#ab-search').addEventListener('click', () => toggleView('search'));
    $('#ab-run').addEventListener('click', runActive);
    $('#ab-term').addEventListener('click', () => togglePanelTab('term'));
    $('#ab-about').addEventListener('click', showAbout);
    $('#sb-newfile').addEventListener('click', newFile);
    $('#sb-closefolder').addEventListener('click', closeFolder);
    $('#empty-open-folder').addEventListener('click', openFolder);
    $('#empty-open-file').addEventListener('click', openFiles);
    $('#cmd-pill').addEventListener('click', palette);
    $('#btn-run').addEventListener('click', runActive);
    $('#btn-stop').addEventListener('click', stopRun);
    $('#btn-term-restart').addEventListener('click', restartTerminal);
    $('#btn-clear').addEventListener('click', clearCurrentPanel);
    $('#btn-close-panel').addEventListener('click', () => togglePanel(false));
    $('#ptab-out').addEventListener('click', () => openPanelTab('out'));
    $('#ptab-term').addEventListener('click', () => openPanelTab('term'));
    $('#st-auto').addEventListener('click', toggleAutosave);
    $('#modal-close').addEventListener('click', hideAbout);
    $('#modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') hideAbout();
    });

    $('#search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch();
    });
    $('#search-case').addEventListener('change', () => {
      if ($('#search-input').value.trim()) runSearch();
    });

    const welcomeActions = {
      newFile,
      openFile: openFiles,
      openFolder,
      search: () => showView('search'),
      terminal: () => togglePanelTab('term'),
      palette,
      run: runActive,
    };
    $$('#welcome .shortcuts li').forEach((li) => {
      li.addEventListener('click', () => welcomeActions[li.dataset.act]());
    });

    // arrastrar para cambiar tamaños
    dragResizer($('#sb-resizer'), (e) => {
      const width = clamp(e.clientX - 52, 160, 520);
      document.documentElement.style.setProperty('--sb-w', width + 'px');
    });
    dragResizer($('#panel-resizer'), (e) => {
      const box = $('#workbench').getBoundingClientRect();
      const height = clamp(box.bottom - e.clientY, 90, box.height - 140);
      document.documentElement.style.setProperty('--panel-h', height + 'px');
    });

    // atajos de teclado
    document.addEventListener(
      'keydown',
      (e) => {
        const ctrl = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        let handled = true;
        if (ctrl && !e.shiftKey && key === 'n') newFile();
        else if (ctrl && !e.shiftKey && key === 'o') openFiles();
        else if (ctrl && e.shiftKey && key === 'o') openFolder();
        else if (ctrl && e.shiftKey && key === 'f') showView('search');
        else if (ctrl && !e.shiftKey && key === 's') saveActive();
        else if (ctrl && e.shiftKey && key === 's') saveActiveAs();
        else if (ctrl && key === 'w') closeActive();
        else if (ctrl && key === 'b') toggleSidebar();
        else if (ctrl && key === 'j') togglePanel();
        else if (ctrl && (key === 'ñ' || key === '`')) togglePanelTab('term');
        else if (ctrl && key === 'tab') cycleTabs(e.shiftKey ? -1 : 1);
        else if (e.key === 'F5' && !e.shiftKey) runActive();
        else if (e.key === 'F5' && e.shiftKey) stopRun();
        else if (e.key === 'Escape' && !$('#modal').hidden) hideAbout();
        else handled = false;
        if (handled) e.preventDefault();
      },
      true
    );

    // si hay cambios sin guardar, la ventana pregunta antes de cerrarse
    window.addEventListener('beforeunload', (e) => {
      saveSession();
      if (state.tabs.some(isDirty)) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    togglePanel(false);
    showPanelTab('out');
    refreshTree();
    updateRunUi();
    updateTitle();
    updateStatus();
    updateAutoLabel();

    await restoreSession(await sessionPromise);
    state.booted = true;
    scheduleSession();
  }

  // Carga del editor Monaco (viene de la carpeta node_modules).
  const MONACO_HELP =
    'No pude cargar el editor (Monaco).\n' +
    'Abre una terminal dentro de la carpeta de Cobalto, escribe:  npm install\n' +
    'y después vuelve a abrir la app con:  npm start';

  if (typeof window.require !== 'function' || typeof window.require.config !== 'function') {
    showFatal(MONACO_HELP);
    return;
  }

  window.require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });
  window.require.onError = (err) => {
    console.error(err);
    showFatal(MONACO_HELP);
  };
  window.require(['vs/editor/editor.main'], () => {
    monaco = window.monaco;
    boot().catch((err) => {
      console.error(err);
      showFatal('Algo falló al iniciar Cobalto:\n' + (err && err.message ? err.message : err));
    });
  });
})();
