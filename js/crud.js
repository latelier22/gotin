// =========================
// CRUD Montres - JS complet
// =========================

const API_URL = "api.php";

// État global
let currentCategory = "All";
let montres = [];
let editing = false;

// Slider (lecture seule)
let currentImages = [];
let currentIndex = 0;

// Edition d'images par slot (4 places)
// slot: { src: string|null, file: File|null, deleted: boolean }
let editSlots = [
  { src: null, file: null, deleted: false },
  { src: null, file: null, deleted: false },
  { src: null, file: null, deleted: false },
  { src: null, file: null, deleted: false },
];
let currentEditSlot = -1; // 0..3 pour mini-modale

// --------- Helpers DOM ----------
const $  = (s) => document.querySelector(s);
const $id = (id) => document.getElementById(id);

function showSpinner(){ $id("spinner")?.style && ($id("spinner").style.display="flex"); }
function hideSpinner(){ $id("spinner")?.style && ($id("spinner").style.display="none"); }

// --------- Utils fichiers (safe name + compression) ----------

function slugify(str){
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,60);
}

function randomId(n=6){
  const chars='abcdefghijklmnopqrstuvwxyz0123456789';
  let out=''; for(let i=0;i<n;i++) out+=chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function getExtByMime(mime){
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  // fallback jpeg (meilleur pour compresser)
  return '.jpg';
}

async function loadBitmapOrImage(file){
  if ('createImageBitmap' in window){
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  }
  return await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compresse si > targetMB ou dimensions > maxW/H.
 * Retourne un File (JPEG par défaut) avec un nom safe et unique.
 */
async function prepareFile(originalFile, {
  maxW = 1600,
  maxH = 1600,
  targetMB = 2,
  quality = 0.85,
} = {}){
  const baseName = slugify(originalFile.name.replace(/\.[^.]+$/, '')) || 'img';
  const needsResizeOrCompress = (originalFile.size/1e6) > targetMB;

  // On regarde aussi les dimensions pour décider
  let bmp; 
  try { bmp = await loadBitmapOrImage(originalFile); } catch { bmp = null; }

  if (!bmp){
    // Si on n'arrive pas à lire l'image, on renvoie tel quel mais avec un nom safe
    const ext = getExtByMime(originalFile.type);
    const safeName = `${baseName}-${Date.now()}-${randomId()}${ext}`;
    return new File([originalFile], safeName, { type: originalFile.type || 'application/octet-stream' });
  }

  const { width: w, height: h } = bmp;
  const needDownscale = (w > maxW) || (h > maxH);

  if (!needsResizeOrCompress && !needDownscale){
    // Juste renommer en nom safe (évite espaces/accents)
    const ext = getExtByMime(originalFile.type);
    const safeName = `${baseName}-${Date.now()}-${randomId()}${ext}`;
    return new File([originalFile], safeName, { type: originalFile.type || 'image/jpeg' });
  }

  // Resize/compress via canvas
  const scale = Math.min(maxW / w, maxH / h, 1);
  const cw = Math.max(1, Math.floor(w * scale));
  const ch = Math.max(1, Math.floor(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, cw, ch);

  // forcer JPEG pour compresser efficacement
  const outBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
  const safeName = `${baseName}-${Date.now()}-${randomId()}.jpg`;
  return new File([outBlob], safeName, { type: 'image/jpeg' });
}

// --------- Fetch + table ----------
async function fetchMontres() {
  showSpinner();
  try {
    const res = await fetch(API_URL + "?action=list");
    montres = await res.json();
    displayMontres();
  } catch(e) {
    console.error(e); alert("Erreur de chargement des produits.");
  } finally { hideSpinner(); }
}

function displayMontres() {
  const tbody = $id("montreTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  const list = currentCategory==="All" ? montres : montres.filter(m => m.categorie===currentCategory);

  list.forEach((m, index) => {
    const tr = document.createElement("tr");

    const tdRef = document.createElement("td"); tdRef.textContent = m.reference || "";
    const tdNom = document.createElement("td"); tdNom.textContent = m.nom || "";

    const tdPrix = document.createElement("td");
    if (m.prix) tdPrix.innerHTML = m.promotion ? `<s>${m.prix} €</s>` : `${m.prix} €`;

    const tdPromo = document.createElement("td");
    tdPromo.textContent = m.promotion ? `${m.promotion} €` : "";

    const tdDesc = document.createElement("td");
    tdDesc.className = "col-description";
    const descDiv = document.createElement("div");
    descDiv.className = "desc-content";
    descDiv.textContent = m.description || "";
    tdDesc.appendChild(descDiv);

    const tdImgs = document.createElement("td");
    const thumbs = document.createElement("div"); thumbs.className = "thumbs";
    const imgs = [m.image1, m.image2, m.image3, m.image4].filter(Boolean);
    imgs.forEach((src,i) => {
      const im = document.createElement("img");
      im.src = src; im.alt = "";
      im.addEventListener("click", () => openModal(imgs, i));
      thumbs.appendChild(im);
    });
    tdImgs.appendChild(thumbs);

    const tdActions = document.createElement("td");
    const bEdit = document.createElement("button"); bEdit.title="Éditer"; bEdit.textContent="📝";
    bEdit.addEventListener("click", () => openEditModal(index));
    const bDel  = document.createElement("button"); bDel.title="Supprimer"; bDel.textContent="🗑️";
    bDel.addEventListener("click", () => deleteMontre(m.id));
    tdActions.appendChild(bEdit); tdActions.appendChild(bDel);

    const tdCat = document.createElement("td"); tdCat.textContent = m.categorie || "";
    const tdEtat= document.createElement("td"); tdEtat.textContent = m.etat || "";
    const tdStat= document.createElement("td"); tdStat.textContent = m.status || "";

    tr.append(tdRef, tdNom, tdPrix, tdPromo, tdDesc, tdImgs, tdActions, tdCat, tdEtat, tdStat);
    tbody.appendChild(tr);
  });
}

function filterCategory(cat){ currentCategory = cat; displayMontres(); }

// --------- Slider (lecture seule) ----------
function openModal(images, start=0){
  currentImages = images || [];
  currentIndex = start;
  const img = $id("modal-image"), modal = $id("modal");
  if (!img || !modal) return;
  img.src = currentImages[currentIndex] || "";
  modal.style.display = "flex";
}
function closeModal(){ const m=$id("modal"); if(m) m.style.display="none"; }
function prevImage(){
  if (!currentImages.length) return;
  currentIndex = (currentIndex-1+currentImages.length)%currentImages.length;
  $id("modal-image").src = currentImages[currentIndex];
}
function nextImage(){
  if (!currentImages.length) return;
  currentIndex = (currentIndex+1)%currentImages.length;
  $id("modal-image").src = currentImages[currentIndex];
}

// --------- Compactage (réindexation sans trous) ----------
function compactSlots() {
  const kept = [];
  for (let i=0;i<4;i++){
    const s = editSlots[i];
    if (s.deleted) continue;
    if (s.file) kept.push({ file: s.file, src: null });
    else if (s.src) kept.push({ file: null, src: s.src });
  }
  for (let i=0;i<4;i++){
    const k = kept[i];
    editSlots[i] = k
      ? { src: k.src, file: k.file, deleted: false }
      : { src: null, file: null, deleted: false };
  }
}

// --------- Preview (lit editSlots) ----------
function renderPreview(){
  const wrap = $id('imagesPreview');
  if (!wrap) return;
  wrap.innerHTML = '';

  for (let i=0;i<4;i++){
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img'); img.alt='';

    if (editSlots[i].file){
      const url = URL.createObjectURL(editSlots[i].file);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
    } else if (editSlots[i].src){
      img.src = editSlots[i].src;
    } else {
      img.src = 'data:image/svg+xml;utf8,'+encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
           <rect width="100%" height="100%" fill="#eee"/>
           <text x="50%" y="50%" font-size="10" text-anchor="middle" fill="#666" dy=".3em">vide ${i+1}</text>
         </svg>`
      );
    }

    img.style.cursor = 'pointer';
    img.addEventListener('click', () => openEditImageModal(i));
    thumb.appendChild(img);
    wrap.appendChild(thumb);
  }
}

// --------- Formulaire ----------
function openAddModal(){
  editing = false;
  const form = $id("formMontre"); if (!form) return;
  form.reset(); form.id.value = "";
  for (let i=0;i<4;i++) editSlots[i] = { src:null, file:null, deleted:false };
  renderPreview();
  $id("formModal").style.display = "flex";
}

function openEditModal(index){
  editing = true;
  const m = montres[index], form = $id("formMontre"); if (!form) return;

  form.id.value   = m.id;
  form.reference.value = m.reference || "";
  form.nom.value  = m.nom || "";
  form.prix.value = m.prix || "";
  form.promotion.value = m.promotion || "";
  form.description.value = m.description || "";
  form.categorie.value = m.categorie || "Montres";
  form.etat.value = m.etat || "Neuf";
  form.status.value = m.status || "disponible";

  const urls = [m.image1, m.image2, m.image3, m.image4];
  for (let i=0;i<4;i++) editSlots[i] = { src: urls[i] || null, file:null, deleted:false };

  renderPreview();
  $id("formModal").style.display = "flex";
}

function closeModalForm(){ const fm=$id("formModal"); if(fm) fm.style.display="none"; }

// --------- Mini-modale édition image ----------
function openEditImageModal(slotIndex){
  currentEditSlot = slotIndex;
  const modal = $id('editImageModal'), img=$id('editImageModalImg');
  if (!modal || !img) return;

  const s = editSlots[slotIndex];
  if (s.file){
    const url = URL.createObjectURL(s.file);
    img.src = url; img.onload = () => URL.revokeObjectURL(url);
  } else if (s.src){
    img.src = s.src;
  } else {
    img.src = 'data:image/svg+xml;utf8,'+encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" font-size="16" text-anchor="middle" fill="#666" dy=".3em">Aucune image (slot ${slotIndex+1})</text>
       </svg>`
    );
  }
  modal.style.zIndex = 1001;
  modal.style.display = 'flex';
}

function closeEditImageModal(){ const m=$id('editImageModal'); if(m) m.style.display='none'; currentEditSlot=-1; }
function triggerReplace(){ if(currentEditSlot>=0) $id('replaceImageInput')?.click(); }

function deleteCurrentSlot(){
  if (currentEditSlot < 0) return;
  editSlots[currentEditSlot] = { src:null, file:null, deleted:true };
  compactSlots();          // réindexe immédiatement
  renderPreview();
  closeEditImageModal();
}

// input caché de remplacement
async function onReplaceInputChange(e){
  if (currentEditSlot < 0) return;
  const file = e.target.files?.[0]; if (!file) return;

  const prepped = await prepareFile(file);
  editSlots[currentEditSlot] = { src:null, file: prepped, deleted:false };

  renderPreview();
  closeEditImageModal();

  e.target.value = '';
  $id('formMontre')?.focus();
}

// --------- Submit (upload + envoi API) ----------
async function onFormSubmit(e){
  e.preventDefault();
  const form = e.target;

  // 1) Compacte AVANT de construire les champs (pas de trous)
  compactSlots();

  // 2) Construit la liste finale (4 cases) : path + files à uploader
  const imageForm = new FormData();
  const imagePaths = ["","","",""];
  let hasNewFiles = false;

  // prépare et compresse si besoin TOUT fichier avant upload
  for (let i=0;i<4;i++){
    const s = editSlots[i];
    if (s.file){
      // s.file peut déjà être compressé (mini-modale). On normalise quand même.
      const finalFile = (s.file instanceof File) ? s.file : new File([s.file], `img-${Date.now()}-${i}.jpg`, {type:'image/jpeg'});
      imageForm.append(`image${i+1}`, finalFile);
      imagePaths[i] = "images/" + finalFile.name;
      hasNewFiles = true;
    } else if (s.src){
      imagePaths[i] = s.src; // URL existante conservée
    } else {
      imagePaths[i] = "";    // fin de liste
    }
  }

  // 3) Uploads si besoin (-> upload-images.php)
  if (hasNewFiles){
    try {
      const resp = await fetch("upload-images.php", { method: "POST", body: imageForm });
      if (!resp.ok) throw new Error(`Upload images: HTTP ${resp.status}`);
      // Optionnel: const json = await resp.json();
    } catch (err) {
      console.error(err);
      alert("Erreur d'upload des images (413 ?). Essayez avec des images plus légères ou voyez la note serveur sous le code.");
      return;
    }
  }

  // 4) Envoi au back (api.php) sans modifier le back
  const dataForm = new FormData(form);
  dataForm.set("image1", imagePaths[0]);
  dataForm.set("image2", imagePaths[1]);
  dataForm.set("image3", imagePaths[2]);
  dataForm.set("image4", imagePaths[3]);
  dataForm.set("etat", form.etat.value);
  dataForm.set("status", form.status.value);
  dataForm.set("action", editing ? "edit" : "add");
  dataForm.set("promotion", form.promotion.value ? String(parseFloat(form.promotion.value)) : "");

  showSpinner();
  try {
    const r = await fetch(API_URL, { method: "POST", body: dataForm });
    if (!r.ok) throw new Error(`API: HTTP ${r.status}`);
    closeModalForm();
    await fetchMontres();
  } catch(e2){
    console.error(e2);
    alert("Erreur lors de l'enregistrement (413 ?). Regardez la note serveur ci-dessous.");
  } finally { hideSpinner(); }
}

// --------- Suppression produit ----------
async function deleteMontre(id){
  if (!confirm("Confirmer suppression ?")) return;
  showSpinner();
  try {
    const fd = new FormData();
    fd.append("action","delete");
    fd.append("id", id);
    await fetch(API_URL, { method:"POST", body:fd });
    await fetchMontres();
  } catch(e){ console.error(e); alert("Erreur lors de la suppression."); }
  finally { hideSpinner(); }
}

// --------- Exports ----------
async function downloadZip(){
  if (typeof JSZip==="undefined"){ alert("JSZip non chargé."); return; }
  const zip = new JSZip();
  const files = [
    { path:'data/montres.csv', name:'montres.csv' },
    { path:'index.html',       name:'index.html' }
  ];
  try{
    for (const f of files){
      const r = await fetch(f.path);
      if (!r.ok) throw new Error(`Erreur de chargement : ${f.path}`);
      zip.file(f.name, await r.text());
    }
    const content = await zip.generateAsync({ type:'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'fichiers_montres.zip';
    a.click();
  } catch(e){ alert(e.message || String(e)); }
}

function downloadProduitsCSV(){
  if (!montres.length){ alert("Aucune donnée"); return; }
  const headers = ["id","reference","nom","prix","promotion","description","image1","image2","image3","image4","categorie","etat","status"];
  const rows = montres.map((m,i)=> headers.map(h=>{
    const v = h==="id" ? (m.id ?? i) : (m[h] ?? "");
    const s = typeof v==="string" ? v : (typeof v==="number" ? String(v) : JSON.stringify(v));
    return `"${s.replace(/"/g,'""')}"`;
  }).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "produits.csv";
  a.click();
}

function sendSQLiteDataToServer(){
  if (!montres.length){ alert("Aucune donnée à envoyer !"); return; }
  const headers = ["id","reference","nom","prix","promotion","description","image1","image2","image3","image4","categorie","etat","status"];
  const rows = montres.map((m,i)=> headers.map(h=>{
    const v = h==="id" ? i : (m[h] || "");
    const s = typeof v==="string" ? v : (typeof v==="number" ? String(v) : JSON.stringify(v));
    return `"${s.replace(/"/g,'""')}"`;
  }).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const formData = new FormData();
  formData.append("csvFile", blob, "montres.csv");
  showSpinner();
  fetch("upload.php", { method:"POST", body:formData })
    .then(r=>r.text())
    .then(msg=>{ hideSpinner(); alert("✅ CSV mis à jour sur le serveur :\n"+msg); })
    .catch(err=>{ hideSpinner(); alert("❌ Erreur : "+err.message); });
}

// --------- Bootstrap ----------
window.addEventListener('DOMContentLoaded', () => {
  const form = $id('formMontre');
  if (form) form.addEventListener('submit', onFormSubmit);

  // Input multiple (UN SEUL input): <input type="file" name="images" multiple>
  const imagesInput = form?.querySelector('input[name="images"]');
  if (imagesInput){
    imagesInput.addEventListener('change', async () => {
      const files = imagesInput.files || [];
      // Remplit depuis le début avec les nouveaux fichiers (compressés & renommés)
      const prepared = [];
      for (let i=0;i<Math.min(files.length,4);i++){
        prepared.push(await prepareFile(files[i]));
      }
      for (let i=0;i<4;i++){
        const f = prepared[i] || null;
        if (f) editSlots[i] = { src:null, file:f, deleted:false };
      }
      compactSlots();
      renderPreview();
    });
  }

  // Remplacement ciblé (mini-modale)
  $id('replaceImageInput')?.addEventListener('change', onReplaceInputChange);

  // z-index de sécurité
  const fm=$id('formModal'); if(fm) fm.style.zIndex=900;
  const eim=$id('editImageModal'); if(eim) eim.style.zIndex=1001;
  const sm=$id('modal'); if(sm) sm.style.zIndex=1100;

  fetchMontres();
});

// Expose pour les boutons inline du HTML existant
window.filterCategory = filterCategory;
window.openAddModal = openAddModal;
window.closeModalForm = closeModalForm;
window.openEditModal = openEditModal;
window.deleteMontre = deleteMontre;

window.openModal = openModal;
window.closeModal = closeModal;
window.prevImage = prevImage;
window.nextImage = nextImage;

window.openEditImageModal = openEditImageModal;
window.closeEditImageModal = closeEditImageModal;
window.triggerReplace = triggerReplace;
window.deleteCurrentSlot = deleteCurrentSlot;

window.downloadZip = downloadZip;
window.downloadProduitsCSV = downloadProduitsCSV;
window.sendSQLiteDataToServer = sendSQLiteDataToServer;
