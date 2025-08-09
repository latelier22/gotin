
const USE_LOCAL_DATA = false; // mettre false pour utiliser le CSV

if (!USE_LOCAL_DATA) {
  let montres = [];
  // Exemple de données locales
  }
let currentMontreIndex = 0;
let currentImageIndex = 0;

let currentFilter = 'all';

const AUTO_DELAY = 4000;
let autoChange = true;        // tu as déjà cette variable
let autoTimerId = null;

// setInterval(() => {
//   if (autoChange && montres.length > 1) {
//     changeMontre(1);
//   }
// }, 4000); // 4000 ms = 4 secondes


function startAutoRotate() {
  stopAutoRotate();
  autoTimerId = setInterval(() => {
    if (autoChange && montres.length > 1) {
      changeMontre(1, { fromAuto: true });
    }
  }, AUTO_DELAY);
}

function stopAutoRotate() {
  if (autoTimerId) {
    clearInterval(autoTimerId);
    autoTimerId = null;
  }
}

function resetAutoRotate() {
  startAutoRotate();
}

function changeMontre(direction, opts = {}) {
  const fromAuto = !!opts.fromAuto;
  let newIndex = (currentMontreIndex + direction + montres.length) % montres.length;
  showMontre(newIndex);
  if (!fromAuto) resetAutoRotate(); // manuel => on redémarre le compte à rebours
}




function showMontre(index) {
  document.querySelector(`#montre-${currentMontreIndex}`)?.classList.remove('active');
  currentMontreIndex = index;
  document.querySelector(`#montre-${currentMontreIndex}`)?.classList.add('active');
}

function changeMontre(direction) {
  let newIndex = (currentMontreIndex + direction + montres.length) % montres.length;
  showMontre(newIndex);
}

function openModal(montreIndex, imageIndex) {
  autoChange = false; 
  currentMontreIndex = montreIndex;
  currentImageIndex = imageIndex;
  document.getElementById("modalImage").src = montres[montreIndex].images[imageIndex];
  document.getElementById("imageModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("imageModal").style.display = "none";
  autoChange = true;             // on relance l’auto
  resetAutoRotate();
}

function nextImage() {
  const imgs = montres[currentMontreIndex].images.length
    ? montres[currentMontreIndex].images
    : ['images/placeholder.jpg'];

  currentImageIndex = (currentImageIndex + 1) % imgs.length;
  document.getElementById("modalImage").src = imgs[currentImageIndex];
}

function prevImage() {
  const imgs = montres[currentMontreIndex].images.length
    ? montres[currentMontreIndex].images
    : ['images/placeholder.jpg'];

  currentImageIndex = (currentImageIndex - 1 + imgs.length) % imgs.length;
  document.getElementById("modalImage").src = imgs[currentImageIndex];
}


// Fermer la modale si clic dehors
window.onclick = function(event) {
  const modal = document.getElementById("imageModal");
  if (event.target === modal) closeModal();
};

if (USE_LOCAL_DATA) {
  renderMontres(); // utilise la variable `montres` déjà définie dans data.js
} else {
  // Charger le CSV et générer le HTML
  fetch('data/montres.csv')
  .then(response => response.text())
  .then(csvText => {
    const data = Papa.parse(csvText, { header: true }).data;

    montres = data
      // on accepte les produits même si 0 image (on mettra un placeholder)
      .map((row, index) => {
        const images = [row.image1, row.image2, row.image3, row.image4].filter(Boolean);
        return {
          id: index,
          nom: row.nom,
          prix: row.prix,
          promotion: row.promotion,
          description: row.description,
          reference: row.reference || '',
          etat: row.etat || '',
          status: row.status || '',
          categorie: row.categorie || '',
          images // 0..4 images
        };
      })
      // si tu veux masquer les produits SANS image, dé-commente la ligne ci-dessous:
      // .filter(m => m.images.length > 0)
      ;

    renderMontres();
  });

}

function renderMontres() {
  const container = document.getElementById("montres-container");
  container.style.position = "relative";

  const thumbs = document.getElementById("thumbnail-strip");
  container.innerHTML = '';
  thumbs.innerHTML = '';

  const filtered = montres.filter(m => currentFilter === 'all' || m.categorie === currentFilter);

  filtered.forEach((montre, index) => {
    const imgs = montre.images.length ? montre.images : ['images/placeholder.jpg'];
    const mainIdx = imgs[1] ? 1 : 0; // si on a ≥2 images on met la 2e en fond, sinon la 1re

    // Affichage principal
    const div = document.createElement("div");
    div.className = "montre" + (index === 0 ? " active" : "");
    div.id = `montre-${index}`;
    div.innerHTML = `
      <div class="main-display" style="background-image: url('${imgs[mainIdx]}');" onclick="openModal(${index}, ${mainIdx})">
        ${hasPromo(montre) ? `<div class="ribbon"><span>PROMO</span></div>` : ''}
        ${hasAchat(montre) ? `<div class="ribbon-left"><span>Achat en cours</span></div>` : ''}
        ${hasVendu(montre) ? `<div class="ribbon-left"><span>VENDU</span></div>` : ''}
        <div class="info">
          <h1>${montre.nom || '—'}</h1>
          <p><strong>Référence :</strong> ${montre.reference || '—'}</p>
          <p><strong>Prix :</strong> ${priceHTML(montre)}</p>
          <p><strong>Description :</strong> ${montre.description || '—'}</p>
          <p><strong>État :</strong> ${montre.etat || '—'}</p>
          <p><strong>Status :</strong> ${montre.status || '—'}</p>
        </div>
      </div>
      <div class="gallery">
        ${imgs
          .map((src, i) => i === mainIdx ? '' : `<img src="${src}" onclick="openModal(${index}, ${i})">`)
          .join('')}
      </div>
    `;
    container.appendChild(div);

    // Miniature de droite
    const thumb = document.createElement("div");
    thumb.className = "thumbnail";
    thumb.innerHTML = `<img src="${imgs[mainIdx]}" alt="${montre.nom || ''}">`;
    thumb.onclick = () => { showMontre(index); resetAutoRotate(); };

    thumbs.appendChild(thumb);
  });
  startAutoRotate();
}


function filterMontres(categorie) {
  currentFilter = categorie;
  renderMontres();
  resetAutoRotate();
}








function hasPromo(m) {
  // true si promotion est un nombre > 0
  const p = (m.promotion ?? "").toString().trim();
  if (p === "") return false;
  const n = Number(p);
  return Number.isFinite(n) && n > 0;
}
function hasVendu(m) {
  // true si promotion est un nombre > 0
  return (m.status ?? "").toLowerCase() === "vendu";
  
}
function hasAchat(m) {
  // true si promotion est un nombre > 0
  return (m.status ?? "").toLowerCase() === "achat en cours";
  
}

function priceHTML(m) {
  const prix = Number(m.prix);
  const promo = Number(m.promotion);
  if (hasPromo(m) && Number.isFinite(prix)) {
    // prix barré + promo en gras
    return `<span class="price-line"><span class="price-old">${prix} €</span><span class="price-new">${promo} €</span></span>`;
  }
  // pas de promo : juste le prix si dispo
  return m.prix ? `<span class="price-line">${m.prix} €</span>` : "";
}


