/**
 * Application entry: editor, pipeline strip, error console, tabs and event wiring.
 */
import { compile } from './compiler.js';
import { lex } from './lexer.js';
import { esc, sleep } from './utils.js';
import { TESTS } from './testcases.js';
import { V } from './views.js';

const $ = (s) => document.querySelector(s);
const ta = $('#ta'),
  hl = $('#hl'),
  gut = $('#gut'),
  con = $('#con'),
  pane = $('#pane');
let marks = new Set(),
  res = null,
  tab = 'res';
const CL = {
  KEYWORD: 'k',
  IDENTIFIER: 'i',
  NUMBER: 'n',
  STRING: 's',
  OPERATOR: 'o',
  COMMENT: 'c',
  ERROR: 'e',
};
function paint() {
  const s = ta.value,
    { T } = lex(s);
  let o = '',
    p = 0;
  for (const t of T) {
    o +=
      esc(s.slice(p, t.start)) +
      `<span class="${CL[t.y] || ''}${marks.has(t.start) ? ' sq' : ''}">${esc(s.slice(t.start, t.end))}</span>`;
    p = t.end;
  }
  hl.innerHTML = o + esc(s.slice(p)) + '\n ';
  gut.textContent = Array.from({ length: s.split('\n').length }, (_, i) => i + 1).join('\n');
}
const sync = () => {
  hl.scrollTop = gut.scrollTop = ta.scrollTop;
  hl.scrollLeft = ta.scrollLeft;
};
ta.addEventListener('input', () => {
  marks = new Set();
  paint();
});
ta.addEventListener('scroll', sync);
ta.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    run();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const b = ta.value.slice(0, ta.selectionStart),
      ind = b.split('\n').pop().match(/^\s*/)[0];
    ta.setRangeText('\n' + ind, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input'));
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input'));
  }
});
const STG = [
  ['lex', 'Lexer'],
  ['parse', 'Parser'],
  ['tree', 'Parse tree'],
  ['ast', 'AST'],
  ['sem', 'Semantic analyzer'],
];
$('#pipe').innerHTML =
  '<span class="chip" id="p0">SQL query</span>' +
  STG.map(([k, n]) => `<span class="ar">→</span><span class="chip" data-k="${k}">${n}</span>`).join('') +
  '<span class="ar">→</span><span class="chip" id="pr">Result</span>';
const chips = () => [...document.querySelectorAll('#pipe .chip')];
function toast(m, c) {
  const t = $('#toast');
  t.textContent = m;
  t.className = 'show ' + c;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (t.className = ''), 2600);
}
function renderCon(r) {
  const n = (p) => r.errors.filter((e) => e.phase === p).length;
  con.innerHTML =
    `<h4>Error console<span class="cnt">Lexical <b>${n('Lexical')}</b> · Syntax <b>${n('Syntax')}</b> · Semantic <b>${n('Semantic')}</b></span></h4>` +
    (r.errors.length
      ? r.errors
          .map(
            (e) =>
              `<div class="er ${e.phase}"><span class="pill">${e.phase} error</span><span class="d mono">Line ${e.line}, Col ${e.col}</span><div>${esc(e.msg)}</div><div class="fx">Suggestion: ${esc(e.fix)}</div></div>`,
          )
          .join('')
      : '<div class="good">✓ Compilation successful: no lexical, syntax or semantic errors.</div>');
}
const TABS = [
  ['res', 'Result'],
  ['tok', 'Tokens'],
  ['pt', 'Parse tree'],
  ['ast', 'AST'],
  ['sem', 'Semantic report'],
  ['sym', 'Symbol table'],
  ['gr', 'Grammar'],
  ['th', 'Theory'],
  ['ts', 'Tests'],
];
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(
    ([k, n]) => `<button class="tab${k === tab ? ' on' : ''}" role="tab" data-t="${k}">${n}</button>`,
  ).join('');
  pane.innerHTML = V[tab](res);
}
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-t]');
  if (b) {
    tab = b.dataset.t;
    renderTabs();
    pane.scrollTop = 0;
  }
});
function show(r, anim) {
  res = r;
  marks = new Set(r.errors.filter((e) => e.pos !== undefined).map((e) => e.pos));
  paint();
  renderCon(r);
  renderTabs();
  chips().forEach((c) => (c.className = 'chip'));
  chips()[0].classList.add('ok');
  const ok = r.status === 'ok';
  STG.forEach(([k], i) => chips()[i + 1].classList.add(r.st[k]));
  $('#pr').classList.add(ok ? 'ok' : 'fail');
  if (anim)
    toast(
      ok
        ? 'Compilation successful'
        : `${r.errors.length} ${r.status} error${r.errors.length > 1 ? 's' : ''} found`,
      ok ? 'ok' : 'er',
    );
  if (!ok && ['tok', 'pt', 'ast', 'sem'].includes(tab) && r.st.lex === 'fail') tab = 'tok';
}
async function run() {
  const b = $('#go');
  b.disabled = true;
  b.textContent = 'Compiling…';
  chips().forEach((c) => (c.className = 'chip run'));
  await sleep(420);
  b.disabled = false;
  b.textContent = 'Compile';
  show(compile(ta.value), true);
}
const DEF = TESTS[0][1];
$('#ex').innerHTML =
  '<option value="">Example queries</option>' +
  TESTS.map((t, i) => (t[3] ? '' : `<option value="${i}">${t[0]}</option>`)).join('');
$('#ex').onchange = (e) => {
  if (e.target.value === '') return;
  ta.value = TESTS[e.target.value][1];
  marks = new Set();
  paint();
  run();
};
$('#rs').onclick = () => {
  ta.value = DEF;
  $('#ex').value = '';
  show(compile(DEF), false);
};
$('#go').onclick = run;
ta.value = DEF;
paint();
show(compile(DEF), false);
