# 🎩 Karty dżentelmenów

Wieloosobowa gra karciana w przeglądarce, w stylu *Cards Against Humanity*:
prowadzący rundy ("sędzia") losuje czarną kartę ze zdaniem z luką, reszta
graczy dobiera ze swojej ręki białą kartę z (chorą/hardkorową) odpowiedzią,
a sędzia wybiera najlepszą. Dowolna liczba graczy w jednym pokoju (polecane 3–20+).

Działa na telefonach i komputerach — każdy gracz po prostu otwiera link
w przeglądarce. Nie trzeba niczego instalować po stronie graczy.

## Jak to jest zbudowane

- **Backend:** Node.js + Express + Socket.IO (`server/server.js`) — trzyma stan
  pokoi w pamięci, rozdaje karty, pilnuje rund, liczy punkty.
- **Frontend:** czysty HTML/CSS/JS (`server/public/`) — bez frameworków i bez
  build-stepu.
- **Talia:** `server/cards/czarne.json` (pytania z luką) i
  `server/cards/biale.json` (odpowiedzi) — zwykłe pliki JSON, więc można je
  dowolnie edytować/rozszerzać bez ruszania kodu.

Ponieważ gra wymaga serwera trzymającego stan rozgrywki w czasie rzeczywistym
(WebSockety), **nie da się** jej hostować na samym GitHub Pages (to hosting
czysto statyczny). Resztę repo (`index.html`, `wariant-a.html` itd. — strona
OLGI) to zupełnie inny, niezależny projekt w tym samym repozytorium.

## Uruchomienie lokalnie

```bash
cd gra/server
npm install
npm start
```

Serwer wystartuje na `http://localhost:3000`. Otwórz ten adres w kilku kartach
przeglądarki (albo na kilku telefonach w tej samej sieci Wi-Fi, wpisując adres
IP komputera zamiast `localhost`), żeby przetestować grę z kilkoma "graczami".

## Jak zagrać

1. Pierwsza osoba wpisuje ksywkę i klika **Stwórz pokój** — dostaje 4-znakowy
   kod pokoju.
2. Reszta graczy wpisuje ksywkę i ten kod, klika **Dołącz**.
3. Gdy jest minimum 3 graczy, host klika **Zaczynamy!**.
4. W każdej rundzie jedna osoba jest sędzią (rotacja po kolei) — reszta
   dobiera odpowiedź(-i) ze swojej ręki i wysyła. Sędzia wybiera zwycięzcę.
5. Gra do 7 punktów (można zmienić w `SCORE_LIMIT` w `server.js`).

Każda faza ma limit czasu (90 s na odpowiedź, 60 s dla sędziego) — jeśli ktoś
zawiesi się z odpowiedzią, serwer dobierze coś losowo za niego, żeby gra się
nie zacięła przy większej grupie.

## Granie przez internet (nie tylko w jednej sieci Wi-Fi)

Serwer trzeba wystawić na zewnątrz — GitHub Pages tu nie pomoże (brak
backendu). Najprościej i za darmo:

- **Render.com** — "New Web Service", wskaż katalog `gra/server`, build command
  `npm install`, start command `npm start`.
- **Railway.app** / **Fly.io** — podobnie, wystarczy wskazać `gra/server` jako
  katalog aplikacji Node.
- Albo dowolny własny VPS: `cd gra/server && npm install && npm start`
  (najlepiej pod `pm2` albo w `screen`/`tmux`, żeby działało po zamknięciu
  terminala).

Po wystawieniu serwera każdy gracz wchodzi po prostu na jego publiczny adres.

## Dostosowywanie talii

Chcesz dodać/zmienić karty? Edytuj:

- `server/cards/czarne.json` — obiekty `{ "text": "...", "pick": 1 }`.
  `pick: 2` oznacza, że gracze muszą wybrać dwie białe karty (dobrze pasuje do
  zdań z dwiema lukami).
- `server/cards/biale.json` — po prostu lista tekstów (stringów).

Nie trzeba restartować niczego poza serwerem po zmianie plików.
