# Publikacja — 3 minuty

Repozytorium git jest już zainicjowane, pliki zacommitowane na gałęzi `main`.
Zostały dwa kroki.

## Wariant 1 — GitHub Pages (git w terminalu)

1. Załóż puste repo na <https://github.com/new>
   nazwa: `olgi-pl`, widoczność **Public**, **nie** zaznaczaj „Add a README”.

2. W folderze z plikami:

```bash
git remote add origin https://github.com/detronexyt/olgi-pl.git
git push -u origin main
```

3. `Settings → Pages → Source: Deploy from a branch → main / (root) → Save`

Po minucie: `https://detronexyt.github.io/olgi-pl/`

## Wariant 1b — GitHub bez terminala

Zamiast kroku 2: na stronie pustego repo kliknij **„uploading an existing file”**
i przeciągnij całą **zawartość** folderu (nie sam folder). Uwaga — plik `.nojekyll`
jest ukryty, w macOS pokażesz go skrótem `Cmd + Shift + .`

## Wariant 2 — Netlify Drop (najszybsze, bez konta git)

Wejdź na <https://app.netlify.com/drop> i przeciągnij folder z plikami.
Adres HTTPS dostajesz od razu. Domenę olgi.pl podpinasz w
`Site settings → Domain management`.

Tu od razu działa też formularz kontaktowy — wystarczy dodać `netlify`
do znacznika `<form>`:

```html
<form name="kontakt" method="POST" data-netlify="true">
```

## Domena olgi.pl (GitHub Pages)

Plik `CNAME` z treścią `olgi.pl` w repo, a w panelu DNS nazwa.pl:

```
A   @   185.199.108.153
A   @   185.199.109.153
A   @   185.199.110.153
A   @   185.199.111.153
CNAME   www   detronexyt.github.io.
```

Potem `Settings → Pages → Custom domain: olgi.pl` + **Enforce HTTPS**.

**Zanim to zrobisz — skasuj w nazwa.pl stare przekierowanie na majew.pl.**
Dopóki tam jest, olgi.pl będzie ładować ramkę zamiast nowej strony.

## Po wyborze wariantu graficznego

```bash
cp wariant-a.html index.html && rm wariant-b.html   # albo wariant-b
git add -A && git commit -m "Wybrany wariant A" && git push
```
