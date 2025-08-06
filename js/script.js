let montres = [];
let currentMontreIndex = 0;
let currentImageIndex = 0;

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
        images: [row.image1, row.image2, row.image3, row.image4]
      }));

    renderMontres();
  });

function renderMontres() {
  const container = document.getElementById("montres-container");
  const thumbs = document.getElementById("thumbnail-strip");

  montres.forEach((montre, index) => {
    // Affichage principal
    const div = document.createElement("div");
    div.className = "montre" + (index === 0 ? " active" : "");
    div.id = `montre-${index}`;
    div.innerHTML = `
      <div class="main-display" style="background-image: url('${montre.images[1]}');" onclick="openModal(${index}, 1)">
        <div class="info">
          <h1>${montre.nom}</h1>
          <p>Prix : ${montre.prix} €</p>
          <p>${montre.description}</p>
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

