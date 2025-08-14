const $ = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>Array.from(p.querySelectorAll(s));

async function refresh(){
  const q = $('#search').value.trim();
  const {items=[]} = await API.list(q);
  const tbody = $('#tbl tbody'); tbody.innerHTML='';
  for(const w of items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.id}</td>
      <td>${w.reference}</td>
      <td>${w.nom||''}</td>
      <td>${w.marque||''}</td>
      <td>${w.prix?.toFixed? w.prix.toFixed(2): w.prix}</td>
      <td>${w.promotion||0}</td>
      <td>${w.stock_qty||0} <small>(${w.stock_status||''})</small></td>
      <td>${w.status||''}</td>
      <td>
        <button data-edit="${w.id}">✏️</button>
        <button data-del="${w.id}">🗑️</button>
        <button data-plus="${w.id}">+1</button>
        <button data-minus="${w.id}">-1</button>
      </td>`;
    tbody.appendChild(tr);
  }
  tbody.addEventListener('click', async (e)=>{
    const id = e.target.dataset.edit || e.target.dataset.del || e.target.dataset.plus || e.target.dataset.minus;
    if(!id) return;
    if(e.target.dataset.edit){
      const r = await fetch('/api/watches/'+id); const w = await r.json();
      for(const k in w){ const inp = document.querySelector(`[name="${k}"]`); if(inp) inp.value = w[k] ?? ''; }
      document.querySelector('[name="id"]').value = w.id;
    } else if(e.target.dataset.del){
      if(confirm('Supprimer ?')){ await API.remove(id); refresh(); }
    } else if(e.target.dataset.plus){
      await API.adjustStock({ watch_id: +id, delta: +1 }); refresh();
    } else if(e.target.dataset.minus){
      await API.adjustStock({ watch_id: +id, delta: -1 }); refresh();
    }
  }, { once: true });
}

async function boot(){
  $('#btn-login').onclick = async ()=>{
    try{
      const j = await API.login($('#email').value, $('#password').value);
      const me = await API.me(); $('#me').textContent = me ? me.email : '';
      alert('Connecté');
    }catch(e){ alert('Échec connexion'); }
  };
  $('#btn-refresh').onclick = refresh;
  $('#watch-form').onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.prix = +data.prix || 0;
    data.promotion = +data.promotion || 0;
    data.stock_qty = +data.stock_qty || 0;
    data.low_stock_threshold = +data.low_stock_threshold || 0;
    if(data.id){
      await API.update(+data.id, data);
    } else {
      await API.create(data);
    }
    e.target.reset(); refresh();
  };
  $('#reset').onclick = ()=> $('#watch-form').reset();
  refresh();
}
boot();
