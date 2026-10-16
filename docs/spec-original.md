# E-commerce Électroménager — Concept & Architecture

> Version 1.0 — October 2026
> Scope: online shop for home appliances (électroménager), TV and TV furniture, fed from the company's Sage stock list.

---

## 1. Project overview

### 1.1 Goal
Build an online shop that sells the company's appliance range, keeps its stock in sync with Sage, and is easy for the team to manage without a developer.

### 1.2 Source data
The starting point is the Excel stock export `total_stock_04-05-2026.xlsx`.

| Item | Value |
|---|---|
| Products | 545 rows |
| "Famille" codes | 56 |
| Columns | Famille, Ref, Désignation, 5 stock columns (DP, DD, DO, DA, DF), Total |
| Missing | price, brand, images, description, specifications |

The file mixes appliances and furniture. Only the appliance range (plus TV, TV accessories and TV furniture) goes on the website. Other furniture is left out.

### 1.3 Key observations that shape the design
1. **"Famille" mixes brand and product type** (BEKOLV, SAMSUNGLV, SKYCLIM…). The website needs brand and category as separate fields.
2. **Some families are mixed.** For example `PETITELECT` contains about 15 product types, and `LGMALLV` contains washing machines, washer-dryers and dishwashers.
3. **Specifications only exist inside the designation text** (capacity in kg or litres, BTU, number of place settings, width, colour). They must be extracted into real attributes to make filters work.
4. **Stock is spread over 5 columns**, probably 5 depots or shops (to be confirmed).
5. **There is no price, image or description.** Prices come from Sage, and images and descriptions must be collected.

---

## 2. Functional scope

### 2.1 Customer-facing (storefront)
- Home page, category pages, product pages, brand pages
- Search with suggestions, filters, sorting
- Product comparison, wishlist
- Cart and one-page checkout (guest checkout allowed)
- Customer account and order tracking
- Promotions, coupons
- Service pages (delivery and installation, warranty and after-sales, returns, FAQ, contact and stores)
- Blog / buying guides (SEO)

### 2.2 Back-office (admin)
- Dashboard (orders, revenue, low stock)
- Products, categories, brands, attributes
- Excel / Sage import with an error report
- Stock per warehouse
- Orders, invoices, delivery slips
- Customers, coupons, banners, static pages
- Settings (delivery zones and fees, payment methods, roles)

### 2.3 Out of scope for version 1
Marketplace with several sellers, mobile app, loyalty program, customer financing. They can be added later.

---

## 3. Catalogue structure

### 3.1 Principle
- **A subcategory is a type of product.** It appears in the menu.
- **A filter is a characteristic of a product.** It is stored as an attribute.

For example, "manual / automatic" washing machines is a *filter* (attribute `type_lavage`), not a subcategory.

### 3.2 Category tree

| Level 1 | Level 2 |
|---|---|
| **TV et accessoires** | Téléviseurs · Récepteurs satellite · Supports TV · Câbles et connectique · Lecteurs et audio |
| **Gros électroménager** | Réfrigérateurs · Congélateurs · Machines à laver · Lave-vaisselle · Cuisinières |
| **Petit électroménager** | Préparation culinaire · Cuisson · Café et petit-déjeuner · Entretien et repassage · Soins et beauté |
| **Confort de la maison** | Climatiseurs · Chauffage · Chauffe-eau · Ventilation et air cooler · Fontaines à eau · Accessoires |
| **Encastrable** | Fours · Plaques · Hottes · Micro-ondes encastrables · Éviers et robinetterie |
| **Meuble TV** | Meubles TV · Tables et stands Hi-Fi |

The tree is stored in the database (not hard-coded), so categories can be added or moved from the admin.

### 3.3 Products in several menus
A built-in hob belongs to both *Encastrable* and the cooking range. Rule:

- Each product has **one primary category** (used for breadcrumbs, SEO and canonical URL).
- It can be linked to **additional categories** to appear in other menus.
- The *installation* attribute (`encastrable`, `pose libre`, `posable`) is also a filter.

### 3.4 Filters per category

| Category | Main filters |
|---|---|
| All | Marque, prix, disponibilité, promotion |
| Machines à laver | Type (semi-automatique, automatique frontale, top load, lavante-séchante), capacité (kg), couleur |
| Réfrigérateurs / congélateurs | Type (statique, no frost, combiné, side by side, coffre, vertical), capacité (L), couleur |
| Lave-vaisselle | Couverts, installation (pose libre / encastrable), largeur |
| Cuisinières / plaques / fours | Énergie (gaz, électrique, mixte), nombre de feux, largeur, installation |
| Climatiseurs | Puissance (BTU), type (split, fenêtre, mobile), inverter |
| Téléviseurs | Taille (pouces), résolution, Smart TV, récepteur intégré |
| Petit électroménager | Type de produit, puissance (W), couleur |

---

## 4. Data model

### 4.1 Entity overview

```
categories ──< product_categories >── products >── brands
                                         │
                                         ├──< product_images
                                         ├──< product_attribute_values >── attributes
                                         └──< stock_levels >── warehouses

categories ──< category_attributes >── attributes     (which filters each category shows)

customers ──< addresses
customers ──< orders ──< order_items >── products
orders ──< payments
orders ──< shipments
coupons, banners, pages, users (admin), roles
```

### 4.2 Main tables (PostgreSQL)

```sql
CREATE TABLE brands (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  parent_id   INT REFERENCES categories(id),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  position    INT DEFAULT 0,
  image_url   TEXT,
  seo_title   TEXT,
  seo_text    TEXT,
  is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE products (
  id                   SERIAL PRIMARY KEY,
  sku                  TEXT NOT NULL UNIQUE,      -- Sage "Ref"
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  brand_id             INT REFERENCES brands(id),
  primary_category_id  INT REFERENCES categories(id),
  description          TEXT,
  price                NUMERIC(12,2),             -- from Sage, TTC or HT to be decided
  old_price            NUMERIC(12,2),
  famille_legacy       TEXT,                      -- original Sage "Famille" code
  status               TEXT DEFAULT 'draft',      -- draft | published | archived
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_categories (
  product_id   INT REFERENCES products(id) ON DELETE CASCADE,
  category_id  INT REFERENCES categories(id) ON DELETE CASCADE,
  is_primary   BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE attributes (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,   -- ex: capacite_kg, btu, taille_pouces
  label       TEXT NOT NULL,
  data_type   TEXT NOT NULL,          -- text | number | boolean | enum
  unit        TEXT,
  is_filter   BOOLEAN DEFAULT TRUE
);

CREATE TABLE category_attributes (
  category_id  INT REFERENCES categories(id) ON DELETE CASCADE,
  attribute_id INT REFERENCES attributes(id) ON DELETE CASCADE,
  position     INT DEFAULT 0,
  PRIMARY KEY (category_id, attribute_id)
);

CREATE TABLE product_attribute_values (
  product_id   INT REFERENCES products(id) ON DELETE CASCADE,
  attribute_id INT REFERENCES attributes(id) ON DELETE CASCADE,
  value_text   TEXT,
  value_number NUMERIC,
  PRIMARY KEY (product_id, attribute_id)
);

CREATE TABLE product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INT REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  position    INT DEFAULT 0
);

CREATE TABLE warehouses (
  id     SERIAL PRIMARY KEY,
  code   TEXT NOT NULL UNIQUE,        -- DP, DD, DO, DA, DF (to be confirmed)
  name   TEXT,
  city   TEXT,
  is_online BOOLEAN DEFAULT TRUE      -- whether its stock is sold on the website
);

CREATE TABLE stock_levels (
  product_id   INT REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id INT REFERENCES warehouses(id),
  quantity     INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id)
);
```

### 4.3 Orders and customers (summary)
- `customers` (name, phone, email, password hash, optional for guest orders)
- `addresses` (city, neighbourhood, street, phone, notes)
- `orders` (number, status, totals, delivery method, payment method, address snapshot)
- `order_items` (product, name and price **copied at order time**, quantity)
- `payments`, `shipments`, `coupons`, `order_status_history`

Prices and product names are copied into `order_items`, so old orders do not change when the catalogue changes.

### 4.4 Available stock rule
Website stock for a product = sum of `stock_levels.quantity` for warehouses where `is_online = TRUE`, minus the quantity reserved by open orders. Which warehouses sell online is a business decision (see section 12).

---

## 5. Technical architecture

### 5.1 Proposed stack
The stack follows the technologies already used by the team.

| Layer | Choice | Why |
|---|---|---|
| Frontend (storefront) | **React with Next.js** (server-side rendering) | Fast pages and good SEO, essential for a shop |
| Admin | React (Vite) single-page app | No SEO needed, quick to build |
| Backend API | **Node.js** (Express or NestJS), REST + JSON | Same language as the frontend |
| Database | **PostgreSQL** | Relational, strong for catalogue and orders |
| Search | PostgreSQL full-text first, **Meilisearch** if needed | Typo-tolerant search and facets |
| Cache / queues | **Redis** (+ BullMQ) | Cache, sessions, background jobs (import, emails) |
| Images | Object storage (S3-compatible) + image resizing (Sharp), served by a CDN | Fast images in several sizes |
| Reverse proxy | **Nginx** | TLS, compression, caching |
| Deployment | **Docker** / Docker Compose on a VPS | Reproducible environments |
| CDN / DNS | Cloudflare | Protection, caching, performance |

### 5.2 Alternative: PrestaShop
PrestaShop would deliver a working shop faster, with payments, orders and an admin included. The trade-offs are less freedom for the custom Sage integration and the attribute-driven filters, and more work to keep it fast. A custom build costs more up front but gives full control. Decide this before development starts.

### 5.3 System diagram

```
                    ┌──────────────┐
   Customer ───────▶│  Cloudflare  │
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │    Nginx     │
                    └───┬──────┬───┘
                        │      │
          ┌─────────────▼┐    ┌▼───────────────┐
          │  Storefront  │    │  Admin (SPA)   │
          │  Next.js SSR │    │  React / Vite  │
          └──────┬───────┘    └───────┬────────┘
                 │   REST / JSON      │
                 └──────────┬─────────┘
                            ▼
                   ┌─────────────────┐        ┌────────────────┐
                   │   Backend API   │───────▶│  Redis / Queue │
                   │   Node.js       │        └───────┬────────┘
                   └───┬─────────┬───┘                ▼
                       │         │            ┌────────────────┐
                       ▼         ▼            │ Workers:       │
              ┌──────────┐  ┌──────────┐      │ import, emails │
              │PostgreSQL│  │Meilisearch│     │ image resize   │
              └──────────┘  └──────────┘      └───────┬────────┘
                                                      ▼
                                              Sage export / API
                                              Payment gateway
                                              Email / SMS / WhatsApp
```

### 5.4 Backend modules

| Module | Responsibility |
|---|---|
| `catalog` | Products, categories, brands, attributes, images |
| `search` | Indexing, suggestions, filters (facets) |
| `inventory` | Stock levels, reservations |
| `cart` | Cart for guests and customers |
| `orders` | Checkout, statuses, invoices |
| `payments` | Gateway integration, cash on delivery, transfers |
| `shipping` | Zones, fees, installation options |
| `customers` | Accounts, addresses, wishlist |
| `promotions` | Discounts, coupons, banners |
| `content` | Static pages, blog, SEO |
| `sage-sync` | Import and synchronisation with Sage |
| `notifications` | Email, SMS, WhatsApp |
| `admin` | Users, roles, audit log |

---

## 6. Sage integration

### 6.1 Principle
**Sage is the source of truth for SKU, stock and price. The website is the source of truth for marketing content** (descriptions, images, SEO, category placement). A sync must never overwrite the marketing content.

### 6.2 Phase 1 — Excel import (start here)
1. Upload the Sage export in the admin.
2. The importer reads each row, matches products by `Ref` (SKU), and creates or updates them.
3. New products are created in `draft` status, with a suggested category, brand and attributes.
4. Stock quantities are written to `stock_levels` per warehouse column.
5. An error report lists rows that failed, duplicates, and rows with negative or zero stock.

### 6.3 Automatic categorisation and extraction
A mapping table converts the legacy `Famille` code plus keywords in the designation into category, brand and attributes. Examples:

| Designation text | Result |
|---|---|
| "…9000 BTU…" | category Climatiseurs, `btu = 9000` |
| "…10.5 kg…" | category Machines à laver, `capacite_kg = 10.5` |
| "…13 couverts…" | category Lave-vaisselle, `couverts = 13` |
| "…No Frost…" | category Réfrigérateurs, `type = no frost` |

Rows the rules cannot classify go to a review queue in the admin, where a person validates them once. The mapping then improves with each correction.

### 6.4 Phase 2 — Automatic sync
- A scheduled job (every 5 to 15 minutes) reads a Sage export or API for stock and price changes.
- Only stock and price fields are updated.
- Every sync run is logged (rows read, updated, failed).
- A low-stock and out-of-stock rule hides or flags products automatically.

### 6.5 Orders back to Sage
Online orders should become sales documents in Sage, either through an export file or API. The chosen method depends on the Sage version and licence.

---

## 7. Storefront design

### 7.1 Main pages
Home, category, product, brand, search, comparison, promotions, cart, checkout, order confirmation, account, contact and stores, service pages, legal pages, blog, 404/500.

### 7.2 Key UX decisions
- **Mobile first.** Most traffic will come from phones.
- **WhatsApp order button** on product and cart pages, since many customers prefer to confirm by chat.
- **Cash on delivery** as a first-class payment method, alongside bank card and transfer.
- **Delivery estimate by city** shown on the product page and in the cart.
- **Installation option** for heavy appliances and air conditioners.
- Filters in a side drawer on mobile, with the number of results shown live.

### 7.3 Image specifications

| Item | Desktop | Mobile |
|---|---|---|
| Hero banner | 1920×640 | 768×900 |
| Promo banner | 800×400 | 600×600 |
| Category banner | 1920×300 | 768×300 |
| Category tile | 600×600 | 600×600 |
| Product main image | 1200×1200 | 1200×1200 |
| Product thumbnail | 400×400 | 400×400 |
| Brand logo | 200×100 | 200×100 |
| Blog cover / social share | 1200×630 | 1200×630 |
| Favicon / app icon | 512×512 | 512×512 |

Format WebP with JPG fallback, logos and icons in SVG. Targets: hero under 200 KB, product images under 120 KB, thumbnails under 30 KB.

---

## 8. API outline

```
GET    /api/categories                      category tree
GET    /api/products?category=&brand=&q=&filters=&sort=&page=
GET    /api/products/:slug                  product page data
GET    /api/brands
GET    /api/search/suggest?q=

POST   /api/cart                            create cart
PATCH  /api/cart/:id/items                  add / change / remove item
POST   /api/checkout                        create order
GET    /api/orders/:number                  order tracking

POST   /api/auth/register | login | logout
GET    /api/me | /api/me/orders | /api/me/addresses
GET    /api/wishlist  POST /api/wishlist

# Admin (role-protected)
CRUD   /api/admin/products | categories | brands | attributes | coupons | banners | pages
POST   /api/admin/import/sage              Excel upload
GET    /api/admin/import/:id/report
PATCH  /api/admin/orders/:id/status
```

---

## 9. Search and filtering

- Each product is indexed with name, brand, category, SKU and its filterable attributes.
- The filter sidebar is built **dynamically** from `category_attributes`: if a category has the attribute `capacite_kg`, the sidebar shows a capacity filter with the available values and counts.
- Brand is a filter on every listing, and brand pages are available at `/marque/<slug>`.
- Search tolerates typos and handles French accents and product codes.

---

## 10. Non-functional requirements

### 10.1 Security
- HTTPS everywhere, HSTS, secure headers
- Passwords hashed with Argon2 or bcrypt, rate limiting on login and checkout
- Role-based access in the admin (admin, catalogue manager, order manager, read-only), with an audit log
- Input validation, parameterised queries, CSRF protection
- Card payments only through a hosted gateway page, so no card data is stored on the site
- Personal data handled in line with Moroccan law 09-08 (CNDP), including a cookie notice and privacy policy

### 10.2 Performance
- Server-side rendering and caching for category and product pages
- Images resized in several sizes and served by a CDN
- Target: main pages loading in under 2.5 seconds on a mid-range phone with 4G

### 10.3 SEO
- Clean URLs: `/gros-electromenager/machines-a-laver/<product-slug>`
- Title, meta description, Open Graph tags and `Product` structured data (price, availability, brand)
- XML sitemap, canonical URLs, breadcrumbs, 301 redirects when slugs change
- Unique text per category and per product, not copied from the brand site

### 10.4 Reliability and operations
- Daily PostgreSQL backups, tested restore, images backed up
- Separate environments: development, staging, production
- CI pipeline: tests, build, deploy through Docker
- Monitoring and alerts (uptime, errors, slow queries), centralised logs

### 10.5 Languages
French first. The database and the UI are designed so Arabic (right-to-left) can be added later without a rebuild (translation tables for names and descriptions).

---

## 11. Roadmap

| Phase | Content | Result |
|---|---|---|
| **0 — Preparation** | Confirm scope, decide custom build vs PrestaShop, clean the Excel file, confirm warehouses and prices, collect product images | Validated catalogue file |
| **1 — Catalogue** | Database, categories, brands, attributes, Excel importer, admin for products | Complete catalogue in the admin |
| **2 — Storefront** | Home, listing with filters, product page, search, brand pages | Browsable site |
| **3 — Ordering** | Cart, checkout, payments, delivery zones, customer account, order management | Orders can be placed |
| **4 — Sage sync** | Automatic stock and price sync, orders back to Sage | Stock always up to date |
| **5 — Growth** | Promotions, comparison, blog, reviews, notifications, analytics | Marketing tools |
| **6 — Launch** | Load and security tests, SEO check, training, go-live | Public launch |

---

## 12. Open questions

1. **Warehouses:** what do the 5 stock columns (DP, DD, DO, DA, DF) represent, and which of them are sold online?
2. **Family `RC`:** what does it mean?
3. **TV range:** keep TVs, receivers and accessories in version 1 (this document assumes yes)?
4. **Kitchen fittings:** keep sinks and mixer taps under *Encastrable* (this document assumes yes)?
5. **Prices:** TTC or HT in Sage? Is there a different price per customer type?
6. **Custom build or PrestaShop?**
7. **Delivery:** which cities, which carriers, and who does the installation?
8. **Payments:** which gateway (for example CMI) and is cash on delivery accepted everywhere?
9. **Images and descriptions:** who provides them, brand sites or an internal photo shoot?
10. **Invoicing:** are invoices generated by the website or only by Sage?

---

## 13. Glossary

| Term | Meaning |
|---|---|
| SKU | Unique product code, here the Sage `Ref` |
| Famille | Sage product grouping code, kept as `famille_legacy` |
| Attribute | A product characteristic (capacity, BTU, size) |
| Facet / filter | A choice in the filter sidebar, built from attributes |
| SSR | Server-side rendering: pages built on the server for speed and SEO |
| COD | Cash on delivery |