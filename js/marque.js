// ===== Marques =====
let brands = []; // {id, name, logo}

// --- Index marques global ---
window.brands = window.brands || [];
window.brandIndex = window.brandIndex || {};

function buildBrandIndex() {
  window.brandIndex = {};
  for (const b of (window.brands || [])) {
    if (b && b.name) window.brandIndex[b.name] = b; // name -> { id, name, logo }
  }
}

function openBrandModal() {
  const m = document.getElementById('brandModal');
  if (!m) return;
  // reset formulaire
  const f = document.getElementById('formBrand');
  if (f) f.reset();
  const prev = document.getElementById('brandLogoPreview');
  if (prev) prev.innerHTML = '';
  m.style.display = 'flex';
}

function closeBrandModal() {
  const m = document.getElementById('brandModal');
  if (m) m.style.display = 'none';
}

// petit util pour sécuriser le nom de fichier (pas d’espaces/accents)
function safeNameBrand(name){
  const base = (name || '').replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'logo';
  const ext = (name.match(/\.[^.]+$/)?.[0] || '.jpg').toLowerCase();
  return `${base}-${Date.now()}${ext}`;
}
function renameBrandFile(file){
  const newName = safeNameBrand(file.name);
  if (newName === file.name) return file;
  return new File([file], newName, { type: file.type || 'application/octet-stream' });
}

// preview logo
document.getElementById('brandLogoInput')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  const box = document.getElementById('brandLogoPreview');
  if (!box) return;
  box.innerHTML = '';
  if (!file) return;
  const img = document.createElement('img');
  img.alt = 'Logo';
  img.src = URL.createObjectURL(file);
  img.onload = () => URL.revokeObjectURL(img.src);
  box.appendChild(img);
});

// submit marque
document.getElementById('formBrand')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.brand_name.value.trim();
  if (!name) { alert("Nom de marque requis."); return; }

  // 1) Upload du logo si fourni
  let logoPath = '';
  const input = document.getElementById('brandLogoInput');
  if (input?.files?.[0]) {
    const logoFile = renameBrandFile(input.files[0]);
    const fd = new FormData();
    fd.append('image1', logoFile); // réutilise upload-images.php
    try {
      const r = await fetch('upload-images.php', { method: 'POST', body: fd });
      const t = await r.text();
      console.log('Upload logo →', r.status, t);
      if (!r.ok) { alert("Échec upload logo."); return; }
      logoPath = 'images/' + logoFile.name;
    } catch (err) {
      console.error(err);
      alert("Erreur réseau pendant l’upload du logo.");
      return;
    }
  }

  // 2) Enregistrer la marque côté back
  // Attendu côté API : action=add_brand, name, logo (optionnel)
  const data = new FormData();
  data.append('action', 'add_brand');
  data.append('name', name);
  data.append('logo', logoPath);

  try {
    const r = await fetch(API_URL, { method: 'POST', body: data });
    const t = await r.text();
    console.log('API add_brand →', r.status, t);
    if (!r.ok) { alert("Échec enregistrement marque (API)."); return; }
  } catch (err) {
    console.error(err);
    alert("Erreur API lors de l’enregistrement de la marque.");
    return;
  }

  closeBrandModal();
  await fetchBrands(); // recharge la liste pour l’autocomplete
  alert('✅ Marque enregistrée.');
});

// charger les marques et remplir le datalist pour l’auto-complétion
async function fetchBrands() {
  try {
    const r = await fetch(API_URL + '?action=list_brands');
    if (!r.ok) throw new Error('HTTP '+r.status);
    brands = await r.json(); // [{id, name, logo}]
  } catch (err) {
    console.warn('Liste des marques indisponible:', err);
    brands = [];
  }
  // peupler le datalist
  const dl = document.getElementById('brandList');
  if (!dl) return;
  dl.innerHTML = '';
  brands.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.name;
    dl.appendChild(opt);
  });
}

// au boot : charge les marques
window.addEventListener('DOMContentLoaded', () => {
  fetchBrands();
});

// exposer pour le bouton
window.openBrandModal = openBrandModal;
window.closeBrandModal = closeBrandModal;



function normalizeBrands(rows){
  return (rows || [])
    .map(b => ({
      id:   b.id ?? b.brand_id ?? null,
      name: b.name ?? b.marque ?? b.brand_name ?? '',
      logo: b.logo ?? b.marque_logo ?? b.brand_logo ?? ''
    }))
    .filter(b => b.name);
}

function populateBrandSelect(selectedValue = ''){
  const sel = document.getElementById('brandSelect');
  if (!sel) return;
  sel.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = !selectedValue;
  placeholder.textContent = brands.length ? '— Choisir une marque —' : '— Aucune marque —';
  sel.appendChild(placeholder);

  brands
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name, 'fr', {sensitivity:'base'}))
    .forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.textContent = b.name;
      if (selectedValue && selectedValue === b.name) opt.selected = true;
      sel.appendChild(opt);
    });

  sel.disabled = brands.length === 0;
}

async function fetchBrands(){
  try{
    const r = await fetch(API_URL + '?action=list_brands');
    if (!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    brands = normalizeBrands(data);
  }catch(e){
    console.warn('Impossible de charger les marques:', e);
    brands = [];
  }
  populateBrandSelect();
}
