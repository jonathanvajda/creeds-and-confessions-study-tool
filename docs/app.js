const DOCUMENTS = {
  wsc: { id: 'wsc', url: 'data/westminster-shorter-catechism_pca.json', abbreviation: 'WSC', title: 'Westminster Shorter Catechism', year: '1646', detail: 'With PCA proof texts' },
  wlc: { id: 'wlc', url: 'data/westminster_larger_catechism.json', abbreviation: 'WLC', title: 'Westminster Larger Catechism', year: '1647', detail: 'Westminster Assembly edition' },
  heidelberg: { id: 'heidelberg', url: 'data/heidelberg_catechism.json', abbreviation: 'HC', title: 'Heidelberg Catechism', year: '1563', detail: 'Zacharias Ursinus' },
  baptist1695: { id: 'baptist1695', url: 'data/1695_baptist_catechism.json', abbreviation: 'BC', title: '1695 Baptist Catechism', year: '1695', detail: 'William Collins' },
  keach: { id: 'keach', url: 'data/keachs_catechism.json', abbreviation: 'KC', title: "Keach's Catechism", year: '1794', detail: 'Baptist Catechism' },
  children: { id: 'children', url: 'data/catechism_for_young_children.json', abbreviation: 'CYC', title: 'Catechism for Young Children', year: '1840', detail: 'Joseph Engles' }
};
const DB_NAME = 'confessio-study';
const state = { documents: {}, activeDocument: 'wsc', questions: [], progress: {}, selected: new Set(), history: [], session: null, charts: [] };
let deferredInstallPrompt = null;
const $ = (id) => document.getElementById(id);
const cleanAnswer = (text = '') => text.replace(/\s*\[[a-z0-9]+\]/gi, '').replace(/\s+([,.;:?!])/g, '$1').trim();
const normalize = (text) => cleanAnswer(text).toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim();
const shuffle = (items) => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function dbGet(key) { const db = await openDB(); return new Promise((resolve, reject) => { const r = db.transaction('state').objectStore('state').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
async function dbSet(key, value) { const db = await openDB(); return new Promise((resolve, reject) => { const r = db.transaction('state', 'readwrite').objectStore('state').put(value, key); r.onsuccess = resolve; r.onerror = () => reject(r.error); }); }
async function persist() {
  $('save-label').textContent = 'Saving…';
  await dbSet('userData', { version: 2, activeDocument: state.activeDocument, progress: state.progress, selected: [...state.selected], history: state.history, exportedAt: new Date().toISOString() });
  $('save-label').textContent = 'Saved'; setTimeout(() => $('save-label').textContent = 'Ready', 1200);
}
function itemKey(number, documentId = state.activeDocument) { return `${documentId}:${number}`; }
function statusOf(number, documentId = state.activeDocument) { return state.progress[itemKey(number, documentId)]?.status || 'unlearned'; }
function counts() { return { learned: state.questions.filter(q => statusOf(q.number) === 'learned').length, revisit: state.questions.filter(q => statusOf(q.number) === 'revisit').length, unlearned: state.questions.filter(q => statusOf(q.number) === 'unlearned').length }; }
function visibleQuestions() { const search = $('question-search').value.toLowerCase().trim(); const filter = $('status-filter').value; return state.questions.filter(q => (filter === 'all' || statusOf(q.number) === filter) && (!search || `${q.question} ${q.answer}`.toLowerCase().includes(search))); }

function renderLibrary() {
  const c = counts(), total = state.questions.length, percent = total ? Math.round(c.learned / total * 100) : 0, doc = DOCUMENTS[state.activeDocument];
  const selectedHere = state.questions.filter(q => state.selected.has(itemKey(q.number))).length;
  $('total-count').textContent = total; $('learned-count').textContent = c.learned; $('revisit-count').textContent = c.revisit; $('selected-count').textContent = selectedHere;
  $('document-abbreviation').textContent = doc.abbreviation; $('document-meta').textContent = `Catechism · ${doc.year}`; $('document-title').textContent = doc.title; $('document-detail').textContent = `${doc.detail} · ${total} questions`;
  document.querySelectorAll('[data-document]').forEach(button => button.classList.toggle('active', button.dataset.document === state.activeDocument));
  $('document-percent').textContent = `${percent}%`; $('document-progress-fill').style.width = `${percent}%`;
  $('selected-pool-label').textContent = `${selectedHere} question${selectedHere === 1 ? '' : 's'} in ${doc.abbreviation}`;
  $('unlearned-pool-label').textContent = `${c.unlearned} questions`; $('revisit-pool-label').textContent = `${c.revisit} questions`;
  const visible = visibleQuestions();
  $('select-all-checkbox').checked = visible.length > 0 && visible.every(q => state.selected.has(itemKey(q.number)));
  $('question-list').innerHTML = visible.length ? visible.map(q => `<label class="question-row"><input type="checkbox" data-question="${q.number}" ${state.selected.has(itemKey(q.number)) ? 'checked' : ''}><span class="number">Q${q.number}</span><span class="question">${q.question}<span class="answer-preview">${cleanAnswer(q.answer)}</span></span><span class="status-pill ${statusOf(q.number)}">${statusOf(q.number) === 'unlearned' ? 'Not started' : statusOf(q.number)}</span></label>`).join('') : '<p class="empty-state">No questions match this filter.</p>';
  document.querySelectorAll('[data-question]').forEach(input => input.addEventListener('change', () => { const key = itemKey(+input.dataset.question); input.checked ? state.selected.add(key) : state.selected.delete(key); persist(); renderLibrary(); }));
}

function switchDocument(documentId) {
  if (!state.documents[documentId]) return;
  state.activeDocument = documentId; state.questions = state.documents[documentId];
  $('question-search').value = ''; $('status-filter').value = 'all';
  persist(); renderLibrary();
}
function route(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `${name}-view`));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  document.querySelector('.sidebar').classList.remove('open'); $('menu-toggle').setAttribute('aria-expanded', 'false');
  if (name === 'progress') renderAnalytics();
  if (name === 'practice') renderLibrary();
  window.scrollTo(0, 0);
}
function showToast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove('show'), 2500); }
function setChoiceCards(name) { document.querySelectorAll(`input[name="${name}"]`).forEach(input => input.closest('.choice-card').classList.toggle('selected', input.checked)); }

function startSession() {
  const poolName = document.querySelector('input[name="pool"]:checked').value;
  const method = document.querySelector('input[name="method"]:checked').value;
  let pool = poolName === 'selected' ? state.questions.filter(q => state.selected.has(itemKey(q.number))) : poolName === 'all' ? [...state.questions] : state.questions.filter(q => statusOf(q.number) === poolName);
  if (!pool.length) { showToast(poolName === 'selected' ? 'Select at least one question in the Library.' : 'There are no questions in that pool yet.'); return; }
  if ($('shuffle-order').checked) pool = shuffle(pool);
  state.session = { pool, method, index: 0, score: 0, answered: false };
  $('practice-setup').classList.add('hidden'); $('session-view').classList.remove('hidden'); renderSession();
}
function renderSession() {
  const s = state.session, q = s.pool[s.index], answer = cleanAnswer(q.answer);
  $('session-counter').textContent = `${s.index + 1} of ${s.pool.length}`; $('session-score').textContent = `${s.score} correct`; $('session-progress-fill').style.width = `${(s.index / s.pool.length) * 100}%`; $('question-number').textContent = `Question ${q.number}`; $('session-question').textContent = q.question; $('feedback').className = 'feedback hidden';
  const area = $('answer-area'), actions = $('session-actions'); actions.innerHTML = '';
  if (s.method === 'flashcard') { area.innerHTML = '<p class="muted">Think through the answer, then reveal it when you are ready.</p>'; actions.innerHTML = '<button class="button primary large" id="reveal-answer">Reveal answer</button>'; $('reveal-answer').onclick = revealFlashcard; }
  if (s.method === 'hard') { area.innerHTML = '<textarea id="hard-answer" aria-label="Your answer" placeholder="Type the complete answer…"></textarea>'; actions.innerHTML = '<button class="button primary large" id="check-answer">Check answer</button>'; $('check-answer').onclick = checkAnswer; }
  if (s.method === 'easy') renderEasy(answer);
  if (s.method === 'medium') renderMedium(answer);
}
function revealFlashcard() {
  const q = state.session.pool[state.session.index]; $('answer-area').innerHTML = `<p class="answer-text">${cleanAnswer(q.answer)}</p>`;
  $('session-actions').innerHTML = '<button class="button rating-button" data-rate="unlearned">Not yet</button><button class="button rating-button" data-rate="revisit">Revisit</button><button class="button primary rating-button" data-rate="learned">Learned</button>';
  document.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => rateCard(b.dataset.rate));
}
function renderEasy(answer) {
  const words = answer.split(/(\s+)/); let blank = 0;
  const html = words.map((part, i) => { if (!part.trim()) return part; const plain = part.replace(/[^A-Za-z']/g, ''); if (plain.length > 3 && i % 7 === 0) { blank++; return `<input class="blank-input" data-word="${plain.toLowerCase()}" aria-label="Missing word ${blank}">` + (part.match(/[^A-Za-z']+$/)?.[0] || ''); } return part; }).join('');
  $('answer-area').innerHTML = `<div>${html}</div>`; $('session-actions').innerHTML = '<button class="button primary large" id="check-answer">Check answer</button>'; $('check-answer').onclick = checkAnswer;
}
function renderMedium(answer) {
  const words = answer.split(/\s+/); $('answer-area').innerHTML = `<p class="muted">Choose words to build the answer. Select a placed word to return it.</p><div id="word-answer" class="word-answer"></div><div id="word-bank" class="word-bank">${shuffle(words).map((w, i) => `<button class="word-chip" data-token="${i}">${w}</button>`).join('')}</div>`;
  $('session-actions').innerHTML = '<button class="button primary large" id="check-answer">Check answer</button>'; $('check-answer').onclick = checkAnswer; wireWordChips();
}
function wireWordChips() { document.querySelectorAll('.word-chip').forEach(chip => chip.onclick = () => { const target = chip.parentElement.id === 'word-bank' ? $('word-answer') : $('word-bank'); target.appendChild(chip); wireWordChips(); }); }
function checkAnswer() {
  const s = state.session, q = s.pool[s.index], target = normalize(q.answer); let attempt = '';
  if (s.method === 'hard') attempt = normalize($('hard-answer').value);
  if (s.method === 'easy') { const inputs = [...document.querySelectorAll('.blank-input')]; const good = inputs.every(i => normalize(i.value) === i.dataset.word); finishCheck(good, inputs.filter(i => normalize(i.value) !== i.dataset.word).length ? 'Some blanks need another look.' : 'Every blank is correct.'); return; }
  if (s.method === 'medium') attempt = normalize([...$('word-answer').children].map(x => x.textContent).join(' '));
  const targetWords = target.split(' '), attemptWords = attempt.split(' ').filter(Boolean), matches = targetWords.filter((w, i) => attemptWords[i] === w).length, accuracy = Math.round(matches / targetWords.length * 100);
  finishCheck(accuracy === 100, accuracy === 100 ? 'Exact match — beautifully recalled.' : `${accuracy}% of words are in the exact position.`);
}
function finishCheck(correct, message) { if (state.session.answered) return; state.session.answered = true; if (correct) state.session.score++; const feedback = $('feedback'); feedback.className = `feedback ${correct ? 'success' : 'error'}`; feedback.innerHTML = `${message}${correct ? '' : `<br><strong>Answer:</strong> ${cleanAnswer(state.session.pool[state.session.index].answer)}`}`; $('session-actions').innerHTML = '<button class="button primary large" id="next-question">Continue →</button>'; $('next-question').onclick = () => recordAndNext(correct ? 'learned' : 'revisit', correct); }
function rateCard(status) { recordAndNext(status, status === 'learned'); }
async function recordAndNext(status, correct) { const s = state.session, q = s.pool[s.index]; state.progress[itemKey(q.number, q.documentId)] = { status, updatedAt: new Date().toISOString() }; state.history.push({ documentId: q.documentId, question: q.number, status, correct, method: s.method, at: new Date().toISOString() }); await persist(); s.index++; s.answered = false; if (s.index >= s.pool.length) finishSession(); else renderSession(); }
function finishSession() { const s = state.session; $('session-progress-fill').style.width = '100%'; $('session-view').innerHTML = `<article class="study-card"><p class="eyebrow">Session complete</p><h2>Well practiced.</h2><p>You reviewed ${s.pool.length} question${s.pool.length === 1 ? '' : 's'}${s.method === 'flashcard' ? '.' : ` with ${s.score} exact ${s.score === 1 ? 'answer' : 'answers'}.`}</p><button class="button primary large" id="return-setup">Build another session</button></article>`; $('return-setup').onclick = () => location.reload(); renderLibrary(); }
function exitSession() { state.session = null; $('session-view').classList.add('hidden'); $('practice-setup').classList.remove('hidden'); }

function renderAnalytics() {
  const documentHistory = state.history.filter(h => (h.documentId || 'wsc') === state.activeDocument);
  const c = counts(), learned = c.learned, reviewed = documentHistory.length, tests = documentHistory.filter(h => h.method !== 'flashcard'), correct = tests.filter(h => h.correct).length;
  $('analytics-mastered').textContent = learned; $('analytics-reviewed').textContent = reviewed; $('analytics-accuracy').textContent = tests.length ? `${Math.round(correct / tests.length * 100)}%` : '—'; $('donut-percent').textContent = `${Math.round(learned / state.questions.length * 100)}%`;
  const days = [...new Set(documentHistory.map(h => h.at.slice(0, 10)))].sort().reverse(); let streak = 0, cursor = new Date(); while (days.includes(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1); } $('analytics-streak').textContent = streak;
  const next = Math.max(10, Math.ceil((learned + 1) / 10) * 10); $('milestone-title').textContent = `Learn ${Math.min(next, state.questions.length)} questions`; $('milestone-value').textContent = learned; $('milestone-copy').textContent = `${Math.max(0, Math.min(next, state.questions.length) - learned)} questions to go. Small, steady steps make durable memories.`;
  $('mastery-legend').innerHTML = `<span><i style="background:#1d5945"></i>Learned ${c.learned}</span><span><i style="background:#c49a50"></i>Revisit ${c.revisit}</span><span><i style="background:#d8d5cc"></i>Not started ${c.unlearned}</span>`;
  state.charts.forEach(chart => chart.destroy()); state.charts = []; if (!window.Chart) return;
  state.charts.push(new Chart($('mastery-chart'), { type: 'doughnut', data: { datasets: [{ data: [c.learned, c.revisit, c.unlearned], backgroundColor: ['#1d5945','#c49a50','#d8d5cc'], borderWidth: 0 }] }, options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: true } }, maintainAspectRatio: false } }));
  const labels = [], activity = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0,10); labels.push(d.toLocaleDateString(undefined,{month:'short',day:'numeric'})); activity.push(documentHistory.filter(h => h.at.slice(0,10) === key).length); }
  state.charts.push(new Chart($('activity-chart'), { type:'line', data:{labels,datasets:[{data:activity,borderColor:'#1d5945',backgroundColor:'#dbe7dc88',fill:true,tension:.35,pointRadius:3}]}, options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:'#e5e1d8'}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:7}}}} }));
}
function applySavedData(data) {
  state.activeDocument = DOCUMENTS[data.activeDocument] ? data.activeDocument : 'wsc';
  state.progress = Object.fromEntries(Object.entries(data.progress || {}).map(([key, value]) => [key.includes(':') ? key : `wsc:${key}`, value]));
  state.selected = new Set((data.selected || []).map(key => String(key).includes(':') ? String(key) : `wsc:${key}`));
  state.history = (data.history || []).map(entry => ({ ...entry, documentId: entry.documentId || 'wsc' }));
  state.questions = state.documents[state.activeDocument];
}
function exportData() { const data = { app: 'Reformanda', version: 2, activeDocument: state.activeDocument, progress: state.progress, selected: [...state.selected], history: state.history, exportedAt: new Date().toISOString() }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = `reformanda-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); showToast('Backup downloaded.'); }
async function importData(file) { try { const data = JSON.parse(await file.text()); if (!['Reformanda', 'Confessio'].includes(data.app) || !data.progress || !Array.isArray(data.history)) throw new Error(); applySavedData(data); await persist(); renderLibrary(); showToast('Backup restored.'); } catch { showToast('That file is not a valid Reformanda backup.'); } }
async function connectFolder() { if (!window.showDirectoryPicker) { showToast('Folder access is not supported in this browser. Export still works.'); return; } try { const handle = await window.showDirectoryPicker({mode:'readwrite'}); $('folder-status').textContent = `Connected to ${handle.name}`; showToast('Folder connected for this visit.'); } catch (e) { if (e.name !== 'AbortError') showToast('The folder could not be connected.'); } }

async function init() {
  try {
    const load = url => fetch(url).then(r => { if (!r.ok) throw new Error('data'); return r.json(); });
    const entries = Object.entries(DOCUMENTS);
    const loaded = await Promise.all(entries.map(([, document]) => load(document.url)));
    const saved = await dbGet('userData');
    entries.forEach(([id], index) => {
      const source = loaded[index];
      state.documents[id] = source.questions
        ? source.questions.map(q => ({ ...q, documentId: id }))
        : source.Data.map(q => ({ number: q.Number, question: q.Question, answer: q.Answer || cleanAnswer(q.AnswerWithProofs), verses: q.Proofs || [], documentId: id }));
    });
    state.questions = state.documents.wsc;
    if (saved) applySavedData(saved);
    renderLibrary();
  }
  catch (error) { $('question-list').innerHTML = '<p>Unable to load the catechism data. When testing locally, serve the docs folder through localhost rather than opening the file directly.</p>'; }
  document.querySelectorAll('[data-route]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const name = a.dataset.route; history.replaceState(null,'',`#${name}`); route(name); }));
  document.querySelectorAll('input[name="pool"],input[name="method"]').forEach(i => i.addEventListener('change', () => setChoiceCards(i.name)));
  $('question-search').addEventListener('input', renderLibrary); $('status-filter').addEventListener('change', renderLibrary);
  document.querySelectorAll('[data-document]').forEach(button => button.onclick = () => switchDocument(button.dataset.document));
  $('select-visible').onclick = () => { visibleQuestions().forEach(q => state.selected.add(itemKey(q.number))); persist(); renderLibrary(); }; $('clear-selection').onclick = () => { state.questions.forEach(q => state.selected.delete(itemKey(q.number))); persist(); renderLibrary(); };
  $('select-all-checkbox').onchange = e => { visibleQuestions().forEach(q => e.target.checked ? state.selected.add(itemKey(q.number)) : state.selected.delete(itemKey(q.number))); persist(); renderLibrary(); };
  $('practice-selection').onclick = () => route('practice'); $('start-session').onclick = startSession; $('exit-session').onclick = exitSession;
  $('export-data').onclick = exportData; $('import-data').onclick = () => $('import-file').click(); $('import-file').onchange = e => e.target.files[0] && importData(e.target.files[0]); $('connect-folder').onclick = connectFolder;
  $('reset-data').onclick = async () => { if (!confirm('Reset all learning progress on this device? This cannot be undone.')) return; state.progress = {}; state.selected.clear(); state.history = []; await persist(); renderLibrary(); showToast('Learning data reset.'); };
  $('install-app').onclick = async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); const result = await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('install-app').hidden = true; $('install-status').textContent = result.outcome === 'accepted' ? 'Reformanda was installed.' : 'Installation was dismissed. You can try again from the browser menu.'; };
  $('menu-toggle').onclick = () => { const open = document.querySelector('.sidebar').classList.toggle('open'); $('menu-toggle').setAttribute('aria-expanded', open); };
  const initial = location.hash.slice(1); if (['library','practice','progress','data'].includes(initial)) route(initial);
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferredInstallPrompt = event;
  const button = $('install-app'); if (button) button.hidden = false;
  const status = $('install-status'); if (status) status.textContent = 'Install for one-tap access and offline study.';
});
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; const button = $('install-app'); if (button) button.hidden = true; const status = $('install-status'); if (status) status.textContent = 'Reformanda is installed on this device.'; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
init();
