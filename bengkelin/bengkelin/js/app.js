/* ===== BENGKELIN - app.js (vanilla JS, data tersimpan di localStorage) ===== */
const CENTER = { lat: -6.5569, lng: 107.4431 }; // titik pusat Purwakarta
const MAX_KM = 7;

const MASALAH = [
  { id: 'ban',     n: 'Ban Bocor',        i: '🛞', min: 20000, max: 40000 },
  { id: 'bensin',  n: 'Kehabisan Bensin', i: '⛽', min: 15000, max: 30000 },
  { id: 'mogok',   n: 'Motor Mogok',      i: '🏍️', min: 50000, max: 120000 },
  { id: 'vbelt',   n: 'V-Belt',           i: '⚙️', min: 80000, max: 160000 },
  { id: 'listrik', n: 'Kelistrikan',      i: '⚡', min: 60000, max: 150000 },
  { id: 'lain',    n: 'Lainnya',          i: '🔧', min: 30000, max: 100000 },
];

const BENGKEL = [
  { id: 1, n: 'Bengkel Setia Motor',  a: 'Jl. Veteran, Purwakarta',  km: 0.2, tags: ['Ban bocor', 'V-belt', 'Servis umum'], match: ['ban', 'vbelt', 'mogok', 'lain'], r: 4.8, c: 12 },
  { id: 2, n: 'Purwa Motor Service',  a: 'Jl. Ipik Gandamanah',      km: 1.2, tags: ['Kelistrikan', 'CVT', 'Oli'],          match: ['listrik', 'mogok', 'vbelt', 'lain'], r: 4.5, c: 8 },
  { id: 3, n: 'Sinar Jaya Tambal Ban', a: 'Jl. Sudirman',            km: 1.3, tags: ['Tambal ban', 'Bensin eceran'],        match: ['ban', 'bensin'], r: 4.3, c: 20 },
];

/* ---------- Penyimpanan ---------- */
const KEY = 'bengkelin_db_v1';
const load = () => {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch (e) {}
  return {
    users: [
      { nama: 'Pelanggan Demo', role: 'pelanggan', username: 'pelanggan', password: '1234' },
      { nama: 'Montir Demo',    role: 'montir',    username: 'montir',    password: '1234' },
    ],
    orders: [], session: null, online: true,
  };
};
let db = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Penyimpanan penuh, coba foto lebih kecil'); } };

/* ---------- State UI ---------- */
let ui = { chat: null, rate: null, tab: 'beranda', authMode: 'masuk', authRole: 'pelanggan', err: '', step: 'form', form: { masalah: '', desk: '', patokan: '', loc: null, foto: '', locMsg: '' } };

/* ---------- Helper ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = (n) => 'Rp' + n.toLocaleString('id-ID');
const me = () => db.users.find((u) => u.username === db.session);
const masalah = (id) => MASALAH.find((m) => m.id === id) || MASALAH[5];
const bengkel = (id) => BENGKEL.find((b) => b.id === id);
function bRate(b) { // rating awal + rating dari pesanan
  const rs = db.orders.filter((o) => o.bengkelId === b.id && o.rating);
  const sum = rs.reduce((a, o) => a + o.rating.s, 0);
  return { r: (b.r * b.c + sum) / (b.c + rs.length), c: b.c + rs.length };
}
const stars = (b) => { const x = bRate(b); return `<span class="rate">⭐ ${x.r.toFixed(1)}</span> <span class="meta">(${x.c})</span>`; };
const jam = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const STATUS = { menunggu: 'Menunggu', diterima: 'Diterima', perjalanan: 'Montir berangkat', selesai: 'Selesai', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan' };
const timeAgo = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + ' menit lalu' : Math.round(m / 60) + ' jam lalu'; };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); }
function km(a, b) { // haversine
  const R = 6371, d = (x) => (x * Math.PI) / 180;
  const dl = d(b.lat - a.lat), dg = d(b.lng - a.lng);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(d(a.lat)) * Math.cos(d(b.lat)) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function go(tab) { ui.chat = null; ui.tab = tab; if (tab === 'cari') ui.step = 'form'; render(); $('#screen').scrollTop = 0; }

/* ---------- Auth ---------- */
function setAuth(k, v) { ui[k] = v; ui.err = ''; render(); }
function doAuth() {
  const g = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
  const username = g('f-user').toLowerCase(), password = g('f-pass');
  if (ui.authMode === 'daftar') {
    const nama = g('f-nama');
    if (!nama || !username || !password) return fail('Lengkapi nama, username, dan password.');
    if (password.length < 4) return fail('Password minimal 4 karakter.');
    if (db.users.some((u) => u.username === username)) return fail('Username sudah dipakai. Pilih username lain.');
    db.users.push({ nama, role: ui.authRole, username, password });
    db.session = username; save(); toast('Akun berhasil dibuat'); ui.tab = 'beranda'; render();
  } else {
    const u = db.users.find((x) => x.username === username && x.password === password);
    if (!u) return fail('Username atau password salah.');
    db.session = u.username; save(); ui.tab = 'beranda'; render();
  }
}
function fail(m) { ui.err = m; render(); }
function logout() { db.session = null; save(); ui.authMode = 'masuk'; ui.err = ''; render(); }

function authView() {
  const daftar = ui.authMode === 'daftar';
  return `
  <div class="auth-top"><div class="logo">🔧 Bengkelin</div><p>Montir datang ke lokasimu, langsung dari Purwakarta.</p></div>
  <div class="auth-box">
    <div class="seg">
      <button class="${!daftar ? 'on' : ''}" onclick="setAuth('authMode','masuk')">Masuk</button>
      <button class="${daftar ? 'on' : ''}" onclick="setAuth('authMode','daftar')">Daftar</button>
    </div>
    ${daftar ? `<label for="f-nama">Nama</label><input type="text" id="f-nama" autocomplete="name" placeholder="Nama lengkap">
      <label>Daftar sebagai</label>
      <div class="chips">
        <button class="chip ${ui.authRole === 'pelanggan' ? 'on' : ''}" onclick="setAuth('authRole','pelanggan')">🏍️ Pelanggan</button>
        <button class="chip ${ui.authRole === 'montir' ? 'on' : ''}" onclick="setAuth('authRole','montir')">🔧 Montir</button>
      </div>` : ''}
    <label for="f-user">Username</label><input type="text" id="f-user" autocapitalize="none" autocomplete="username" placeholder="contoh: budi123">
    <label for="f-pass">Password</label><input type="password" id="f-pass" autocomplete="${daftar ? 'new-password' : 'current-password'}" placeholder="Minimal 4 karakter" onkeydown="if(event.key==='Enter')doAuth()">
    ${ui.err ? `<div class="err">${esc(ui.err)}</div>` : ''}
    <div style="margin-top:16px"><button class="btn" onclick="doAuth()">${daftar ? 'Buat akun' : 'Masuk'}</button></div>
  </div>
  ${daftar ? '' : '<p class="hint">Coba demo: <b>pelanggan</b> / 1234 atau <b>montir</b> / 1234</p>'}`;
}

/* ---------- Beranda ---------- */
function berandaPelanggan(u) {
  const aktif = db.orders.filter((o) => o.cust === u.username && ['menunggu', 'diterima', 'perjalanan'].includes(o.status));
  return `
  <div class="hero">
    <div class="row"><div><small>Halo, ${esc(u.nama.split(' ')[0])}</small><h1>Motor bermasalah?</h1><div class="loc">📍 Purwakarta • radius ${MAX_KM} km</div></div>
    <button class="avatar" onclick="go('akun')" aria-label="Akun">${esc(u.nama[0].toUpperCase())}</button></div>
  </div>
  <div class="pull"><button class="search" onclick="go('cari')">🔍 Cari bengkel terdekat…</button></div>
  <h2>Pilih masalah motor</h2>
  <div class="grid">${MASALAH.map((m) => `<button class="tile" onclick="pickMasalah('${m.id}')"><div class="ic">${m.i}</div>${m.n}</button>`).join('')}</div>
  <div class="banner"><div><b>Estimasi biaya di awal</b><span>Tanpa biaya tak terduga. Lihat harga sebelum pesan.</span></div><button onclick="go('cari')">Pesan</button></div>
  ${aktif.length ? `<h2>Pesanan aktif <a onclick="go('pesanan')">Lihat semua</a></h2>${aktif.slice(0, 2).map((o) => orderCard(o)).join('')}` : ''}
  <h2>Bengkel terdekat <a onclick="go('cari')">Lihat semua</a></h2>
  ${BENGKEL.map(bengkelCard).join('')}`;
}
function berandaMontir(u) {
  const masuk = db.orders.filter((o) => o.status === 'menunggu').length;
  const jalan = db.orders.filter((o) => ['diterima', 'perjalanan'].includes(o.status)).length;
  const done = db.orders.filter((o) => o.status === 'selesai').length;
  return `
  <div class="hero">
    <div class="row"><div><small>Halo montir,</small><h1>${esc(u.nama)}</h1><div class="loc">📍 Area Purwakarta • radius ${MAX_KM} km</div></div>
    <button class="avatar" onclick="go('akun')" aria-label="Akun">${esc(u.nama[0].toUpperCase())}</button></div>
  </div>
  <div class="pull"><div class="card split" style="margin:0;box-shadow:0 6px 18px rgba(107,122,40,.18)">
    <div><h3>${db.online ? 'Siap menerima panggilan' : 'Sedang offline'}</h3><div class="meta">Geser untuk ${db.online ? 'berhenti' : 'mulai'} menerima</div></div>
    <button class="switch ${db.online ? 'on' : ''}" onclick="toggleOnline()" aria-label="Status online"></button></div></div>
  <h2>Ringkasan</h2>
  <div class="stats">
    <div class="stat"><b>${masuk}</b><span>Panggilan baru</span></div><div class="stat"><b>${jalan}</b><span>Sedang dikerjakan</span></div>
    <div class="stat"><b>${done}</b><span>Selesai</span></div><div class="stat"><b>${MASALAH.length}</b><span>Jenis layanan</span></div>
  </div>
  <h2>Panggilan terbaru <a onclick="go('panggilan')">Lihat semua</a></h2>
  ${db.orders.filter((o) => o.status === 'menunggu').slice(0, 2).map((o) => orderCard(o)).join('') || '<div class="empty"><div class="big">📭</div>Belum ada panggilan masuk.</div>'}`;
}
function toggleOnline() { db.online = !db.online; save(); render(); }
function pickMasalah(id) { ui.form.masalah = id; go('cari'); }
function bengkelCard(b) {
  return `<div class="card"><div class="split"><div><h3>${b.n}</h3><div class="meta">${b.a}</div></div><div class="dist">${b.km} km</div></div>
  <div class="tags">${b.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>${stars(b)}</div>`;
}

/* ---------- Cari bengkel ---------- */
function setF(k, v) { ui.form[k] = v; }
function pickM(id) { ui.form.masalah = id; ui.err = ''; render(); }
function shareLoc() {
  if (!navigator.geolocation) { ui.form.locMsg = 'Browser tidak mendukung lokasi.'; return render(); }
  ui.form.locMsg = 'Mencari lokasimu…'; render();
  navigator.geolocation.getCurrentPosition(
    (p) => {
      const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
      loc.dist = km(CENTER, loc); ui.form.loc = loc; ui.form.locMsg = ''; render();
    },
    () => { ui.form.locMsg = 'Lokasi tidak bisa diakses. Izinkan akses lokasi atau isi patokan.'; render(); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
function pickFoto(inp) {
  const f = inp.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => { // perkecil agar hemat penyimpanan
      const s = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * s; c.height = img.height * s;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      ui.form.foto = c.toDataURL('image/jpeg', 0.7); render();
    };
    img.src = r.result;
  };
  r.readAsDataURL(f);
}
function cariView() {
  const f = ui.form;
  if (ui.step === 'hasil') return hasilView();
  const out = f.loc && f.loc.dist > MAX_KM;
  return `
  <div class="topbar"><h1>Cari bengkel terdekat</h1><p>Isi detail agar montir siap membawa alat yang tepat</p></div>
  <div class="pad" style="padding-top:4px">
    <label>Jenis masalah</label>
    <div class="chips">${MASALAH.map((m) => `<button class="chip ${f.masalah === m.id ? 'on' : ''}" onclick="pickM('${m.id}')">${m.i} ${m.n}</button>`).join('')}</div>
    <label for="f-desk">Deskripsi singkat</label>
    <textarea id="f-desk" placeholder="Contoh: ban belakang kempes setelah kena paku" oninput="setF('desk',this.value)">${esc(f.desk)}</textarea>
    <label for="f-pat">Lokasi / patokan</label>
    <input type="text" id="f-pat" placeholder="Contoh: depan Alfamart, Jl. Veteran" value="${esc(f.patokan)}" oninput="setF('patokan',this.value)">
    <div class="row-btn"><button class="btn ghost sm" onclick="shareLoc()">📍 Share location</button></div>
    ${f.locMsg ? `<div class="loc-ok">${esc(f.locMsg)}</div>` : ''}
    ${f.loc ? `<div class="loc-ok ${out ? 'loc-bad' : ''}">${out ? '⚠️' : '✅'} Lokasi terkirim • ${f.loc.dist.toFixed(1)} km dari pusat Purwakarta${out ? ` (di luar radius ${MAX_KM} km)` : ''}</div>` : ''}
    <label>Foto kerusakan</label>
    <label class="photo" style="margin:0">
      ${f.foto ? `<img src="${f.foto}" alt="Foto kerusakan">` : '<div class="ph">📷</div>'}
      <div><b style="font-size:14px">${f.foto ? 'Ganti foto' : 'Tambah foto'}</b><div class="meta">Bantu montir menilai kerusakan</div></div>
      <input type="file" accept="image/*" capture="environment" hidden onchange="pickFoto(this)">
    </label>
    ${ui.err ? `<div class="err">${esc(ui.err)}</div>` : ''}
    <div style="margin-top:20px"><button class="btn" onclick="cariBengkel()">Cari bengkel</button></div>
  </div>`;
}
function cariBengkel() {
  const f = ui.form;
  if (!f.masalah) { ui.err = 'Pilih jenis masalah dulu.'; return render(); }
  if (!f.patokan.trim() && !f.loc) { ui.err = 'Isi lokasi/patokan atau tekan Share location.'; return render(); }
  if (f.loc && f.loc.dist > MAX_KM) { ui.err = `Lokasimu ${f.loc.dist.toFixed(1)} km dari pusat Purwakarta. Layanan hanya sampai ${MAX_KM} km.`; return render(); }
  ui.err = ''; ui.step = 'hasil'; render(); $('#screen').scrollTop = 0;
}
function estimasi(b) {
  const m = masalah(ui.form.masalah);
  return { min: m.min, max: m.max, eta: Math.round(5 + b.km * 4) };
}
function hasilView() {
  const m = masalah(ui.form.masalah);
  const list = BENGKEL.filter((b) => b.km <= MAX_KM).sort((a, b) => (b.match.includes(m.id) - a.match.includes(m.id)) || a.km - b.km);
  return `
  <div class="topbar"><h1>${m.i} ${m.n}</h1><p>${list.length} bengkel dalam radius ${MAX_KM} km</p></div>
  <div style="padding-top:14px">${list.map((b) => {
    const e = estimasi(b), cocok = b.match.includes(m.id);
    return `<div class="card"><div class="split"><div><h3>${b.n}</h3><div class="meta">${b.a}</div></div><div class="dist">${b.km} km</div></div>
    <div class="tags">${cocok ? '<span class="tag pink">Cocok untuk masalahmu</span>' : ''}${b.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    <div class="split">${stars(b)}<div class="meta">Tiba ± ${e.eta} menit</div></div>
    <div class="meta" style="margin-top:6px">Estimasi biaya <b style="color:var(--ink)">${rp(e.min)} – ${rp(e.max)}</b></div>
    <div class="row-btn"><button class="btn pink" onclick="pesan(${b.id})">Pesan montir</button></div></div>`;
  }).join('')}
  <div style="padding:0 16px"><button class="btn ghost" onclick="ui.step='form';render()">Ubah detail masalah</button></div></div>`;
}
function pesan(id) {
  const f = ui.form, b = bengkel(id), e = estimasi(b), u = me();
  db.orders.unshift({
    id: Date.now(), cust: u.username, custName: u.nama, masalah: f.masalah, desk: f.desk.trim(), patokan: f.patokan.trim(),
    loc: f.loc, foto: f.foto, bengkelId: id, min: e.min, max: e.max, eta: e.eta, status: 'menunggu', at: Date.now(),
  });
  save();
  ui.form = { masalah: '', desk: '', patokan: '', loc: null, foto: '', locMsg: '' };
  toast('Pesanan terkirim ke ' + b.n); go('pesanan');
}

/* ---------- Pesanan ---------- */
function orderCard(o, role) {
  role = role || me().role;
  const m = masalah(o.masalah), b = bengkel(o.bengkelId);
  const maps = o.loc ? `https://www.google.com/maps?q=${o.loc.lat},${o.loc.lng}` : '';
  let act = '';
  if (role === 'pelanggan' && o.status === 'menunggu') act = `<button class="btn ghost sm" onclick="setStatus(${o.id},'dibatalkan')">Batalkan</button>`;
  if (role === 'montir') {
    if (o.status === 'menunggu') act = `<button class="btn ghost sm" onclick="setStatus(${o.id},'ditolak')">Tolak</button><button class="btn sm" onclick="setStatus(${o.id},'diterima')">Terima</button>`;
    if (o.status === 'diterima') act = `<button class="btn sm" onclick="setStatus(${o.id},'perjalanan')">Berangkat</button>`;
    if (o.status === 'perjalanan') act = `<button class="btn pink sm" onclick="setStatus(${o.id},'selesai')">Tandai selesai</button>`;
  }
  if (['diterima', 'perjalanan', 'selesai'].includes(o.status)) {
    const n = (o.chat || []).filter((c) => c.from !== 'sistem').length;
    act = `<button class="btn ghost sm" onclick="openChat(${o.id})">💬 Chat${n ? ' (' + n + ')' : ''}</button>` + act;
  }
  if (role === 'pelanggan' && o.status === 'selesai' && !o.rating) act += `<button class="btn pink sm" onclick="openRate(${o.id})">⭐ Beri rating</button>`;
  const ratingLine = o.rating ? `<div class="meta" style="margin-top:8px">Rating: <b style="color:var(--ink)">${'⭐'.repeat(o.rating.s)}</b>${o.rating.text ? ' — ' + esc(o.rating.text) : ''}</div>` : '';
  return `<div class="card">
    <div class="split"><h3>${m.i} ${m.n}</h3><span class="status s-${o.status}">${STATUS[o.status]}</span></div>
    <div class="meta">${role === 'montir' ? esc(o.custName) + ' • ' : ''}${timeAgo(o.at)} • ${b.n}</div>
    ${o.desk ? `<p style="font-size:13px;margin-top:8px">${esc(o.desk)}</p>` : ''}
    <div class="tags"><span class="tag warn">📍 ${esc(o.patokan || 'Lokasi dibagikan')}</span>${o.loc ? `<span class="tag">GPS ${o.loc.dist.toFixed(1)} km dari pusat</span>` : ''}</div>
    ${o.foto ? `<img class="thumb" src="${o.foto}" alt="Foto kerusakan">` : ''}
    <div class="meta" style="margin-top:8px">Estimasi <b style="color:var(--ink)">${rp(o.min)} – ${rp(o.max)}</b> • tiba ± ${o.eta} menit</div>
    ${ratingLine}
    ${(act || maps) ? `<div class="row-btn" style="justify-content:flex-end">${maps ? `<a class="btn ghost sm" style="text-decoration:none;text-align:center" href="${maps}" target="_blank" rel="noopener">Buka peta</a>` : ''}${act}</div>` : ''}
  </div>`;
}
function setStatus(id, s) {
  const o = db.orders.find((x) => x.id === id); if (!o) return;
  o.status = s;
  const sys = { diterima: 'Pesanan diterima. Silakan chat untuk koordinasi lokasi dan kerusakan.', perjalanan: 'Montir sedang menuju lokasimu.', selesai: 'Pesanan selesai. Terima kasih!' }[s];
  if (sys) (o.chat = o.chat || []).push({ from: 'sistem', text: sys, t: Date.now() });
  save(); toast('Status: ' + STATUS[s]); render();
}
function pesananView() {
  const u = me();
  const list = db.orders.filter((o) => o.cust === u.username);
  return `<div class="topbar"><h1>Pesanan saya</h1><p>Pantau status montir yang kamu panggil</p></div><div style="padding-top:14px">
  ${list.map((o) => orderCard(o, 'pelanggan')).join('') || '<div class="empty"><div class="big">🧾</div>Belum ada pesanan.<div style="margin-top:14px"><button class="btn sm" onclick="go(\'cari\')">Cari bengkel</button></div></div>'}</div>`;
}
function panggilanView() {
  const order = { menunggu: 0, diterima: 1, perjalanan: 1, selesai: 2, ditolak: 3, dibatalkan: 3 };
  const list = [...db.orders].sort((a, b) => order[a.status] - order[b.status] || b.at - a.at);
  return `<div class="topbar"><h1>Panggilan masuk</h1><p>${db.online ? 'Kamu online' : 'Kamu offline — nyalakan status di Beranda'}</p></div><div style="padding-top:14px">
  ${list.map((o) => orderCard(o, 'montir')).join('') || '<div class="empty"><div class="big">📭</div>Belum ada panggilan masuk.<br>Pesanan pelanggan akan muncul di sini.</div>'}</div>`;
}

/* ---------- Chat ---------- */
function openChat(id) { ui.chat = id; render(); }
function closeChat() { ui.chat = null; render(); }
function sendMsg(text) {
  const o = db.orders.find((x) => x.id === ui.chat), inp = $('#f-msg');
  text = (text || (inp ? inp.value : '')).trim();
  if (!o || !text) return;
  (o.chat = o.chat || []).push({ from: me().role, text, t: Date.now() });
  save(); render();
}
function chatView() {
  const o = db.orders.find((x) => x.id === ui.chat), u = me(), b = bengkel(o.bengkelId), m = masalah(o.masalah);
  const aktif = ['diterima', 'perjalanan'].includes(o.status);
  const quick = u.role === 'montir'
    ? ['Saya otw ke lokasi', 'Mohon kirim patokan lebih jelas', 'Estimasi biaya sudah sesuai ya']
    : ['Saya di dekat patokan', 'Berapa lama lagi tiba?', 'Motor ada di pinggir jalan'];
  const msgs = (o.chat || []).map((c) => c.from === 'sistem'
    ? `<div class="sys">${esc(c.text)}</div>`
    : `<div class="bub ${c.from === u.role ? 'me' : 'them'}">${esc(c.text)}<small>${jam(c.t)}</small></div>`).join('');
  return `<div class="chat">
    <div class="topbar chat-h"><button class="back" onclick="closeChat()" aria-label="Kembali">←</button>
      <div><h1>${esc(u.role === 'montir' ? o.custName : b.n)}</h1><p>${m.i} ${m.n} • ${STATUS[o.status]}</p></div></div>
    <div class="msgs" id="msgs">${msgs || '<div class="empty">Belum ada pesan.</div>'}</div>
    ${aktif ? `<div class="quick">${quick.map((q) => `<button class="chip" onclick="sendMsg('${q}')">${q}</button>`).join('')}</div>
    <div class="compose"><input type="text" id="f-msg" placeholder="Tulis pesan…" onkeydown="if(event.key==='Enter')sendMsg()"><button onclick="sendMsg()">Kirim</button></div>`
    : '<div class="hint" style="margin:10px">Chat ditutup karena pesanan sudah selesai.</div>'}
  </div>`;
}

/* ---------- Rating bengkel ---------- */
function openRate(id) { ui.rate = { id, s: 0, text: '' }; render(); }
function setRate(n) { ui.rate.s = n; render(); }
function submitRate() {
  const o = db.orders.find((x) => x.id === ui.rate.id);
  if (!ui.rate.s) return toast('Pilih jumlah bintang dulu');
  o.rating = { s: ui.rate.s, text: ui.rate.text.trim(), t: Date.now() };
  ui.rate = null; save(); toast('Terima kasih atas penilaianmu'); render();
}
function rateModal() {
  const r = ui.rate, o = db.orders.find((x) => x.id === r.id), b = bengkel(o.bengkelId);
  const lbl = ['Pilih bintang', 'Buruk', 'Kurang', 'Cukup', 'Bagus', 'Sangat bagus'][r.s];
  return `<div class="modal" onclick="if(event.target===this){ui.rate=null;render()}"><div class="sheet">
    <h3 style="font-size:17px">Beri rating</h3><div class="meta">${b.n}</div>
    <div class="starpick">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= r.s ? 'on' : ''}" onclick="setRate(${n})" aria-label="${n} bintang">★</button>`).join('')}</div>
    <div class="loc-ok" style="text-align:center;color:var(--muted)">${lbl}</div>
    <label for="f-rv">Ulasan (opsional)</label>
    <textarea id="f-rv" placeholder="Ceritakan pelayanan, kejujuran harga, dan ketepatan waktu" oninput="ui.rate.text=this.value">${esc(r.text)}</textarea>
    <div class="row-btn"><button class="btn ghost" onclick="ui.rate=null;render()">Nanti</button><button class="btn pink" onclick="submitRate()">Kirim rating</button></div>
  </div></div>`;
}

/* ---------- Akun ---------- */
function akunView() {
  const u = me();
  const total = db.orders.filter((o) => (u.role === 'pelanggan' ? o.cust === u.username : true)).length;
  return `<div class="topbar"><h1>Akun</h1><p>Kelola profil kamu</p></div>
  <div class="card" style="margin-top:14px"><div class="split" style="justify-content:flex-start;gap:14px">
    <div class="avatar" style="width:56px;height:56px;font-size:22px;background:var(--grad)">${esc(u.nama[0].toUpperCase())}</div>
    <div><h3 style="font-size:16px">${esc(u.nama)}</h3><div class="meta">@${esc(u.username)}</div>
    <div class="tags" style="margin:6px 0 0"><span class="tag ${u.role === 'montir' ? 'pink' : ''}">${u.role === 'montir' ? '🔧 Montir' : '🏍️ Pelanggan'}</span></div></div></div></div>
  <div class="card"><div class="split"><span>${u.role === 'montir' ? 'Total panggilan' : 'Total pesanan'}</span><b>${total}</b></div></div>
  <div class="card"><div class="split"><span>Area layanan</span><b>Purwakarta ≤ ${MAX_KM} km</b></div></div>
  <div style="padding:6px 16px"><button class="btn ghost" onclick="logout()">Keluar</button></div>`;
}

/* ---------- Render ---------- */
function render() {
  const u = me(), scr = $('#screen'), nav = $('#nav');
  document.querySelectorAll('.modal').forEach((e) => e.remove());
  if (!u) { nav.innerHTML = ''; scr.innerHTML = authView(); return; }
  if (ui.chat) {
    nav.innerHTML = ''; scr.innerHTML = chatView();
    const ms = $('#msgs'); ms.scrollTop = ms.scrollHeight;
    const inp = $('#f-msg'); if (inp) inp.focus();
    return;
  }
  const menu = u.role === 'montir'
    ? [['beranda', '🏠', 'Beranda'], ['panggilan', '📞', 'Panggilan'], ['akun', '👤', 'Akun']]
    : [['beranda', '🏠', 'Beranda'], ['cari', '🔍', 'Cari'], ['pesanan', '🧾', 'Pesanan'], ['akun', '👤', 'Akun']];
  if (!menu.some((m) => m[0] === ui.tab)) ui.tab = 'beranda';
  const baru = db.orders.filter((o) => o.status === 'menunggu').length;
  nav.innerHTML = menu.map(([id, ic, lb]) => `<button class="${ui.tab === id ? 'on' : ''}" onclick="go('${id}')"><span>${ic}</span>${lb}${id === 'panggilan' && baru ? `<i class="dot">${baru}</i>` : ''}</button>`).join('');
  const views = {
    beranda: () => (u.role === 'montir' ? berandaMontir(u) : berandaPelanggan(u)),
    cari: cariView, pesanan: pesananView, panggilan: panggilanView, akun: akunView,
  };
  const top = scr.scrollTop;
  scr.innerHTML = views[ui.tab]();
  scr.scrollTop = top;
  if (ui.rate) $('#app').insertAdjacentHTML('beforeend', rateModal());
}
render();
