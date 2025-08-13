// --- Config : CSV ou données locales ---
const USE_LOCAL_DATA = false;   // false => lit data/montres.csv
const CSV_PATH = 'data/montres.csv';
const PLACEHOLDER_IMG = 'images/placeholder.jpg';

let montres = [];
let currentMontreIndex = 0;
let currentImageIndex = 0;
let currentFilter = 'all';

// Auto-rotation
const AUTO_DELAY = 4000;
let autoChange = true;
let autoTimerId = null;

/* ========= Utils ========= */
function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function hasPromo(m){
  const p = (m.promotion ?? "").toString().trim();
  if (p === "") return false;
  const n = Number(p);
  return Number.isFinite(n) && n > 0;
}
function hasVendu(m){
  return (m.status ?? "").toLowerCase() === "vendu";
}
function hasAchat(m){
  return (m.status ?? "").toLowerCase() === "achat en cours";
}
function brandBlock(m){
  const name = (m.marque || '').trim();
  const logo = (m.marque_logo || '').trim();
  if (logo){
    return `<div class="brand-badge" title="${escapeHtml(name || 'Marque')}">
              <img src="${logo}" alt="${escapeHtml(name || 'Marque')}">
            </div>`;
  }
  if (name){
    return `<div class="brand-badge brand-text">${escapeHtml(name)}</div>`;
  }
  return '';
}
function priceBlock(m){
  const prix = Number(m.prix);
  const promo = Number(m.promotion);
  if (!Number.isFinite(prix) && !Number.isFinite(promo)) return '';
  if (Number.isFinite(promo) && promo > 0 && Number.isFinite(prix)){
    return `<div class="price-tag"><span class="price-old">${prix} €</span><span class="price-new">${promo} €</span></div>`;
  }
  if (Number.isFinite(prix)){
    return `<div class="price-tag">${prix} €</div>`;
  }
  return '';
}

/* ========= Auto-rotation ========= */
function startAutoRotate(){
  stopAutoRotate();
  autoTimerId = setInterval(() => {
    if (autoChange && montres.length > 1) changeMontre(1, { fromAuto: true });
  }, AUTO_DELAY);
}
function stopAutoRotate(){ if (autoTimerId){ clearInterval(autoTimerId); autoTimerId = null; } }
function resetAutoRotate(){ startAutoRotate(); }

/* ========= Navigation produit ========= */
function showMontre(index){
  document.querySelector(`#montre-${currentMontreIndex}`)?.classList.remove('active');
  currentMontreIndex = index;
  document.querySelector(`#montre-${currentMontreIndex}`)?.classList.add('active');
}
function changeMontre(direction, opts = {}){
  const fromAuto = !!opts.fromAuto;
  const list = getFilteredMontres();
  if (!list.length) return;
  let newIndex = (currentMontreIndex + direction + list.length) % list.length;
  showMontre(newIndex);
  if (!fromAuto) resetAutoRotate();
}

/* ========= Modale ========= */
function openModal(montreIndex, imageIndex){
  autoChange = false;
  currentMontreIndex = montreIndex;
  currentImageIndex = imageIndex;
  const list = getFilteredMontres();
  const imgs = list[montreIndex].images.length ? list[montreIndex].images : [PLACEHOLDER_IMG];
  document.getElementById("modalImage").src = imgs[imageIndex];
  document.getElementById("imageModal").style.display = "flex";
}
function closeModal(){
  document.getElementById("imageModal").style.display = "none";
  autoChange = true;
  resetAutoRotate();
}
function nextImage(){
  const list = getFilteredMontres();
  const imgs = list[currentMontreIndex].images.length ? list[currentMontreIndex].images : [PLACEHOLDER_IMG];
  currentImageIndex = (currentImageIndex + 1) % imgs.length;
  document.getElementById("modalImage").src = imgs[currentImageIndex];
}
function prevImage(){
  const list = getFilteredMontres();
  const imgs = list[currentMontreIndex].images.length ? list[currentMontreIndex].images : [PLACEHOLDER_IMG];
  currentImageIndex = (currentImageIndex - 1 + imgs.length) % imgs.length;
  document.getElementById("modalImage").src = imgs[currentImageIndex];
}
window.onclick = function(ev){
  const modal = document.getElementById("imageModal");
  if (ev.target === modal) closeModal();
};

/* ========= Filtre ========= */
function filterMontres(categorie){
  currentFilter = categorie;
  renderMontres();
  resetAutoRotate();
}
function getFilteredMontres(){
  return montres.filter(m => currentFilter === 'all' || m.categorie === currentFilter);
}

/* ========= En savoir plus ========= */
function toggleMore(idx){
  const el = document.getElementById(`more-${idx}`);
  if (!el) return;
  el.hidden = !el.hidden;
}

/* ========= Rendu ========= */
function renderMontres(){
  const container = document.getElementById("montres-container");
  const thumbs = document.getElementById("thumbnail-strip");
  container.style.position = "relative";
  container.innerHTML = '';
  thumbs.innerHTML = '';

  const filtered = getFilteredMontres();
  if (!filtered.length){
    container.innerHTML = `<p style="text-align:center;margin:40px 0;">Aucun produit.</p>`;
    return;
  }

  filtered.forEach((montre, index) => {
    const imgs = montre.images.length ? montre.images : [PLACEHOLDER_IMG];
    const mainIdx = imgs[1] ? 1 : 0;

    const div = document.createElement("div");
    div.className = "montre" + (index === 0 ? " active" : "");
    div.id = `montre-${index}`;

    const ribbons = `
      ${hasPromo(montre) ? `<div class="ribbon"><span>PROMO</span></div>` : ''}
      ${hasAchat(montre) ? `<div class="ribbon-left"><span>Achat en cours</span></div>` : ''}
      ${hasVendu(montre) ? `<div class="ribbon-left"><span>VENDU</span></div>` : ''}
    `;

    const brandHtml = brandBlock(montre);
    const priceHtml = priceBlock(montre);

  div.innerHTML = `
  <div class="main-display" style="background-image:url('${imgs[mainIdx]}');" onclick="openModal(${index}, ${mainIdx})">
    ${ribbons}

    <!-- Infos haut gauche -->
    <div class="info" onclick="event.stopPropagation()">
      <p class="ref"><strong>Réf :</strong> ${escapeHtml(montre.reference || '—')} / <span class="status"> <strong>(ETAT: ${escapeHtml(montre.etat || '')})</span> </strong>  </p> 
      <h1 class="prod-name">${escapeHtml(montre.nom || '—')}</h1>
      <p class="short_desc">${escapeHtml(montre.short_description || '—')}</p>
      <button class="btn-more" onclick="toggleMore(${index}); event.stopPropagation();">En savoir plus</button>
    </div> 

    <!-- Coin bas gauche : Marque -->
    <div class="corner-bottom-left" onclick="event.stopPropagation()">
      ${brandHtml}
    </div>

    <!-- Coin bas droite : Prix -->
    <div class="corner-bottom-right" onclick="event.stopPropagation()">
      ${montre.prix_conseille ? `<span class="price-conseille">Prix conseillé : ${escapeHtml(montre.prix_conseille)} €</span>` : ''}
      ${priceHtml}
    </div>

    <!-- Panneau “en savoir plus” (DANS main-display) -->
    <div class="more-panel" id="more-${index}" hidden onclick="event.stopPropagation()">
      <div class="more-panel__inner">
        <div class="desc-html"></div>
        <div class="meta">
          <p><strong>État :</strong> ${escapeHtml(montre.etat || '—')}</p>
          <p><strong>Status :</strong> ${escapeHtml(montre.status || '—')}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Miniatures -->
  <div class="gallery">
    ${imgs.map((src, i) => i === mainIdx ? '' : `<img src="${src}" alt="" onclick="openModal(${index}, ${i})">`).join('')}
  </div>
`;


    container.appendChild(div);

    // Sanitize + injecte le HTML CKEditor
const rawDesc = montre.description || '';
const safeDesc = DOMPurify.sanitize(rawDesc, {
  ALLOWED_TAGS: ['p','h1','h2','h3','strong','em','u','span','div','br',
                 'ul','ol','li','a','table','thead','tbody','tr','th','td','img'],
  ALLOWED_ATTR: ['href','target','rel','style','colspan','rowspan','src','alt']
});
div.querySelector('.desc-html').innerHTML = safeDesc || '—';


    // Miniature droite
    const thumb = document.createElement("div");
    thumb.className = "thumbnail";
    thumb.innerHTML = `<img src="${imgs[mainIdx]}" alt="${escapeHtml(montre.nom || '')}">`;
    thumb.onclick = () => { showMontre(index); resetAutoRotate(); };
    thumbs.appendChild(thumb);
  });

  // au premier rendu / rerendu, repart l’auto
  startAutoRotate();
}

/* ========= Chargement ========= */
function loadFromCSV(){
  fetch(CSV_PATH)
    .then(r => r.text())
    .then(csvText => {
      const data = Papa.parse(csvText, { header: true }).data;

      montres = data.map((row, index) => {
        const images = [row.image2, row.image1, row.image3, row.image4].filter(Boolean);
        return {
          id: index,
          nom: row.nom,
          marque: row.marque || '',
          marque_logo: row.marque_logo || '',
          prix: row.prix,
          promotion: row.promotion,
          short_description: row.short_description || '',
          description: row.description,
          reference: row.reference || '',
          etat: row.etat || '',
          status: row.status || '',
          categorie: row.categorie || '',
          prix_conseille: row.prix_conseille || '',
          images
        };
      });

      renderMontres();
    })
    .catch(err => {
      console.error(err);
      montres = [];
      renderMontres();
    });
}

document.addEventListener('DOMContentLoaded', () => {
  if (USE_LOCAL_DATA){
    // montres = [ ... ] // si tu veux tester en local sans CSV
    renderMontres();
  } else {
    loadFromCSV();
  }
});

/* ========= Expose global (HTML inline) ========= */
window.filterMontres = filterMontres;
window.changeMontre  = changeMontre;
window.openModal     = openModal;
window.closeModal    = closeModal;
window.nextImage     = nextImage;
window.prevImage     = prevImage;
window.toggleMore    = toggleMore;
