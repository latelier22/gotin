# GOTIN Watches — Refactor Template (PHP + SQLite)

Projet de base **proprement structuré** pour votre boutique de montres (CRUD) avec **authentification (JWT)** et **gestion des stocks**.

## Structure
```
api/
  config/
    config.sample.php
  controllers/
    AuthController.php
    WatchController.php
    StockController.php
  db/
    migrations/
      001_init.sql
      002_stock.sql
  middleware/
    AuthMiddleware.php
  models/
    Watch.php
    User.php
  services/
    AuthService.php
    WatchService.php
    StockService.php
  utils/
    Response.php
    Validator.php
    JWT.php
    Router.php
  index.php
  .htaccess
public/
  index.html
  admin/
    crud.html
    js/
      api.js
      crud.js
    styles/
      admin.css
  styles/
    style.css
scripts/
  migrate.php
  seed.php
```

## Installation rapide
1. Copier `api/config/config.sample.php` → `api/config/config.php` et **renseigner la clé `JWT_SECRET`**.
2. Lancer les migrations et seeds :
   ```bash
   php scripts/migrate.php
   php scripts/seed.php
   ```
3. Déployer votre vhost : servir `/public` en racine web. Le dossier `/api` expose l’API (Apache: `.htaccess` inclus).
4. Authentification : `POST /api/auth/login` avec `{ "email": "admin@example.com", "password": "admin123" }` → récupérez un **JWT** à passer ensuite dans `Authorization: Bearer <token>`.

## Endpoints principaux
- `POST /api/auth/login` → token JWT
- `GET /api/watches` → liste paginée
- `POST /api/watches` → créer (protégé)
- `GET /api/watches/{id}` → détail
- `PUT /api/watches/{id}` → éditer (protégé)
- `DELETE /api/watches/{id}` → supprimer (protégé)
- `POST /api/stocks/adjust` → ajustement quantités (protégé)
- `GET /api/auth/me` → info utilisateur (protégé)

## Notes
- **Référence** (`reference`) unique côté DB.
- **Stocks** : colonnes `stock_qty`, `low_stock_threshold`, `stock_status` (in_stock, low, out).
- Vous pouvez intégrer vos anciens fichiers en mappant vers ces services/contrôleurs.
