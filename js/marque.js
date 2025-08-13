// ============ Marques (indépendant) ============
// N'auto-fetch PAS ici. CRUD va appeler fetchBrands().

(function () {
  const API = window.API_URL || 'api.php';

  // État global accessible aux autres scripts
  window.brands = [];
  window.brandIndex = {}; // name -> { id, name, logo }

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

  function populateBrandSelect(selectedValue = '') {
    const sel = document.getElementById('brandSelect');
    if (!sel) return;

    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = !selectedValue;
    placeholder.textContent = window.brands.length ? '— Choisir une marque —' : '— Aucune marque —';
    sel.appendChild(placeholder);

    window.brands
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
      .forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.name;
        opt.textContent = b.name;
        if (selectedValue && selectedValue === b.name) opt.selected = true;
        sel.appendChild(opt);
      });

    sel.disabled = window.brands.length === 0;
  }

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
    populateBrandSelect();
    // si la table existe déjà, on peut rerender
    if (typeof window.displayMontres === 'function') window.displayMontres();
  }

  // --- Modale Marques ---
  function openBrandModal() {
    const m = document.getElementById('brandModal');
    if (!m) return;
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

  // safe filename pour les logos
  function safeNameBrand(name){
    const base = (name || '').replace(/\.[^.]+$/, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .toLowerCase() || 'logo';
    const ext = (name.match(/\.[^.]+$/)?.[0] || '.jpg').toLowerCase();
    return `${base}-${Date.now()}${ext}`;
  }
  function renameBrandFile(file){
    const newName = safeNameBrand(file.name);
    if (newName === file.name) return file;
    return new File([file], newName, { type: file.type || 'application/octet-stream' });
  }

  // Listeners DOM (uniquement pour la modale Marques)
  document.addEventListener('DOMContentLoaded', () => {
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
        img.style.maxHeight = '80px';
        img.style.border = '1px solid #555';
        img.style.borderRadius = '8px';
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        box.appendChild(img);
      });
    }

    const formBrand = document.getElementById('formBrand');
    if (formBrand) {
      formBrand.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = formBrand.brand_name.value.trim();
        if (!name) { alert("Nom de marque requis."); return; }

        // Upload logo si présent
        let logoPath = '';
        const input = document.getElementById('brandLogoInput');
        if (input?.files?.[0]) {
          const logoFile = renameBrandFile(input.files[0]);
          const fd = new FormData();
          fd.append('image1', logoFile);
          try {
            const r = await fetch('upload-images.php', { method: 'POST', body: fd });
            if (!r.ok) { alert("Échec upload logo."); return; }
            logoPath = 'images/' + logoFile.name;
          } catch (err) {
            console.error(err);
            alert("Erreur réseau pendant l’upload du logo.");
            return;
          }
        }

        // API add_brand
        const data = new FormData();
        data.append('action', 'add_brand');
        data.append('name', name);
        data.append('logo', logoPath);

        try {
          const r = await fetch(API, { method: 'POST', body: data });
          if (!r.ok) { alert("Échec enregistrement marque (API)."); return; }
        } catch (err) {
          console.error(err);
          alert("Erreur API lors de l’enregistrement de la marque.");
          return;
        }

        closeBrandModal();
        await fetchBrands();                // recharge
        populateBrandSelect(name);          // sélectionne la nouvelle marque
        const sel = document.getElementById('brandSelect');
        if (sel) sel.value = name;
        alert('✅ Marque enregistrée.');
      });
    }
  });

  // expose global
  window.fetchBrands = fetchBrands;
  window.populateBrandSelect = populateBrandSelect;
  window.openBrandModal = openBrandModal;
  window.closeBrandModal = closeBrandModal;
})();
