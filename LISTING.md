# Fiche Chrome Web Store (brouillon, à valider par le fondateur)

**Nom** : Tech Stack & Hiring Profiler
**Catégorie** : Developer Tools (ou Productivity)
**Langue** : anglais (texte ci-dessous). Le français est possible ensuite via `_locales`.

## Description courte (≤ 132 caractères)
See the tech stack of any website in one click, 100% locally. Pro: open jobs from the company's ATS + CSV/JSON export.

## Description longue
Find out what a website is built with, and whether the company is hiring.

FREE
• Detects ~100 technologies: CMS, e-commerce platforms, JavaScript frameworks, analytics, ad pixels, marketing automation, live chat, payments, cookie consent, monitoring, CDN.
• Shows versions when visible, a confidence level and the evidence behind each match.
• Runs entirely in your browser. No account, no tracking, no browsing data sent anywhere.

PRO
• Hiring tab: finds the company's applicant tracking system (Greenhouse, Lever, Ashby, Recruitee, Workable, SmartRecruiters, Teamtailor, Personio) and lists its open jobs from the ATS's public job-board API, with a link to each original posting.
• Hiring signal: number of open jobs, jobs posted in the last 30 days, top departments.
• Export the stack and the jobs to CSV or JSON.
• Personal data (emails, phone numbers, personal profile links) is masked.

Who it's for: sales and business development teams qualifying accounts, agencies, recruiters, investors, developers.

Not affiliated with any of the detected vendors or ATS providers.

## Justification des permissions (champ « Privacy practices »)
- activeTab: read the current page only when the user opens the popup.
- scripting: run the local detection script in that tab.
- storage: store the Pro license key locally.
- Optional host permissions (ATS public APIs): requested only when the user clicks "Find open jobs", to read public job listings.
- Remote code: none.
- Data usage: no user data collected or transmitted. Certifier « does not collect user data ».

## Captures prévues (1280×800, 5 max)
Aucune n'est encore faite. Il faut un Chrome avec affichage, absent de la VM.
1. Popup « Technologies » sur un site e-commerce : catégories, versions, confiance.
2. Survol d'une technologie qui montre ses preuves.
3. Onglet Recrutement sur un site qui utilise Greenhouse : signal et liste d'offres.
4. Export CSV ouvert dans un tableur.
5. Onglet License : activation hors ligne, aucun compte.

Tuile promo 440×280 à faire. L'icône 128 est dans icons/icon128.png.

## Prix (proposé, à valider)
- **Gratuit** : détection.
- **Pro** : 4,99 $/mois ou 39 $/an, licence à vie 79 $. Ces montants n'ont pas été comparés aux concurrents (budget IA épuisé ce mois). Aucune tâche Finance ne fixe ce prix (#55 annulé).
- **Encaissement** : le Chrome Web Store n'encaisse plus de paiements. Il faut un canal externe pour vendre les clés : Gumroad, Lemon Squeezy, ou toute boutique qui livre un texte, à choisir par le fondateur. La clé se génère avec `node tools/license.js issue --days 365`. Il n'y a pas encore d'émission automatique : il faudra soit une émission manuelle, soit un petit webhook (hors MVP).
- **Inscription** : un compte développeur Chrome Web Store est nécessaire (frais d'inscription uniques), côté fondateur.
