# Tech Stack & Hiring Profiler (extension Chrome, MV3)

Profileur de technologies 100 % local. L'onglet Recrutement (Pro) liste les offres ouvertes de l'entreprise via les API publiques de son ATS. Not affiliated with any detected vendor or ATS provider.

## Fonctions
- **Gratuit** : détection d'environ 100 technologies (CMS, e-commerce, frameworks JS, analytics, pixels, marketing automation, chat, paiement, consentement, monitoring, CDN), avec la version, un niveau de confiance et les preuves. Empreintes écrites par NORESPI, aucune base tierce copiée.
- **Pro** :
  - Onglet Recrutement : détection de l'ATS (Greenhouse, Lever, Ashby, Recruitee, Workable, SmartRecruiters, Teamtailor, Personio), offres ouvertes et signal d'embauche (nombre d'offres, offres publiées sur 30 jours, départements).
  - Export CSV et JSON.
  - Workday n'est pas pris en charge (ses conditions l'interdisent).

## Vie privée
- L'analyse se fait dans le navigateur. Aucune donnée de navigation n'est envoyée à NORESPI ni à un tiers.
- Aucun compte, aucune télémétrie.
- L'onglet Recrutement, sur clic de l'utilisateur seulement, appelle l'API publique de l'ATS avec l'identifiant de l'entreprise. Il lit aussi au plus quelques pages du même site, par exemple /careers.
- Les e-mails, téléphones et liens de profils personnels sont masqués dans les offres (`src/lib/privacy.js`, copie d'ats-jobs-by-company).
- Les requêtes sont plafonnées à 40 par analyse. Sur 403 ou 429, l'extension s'arrête sans réessayer.

## Permissions
| Permission | Pourquoi |
|---|---|
| `activeTab` | Lire l'onglet courant, et seulement quand l'utilisateur ouvre la popup. Aucun accès permanent aux sites. |
| `scripting` | Injecter la lecture du DOM et des variables globales dans cet onglet. |
| `storage` | Garder la clé de licence en local. |
| `optional_host_permissions` (domaines des API des 8 ATS) | Demandées seulement au premier clic sur « Find open jobs ». Elles servent à lire les offres publiques. |

Pas de `host_permissions` obligatoires, pas de content script permanent, pas de service worker.

## Licence Pro
- Format de la clé : `TSH1.<payload>.<signature>`, signature ECDSA P-256.
- La vérification se fait hors ligne avec la clé publique (`src/license-public.js`).
- Le payload contient un identifiant aléatoire et une date d'expiration, sans e-mail.
- Outil vendeur :
  - `node tools/license.js init` : crée la paire de clés, déjà fait. La clé privée est dans `secrets/tech-stack-hiring/`, hors de ce dossier, et n'est jamais poussée.
  - `node tools/license.js issue --days 365` : émet une clé.

## Développement
```
npm test          # node:test, 9 tests
npm run icons     # régénère icons/*.png
npm run zip       # paquet pour le Chrome Web Store
```
Pour charger l'extension : chrome://extensions, activer le mode développeur, puis « Charger l'extension non empaquetée » et choisir ce dossier.

## Limites
- La détection repose sur des signatures. Une technologie absente de la page analysée, ou rendue côté serveur sans trace, n'est pas vue.
- Les ATS non pris en charge (Workday, iCIMS, Taleo…) ne sont pas détectés.
- Le risque restant est noté selon la règle données v2. On utilise les API publiques documentées des job boards ATS, sans compte. Toute demande de retrait d'une source est traitée sous 7 jours.
