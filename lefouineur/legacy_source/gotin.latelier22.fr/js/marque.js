// ============ Marques : liste, ajout, édition, suppression ============

(function () {
  const API = window.API_URL || 'api.php';

  // État global accessible ailleurs (crud.js)
  window.brands = [];
  window.brandIndex = {}; // name -> { id, name, logo }

  // ---------- Utils ----------
  function normalizeBrands(rows) {
    return (rows || [])
      .map(b => ({
        id:   b.id ?? b.brand_id ?? null,
        name: (b.name ?? b.marque ?? b.brand_name ?? '').trim(),
        logo: (b.logo ?? b.marque_logo ?? b.brand_logo ?? '').trim(),
      }))
      .filter(b => b.name);
  }
  function buildBrandIndex() {
    window.brandIndex = {};
    for (const b of (window.brands || [])) {
      if (b && b.name) window.brandIndex[b.name] = b;
    }
  }
  function safeName(name){
    return (name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'logo';
  }
  function renameBrandFile(file){
    const base = safeName(file.name.replace(/\.[^.]+$/, ''));
    const ext = (file.name.match(/\.[^.]+$/)?.[0] || '.jpg').toLowerCase();
    const out = `${base}-${Date.now()}${ext}`;
    if (out === file.name) return file;
    return new File([file], out, { type: file.type || 'application/octet-stream' });
  }

  // ---------- UI helpers ----------
  function openBrandModal() {
    const m = document.getElementById('brandModal');
    if (!m) return;
    m.style.display = 'flex';
    // charge/rafraîchit la liste à l’ouverture
    fetchBrands();
  }
  function closeBrandModal() {
    const m = document.getElementById('brandModal');
    if (m) m.style.display = 'none';
  }
  function resetBrandForm() {
    const f = document.getElementById('formBrand');
    if (f) {
      f.reset();
      f.brand_id.value = '';
    }
    const prev = document.getElementById('brandLogoPreview');
    if (prev) prev.innerHTML = '';
  }
  function fillBrandForm(brand) {
    const f = document.getElementById('formBrand');
    if (!f) return;
    f.brand_id.value = brand.id || '';
    f.brand_name.value = brand.name || '';
    const prev = document.getElementById('brandLogoPreview');
    if (prev) {
      prev.innerHTML = '';
      if (brand.logo) {
        const img = document.createElement('img');
        img.src = brand.logo;
        img.alt = 'Logo';
        img.style.maxHeight = '80px';
        img.style.border = '1px solid #ccc';
        img.style.borderRadius = '8px';
        prev.appendChild(img);
      }
    }
    // on ne remplit pas l'input file (sécurité navigateur)
    const file = document.getElementById('brandLogoInput');
    if (file) file.value = '';
  }

  // ---------- Rendu liste ----------
  function renderBrandTable() {
    const tbody = document.getElementById('brandTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    window.brands
      .slice()
      .sort((a,b) => a.name.localeCompare(b.name, 'fr', {sensitivity:'base'}))
      .forEach(b => {
        const tr = document.createElement('tr');

        const tdLogo = document.createElement('td');
        tdLogo.style.padding = '6px';
        if (b.logo) {
          const img = document.createElement('img');
          img.src = b.logo;
          img.alt = b.name;
          img.style.width = '42px';
          img.style.height = '42px';
          img.style.objectFit = 'contain';
          img.style.border = '1px solid #ddd';
          img.style.borderRadius = '6px';
          img.style.background = '#fff';
          tdLogo.appendChild(img);
        } else {
          tdLogo.textContent = '—';
        }

        const tdName = document.createElement('td');
        tdName.style.padding = '6px';
        tdName.textContent = b.name;

        const tdAct = document.createElement('td');
        tdAct.style.padding = '6px';
        const btnE = document.createElement('button');
        btnE.textContent = '📝 Éditer';
        btnE.style.marginRight = '6px';
        btnE.dataset.action = 'edit';
        btnE.dataset.id = b.id;
        const btnD = document.createElement('button');
        btnD.textContent = '🗑️ Supprimer';
        btnD.dataset.action = 'delete';
        btnD.dataset.id = b.id;

        tdAct.append(btnE, btnD);
        tr.append(tdLogo, tdName, tdAct);
        tbody.appendChild(tr);
      });
  }

  // ---------- API ----------
  async function fetchBrands() {
    try {
      const r = await fetch(API + '?action=list_brands');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      window.brands = normalizeBrands(data);
    } catch (e) {
      console.warn('Impossible de charger les marques:', e);
      window.brands = [];
    }
    buildBrandIndex();
    renderBrandTable();
    // remet à jour le <select> du form produit
    if (typeof window.populateBrandSelect === 'function') window.populateBrandSelect();
    // si la table produits est visible, on réaffiche (logo en colonne)
    if (typeof window.displayMontres === 'function') window.displayMontres();
  }

  async function uploadLogoIfAny() {
    const input = document.getElementById('brandLogoInput');
    if (!input?.files?.[0]) return ''; // pas de nouveau logo
    const logoFile = renameBrandFile(input.files[0]);
    const fd = new FormData();
    fd.append('image1', logoFile);
    const r = await fetch('upload-images.php', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('Upload logo HTTP ' + r.status);
    return 'images/' + logoFile.name;
  }

  async function addBrand(name) {
    const logoPath = await uploadLogoIfAny(); // peut être ''
    const data = new FormData();
    data.append('action', 'add_brand');
    data.append('name', name);
    data.append('logo', logoPath);
    const r = await fetch(API, { method: 'POST', body: data });
    if (!r.ok) throw new Error('API add_brand HTTP ' + r.status);
  }

// ----- remplace TOUTE ta fonction editBrand par celle-ci -----
async function editBrand(id, name) {
  // 1) si un nouveau logo a été choisi, on l’upload d’abord
  let logoPath = '';
  const input = document.getElementById('brandLogoInput');
  if (input?.files?.[0]) {
    const logoFile = renameBrandFile(input.files[0]);
    const fd = new FormData();
    fd.append('image1', logoFile);
    const rUp = await fetch('upload-images.php', { method: 'POST', body: fd });
    if (!rUp.ok) throw new Error('Upload logo HTTP ' + rUp.status);
    logoPath = 'images/' + logoFile.name;
  }

  // 2) on envoie la mise à jour au back
  //    (ton api.php supporte edit_brand ; on prévoit un fallback update_brand)
  const data = new FormData();
  data.append('action', 'edit_brand');
  data.append('id', id);
  data.append('name', name);
  if (logoPath) data.append('logo', logoPath);

  let r = await fetch(API, { method: 'POST', body: data });
  if (!r.ok) {
    // fallback si ton back attend "update_brand"
    data.set('action', 'update_brand');
    r = await fetch(API, { method: 'POST', body: data });
    if (!r.ok) throw new Error('API edit/update_brand HTTP ' + r.status);
  }
}

  async function deleteBrand(id) {
    const fd = new FormData();
    fd.append('action', 'delete_brand');
    fd.append('id', id);
    const r = await fetch(API, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('API delete_brand HTTP ' + r.status);
  }

  // ---------- Events ----------
  document.addEventListener('DOMContentLoaded', () => {
    // preview logo
    const logoInput = document.getElementById('brandLogoInput');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const box = document.getElementById('brandLogoPreview');
        if (!box) return;
        box.innerHTML = '';
        if (!file) return;
        const img = document.createElement('img');
        img.alt = 'Logo';
        img.src = URL.createObjectURL(file);
        img.style.maxHeight = '80px';
        img.style.border = '1px solid #ccc';
        img.style.borderRadius = '8px';
        img.onload = () => URL.revokeObjectURL(img.src);
        box.appendChild(img);
      });
    }

    // soumission form (add / edit)
    const form = document.getElementById('formBrand');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id   = form.brand_id.value.trim();
        const name = form.brand_name.value.trim();
        if (!name) { alert('Nom de marque requis.'); return; }

        try {
          if (id) {
            await editBrand(id, name);
          } else {
            await addBrand(name);
          }
          await fetchBrands();
          if (!id) {
            // si création, on sélectionne la marque dans le <select> produit le cas échéant
            if (typeof window.populateBrandSelect === 'function') window.populateBrandSelect(name);
            const sel = document.getElementById('brandSelect');
            if (sel) sel.value = name;
          }
          alert('✅ Marque enregistrée.');
          resetBrandForm();
        } catch (err) {
          console.error(err);
          alert("❌ Erreur lors de l'enregistrement de la marque.");
        }
      });
    }

    // actions Edit / Delete via délégation
    const table = document.getElementById('brandTable');
    if (table) {
      table.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (!action || !id) return;

        const brand = window.brands.find(b => String(b.id) === String(id));
        if (!brand) return;

        if (action === 'edit') {
          fillBrandForm(brand);
        } else if (action === 'delete') {
          if (!confirm(`Supprimer la marque “${brand.name}” ?`)) return;
          try {
            await deleteBrand(id);
            await fetchBrands();
            alert('🗑️ Marque supprimée.');
            // Si la marque était sélectionnée dans le form produit, on nettoie
            const sel = document.getElementById('brandSelect');
            if (sel && sel.value === brand.name) sel.value = '';
          } catch (err) {
            console.error(err);
            alert("❌ Suppression impossible (peut-être utilisée par des produits ?)");
          }
        }
      });
    }
  });

// Remplit le <select id="brandSelect"> avec window.brands
window.populateBrandSelect = function populateBrandSelect(selectedValue = '') {
  const sel = document.getElementById('brandSelect');
  if (!sel) return;

  // on garde la valeur actuelle au cas où
  const current = sel.value;

  sel.innerHTML = '';

  // placeholder
  const ph = document.createElement('option');
  ph.value = '';
  ph.disabled = true;
  ph.selected = !selectedValue;
  ph.textContent = (Array.isArray(window.brands) && window.brands.length)
    ? '— Choisir une marque —'
    : '— Aucune marque —';
  sel.appendChild(ph);

  // options triées
  (window.brands || [])
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });

  // réactive/désactive le select
  sel.disabled = !(window.brands && window.brands.length);

  // sélection
  if (selectedValue) {
    sel.value = selectedValue;
  } else if (current && [...sel.options].some(o => o.value === current)) {
    sel.value = current;
  } else {
    sel.value = '';
  }
};


  // expose global pour CRUD
  window.fetchBrands = fetchBrands;
  window.openBrandModal = openBrandModal;
  window.closeBrandModal = closeBrandModal;
  window.resetBrandForm = resetBrandForm;
})();
