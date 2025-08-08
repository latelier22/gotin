import sqlite3
import shutil
import json
from pathlib import Path
from zipfile import ZipFile

# === CONFIGURATION ===
db_path = Path("/home/debian/gotin/data/montres.sqlite")
image_dir = Path("/home/debian/gotin/images")  # Dossier où sont les images source
output_dir = Path("site_export")
zip_path = Path("gotin_montres_site.zip")

# === PRÉPARATION DOSSIER ===
if output_dir.exists():
    shutil.rmtree(output_dir)
output_dir.mkdir()
(output_dir / "images").mkdir()

# === EXTRACTION DONNÉES MONTRES ===
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT nom, prix, description, image1, image2, image3, image4 FROM montres")
rows = cursor.fetchall()
conn.close()

montres = []
for i, row in enumerate(rows):
    nom, prix, description, *images = row
    montres.append({
        "id": i,
        "nom": nom,
        "prix": prix,
        "description": description,
        "images": images
    })

    # Copier les images utilisées
    for image in images:
        if image:
            src = image_dir / Path(image).name
            dst = output_dir / "images" / Path(image).name
            if src.exists():
                shutil.copy(src, dst)

# === GÉNÉRATION index.html AVEC JS + CSS INLINE ===
html_template = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Les Montres de Gotin</title>
  <style>
    body {{
      margin: 0;
      font-family: 'Cormorant Garamond', serif;
      background-color: #000;
      color: #D4AF37;
    }}
    .container {{ max-width: 800px; margin: auto; padding: 10px; }}
    .navigation {{ text-align: center; margin-bottom: 20px; }}
    .navigation button {{
      font-size: 1.2em; padding: 10px 20px; margin: 0 20px;
      cursor: pointer; background-color: transparent;
      border: 2px solid #D4AF37; color: #D4AF37; border-radius: 8px;
    }}
    .navigation button:hover {{ background-color: #D4AF37; color: #000; }}
    .montre {{ display: none; }}
    .montre.active {{ display: block; }}
    .main-display {{
      position: relative; height: 400px; border-radius: 10px;
      overflow: hidden; background-size: cover; background-position: center;
      cursor: pointer; box-shadow: 0 4px 8px rgba(212, 175, 55, 0.4);
    }}
    .main-display::after {{
      content: ""; position: absolute; inset: 0; background: rgba(0,0,0,0.4);
    }}
    .info {{
      position: absolute; z-index: 2; color: #D4AF37;
      top: 20px; left: 20px; background: rgba(0, 0, 0, 0.6);
      padding: 15px; border: 1px solid #D4AF37; border-radius: 10px;
    }}
    .info h1 {{ margin: 0 0 10px; font-size: 2em; color: #FFD700; }}
    .info p {{ margin: 5px 0; font-size: 1.1em; color: #f8e7b8; }}
    .gallery {{ display: flex; margin-top: 15px; gap: 10px; }}
    .gallery img {{
      flex: 1; height: 120px; object-fit: cover;
      border-radius: 8px; cursor: pointer; box-shadow: 0 2px 5px rgba(212, 175, 55, 0.3);
    }}
    .thumbnail-strip {{
      display: flex; gap: 10px; overflow-x: auto;
      padding: 15px 0; margin-top: 30px; background-color: #111;
    }}
    .thumbnail {{
      flex: 0 0 auto; width: 120px; height: 80px;
      border-radius: 8px; overflow: hidden;
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.4);
      cursor: pointer; border: 2px solid transparent;
    }}
    .thumbnail:hover {{ transform: scale(1.05); border-color: #D4AF37; }}
    .thumbnail img {{ width: 100%; height: 100%; object-fit: cover; }}
    .modal {{
      display: none; position: fixed; z-index: 999;
      left: 0; top: 0; width: 100vw; height: 100vh;
      background-color: rgba(0,0,0,0.95);
      justify-content: center; align-items: center;
    }}
    .modal-content {{ position: relative; max-width: 90%; max-height: 90%; }}
    .modal-content img {{
      width: 100%; max-height: 80vh; object-fit: contain;
      border-radius: 10px; box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
    }}
    .close, .prev, .next {{
      position: absolute; color: #D4AF37; font-size: 2em;
      cursor: pointer; background: rgba(0,0,0,0.6);
      padding: 10px; border-radius: 50%;
    }}
    .close {{ top: 10px; right: 20px; }}
    .prev {{ top: 50%; left: -50px; transform: translateY(-50%); }}
    .next {{ top: 50%; right: -50px; transform: translateY(-50%); }}
    .footer {{
      text-align: center; margin-top: 20px;
      color: #D4AF37; font-size: 1.5em;
    }}
    .footer a {{ color: #D4AF37; text-decoration: none; }}
    .footer a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body>
  <div class="container">
    <h1 style="text-align:center; font-size:2.5em; margin-bottom:30px; color:#FFD700;">Les Montres de Gotin</h1>
    <div id="montres-container"></div>
    <div class="thumbnail-strip" id="thumbnail-strip"></div>
    <div class="navigation">
      <button onclick="changeMontre(-1)">⟵ Précédente</button>
      <button onclick="changeMontre(1)">Suivante ⟶</button>
    </div>
  </div>

  <div class="modal" id="imageModal">
    <div class="modal-content">
      <span class="close" onclick="closeModal()">✖</span>
      <span class="prev" onclick="prevImage()">◀</span>
      <img id="modalImage" src="">
      <span class="next" onclick="nextImage()">▶</span>
    </div>
  </div>

  <footer class="footer">
    <p>Pour tout renseignement : <a href="mailto:robic@gmail.com">robic@gmail.com</a> — <a href="tel:+33326156546">+33 3 26 15 65 46</a></p>
  </footer>

  <script>
    let montres = {json.dumps(montres)};
    let currentMontreIndex = 0;
    let currentImageIndex = 0;

    function showMontre(index) {{
      document.querySelector(`#montre-${currentMontreIndex}`)?.classList.remove('active');
      currentMontreIndex = index;
      document.querySelector(`#montre-${currentMontreIndex}`)?.classList.add('active');
    }}

    function changeMontre(direction) {{
      let newIndex = (currentMontreIndex + direction + montres.length) % montres.length;
      showMontre(newIndex);
    }}

    function openModal(montreIndex, imageIndex) {{
      currentMontreIndex = montreIndex;
      currentImageIndex = imageIndex;
      document.getElementById("modalImage").src = 'images/' + montres[montreIndex].images[imageIndex];
      document.getElementById("imageModal").style.display = "flex";
    }}

    function closeModal() {{
      document.getElementById("imageModal").style.display = "none";
    }}

    function nextImage() {{
      currentImageIndex = (currentImageIndex + 1) % 4;
      document.getElementById("modalImage").src = 'images/' + montres[currentMontreIndex].images[currentImageIndex];
    }}

    function prevImage() {{
      currentImageIndex = (currentImageIndex - 1 + 4) % 4;
      document.getElementById("modalImage").src = 'images/' + montres[currentMontreIndex].images[currentImageIndex];
    }}

    function renderMontres() {{
      const container = document.getElementById("montres-container");
      const thumbs = document.getElementById("thumbnail-strip");

      montres.forEach((montre, index) => {{
        const div = document.createElement("div");
        div.className = "montre" + (index === 0 ? " active" : "");
        div.id = `montre-${index}`;
        div.innerHTML = `
          <div class="main-display" style="background-image: url('images/${{montre.images[1]}}');" onclick="openModal(${{index}}, 1)">
            <div class="info">
              <h1>${{montre.nom}}</h1>
              <p>Prix : ${{montre.prix}} €</p>
              <p>${{montre.description}}</p>
            </div>
          </div>
          <div class="gallery">
            <img src="images/${{montre.images[0]}}" onclick="openModal(${{index}}, 0)">
            <img src="images/${{montre.images[2]}}" onclick="openModal(${{index}}, 2)">
            <img src="images/${{montre.images[3]}}" onclick="openModal(${{index}}, 3)">
          </div>
        `;
        container.appendChild(div);

        const thumb = document.createElement("div");
        thumb.className = "thumbnail";
        thumb.innerHTML = `<img src="images/${{montre.images[1]}}" alt="${{montre.nom}}">`;
        thumb.onclick = () => showMontre(index);
        thumbs.appendChild(thumb);
      }});
    }}

    renderMontres();
  </script>
</body>
</html>
"""

# Écriture de l'index.html
(output_dir / "index.html").write_text(html_template, encoding="utf-8")

# Compression en ZIP
with ZipFile(zip_path, 'w') as zipf:
    for path in output_dir.rglob("*"):
        zipf.write(path, path.relative_to(output_dir))

print(f"✔ Archive créée : {zip_path}")
