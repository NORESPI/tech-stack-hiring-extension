// Empreintes de technologies écrites par NORESPI (aucune base tierce copiée).
// Signaux possibles (tous lus localement dans l'onglet actif, rien n'est envoyé) :
//   scripts : regex sur les URL des <script src>
//   links   : regex sur les URL des <link href> (feuilles de style, polices, preconnect)
//   html    : regex sur le HTML de la page (tronqué)
//   meta    : { nom_meta: regex } sur le contenu des balises <meta name|property>
//   globals : chemins de variables globales (monde MAIN), ex. 'Shopify' ou 'React.version'
//   dom     : sélecteurs CSS
//   flags   : indicateurs calculés par le collecteur (reactFiber, vueApp)
//   version : chemin global ou attribut DOM ({ selector, attr }) donnant la version
//   implies : technologies impliquées
// Le premier groupe capturant d'une regex, s'il existe, donne la version.

export const CATEGORIES = [
    'CMS', 'Ecommerce', 'JavaScript framework', 'JavaScript library', 'UI framework', 'Analytics', 'Tag manager',
    'Advertising', 'Marketing automation', 'Live chat', 'Payments', 'A/B testing', 'Consent management',
    'Monitoring', 'Search', 'Fonts', 'Video', 'CDN / hosting', 'Security', 'Reviews', 'Scheduling',
];

export const FINGERPRINTS = [
    // CMS
    { name: 'WordPress', category: 'CMS', meta: { generator: /WordPress\s*([\d.]+)?/i }, html: /\/wp-content\/|\/wp-includes\//, globals: ['wp'] },
    { name: 'Drupal', category: 'CMS', meta: { generator: /Drupal\s*(\d+)?/i }, html: /\/sites\/default\/files\//, globals: ['Drupal'] },
    { name: 'Joomla', category: 'CMS', meta: { generator: /Joomla!?\s*([\d.]+)?/i } },
    { name: 'Wix', category: 'CMS', meta: { generator: /Wix\.com/i }, scripts: /static\.parastorage\.com/, html: /static\.wixstatic\.com/ },
    { name: 'Squarespace', category: 'CMS', html: /static1\.squarespace\.com|squarespace-cdn\.com/, globals: ['Static.SQUARESPACE_CONTEXT'] },
    { name: 'Webflow', category: 'CMS', meta: { generator: /Webflow/i }, dom: ['html[data-wf-site]', 'html[data-wf-page]'] },
    { name: 'Ghost', category: 'CMS', meta: { generator: /Ghost\s*([\d.]+)?/i } },
    { name: 'HubSpot CMS', category: 'CMS', meta: { generator: /HubSpot/i } },
    { name: 'Framer', category: 'CMS', meta: { generator: /Framer\s*([\w.]+)?/i }, html: /framerusercontent\.com/ },
    { name: 'Contentful', category: 'CMS', html: /(?:images|assets|videos)\.ctfassets\.net/ },
    { name: 'Sanity', category: 'CMS', html: /cdn\.sanity\.io/ },

    // E-commerce
    { name: 'Shopify', category: 'Ecommerce', scripts: /cdn\.shopify\.com/, html: /cdn\.shopify\.com/, globals: ['Shopify.shop'] },
    { name: 'WooCommerce', category: 'Ecommerce', meta: { generator: /WooCommerce\s*([\d.]+)?/i }, scripts: /\/plugins\/woocommerce\//, html: /\bwoocommerce-(?:page|cart|js)\b/, implies: ['WordPress'] },
    { name: 'Magento', category: 'Ecommerce', html: /\/static\/version\d+\/frontend\/|Magento_Ui\/js/, scripts: /\/mage\/requirejs\//, globals: ['Mage'] },
    { name: 'BigCommerce', category: 'Ecommerce', html: /cdn\d*\.bigcommerce\.com/, globals: ['BCData'] },
    { name: 'PrestaShop', category: 'Ecommerce', meta: { generator: /PrestaShop/i }, globals: ['prestashop'] },
    { name: 'Salesforce Commerce Cloud', category: 'Ecommerce', html: /demandware\.static|\/on\/demandware\.store\// },

    // Frameworks JS
    { name: 'Next.js', category: 'JavaScript framework', dom: ['script#__NEXT_DATA__'], html: /\/_next\/static\//, globals: ['__NEXT_DATA__', 'next.version'], version: 'next.version', implies: ['React'] },
    { name: 'Nuxt', category: 'JavaScript framework', globals: ['__NUXT__', '$nuxt'], html: /\/_nuxt\//, implies: ['Vue.js'] },
    { name: 'Gatsby', category: 'JavaScript framework', meta: { generator: /Gatsby\s*([\d.]+)?/i }, dom: ['#___gatsby'], implies: ['React'] },
    { name: 'Remix', category: 'JavaScript framework', globals: ['__remixContext'], implies: ['React'] },
    { name: 'Astro', category: 'JavaScript framework', meta: { generator: /Astro\s*v?([\d.]+)?/i }, dom: ['astro-island'] },
    { name: 'SvelteKit', category: 'JavaScript framework', html: /\/_app\/immutable\/|data-sveltekit-/, implies: ['Svelte'] },
    { name: 'Svelte', category: 'JavaScript framework', html: /class="[^"]*\bsvelte-[a-z0-9]{5,}/ },
    { name: 'React', category: 'JavaScript framework', globals: ['React.version'], version: 'React.version', flags: ['reactFiber'], dom: ['[data-reactroot]'] },
    { name: 'Vue.js', category: 'JavaScript framework', globals: ['Vue.version'], version: 'Vue.version', flags: ['vueApp'], dom: ['[data-v-app]'] },
    { name: 'Angular', category: 'JavaScript framework', dom: ['[ng-version]'], version: { selector: '[ng-version]', attr: 'ng-version' } },
    { name: 'AngularJS', category: 'JavaScript framework', globals: ['angular.version.full'], version: 'angular.version.full', dom: ['[ng-app]'] },
    { name: 'Ember.js', category: 'JavaScript framework', globals: ['Ember.VERSION'], version: 'Ember.VERSION' },

    // Bibliothèques JS
    { name: 'jQuery', category: 'JavaScript library', globals: ['jQuery.fn.jquery'], version: 'jQuery.fn.jquery', scripts: /jquery[.-]?([\d]+\.[\d.]+)?(?:\.min)?\.js/i },
    { name: 'Alpine.js', category: 'JavaScript library', globals: ['Alpine.version'], version: 'Alpine.version' },
    { name: 'htmx', category: 'JavaScript library', globals: ['htmx.version'], version: 'htmx.version', scripts: /htmx(?:\.org)?[^/]*\.js/ },
    { name: 'Lodash', category: 'JavaScript library', globals: ['_.VERSION'], version: '_.VERSION', scripts: /lodash(?:\.min)?\.js/ },
    { name: 'GSAP', category: 'JavaScript library', globals: ['gsap.version'], version: 'gsap.version', scripts: /gsap(?:\.min)?\.js/ },

    // UI
    { name: 'Bootstrap', category: 'UI framework', scripts: /bootstrap(?:\.bundle)?(?:\.min)?\.js/, links: /bootstrap(?:\.min)?\.css/ },
    { name: 'Tailwind CSS', category: 'UI framework', links: /tailwind/i, html: /--tw-(?:ring|shadow|translate|bg-opacity)/ },
    { name: 'Font Awesome', category: 'Fonts', links: /font-?awesome/i, scripts: /kit\.fontawesome\.com/ },
    { name: 'Google Fonts', category: 'Fonts', links: /fonts\.googleapis\.com|fonts\.gstatic\.com/ },
    { name: 'Adobe Fonts', category: 'Fonts', links: /use\.typekit\.net/, scripts: /use\.typekit\.net/ },

    // Analytics
    { name: 'Google Analytics', category: 'Analytics', scripts: /google-analytics\.com\/(?:analytics|ga)\.js|googletagmanager\.com\/gtag\/js/, globals: ['gtag', 'ga'] },
    { name: 'Google Tag Manager', category: 'Tag manager', scripts: /googletagmanager\.com\/gtm\.js/, html: /googletagmanager\.com\/ns\.html/, globals: ['google_tag_manager'] },
    { name: 'Adobe Experience Platform Tags', category: 'Tag manager', scripts: /assets\.adobedtm\.com/ },
    { name: 'Segment', category: 'Analytics', scripts: /cdn\.segment\.com\/analytics\.js/ },
    { name: 'Mixpanel', category: 'Analytics', scripts: /cdn\.mxpnl\.com|mixpanel-[\d.-]+(?:\.min)?\.js/, globals: ['mixpanel'] },
    { name: 'Amplitude', category: 'Analytics', scripts: /cdn\.amplitude\.com/, globals: ['amplitude'] },
    { name: 'Hotjar', category: 'Analytics', scripts: /static\.hotjar\.com/, globals: ['hj'] },
    { name: 'Microsoft Clarity', category: 'Analytics', scripts: /clarity\.ms\/tag/, globals: ['clarity'] },
    { name: 'Plausible', category: 'Analytics', scripts: /plausible\.io\/js/ },
    { name: 'Matomo', category: 'Analytics', scripts: /matomo\.js|piwik\.js/, globals: ['_paq', 'Matomo'] },
    { name: 'Heap', category: 'Analytics', scripts: /cdn\.heapanalytics\.com/, globals: ['heap'] },
    { name: 'PostHog', category: 'Analytics', scripts: /posthog/i, globals: ['posthog'] },
    { name: 'FullStory', category: 'Analytics', scripts: /fullstory\.com\/s\/fs\.js|edge\.fullstory\.com/, globals: ['_fs_namespace'] },
    { name: 'Cloudflare Web Analytics', category: 'Analytics', scripts: /static\.cloudflareinsights\.com/ },
    { name: 'Vercel Analytics', category: 'Analytics', scripts: /\/_vercel\/insights|va\.vercel-scripts\.com/ },

    // Publicité
    { name: 'Meta Pixel', category: 'Advertising', scripts: /connect\.facebook\.net\/[^/]+\/fbevents\.js/, globals: ['fbq'] },
    { name: 'LinkedIn Insight Tag', category: 'Advertising', scripts: /snap\.licdn\.com\/li\.lms-analytics/, globals: ['_linkedin_partner_id'] },
    { name: 'TikTok Pixel', category: 'Advertising', scripts: /analytics\.tiktok\.com/, globals: ['ttq'] },
    { name: 'Google Ads', category: 'Advertising', scripts: /googleadservices\.com|googleads\.g\.doubleclick\.net/ },
    { name: 'X (Twitter) Pixel', category: 'Advertising', scripts: /static\.ads-twitter\.com/ },
    { name: 'Reddit Pixel', category: 'Advertising', scripts: /redditstatic\.com\/ads\/pixel/ },

    // Marketing automation
    { name: 'HubSpot', category: 'Marketing automation', scripts: /js\.hs-scripts\.com|js\.hsforms\.net|js\.hs-analytics\.net|js\.hscollectedforms\.net/, globals: ['_hsq'] },
    { name: 'Marketo', category: 'Marketing automation', scripts: /munchkin\.marketo\.net/, globals: ['Munchkin'] },
    { name: 'Pardot', category: 'Marketing automation', scripts: /pi\.pardot\.com/, globals: ['piAId'] },
    { name: 'Klaviyo', category: 'Marketing automation', scripts: /static\.klaviyo\.com/, globals: ['_learnq'] },
    { name: 'Mailchimp', category: 'Marketing automation', scripts: /chimpstatic\.com|list-manage\.com/ },
    { name: 'ActiveCampaign', category: 'Marketing automation', scripts: /trackcmp\.net/ },

    // Chat / support
    { name: 'Intercom', category: 'Live chat', scripts: /widget\.intercom\.io|js\.intercomcdn\.com/, globals: ['Intercom'] },
    { name: 'Zendesk', category: 'Live chat', scripts: /static\.zdassets\.com/, globals: ['zE'] },
    { name: 'Drift', category: 'Live chat', scripts: /js\.driftt\.com/, globals: ['drift'] },
    { name: 'Crisp', category: 'Live chat', scripts: /client\.crisp\.chat/, globals: ['$crisp'] },
    { name: 'Tawk.to', category: 'Live chat', scripts: /embed\.tawk\.to/, globals: ['Tawk_API'] },
    { name: 'LiveChat', category: 'Live chat', scripts: /cdn\.livechatinc\.com/, globals: ['LiveChatWidget'] },
    { name: 'Freshworks', category: 'Live chat', scripts: /wchat\.freshchat\.com|widget\.freshworks\.com/ },

    // Paiement
    { name: 'Stripe', category: 'Payments', scripts: /js\.stripe\.com/, globals: ['Stripe'] },
    { name: 'PayPal', category: 'Payments', scripts: /paypal\.com\/sdk\/js|paypalobjects\.com/ },
    { name: 'Adyen', category: 'Payments', scripts: /checkoutshopper-[a-z]+\.adyen\.com/ },
    { name: 'Klarna', category: 'Payments', scripts: /klarnacdn\.net|js\.klarna\.com/ },

    // A/B testing
    { name: 'Optimizely', category: 'A/B testing', scripts: /cdn\.optimizely\.com/, globals: ['optimizely'] },
    { name: 'VWO', category: 'A/B testing', scripts: /visualwebsiteoptimizer\.com/, globals: ['_vwo_code'] },

    // Consentement
    { name: 'OneTrust', category: 'Consent management', scripts: /cdn\.cookielaw\.org|optanon/i, globals: ['OneTrust'] },
    { name: 'Cookiebot', category: 'Consent management', scripts: /consent\.cookiebot\.com/, globals: ['Cookiebot'] },
    { name: 'Didomi', category: 'Consent management', scripts: /sdk\.privacy-center\.org/, globals: ['Didomi'] },
    { name: 'Axeptio', category: 'Consent management', scripts: /static\.axept\.io/ },
    { name: 'Usercentrics', category: 'Consent management', scripts: /usercentrics\.eu/, globals: ['UC_UI'] },

    // Monitoring
    { name: 'Sentry', category: 'Monitoring', scripts: /browser\.sentry-cdn\.com|js\.sentry-cdn\.com/, globals: ['__SENTRY__'] },
    { name: 'Datadog RUM', category: 'Monitoring', scripts: /datadoghq-browser-agent\.com/, globals: ['DD_RUM'] },
    { name: 'New Relic', category: 'Monitoring', scripts: /js-agent\.newrelic\.com/, globals: ['NREUM'] },

    // Recherche, vidéo, divers
    { name: 'Algolia', category: 'Search', scripts: /algoliasearch|cdn\.jsdelivr\.net\/npm\/algolia/, html: /\.algolia\.net|\.algolianet\.com/ },
    { name: 'YouTube', category: 'Video', html: /youtube(?:-nocookie)?\.com\/embed\// },
    { name: 'Vimeo', category: 'Video', html: /player\.vimeo\.com/ },
    { name: 'Wistia', category: 'Video', scripts: /fast\.wistia\.(?:com|net)/ },
    { name: 'Cloudflare', category: 'CDN / hosting', html: /\/cdn-cgi\// },
    { name: 'Amazon CloudFront', category: 'CDN / hosting', html: /[a-z0-9]+\.cloudfront\.net/ },
    { name: 'jsDelivr', category: 'CDN / hosting', scripts: /cdn\.jsdelivr\.net/ },
    { name: 'unpkg', category: 'CDN / hosting', scripts: /unpkg\.com/ },
    { name: 'cdnjs', category: 'CDN / hosting', scripts: /cdnjs\.cloudflare\.com/ },
    { name: 'reCAPTCHA', category: 'Security', scripts: /google\.com\/recaptcha|recaptcha\/api\.js|gstatic\.com\/recaptcha/ },
    { name: 'hCaptcha', category: 'Security', scripts: /hcaptcha\.com\/1\/api\.js/ },
    { name: 'Trustpilot', category: 'Reviews', scripts: /widget\.trustpilot\.com/ },
    { name: 'Calendly', category: 'Scheduling', scripts: /assets\.calendly\.com/ },
];

// Listes à transmettre au collecteur (sélecteurs DOM et variables globales à tester)
export function collectorSpec(fps = FINGERPRINTS) {
    const selectors = new Set();
    const globals = new Set();
    const attrs = [];
    for (const f of fps) {
        for (const s of f.dom || []) selectors.add(s);
        for (const g of f.globals || []) globals.add(g);
        if (typeof f.version === 'string') globals.add(f.version);
        if (f.version && typeof f.version === 'object') attrs.push(f.version);
    }
    return { selectors: [...selectors], globals: [...globals], attrs };
}
