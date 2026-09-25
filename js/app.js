/* WIKI ACE ID — extracted from the original index.html.
   This file intentionally contains the existing application logic unchanged. */
/* ========================================================================
   PENGATURAN — ubah bagian ini saja untuk nama, sosmed, dan hero di header.
   Biarkan url kosong ("") kalau belum punya akunnya; yang kosong otomatis
   disembunyikan.
   ======================================================================== */
const CONFIG = {
  brand:       'WIKI ID',       // teks besar di header + judul tab
  author:      'Eun One',       // dipakai di footer
  title:       'Kamus Kartu HoK: ACE',
  bannerHero:  'Donghuang Taiyi',   // nama Hero apa saja dari daftar Hero
  links: [
    { kind:'youtube',   label:'YouTube',   url:'https://www.youtube.com/@patotogaming' },
    { kind:'tiktok',    label:'TikTok',    url:'https://www.tiktok.com/@wanone562' },
    { kind:'instagram', label:'Instagram', url:'' },
    { kind:'discord',   label:'Discord',   url:'' },
    { kind:'link',      label:'Website',   url:'' }
  ]
};
/* ===================== batas pengaturan ================================= */

const DATA = JSON.parse(document.getElementById('data').textContent);
const KINDS = [
  ['hero','Kartu Hero'], ['talent','Kartu Talent'],
  ['equip','Kartu Equipment'], ['effect','Kartu Effect']
];
const FC = {
  'Riverlands':'var(--f-riv)','Central Plain':'var(--f-cen)','Zhulu':'var(--f-zhu)',
  'Three Kingdoms':'var(--f-thr)','Sunset Sea':'var(--f-sun)','No Faction':'var(--f-non)',
  'Universal':'var(--f-non)'
};
const FACTIONS = ['Riverlands','Zhulu','Three Kingdoms','Central Plain','Sunset Sea','No Faction'];
const KEYWORDS = Object.keys(DATA.keywords);
const state = {kind:'hero', faction:'', kw:'', tier:0, q:'', sel:null, dtab:0};

const el = (t,c,x)=>{const n=document.createElement(t); if(c)n.className=c;
  if(x!=null)n.textContent=x; return n;};
const esc = s => (s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

/* highlight numbers, keywords and [Faction] tags inside effect text */
function fmt(s){
  let h = esc(s);
  h = h.replace(/\[([^\]]+)\]/g,'<i>[$1]</i>');
  h = h.replace(/([+\-]?\d+(?:\.\d+)?%?)/g,'<u>$1</u>');
  const kws = KEYWORDS.concat(['Physical Damage','Magic Damage','True Damage','Max HP',
    'Max Mana','Attack Speed','Crit Rate','Crit Damage','Shield','Lifesteal',
    'Permanent Level','Summoned Unit','Kartu Hero','Kartu Effect','Kartu Talent',
    'Kartu Tactic','Player EXP','Player Level','Player HP','Energy','Refresh','Tier']);
  kws.sort((a,b)=>b.length-a.length).forEach(k=>{
    h = h.replace(new RegExp('(?<![\\w>])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\w<])','g'),
      '<b>'+k+'</b>');
  });
  return h;
}

function items(){
  let a = DATA[state.kind].filter(c=>!c.hidden);
  if(state.faction) a = a.filter(c=>c.faction===state.faction);
  if(state.tier) a = a.filter(c=>c.tier===state.tier);
  if(state.kw) a = a.filter(c=>(c.kw||[]).includes(state.kw));
  if(state.q){
    const q = state.q.toLowerCase();
    a = a.filter(c=>(c.name+' '+c.cn+' '+c.desc+' '+(c.descCn||'')).toLowerCase().includes(q));
  }
  return a;
}

function groupKey(c){
  if(state.kind==='equip') return c.slot||'Lainnya';
  if(state.kind==='talent'||state.kind==='effect') return c.group||'Lainnya';
  return c.faction;
}
const ORDER = {
  equip:['Basic Equipment','Normal Equipment','Talent Equipment','Special Equipment'],
  talent:['Starter Talents','Talent Pack I','Talent Pack II','Talent Pack III','Talent Pack IV'],
  effect:['Starter Effect Cards','Effect Pack I','Effect Pack II','Effect Pack III','Effect Pack IV'],
  hero:FACTIONS
};

function renderTabs(){
  const t = document.getElementById('tabs'); t.innerHTML='';
  KINDS.forEach(([k,label])=>{
    const b = el('button','',''); b.setAttribute('role','tab');
    b.setAttribute('aria-selected', viewMode==='database' && state.kind===k);
    b.append(document.createTextNode(label));
    b.append(el('span','n',String(DATA[k].filter(c=>!c.hidden).length)));
    b.onclick=()=>{showDatabase(); state.kind=k; state.faction=''; state.kw=''; state.tier=0;
      state.sel=null; renderAll();};
    t.append(b);
  });
  const kb = el('button','',''); kb.setAttribute('role','tab');
  kb.setAttribute('aria-selected', viewMode==='kontestan');
  kb.append(document.createTextNode('Kontestan'));
  kb.append(el('span','n',String(LORDS.length)));
  kb.onclick=()=>{ showKontestan(); renderTabs(); };
  t.append(kb);
}

function chipRow(label, opts, cur, set, colored){
  const r = el('div','frow'); r.append(el('span','',label));
  const w = el('div','chips');
  opts.forEach(([val,txt])=>{
    const b = el('button','chip'+(colored&&val?' c':''),txt);
    b.setAttribute('aria-pressed', cur===val);
    if(colored && val && cur===val) b.style.color = FC[val]||'var(--jade)';
    b.onclick=()=>{set(val); renderAll();};
    w.append(b);
  });
  r.append(w); return r;
}

function renderFilters(){
  const f = document.getElementById('filters'); f.innerHTML='';
  if(state.kind==='hero'){
    f.append(chipRow('Faksi',[['','Semua']].concat(FACTIONS.map(x=>[x,x])),
      state.faction, v=>state.faction=v, true));
  }
  f.append(chipRow('Keyword',[['','Semua']].concat(KEYWORDS.map(x=>[x,x])),
    state.kw, v=>state.kw=v));
  const tiers = [...new Set(DATA[state.kind].map(c=>c.tier))].filter(Boolean).sort();
  f.append(chipRow('Tier',[[0,'Semua']].concat(tiers.map(x=>[x,'Tier '+x])),
    state.tier, v=>state.tier=v));
}

function groupedList(){
  const arr = items();
  const map = new Map();
  arr.forEach(c=>{const k=groupKey(c); if(!map.has(k)) map.set(k,[]); map.get(k).push(c);});
  const order = ORDER[state.kind]||[];
  const keys = [...map.keys()].sort((a,b)=>{
    const i=order.indexOf(a), j=order.indexOf(b);
    return (i<0?99:i)-(j<0?99:j) || a.localeCompare(b);
  });
  keys.forEach(k=>map.get(k).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name)));
  return {keys, map};
}

/* flat reading order matching the visual grid, used for Prev/Next in the detail panel */
function orderedList(){
  const {keys,map} = groupedList();
  return keys.flatMap(k=>map.get(k));
}

function stepCard(delta){
  const list = orderedList();
  const idx = list.indexOf(state.sel);
  if(idx<0) return;
  const t = list[idx+delta];
  if(!t) return;
  state.sel = t; state.dtab = 0; renderDetail();
}

function renderList(){
  const m = document.getElementById('list'); m.innerHTML='';
  const {keys, map} = groupedList();
  if(!keys.length){
    m.append(el('p','empty','Tidak ada kartu yang cocok. Coba ubah filter atau kata kuncinya.'));
    return;
  }
  keys.forEach(k=>{
    const g = el('section','group');
    const h = el('div','ghead');
    h.style.color = FC[k]||'var(--muted)';
    h.append(el('i'));
    const t = el('h2','',k); h.append(t);
    h.append(el('b','',String(map.get(k).length)));
    h.append(el('hr'));
    g.append(h);
    const grid = el('div','grid');
    map.get(k).forEach(c=>grid.append(cardTile(c)));
    g.append(grid); m.append(g);
  });
}

function cardTile(c){
  const b = el('button','card');
  b.setAttribute('aria-current', state.sel && state.sel.id===c.id && state.sel.cn===c.cn);
  const th = el('div','thumb');
  const fb = el('div','fb', (c.name||'?').trim().charAt(0).toUpperCase());
  th.append(fb);
  if(c.thumb){
    const im = new Image(); im.loading='lazy'; im.alt='';
    im.onerror=()=>im.remove();
    im.onload=()=>fb.remove();
    im.src=c.thumb; th.append(im);
  }
  if(c.tier) th.append(el('div','tier','T'+c.tier));
  const d = el('div','fdot'); d.style.background = FC[c.faction]||'var(--f-non)';
  th.append(d);
  b.append(th);
  const n = el('span','cname', c.name);
  n.append(el('em','',c.cn));
  b.append(n);
  b.onclick=()=>{state.sel=c; state.dtab=0; renderDetail();
    document.querySelectorAll('.card').forEach(x=>x.setAttribute('aria-current','false'));
    b.setAttribute('aria-current','true');
    if(window.innerWidth<=1000) document.getElementById('detail').scrollIntoView({block:'nearest'});
  };
  return b;
}

function renderDetail(){
  const box = document.getElementById('detail');
  const host = document.getElementById('dinner');
  const c = state.sel;
  if(!c){ box.classList.add('hide'); return; }
  box.classList.remove('hide');
  host.innerHTML='';

  const list = orderedList();
  const idx = list.indexOf(c);
  const toolbar = el('div','dtoolbar');
  const prevBtn = el('button','navbtn','‹'); prevBtn.setAttribute('aria-label','Kartu sebelumnya');
  const nextBtn = el('button','navbtn','›'); nextBtn.setAttribute('aria-label','Kartu berikutnya');
  prevBtn.disabled = idx<=0;
  nextBtn.disabled = idx<0 || idx>=list.length-1;
  prevBtn.onclick=()=>stepCard(-1);
  nextBtn.onclick=()=>stepCard(1);
  toolbar.append(prevBtn);
  toolbar.append(el('span','pos', idx<0 ? '—' : (idx+1)+' / '+list.length));
  toolbar.append(nextBtn);
  const closeX = el('button','closeX','Tutup ✕');
  closeX.onclick = ()=>{state.sel=null; renderDetail();};
  toolbar.append(closeX);
  host.append(toolbar);

  const art = el('div','dart');
  const backdrop = c.art || c.card;
  if(backdrop){
    const bg = el('div','bg');
    const probe = new Image();
    probe.onload = ()=>{ bg.style.backgroundImage = 'url("'+backdrop+'")'; };
    probe.src = backdrop;
    art.append(bg); art.append(el('div','scrim'));
  }
  if(c.card){
    const im = new Image(); im.alt=c.name;
    im.onerror=()=>{im.remove(); art.append(el('div','fb2',
      'Gambar kartu tidak dapat dimuat di pratinjau ini. Saat file di-host sendiri, art asli akan tampil.'));};
    im.src=c.card; art.append(im);
  } else art.append(el('div','fb2','Tidak ada gambar kartu.'));
  host.append(art);

  const body = el('div','dbody');
  const top = el('div','dtop');
  top.append(el('h3','',c.name)); top.append(el('span','cn',c.cn));
  body.append(top);

  const meta = el('div','meta');
  if(c.tier) meta.append(el('span','tag','Tier '+c.tier));
  if(c.faction) meta.append(el('span','tag',c.faction));
  if(c.slot) meta.append(el('span','tag',c.slot));
  if(c.etype) meta.append(el('span','tag',c.etype));
  if(c.group) meta.append(el('span','tag',c.group));
  (c.kw||[]).forEach(k=>meta.append(el('span','tag kw',k)));
  body.append(meta);

  const tabs = [['Deskripsi',renderDesc]];
  if(c.skills && c.skills.length) tabs.push(['Skill',renderSkills]);
  if(c.props && c.props.length) tabs.push(['Atribut',renderProps]);
  if(c.awaken) tabs.push(['Awakening',renderAwaken]);
  tabs.push(['Mandarin',renderCn]);

  const tb = el('div','dtabs'); tb.setAttribute('role','tablist');
  tabs.forEach(([label],i)=>{
    const b = el('button','',label); b.setAttribute('role','tab');
    b.setAttribute('aria-selected', state.dtab===i);
    b.onclick=()=>{state.dtab=i; renderDetail();};
    tb.append(b);
  });
  body.append(tb);

  const pane = el('div');
  (tabs[Math.min(state.dtab,tabs.length-1)][1])(pane, c);
  body.append(pane);
  host.append(body);
  box.scrollTop = 0;
}

function renderDesc(p,c){
  const d = el('div','eff'); d.innerHTML = fmt(c.desc); p.append(d);
  (c.kw||[]).forEach(k=>{
    if(!DATA.keywords[k]) return;
    p.append(el('div','sub',k));
    const x = el('div','cnbox', DATA.keywords[k]); p.append(x);
  });
  if(c.linked && c.linked.length){
    p.append(el('div','sub','Kartu terkait'));
    c.linked.forEach(l=>{
      const b = el('div','cnbox'); b.innerHTML='<b>'+esc(l.name)+'</b><br>'+fmt(l.desc);
      b.style.marginBottom='6px'; p.append(b);
    });
  }
  if(c.up && c.up.length){
    p.append(el('div','sub','Bisa ditempa menjadi'));
    p.append(el('div','cnbox', c.up.join(' · ')));
  }
  if(c.parts && c.parts.length){
    p.append(el('div','sub','Bahan'));
    p.append(el('div','cnbox', c.parts.join(' · ')));
  }
  if(c.src){ p.append(el('div','sub','Cara dapat')); p.append(el('div','cnbox',c.src)); }
}

function renderSkills(p,c){
  c.skills.forEach(s=>{
    const w = el('div','skill');
    const h = el('h4');
    if(s.icon){ const i=new Image(); i.alt=''; i.onerror=()=>i.remove(); i.src=s.icon; h.append(i); }
    h.append(document.createTextNode(s.name));
    w.append(h);
    const d = el('div','eff'); d.innerHTML=fmt(s.desc); w.append(d);
    if(s.enh && s.enh.length){
      w.append(el('div','sub','Peningkatan per Level'));
      s.enh.forEach(e=>{
        const r = el('div','enh'); r.append(el('span','','Lv'+e.lv));
        const t = el('div'); t.innerHTML=fmt(e.desc); r.append(t); w.append(r);
      });
    }
    p.append(w);
  });
}

function renderProps(p,c){
  const dl = el('dl','props');
  c.props.forEach(x=>{
    let v = x.v;
    if(x.k==='Attack Speed'||x.k==='Movement Speed'||x.k==='Crit Rate'||x.k==='Crit Damage')
      v = (x.v/100)+'%';
    dl.append(el('dt','',x.k)); dl.append(el('dd','',String(v)));
  });
  p.append(dl);
}

function renderAwaken(p,c){
  const d = el('div','eff'); d.innerHTML=fmt(c.awaken.desc); p.append(d);
  p.append(el('div','sub','Teks Mandarin'));
  p.append(el('div','cnbox', c.awaken.descCn));
}

function renderCn(p,c){
  p.append(el('div','cnbox', c.descCn||'—'));
  if(c.skills) c.skills.forEach(s=>{
    p.append(el('div','sub', s.cn));
    p.append(el('div','cnbox', s.descCn));
  });
}

const ICONS = {
  youtube:'<path d="M22 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.5A2.5 2.5 0 0 0 2.4 7.3C2 8.8 2 12 2 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.5a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12z"/><path d="m10 15 5-3-5-3z" fill="currentColor"/>',
  tiktok:'<path d="M16 3a5 5 0 0 0 5 5v3a8 8 0 0 1-5-1.8V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3z"/>',
  instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
  discord:'<path d="M8 6a16 16 0 0 1 8 0l1-2s3 1 4 3c1 3 1 8 0 11-2 2-5 3-5 3l-1-2M8 6 7 4S4 5 3 7c-1 3-1 8 0 11 2 2 5 3 5 3l1-2"/><circle cx="9.5" cy="13" r="1.3" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.3" fill="currentColor" stroke="none"/>',
  link:'<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>'
};

function renderChrome(){
  document.getElementById('byline').textContent = (CONFIG.brand||CONFIG.author||'').toUpperCase();
  document.getElementById('fname').textContent = CONFIG.author||'';
  document.getElementById('sitetitle').textContent = CONFIG.title||'';
  document.title = ((CONFIG.brand||CONFIG.author) ? (CONFIG.brand||CONFIG.author) + ' — ' : '') +
                   (CONFIG.title||'Kartu HoK: ACE');
  const total = ['hero','talent','equip','effect']
    .reduce((n,k)=>n + DATA[k].filter(c=>!c.hidden).length, 0);
  document.getElementById('count').textContent =
    total + ' kartu: Hero, Talent, Equipment, dan Effect';
  const h = DATA.hero.find(x=>x.name===CONFIG.bannerHero) || DATA.hero[0];
  if(h && h.art){
    const probe = new Image();
    probe.onload = ()=>{
      document.getElementById('bannerArt').style.backgroundImage = 'url("'+h.art+'")';
    };
    probe.src = h.art;
  }
  const nav = document.getElementById('social');
  nav.innerHTML='';
  (CONFIG.links||[]).filter(l=>l.url && l.url.trim()).forEach(l=>{
    const a = document.createElement('a');
    a.href = l.url; a.target='_blank'; a.rel='noopener noreferrer';
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '+
      'aria-hidden="true">'+(ICONS[l.kind]||ICONS.link)+'</svg>';
    a.append(document.createTextNode(l.label||l.kind));
    nav.append(a);
  });
}

function syncStickyOffset(){
  const sh = document.querySelector('.stickyhead');
  if(!sh) return;
  document.documentElement.style.setProperty('--stickyH', sh.getBoundingClientRect().height+'px');
}
window.addEventListener('resize', syncStickyOffset);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(syncStickyOffset);

function renderAll(){ renderTabs(); renderFilters(); renderList(); renderDetail(); syncStickyOffset(); }

document.getElementById('q').addEventListener('input', e=>{
  state.q = e.target.value.trim(); renderList();
});
document.addEventListener('keydown', e=>{
  if(!state.sel) return;
  const tag = (document.activeElement||{}).tagName;
  if(tag==='INPUT'||tag==='TEXTAREA') return;
  if(e.key==='ArrowRight') stepCard(1);
  if(e.key==='ArrowLeft') stepCard(-1);
});
document.getElementById('theme').onclick = ()=>{
  const cur = document.documentElement.getAttribute('data-theme');
  const dark = cur ? cur==='dark'
    : !window.matchMedia('(prefers-color-scheme: light)').matches;
  document.documentElement.setAttribute('data-theme', dark?'light':'dark');
  try{ localStorage.setItem('hok-theme', dark?'light':'dark'); }catch(e){}
};
try{ const t=localStorage.getItem('hok-theme');
  if(t) document.documentElement.setAttribute('data-theme',t); }catch(e){}

const LORDS = JSON.parse(document.getElementById('lords-data').textContent);
let kActive = 0;
let viewMode = 'database';

function showDatabase(){
  viewMode='database';
  document.querySelector('.cols').style.display='';
  document.getElementById('filters').style.display='';
  document.querySelector('.search').style.display='';
  document.getElementById('kontestanPanel').style.display='none';
}
function showKontestan(){
  viewMode='kontestan';
  document.querySelector('.cols').style.display='none';
  document.getElementById('filters').style.display='none';
  document.querySelector('.search').style.display='none';
  document.getElementById('kontestanPanel').style.display='block';
  kRenderRail(); kRenderStage();
}

function kRenderRail(){
  const rail=document.getElementById('kRail');
  rail.innerHTML = LORDS.map((l,i)=>`
    <button role="tab" aria-current="${i===kActive}" onclick="kSetActive(${i})" title="${l.name}">
      <span class="k-ring"><span class="k-av"><img src="${l.avatar}" alt="${l.name}" loading="lazy"></span></span>
      <span class="k-lbl">${l.name}</span>
    </button>`).join('');
}
const K_CORNER = '<svg viewBox="0 0 34 34" fill="none"><path d="M2 20V6a4 4 0 0 1 4-4h14" stroke="currentColor" stroke-width="1.1"/><circle cx="6" cy="6" r="1.6" fill="currentColor"/></svg>';
function kDivider(label){
  return `<div class="k-divider"><span class="ln"></span><h3>${label}</h3><span class="ln"></span></div>`;
}
function kRenderStage(){
  const l = LORDS[kActive];
  const triptych = l.talents.map(t=>`
    <div class="k-plate">
      <div class="k-ptop"><span class="k-icon">${t.catIcon?`<img src="${t.catIcon}" alt="">`:''}</span>
        <span class="k-cat">${t.catName}</span><span>Lv.${t.level}</span></div>
      <h4>${t.cardName}</h4><p>${t.desc}</p>
    </div>`).join('');
  const related = (l.related && l.related.length)
    ? l.related.map((c,idx)=>`<button type="button" class="k-rcard" onclick="kPeekToggle(${idx})" aria-expanded="false">
        <div class="k-thumb">${c.thumb?`<img src="${c.thumb}" alt="${c.name}" loading="lazy">`:''}</div>
        <div class="k-rname">${c.name}</div>
      </button>`).join('')
    : `<div class="k-empty">Belum ada kartu terkait untuk kontestan ini di data yang diambil.</div>`;
  document.getElementById('kStage').innerHTML = `
    <div class="k-stage">
      <div class="k-bg" style="background-image:url('${l.bgImg||''}')"></div>
      <div class="k-scrim"></div>
      <img class="k-char" id="kChar" alt="${l.name}">
      <span class="k-corner tl">${K_CORNER}</span><span class="k-corner tr">${K_CORNER}</span>
      <span class="k-corner bl">${K_CORNER}</span><span class="k-corner br">${K_CORNER}</span>
      <div class="k-inner">
        <div class="k-eyebrow"><span class="k-seal"><img src="${l.avatar}" alt=""></span><span>KONTESTAN</span></div>
        <h2>${l.name}</h2>
      </div>
    </div>
    ${kDivider('Kemampuan')}
    <div class="k-triptych">${triptych}</div>
    ${kDivider('Kartu Terkait')}
    <div class="k-strip" id="kStrip">${related}</div>
    <div class="k-peek hide" id="kPeek"></div>
  `;
  kLoadPortrait(l);
}
let kPeekIdx = -1;
function kPeekToggle(idx){
  const l = LORDS[kActive];
  const c = (l.related||[])[idx];
  const panel = document.getElementById('kPeek');
  const btns = document.querySelectorAll('#kStrip .k-rcard');
  if(!c) return;
  if(kPeekIdx === idx){
    kPeekIdx = -1;
    panel.classList.add('hide'); panel.innerHTML='';
    btns.forEach(b=>{b.classList.remove('active'); b.setAttribute('aria-expanded','false');});
    return;
  }
  kPeekIdx = idx;
  btns.forEach((b,i)=>{
    const on = i===idx;
    b.classList.toggle('active', on);
    b.setAttribute('aria-expanded', on?'true':'false');
  });
  panel.classList.remove('hide');
  panel.innerHTML = `<div class="k-thumb">${c.thumb?`<img src="${c.thumb}" alt="">`:''}</div>
    <div class="k-peek-body"><h4>${c.name}</h4><p>${c.desc || 'Deskripsi kartu ini belum tersedia di data yang diambil.'}</p></div>`;
}
function kSetActive(i){ kActive=i; kPeekIdx=-1; kRenderRail(); kRenderStage(); }


/* ---------- karakter kontestan ----------
   Urutan field gambar karakter dari data kontestan. Kalau gambar yang tampil
   kurang pas, ubah urutannya di sini (field pertama yang berhasil dimuat dipakai). */
const K_PORTRAIT_FIELDS = ['banShenImg','portraitV2','portrait'];
const K_PRELOADED = {};
function kPreload(l){
  if(!l || K_PRELOADED[l.id]) return;
  const u = K_PORTRAIT_FIELDS.map(f=>l[f]).find(Boolean);
  if(u){ const im = new Image(); im.src = u; K_PRELOADED[l.id] = im; }
}
function kLoadPortrait(l){
  const img = document.getElementById('kChar');
  if(!img) return;
  const urls = K_PORTRAIT_FIELDS.map(f=>l[f]).filter(Boolean);
  let i = 0;
  img.decoding = 'async'; img.style.opacity = 0;
  img.onload = ()=>{ img.style.opacity = ''; kPreload(LORDS[kActive+1]); kPreload(LORDS[kActive-1]); };
  img.onerror = ()=>{ i++; if(i<urls.length) img.src = urls[i]; else img.remove(); };
  if(urls.length) img.src = urls[0]; else img.remove();
}

/* ---------- info update patch ----------
   Patch baru: tambahkan objek baru di paling atas array PATCHES.
   act: 'buff' | 'nerf' | 'adjust' | 'new' */
const PATCHES = [{
  short:'24 Sep', label:'24 September 2026',
  note:'Pembaruan kartu Honor of Kings: ACE',
  groups:[
    {label:'Hero', items:[
      {act:'buff', name:'Sun Bin', cn:'孙膑', text:'Damage bom di Lv10 naik.', from:'50+150% Magic Attack', to:'100+175% Magic Attack'},
      {act:'buff', name:'Yao', cn:'曜', text:'Damage dasar Skill naik.', from:'70+120% Physical Attack', to:'100+130% Physical Attack'},
      {act:'buff', name:'Meng Ya', cn:'蒙犽', text:'Durasi cast Skill lebih singkat.', from:'2 detik', to:'1,6 detik'},
      {act:'buff', name:'Marco Polo', cn:'马可波罗', text:'Damage peluru di Lv10 naik.', from:'40+25% Physical Attack', to:'40+30% Physical Attack'},
      {act:'buff', name:'Allain', cn:'亚连', text:'Preparation tidak lagi terbatas pada Hero [Sunset Sea]: Hero dengan Equipment terbanyak dari Faction mana pun kini dapat +2 Level.', from:'Hero [Sunset Sea] dengan Equipment terbanyak', to:'Hero mana pun dengan Equipment terbanyak'},
      {act:'buff', name:'Shen Mengxi', cn:'沈梦溪', text:'Damage Skill di Lv10 naik.', from:'100+150% Magic Attack', to:'125+175% Magic Attack'},
      {act:'buff', name:'Han Xin', cn:'韩信', text:'Tiap efek Preparation atau Engage dari Hero-mu, Level Han Xin naik permanen lebih besar.', from:'+1 Level', to:'+2 Level'}
    ]},
    {label:'Kontestan', items:[
      {act:'buff', name:'Zhaojun · Icy Heart Domain', cn:'冰心领域', text:'Saat Round dimulai, Hero sekutu di field mendapat Level dari total Tier di field.', from:'30%', to:'35%'},
      {act:'adjust', name:'Little Zhuang Fish · Dreamlike Illusion', cn:'如梦似幻', text:'Set kartu impian sekarang dibentuk dari Hero dan Faction di field (minimal 3 Hero).', from:'Berdasarkan susunan Hero di field', to:'Berdasarkan Hero dan Faction di field (min. 3 Hero)'},
      {act:'buff', name:'Director Jiang · Moment of Deification', cn:'封神一瞬', text:'Hero yang dipilih langsung mendapat Level sebesar Tier ×5, selain bonus +1 Level tiap kali Level-nya naik permanen.'}
    ]},
    {label:'Talent', items:[
      {act:'new', name:'Divine Eagle Blacksmith', cn:'神鹰锻匠', text:'Memperoleh 1 Cirrus. Saat Combat dimulai, Cirrus menambahkan 1 Divine Weapon ke Hero [Riverlands] terdekat (maksimal 3 jika Cirrus sudah Awakening).'},
      {act:'nerf', name:'Emergency Action', cn:'紧急行动', text:'Player HP yang didapat berkurang. Equipment Box tetap 1.', from:'15 Player HP', to:'10 Player HP'},
      {act:'new', name:'Overdraft', cn:'透支', text:'Energy dapat dipakai sampai -15. Jika Energy negatif saat Round dimulai, Kartu Hero tidak bisa dimainkan di Round itu.'},
      {act:'new', name:'Wild Iron · Enhanced', cn:'狂铁·强化', text:'Saat Biron memicu efek kartu, dirinya mendapat +10% Attack Speed.'},
      {act:'buff', name:'Cunning Tactics', cn:'兵行诡招', text:'Pengurangan Player HP lebih kecil.', from:'-15 Player HP', to:'-10 Player HP'}
    ]}
  ]
}];
const PM_ACT = {buff:['Buff','var(--jade)'], nerf:['Nerf','var(--f-thr)'],
  adjust:['Penyesuaian','var(--gold)'], new:['Baru','var(--f-sun)']};
let pmP = 0, pmT = 0, pmOpener = null;

function pmRender(){
  const P = PATCHES[pmP];
  document.getElementById('pmTitle').textContent = 'Update patch ' + P.label;
  document.getElementById('pmSub').textContent = P.note || '';
  const pick = document.getElementById('pmPick'); pick.innerHTML='';
  pick.style.display = PATCHES.length>1 ? '' : 'none';
  PATCHES.forEach((p,i)=>{
    const b = el('button','chip',p.short); b.setAttribute('aria-pressed', i===pmP);
    b.onclick = ()=>{ pmP=i; pmT=0; pmRender(); };
    pick.append(b);
  });
  const tabs = document.getElementById('pmTabs'); tabs.innerHTML='';
  P.groups.forEach((g,i)=>{
    const b = el('button','',g.label); b.setAttribute('role','tab');
    b.setAttribute('aria-selected', i===pmT);
    b.append(el('span','n',String(g.items.length)));
    b.onclick = ()=>{ pmT=i; pmRender(); };
    tabs.append(b);
  });
  const body = document.getElementById('pmBody'); body.innerHTML='';
  P.groups[pmT].items.forEach(it=>{
    const a = PM_ACT[it.act] || PM_ACT.adjust;
    const row = el('div','pm-row');
    const tag = el('span','pm-tag',a[0]); tag.style.color = a[1];
    const main = el('div','pm-main');
    const nm = el('div','pm-name'); nm.append(el('b','',it.name));
    if(it.cn) nm.append(el('span','cn',it.cn));
    main.append(nm);
    if(it.text) main.append(el('p','',it.text));
    if(it.from || it.to){
      const d = el('div','pm-diff');
      d.append(el('s','',it.from||'')); d.append(document.createTextNode('  →  ')); d.append(el('b','',it.to||''));
      main.append(d);
    }
    row.append(tag, main); body.append(row);
  });
}
function pmOpen(){
  pmOpener = document.activeElement;
  pmRender();
  document.getElementById('patchModal').hidden = false;
  document.body.style.overflow = 'hidden';
  document.querySelector('#patchModal .pm-x').focus();
}
function pmClose(){
  document.getElementById('patchModal').hidden = true;
  document.body.style.overflow = '';
  if(pmOpener && pmOpener.focus) pmOpener.focus();
}
document.getElementById('patchDate').textContent = PATCHES[0].short;
document.getElementById('patchBtn').onclick = pmOpen;
document.getElementById('patchModal').addEventListener('click', e=>{
  if(e.target.closest('[data-close]')) pmClose();
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && !document.getElementById('patchModal').hidden) pmClose();
});

renderChrome();
renderAll();
