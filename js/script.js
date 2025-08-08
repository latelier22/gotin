
const USE_LOCAL_DATA = false; // mettre false pour utiliser le CSV

if (!USE_LOCAL_DATA) {
  let montres = [];
  // Exemple de données locales
  }
let currentMontreIndex = 0;
let currentImageIndex = 0;

let currentFilter = 'all';


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
  currentMontreIndex = montreIndex;
  currentImageIndex = imageIndex;
  document.getElementById("modalImage").src = montres[montreIndex].images[imageIndex];
  document.getElementById("imageModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("imageModal").style.display = "none";
}

function nextImage() {
  currentImageIndex = (currentImageIndex + 1) % 4;
  document.getElementById("modalImage").src = montres[currentMontreIndex].images[currentImageIndex];
}

function prevImage() {
  currentImageIndex = (currentImageIndex - 1 + 4) % 4;
  document.getElementById("modalImage").src = montres[currentMontreIndex].images[currentImageIndex];
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
  .filter(row => row.image1 && row.image2 && row.image3 && row.image4)
  .map((row, index) => ({
    id: index,
    nom: row.nom,
    prix: row.prix,
    description: row.description,
    reference: row.reference || '',
    etat: row.etat || '',
    status: row.status || '',
    categorie: row.categorie || '',
    images: [row.image1, row.image2, row.image3, row.image4]
  }));


      renderMontres();
    });
}


 
function renderMontres() {
  const container = document.getElementById("montres-container");
  container.style.position = "relative";

  const thumbs = document.getElementById("thumbnail-strip");
  container.innerHTML = '';
  thumbs.innerHTML = '';

  montres
  .filter(montre => currentFilter === 'all' || montre.categorie === currentFilter)
  .forEach((montre, index) => {
    // Affichage principal
    const div = document.createElement("div");
    div.className = "montre" + (index === 0 ? " active" : "");
    div.id = `montre-${index}`;
    div.innerHTML = `
      <div class="main-display" style="background-image: url('${montre.images[1]}');" onclick="openModal(${index}, 1)">
       <div class="info">
      <h1>${montre.nom}</h1>
      <p><strong>Référence :</strong> ${montre.reference || '—'}</p>
      <p><strong>Prix :</strong> ${montre.prix} €</p>
      <p><strong>Description :</strong> ${montre.description}</p>
      <p><strong>État :</strong> ${montre.etat || '—'}</p>
      <p><strong>Status :</strong> ${montre.status || '—'}</p>
    </div>
      </div>
      <div class="gallery">
        <img src="${montre.images[0]}" onclick="openModal(${index}, 0)">
        <img src="${montre.images[2]}" onclick="openModal(${index}, 2)">
        <img src="${montre.images[3]}" onclick="openModal(${index}, 3)">
      </div>
    `;
    container.appendChild(div);

    // Miniature
    const thumb = document.createElement("div");
    thumb.className = "thumbnail";
    thumb.innerHTML = `<img src="${montre.images[1]}" alt="${montre.nom}">`;
    thumb.onclick = () => showMontre(index);
    thumbs.appendChild(thumb);
  });
}

function filterMontres(categorie) {
  currentFilter = categorie;
  renderMontres();
}

// Animation automatique : changement de montre toutes les 2 secondes
let autoChange = true;

setInterval(() => {
  if (autoChange && montres.length > 1) {
    changeMontre(1);
  }
}, 4000); // 4000 ms = 4 secondes


