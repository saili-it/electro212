# Déploiement — Electro212 (Docker + PostgreSQL)

Déploie l'application Next.js **et** sa base PostgreSQL avec Docker Compose. Testé pour un serveur Linux (VPS). Les images produit uploadées sont conservées dans un volume Docker.

## 1. Prérequis sur le serveur

- **Docker** + **Docker Compose v2** (`docker --version`, `docker compose version`).
- Un **nom de domaine** pointant vers le serveur (pour le HTTPS, voir §6).
- Le code du projet sur le serveur (`git clone <votre-remote>` une fois le dépôt poussé).

## 2. Variables d'environnement

À la racine du projet (à côté de `docker-compose.yml`), créez un fichier **`.env`** :

```bash
# Base de données (le mot de passe est obligatoire)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=remplacez-par-un-mot-de-passe-fort
POSTGRES_DB=electro212

# Secret de session Auth.js — générez-le avec : npx auth secret
AUTH_SECRET=collez-ici-le-secret-genere

# URL publique du site (sert aux liens canoniques, Open Graph, sitemap, robots)
SITE_URL=https://votre-domaine.ma

# Stockage des images : "local" (disque, volume Docker) par défaut.
STORAGE_DRIVER=local
```

> `AUTH_SECRET` : `docker run --rm node:22-bookworm-slim npx -y auth secret` (ou `openssl rand -base64 32`).
> Ne committez jamais ce `.env` (il est déjà dans `.gitignore`).

## 3. Démarrer

```bash
docker compose up -d --build
```

- Construit l'image de l'app, démarre **PostgreSQL** puis **l'app**.
- Au démarrage, l'app applique automatiquement les migrations (`prisma migrate deploy`) — le schéma est créé.
- L'app écoute sur le port **3000** ; la base seulement sur `127.0.0.1:5432` (jamais publique).

Vérifier : `docker compose ps` et `docker compose logs -f app`. Après le premier
`db:seed`/import (étape 4), la page d'accueil se rafraîchit sous ~1 min ; les
pages catégories/produits sont correctes dès la première visite.

## 4. Données de départ

```bash
# Structure du catalogue (catégories, marques, attributs) + quelques produits démo
docker compose exec app npm run db:seed

# (Optionnel) Importer le vrai catalogue WooCommerce (prisma/data/product-catalog.json)
# ⚠️ destructif : remplace le catalogue existant.
docker compose exec app npm run db:import-catalog
```

Les **photos produit** s'ajoutent ensuite depuis l'admin (elles ne sont pas incluses dans l'image).

```bash
# Logos des marques (« Nos marques ») : attribue les logos de public/brands/ et crée les marques manquantes.
# Sans danger à relancer. Le site garde la liste des marques en mémoire (~1 h) : on redémarre pour l'afficher tout de suite.
docker compose exec app npm run db:load-brand-logos
docker compose restart app
```

## 5. Créer le compte administrateur

Indispensable pour se connecter à `/admin` (le seed n'en crée pas) :

```bash
docker compose exec \
  -e ADMIN_EMAIL=contact@votre-domaine.ma \
  -e ADMIN_PASSWORD='un-mot-de-passe-fort' \
  -e ADMIN_NAME='Votre Nom' \
  app npm run db:create-admin
```

Connexion ensuite sur `https://votre-domaine.ma/admin/login`.

## 6. HTTPS (reverse proxy recommandé)

L'app sert du HTTP sur `:3000`. Mettez un reverse proxy devant pour le TLS. Exemple **Caddy** (`Caddyfile`) :

```
votre-domaine.ma {
    reverse_proxy localhost:3000
}
```

`caddy run` obtient et renouvelle automatiquement le certificat Let's Encrypt. (Alternatives : Nginx + Certbot, Traefik.) Mettez bien `SITE_URL=https://votre-domaine.ma` dans `.env`.

### Serveur de production actuel (proxy Caddy partagé)

Sur le VPS, Caddy tourne **dans Docker** (projet `/opt/proxy`, conteneur `proxy-caddy-1`) et sert aussi les autres applications de la société. Electro212 le rejoint par le réseau Docker `web` (fichier `docker-compose.override.yml`, avec `AUTH_TRUST_HOST: "true"`), donc Caddy joint l'app par son nom de conteneur. Le bloc à avoir dans **`/opt/proxy/sites.caddy`** :

```
# ----- Electro212 (boutique en ligne, /opt/electro212) — ne pas supprimer -----
electro212.ma {
    encode zstd gzip
    reverse_proxy electro212-app-1:3000
    log {
        output stdout
        format json
    }
}

www.electro212.ma {
    redir https://electro212.ma{uri} permanent
}
```

Après modification : `cd /opt/proxy && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile` (rechargement sans coupure pour les autres sites).

> ⚠️ Ce fichier est partagé : si le bloc Electro212 disparaît (ex. fichier réécrit lors du déploiement d'une autre application), le site devient **inaccessible en HTTPS** (« Ce site est inaccessible ») alors que l'app tourne. Vérifier avec `docker logs proxy-caddy-1 | grep "automatic TLS"` : `electro212.ma` doit figurer dans la liste des domaines.

## 7. Mises à jour

```bash
git pull
docker compose up -d --build
```

Les nouvelles migrations s'appliquent automatiquement au redémarrage.

## 8. Sauvegardes

```bash
# Dump de la base
docker compose exec db pg_dump -U postgres electro212 > backup-$(date +%F).sql

# Restauration
cat backup-AAAA-MM-JJ.sql | docker compose exec -T db psql -U postgres electro212
```

Les images uploadées vivent dans le volume `electro212_uploads` ; sauvegardez-le aussi (`docker run --rm -v electro212_uploads:/data -v $PWD:/backup busybox tar czf /backup/uploads.tgz /data`).

## Notes

- **Base de données** : gérée par le service `db` (volume `electro212_pgdata`). Pour utiliser une base externe/managée à la place, retirez le service `db` et mettez votre `DATABASE_URL` complète dans l'environnement du service `app`.
- **Stockage S3/CDN** (au lieu du disque local) : renseignez `STORAGE_DRIVER=s3` et les `STORAGE_*` dans `.env`. Comme `next/image` a besoin du domaine CDN **au moment du build**, reconstruisez avec : `docker compose build --build-arg STORAGE_PUBLIC_CDN_URL=https://cdn.exemple.com app` (puis ajoutez aussi la variable dans `.env`).
- **Pixel Meta** (ID `4870708023215633`, devise MAD) : lu depuis `NEXT_PUBLIC_META_PIXEL_ID`, sinon l'ID de `src/config/site.ts` (`metaPixelId`) sert de valeur par défaut. Comme toute variable `NEXT_PUBLIC_*`, elle est figée **au moment du build** et les fichiers `.env*` ne sont pas copiés dans l'image : pour changer d'ID en production, reconstruisez avec `docker compose build --build-arg NEXT_PUBLIC_META_PIXEL_ID=<id> app` (ou modifiez `site.ts`). Le pixel n'est chargé que sur la boutique (jamais sur l'admin) et envoie PageView, ViewContent, Search, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase et Contact (`src/lib/meta.ts`). Les événements serveur passent par l'API Conversions hébergée par Meta : aucun jeton à configurer ici.
- **À prévoir plus tard** : un cron qui libère le stock réservé des commandes « À confirmer » restées sans suite (endpoint `release-stale-reservations` + `CRON_SECRET`) — non implémenté à ce jour.
