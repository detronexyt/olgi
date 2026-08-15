# OLGI — dwie propozycje graficzne

Statyczna strona, bez frameworków i bez build-stepu. Wgrywasz pliki — działa.

```
index.html        ← strona porównawcza A / B (na czas wyboru; noindex)
wariant-a.html    ← Wariant A — "Editorial" (jasny)
wariant-b.html    ← Wariant B — "Kontrast" (ciemny)
fonts.css         ← lokalne @font-face
fonts/            ← pliki .woff2 (Inter, Newsreader, Space Grotesk, IBM Plex Mono)
img/              ← tu wrzuć zdjęcia realizacji
robots.txt, sitemap.xml, .nojekyll
```

**Po wyborze wariantu:** skopiuj wybrany plik na `index.html` (nadpisując porównanie)
i skasuj drugi wariant.

```bash
cp wariant-a.html index.html && rm wariant-b.html   # albo wariant-b
```

---

## Czym różnią się warianty

|  | **A — Editorial** | **B — Kontrast** |
|---|---|---|
| Tło | złamana biel `#FAFAF7` | grafit `#0D0D0C` |
| Akcent | ceglany `#B4441F` | piaskowy `#C9B79A` |
| Typografia | Inter + kursywa Newsreader | Space Grotesk, wersaliki |
| Charakter | spokojny, redakcyjny | zdecydowany, techniczny |
| Kadry realizacji | pionowe 4:5 | poziome 16:11 |
| Dla kogo | marki premium, food & beauty | klienci przemysłowi, duże nakłady |

Treść, struktura sekcji, SEO i JSON-LD są w obu wariantach **identyczne**.

---

## GitHub Pages — tak, da się

Strona jest w 100% statyczna, więc GitHub Pages nadaje się tu idealnie:
darmowy hosting, darmowy certyfikat HTTPS, własna domena, CDN.

### 1. Repozytorium

Pliki są już w repo <https://github.com/detronexyt/olgi> (publiczne — na darmowym
planie GitHub Pages działa tylko w repo publicznych; Pages w repo prywatnym
wymaga planu Pro / Team).

### 2. Włączenie Pages

W repo leży workflow `.github/workflows/pages.yml`, który po każdym pushu na
`main` wysyła całą zawartość repo na Pages. Jednorazowo trzeba wskazać źródło:

`Settings → Pages → Source: GitHub Actions`

Po ~minucie strona jest pod `https://detronexyt.github.io/olgi/`.
To dobry adres na czas wybierania wariantu.

Kolejne deploye lecą same przy każdym pushu na `main`; ręcznie można je odpalić
z zakładki `Actions → Deploy to GitHub Pages → Run workflow`.

### 3. Własna domena olgi.pl

W repo utwórz plik `CNAME` (bez rozszerzenia) o treści:

```
olgi.pl
```

Potem w panelu DNS (nazwa.pl) ustaw dla domeny **olgi.pl** cztery rekordy A:

```
A   @   185.199.108.153
A   @   185.199.109.153
A   @   185.199.110.153
A   @   185.199.111.153
```

oraz dla `www`:

```
CNAME   www   detronexyt.github.io.
```

Na koniec `Settings → Pages → Custom domain: olgi.pl` i zaznacz **Enforce HTTPS**
(certyfikat pojawia się do ~24 h, zwykle w kilkanaście minut).

**Uwaga:** usuń w nazwa.pl stare przekierowanie/frameset na majew.pl, inaczej
domena dalej będzie ładować ramkę zamiast nowej strony.

### Czego GitHub Pages nie zrobi

- **Brak PHP i backendu** — formularz kontaktowy musi iść przez zewnętrzną usługę
  (patrz niżej). To jedyna realna różnica względem hostingu w nazwa.pl.
- Limity: repo do 1 GB, strona do 1 GB, ~100 GB transferu miesięcznie.
  Dla strony wizytówki — nieosiągalne.
- Brak logów serwera. Statystyki przez Google Analytics / Plausible.

Alternatywy o identycznej prostocie, ale z obsługą formularzy „z pudełka”:
**Netlify** (Netlify Forms) lub **Vercel**. Limity darmowych planów zmieniały się
ostatnio kilka razy — warto sprawdzić aktualny cennik przed decyzją.

---

## Zdjęcia realizacji

Kafelki w sekcji „Realizacje” to placeholdery. Żeby wstawić zdjęcia:

1. wrzuć pliki do `img/`,
2. w każdej karcie podmień `<div class="ph">…</div>` na:

```html
<img src="img/realizacja-1.jpg" alt="Opis opakowania" loading="lazy">
```

Proporcje: **4:5** (np. 1200 × 1500 px) w wariancie A, **16:11** (np. 1600 × 1100 px)
w wariancie B. Format `.webp` da najszybsze ładowanie.

To samo dotyczy zdjęcia w sekcji „Zespół” — gotowa, zakomentowana linijka
`<img src="img/marcin.jpg" alt="Marcin Majewski">` jest już w kodzie.

---

## Formularz kontaktowy

Domyślnie formularz otwiera program pocztowy (`mailto:`). Żeby wysyłał normalnie,
podmień otwarcie `<form>` na:

```html
<form action="https://formspree.io/f/TWOJ_ID" method="POST">
```

Darmowe usługi: Formspree, Web3Forms, Netlify Forms.

---

## Fonty

Fonty są **wgrane lokalnie** (`fonts/`), a nie ładowane z CDN Google.
Dwa powody: szybsze ładowanie (brak dodatkowego połączenia) oraz RODO —
niemiecki wyrok (LG München I, 2022) uznał osadzanie Google Fonts z CDN
za przekazywanie adresu IP bez zgody. Przy stronie z formularzem i checkboxem
zgody lepiej nie mieć tego tematu.

Pliki obejmują zakresy `latin` + `latin-ext`, czyli pełne polskie znaki.

---

## Do uzupełnienia przed startem

- **Polityka prywatności** — checkbox przy formularzu odwołuje się do dokumentu,
  którego nie ma. Przy zbieraniu danych to wymóg RODO.
- **Dane firmy w stopce** — NIP, forma prawna, adres. Podnosi wiarygodność w B2B
  i pomaga w lokalnym SEO.
- **Numer telefonu** — obecnie jedynym kanałem jest e-mail.
- **Nazwy klientów / marek** przy realizacjach, jeśli umowy na to pozwalają.
- **Obraz OG** — `og:image` nie jest ustawiony; warto dodać `img/og.jpg`
  (1200 × 630 px) i wpisać go w `<meta property="og:image">`, żeby linki
  ładnie wyglądały na LinkedIn.
