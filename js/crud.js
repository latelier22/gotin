
const API_URL = "api.php";
let currentCategory = "All";
let montres = [];
let currentImages = [];
let currentIndex = 0;
let editing = false;

function showSpinner() { document.getElementById("spinner").style.display = "flex"; }
function hideSpinner() { document.getElementById("spinner").style.display = "none"; }

async function fetchMontres() {
    showSpinner();
    const res = await fetch(API_URL + "?action=list");
    montres = await res.json();
    hideSpinner();
    displayMontres();
}

function displayMontres() {
    const tbody = document.getElementById("montreTable");
    tbody.innerHTML = "";

    const filtered = currentCategory === "All" ? montres : montres.filter(m => m.categorie === currentCategory);

    filtered.forEach((m, index) => {
        const imgs = [m.image1, m.image2, m.image3, m.image4].filter(Boolean); // évite les vides
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.reference || ""}</td>
          <td>${m.nom || ""}</td>
          <td>${m.prix ? (m.promotion ? `<s>${m.prix} €</s>` : m.prix + " €") : ""}</td>
          <td>${m.promotion ? m.promotion + " €" : ""}</td>
          <td class="col-description"><div class="desc-content">${m.description || ""}</div></td>
          <td>
            <div class="thumbs">
              ${imgs.map((src, i) => `<img src="${src}" alt="" onclick="openModal(${JSON.stringify(imgs)}, ${i})">`).join('')}
            </div>
          </td>
          <td>
            <button title="Éditer" onclick="openEditModal(${index})">📝</button>
            <button title="Supprimer" onclick="deleteMontre(${m.id})">🗑️</button>
          </td>
          <td>${m.categorie || ""}</td>
          <td>${m.etat || ""}</td>
          <td>${m.status || ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterCategory(cat) { currentCategory = cat; displayMontres(); }

/* Slider images */
function openModal(images, start) {
    currentImages = images; currentIndex = start;
    document.getElementById("modal-image").src = images[start];
    document.getElementById("modal").style.display = "flex";
}
function closeModal() { document.getElementById("modal").style.display = "none"; }
function prevImage() {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    document.getElementById("modal-image").src = currentImages[currentIndex];
}
function nextImage() {
    currentIndex = (currentIndex + 1) % currentImages.length;
    document.getElementById("modal-image").src = currentImages[currentIndex];
}

/* Formulaire */
function openAddModal() {
    editing = false;
    const form = document.getElementById("formMontre");
    form.reset(); form.id.value = "";
    document.getElementById("formModal").style.display = "flex";
}
function openEditModal(index) {
    editing = true;
    const m = montres[index];
    const form = document.getElementById("formMontre");
    form.id.value = m.id;
    form.reference.value = m.reference || "";
    form.nom.value = m.nom || "";
    form.prix.value = m.prix || "";
    form.promotion.value = m.promotion || "";
    form.description.value = m.description || "";
    form.categorie.value = m.categorie || "Montres";
    form.etat.value = m.etat || "Neuf";
    form.status.value = m.status || "disponible";
    document.getElementById("formModal").style.display = "flex";
}
function closeModalForm() { document.getElementById("formModal").style.display = "none"; }

async function deleteMontre(id) {
    if (!confirm("Confirmer suppression ?")) return;
    const fd = new FormData();
    fd.append("action", "delete");
    fd.append("id", id);
    showSpinner();
    await fetch(API_URL, { method: "POST", body: fd });
    hideSpinner();
    fetchMontres();
}

document.getElementById("formMontre").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const dataForm = new FormData(form);
    const imageForm = new FormData();
    let imagePaths = [];

    // Récupère les fichiers sélectionnés
    const files = form.images.files;

    // Si des nouvelles images ont été choisies → remplacer
    if (files.length > 0) {
        for (let i = 0; i < files.length && i < 4; i++) {
            imageForm.append(`image${i + 1}`, files[i]);
            imagePaths.push("images/" + files[i].name);
        }
        // Complète à 4 slots si moins d'images
        while (imagePaths.length < 4) {
            imagePaths.push("");
        }
    } else {
        // Pas de nouvelles images → garder celles existantes si édition
        if (editing) {
            const existing = montres.find(m => m.id == form.id.value) || {};
            imagePaths = [existing.image1 || "", existing.image2 || "", existing.image3 || "", existing.image4 || ""];
        } else {
            imagePaths = ["", "", "", ""];
        }
    }

    // Upload si nouvelles images
    if (files.length > 0) {
        await fetch("upload-images.php", { method: "POST", body: imageForm });
    }

    // Ajoute au formulaire final
    dataForm.append("image1", imagePaths[0]);
    dataForm.append("image2", imagePaths[1]);
    dataForm.append("image3", imagePaths[2]);
    dataForm.append("image4", imagePaths[3]);

    dataForm.append("etat", form.etat.value);
    dataForm.append("status", form.status.value);
    dataForm.append("action", editing ? "edit" : "add");
    dataForm.append("promotion", form.promotion.value ? parseFloat(form.promotion.value) : "");


    showSpinner();
    await fetch(API_URL, { method: "POST", body: dataForm });
    hideSpinner();

    closeModalForm();
    fetchMontres();
});

/* Exports */
async function downloadZip() {
    const zip = new JSZip();
    const files = [
        { path: 'data/montres.csv', name: 'montres.csv' },
        { path: 'index.html', name: 'index.html' }
    ];
    for (const file of files) {
        const response = await fetch(file.path);
        if (!response.ok) { alert(`Erreur de chargement : ${file.path}`); return; }
        const content = await response.text();
        zip.file(file.name, content);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'fichiers_montres.zip';
    a.click();
}

function downloadProduitsCSV() {
    if (montres.length === 0) { alert("Aucune donnée"); return; }
    const headers = ["id", "reference", "nom", "prix", "promotion", "description", "image1", "image2", "image3", "image4", "categorie", "etat", "status"];

    const rows = montres.map((m, i) => headers.map(h => {
        const v = h === "id" ? (m.id ?? i) : (m[h] ?? "");
        const s = typeof v === "string" ? v : (typeof v === "number" ? String(v) : JSON.stringify(v));
        return `"${s.replace(/"/g, '""')}"`;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "produits.csv";
    a.click();
}

function sendSQLiteDataToServer() {
    if (montres.length === 0) { alert("Aucune donnée à envoyer !"); return; }
    const headers = ["id", "reference", "nom", "prix", "promotion", "description", "image1", "image2", "image3", "image4", "categorie", "etat", "status"];

    const rows = montres.map((m, i) => headers.map(h => {
        const v = h === "id" ? i : (m[h] || "");
        const s = typeof v === "string" ? v : (typeof v === "number" ? String(v) : JSON.stringify(v));
        return `"${s.replace(/"/g, '""')}"`;
    }).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const formData = new FormData();
    formData.append("csvFile", blob, "montres.csv");
    showSpinner();
    fetch("upload.php", { method: "POST", body: formData })
        .then(r => r.text())
        .then(msg => { hideSpinner(); alert("✅ CSV mis à jour sur le serveur :\n" + msg); })
        .catch(err => { hideSpinner(); alert("❌ Erreur : " + err.message); });
}

window.onload = fetchMontres;


