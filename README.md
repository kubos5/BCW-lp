<h1 align="center">BCW · sito</h1>

<p align="center">
  <strong>La pagina di <a href="https://github.com/kubos5/BCW">BCW</a> e il suo supporto, in Material 3 Expressive</strong>
</p>

<p align="center">
  <a href="https://github.com/kubos5/BCW">BCW per iOS</a> ·
  <a href="https://github.com/kubos5/BCW-web">BCW per Web</a> ·
  <a href="https://github.com/kubos5/BCW-android">BCW per Android</a> ·
  <a href="https://github.com/kubos5/BCW-api">Backend</a> ·
  <strong><a href="https://github.com/kubos5/BCW-lp">Sito</a></strong>
</p>

<p align="center">
  BCW non è affiliata a Gruppo Spaggiari Parma S.p.A.
</p>

---

## Pagine

- `index.html`: la pagina di BCW (funzioni, attività in diretta e widget, temi, BCW+, account BCW e server proprio, privacy, download, domande)
- `support/index.html`: il supporto (`/support`), con ricerca, risoluzione dei problemi per argomento, repository e informazioni. Ogni risposta ha un indirizzo: `support/#altstore` apre quella risposta

HTML, CSS e JavaScript senza dipendenze né compilazione, come BCW-web: basta un qualsiasi hosting statico.

## Avvio in locale

```
python3 -m http.server 8093
```

Poi apri http://localhost:8093. Serve un server (non `file://`) perché icone e forme sono in sprite SVG esterni.

## Pubblicazione

Su GitHub Pages: Impostazioni › Pages › Deploy from a branch › `main`, cartella `/`. Il file `.nojekyll` evita l'elaborazione di Jekyll. Tutti i percorsi sono relativi, quindi il sito funziona anche in una sottocartella (`https://kubos5.github.io/BCW-lp/`) o con un dominio proprio; solo `og:image` è un indirizzo assoluto (da cambiare con un dominio diverso).

## Nuova versione

### 1. Le versioni, con lo script

```
node tools/version.mjs ios 4.1
```

Si possono aggiornare più piattaforme insieme (`node tools/version.mjs android 4.0 web 4.0`). Senza argomenti, `node tools/version.mjs` mostra le versioni attuali e avvisa se in qualche punto è rimasta quella vecchia.

Lo script cambia, su entrambe le pagine:

- l'avviso "Novità" in cima alla pagina principale e il suo link alla release (`releases/tag/v…`)
- le etichette di versione delle piattaforme (sezione Scarica) e dei repository (supporto)
- la domanda "Quando arriva su App Store?"
- il riquadro "Novità di BCW …" del supporto e il suo link
- i nomi dei file d'esempio nel supporto: `BCW_v….ipa`, `BCW_v…_APPSTORE.ipa`, `BCW-….apk`

I pulsanti di download non vanno toccati: puntano a `releases/latest` e scaricano sempre l'ultima versione.

Ogni testo con una versione è marcato con `data-version="ios"`, `"android"` o `"web"`: lo script cambia il numero dentro quell'elemento, che deve contenere solo testo (niente altri tag). Per aggiungere una versione in un punto nuovo basta marcarlo così. Le frasi storiche, come "Dalla versione 4.0 i compiti…", non sono marcate e restano com'erano.

### 2. Da controllare a mano

- **Testo delle novità.** Nel supporto, la riga sotto "Novità di BCW …" descrive cosa porta la versione. Nella pagina principale, l'avviso in cima dice "sta arrivando su App Store": va cambiato se la novità è un'altra.
- **Funzioni nuove o cambiate.** Vanno aggiunte o corrette:
  - nella pagina principale: riquadri della sezione Funzioni, nastro delle funzioni sotto l'hero, Attività in diretta, Temi, domande;
  - nelle risposte del supporto (istruzioni, nomi dei menu, requisiti come "iOS 26 o successivi").
- **BCW+.** Se cambiano i testi della schermata di acquisto (`PlusPaywallView.swift`), vanno ricopiati nella sezione BCW+, insieme al prezzo se cambia.
- **Screenshot.** Vanno rifatti solo se cambia l'aspetto dell'app: `tools/shoot-ios.sh` per l'app e `tools/webshot.mjs` per il web, poi `cwebp` (vedi Strumenti).
- **Icone.** Se servono icone nuove: aggiungerle in `tools/icons.mjs` e rilanciarlo.
- **App Store.** Quando BCW sarà sull'App Store:
  - nella pagina principale, sostituire "In arrivo su App Store" con il link alla pagina dell'App Store nella scheda "iPhone e iPad", nell'hero e nella domanda "Quando arriva su App Store?";
  - aggiornare la nota sull'acquisto di BCW+ ("appena BCW sarà su App Store") e, nel supporto, l'avviso nella risposta su AltStore ("Appena BCW sarà sull'App Store…").

## Design

- Colori, font e forme sono quelli dell'app e di BCW-web: palette Tonal Spot dal rosso mattone di BCW (`#A23E2F`), Google Sans Flex con l'asse ROND, MaterialShapes, molle di M3 Expressive (`linear()`), chiaro e scuro
- La pagina parte in bianco e nero e i colori arrivano con un cerchio che si allarga dalla barra sotto il titolo, come nell'introduzione dell'app (una volta per sessione, non con le animazioni ridotte)
- Nella sezione Temi si sceglie uno dei dieci colori dell'app (o uno a piacere): la pagina intera cambia tema con un cerchio che parte dal colore toccato (View Transitions), con i colori generati da `material-color-utilities` come in BCW-web; anche il favicon e l'icona di BCW seguono il tema. Tema e modalità chiara/scura restano salvati nel browser e valgono anche per il supporto
- Lezione in corso (Dynamic Island, schermata di blocco, widget) che scorre davvero attorno all'ora attuale, simulatore "E se prendessi…" con l'anello ondulato della media (stessa geometria di `RingShape` dell'app), confronto Material 3 Expressive / Liquid Glass
- I testi di BCW+ sono quelli della schermata di acquisto dell'app (`PlusPaywallView.swift`)

## Struttura

```
index.html, support/index.html
assets/
├── css/site.css          Design system (colori, tipografia, componenti) e tutte le sezioni
├── js/theme.js           Chiaro/scuro, colore d'accento, cerchio delle View Transitions, favicon
├── js/ui.js              Pezzi comuni: barra in alto, comparsa allo scorrimento, anello della media
├── js/site.js            Pagina principale
├── js/support.js         Ricerca e filtri del supporto
├── js/vendor/            material-color-utilities (Apache 2.0), da BCW-web
├── icons.svg             Material Symbols Rounded (Apache 2.0), generato da tools/icons.mjs
├── shapes.svg            Forme di Material 3 Expressive, generato da tools/shapes.mjs
├── fonts/                Google Sans Flex (licenza OFL)
└── img/                  Icona, immagine per i social, screenshot (shots/ dell'app, web/ di BCW-web)
tools/                    Script per icone, forme e screenshot
```

## Strumenti

Gli script leggono le repo accanto a questa (`../BCW`, `../BCW-web`).

- `node tools/icons.mjs`: rigenera `assets/icons.svg` dalle icone dell'app iOS; per un'icona nuova aggiungere il nome all'elenco nello script
- `node tools/shapes.mjs`: rigenera `assets/shapes.svg` da `js/shapes.js` di BCW-web
- `tools/shoot-ios.sh <cartella>`: screenshot della demo dell'app sul simulatore (build Debug di BCW installata), in chiaro e in scuro e nei dieci colori d'accento
- `node tools/webshot.mjs …`: screenshot della demo di BCW-web con Chrome headless
- `node tools/version.mjs`: versioni scritte nel sito (vedi Nuova versione)

Gli screenshot si convertono in WebP larghi 720 px (app) e 1600 px (web):

```
cwebp -q 80 -m 6 -resize 720 0 l-dashboard.png -o assets/img/shots/l-dashboard.webp
```

I nomi iniziano con `l-` (chiaro) e `d-` (scuro); la Dashboard nei colori d'accento è `l-accent-<colore>.webp` e `d-accent-<colore>.webp`.

---

## Licenza

Distribuito con licenza MIT. Google Sans Flex è distribuito con licenza SIL Open Font License; Material Symbols e material-color-utilities con licenza Apache 2.0.
