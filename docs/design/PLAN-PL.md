# PokéSurvivor — projekt rozszerzenia i audyt balansu

Stan: projekt, bez zmian zasad rozgrywki. Baza: `5bbc3b29288d6af4596f21188fb8b54e0e9b739f`.
Cel: kilka konkurencyjnych stylów walki, kanoniczne formy i czytelne wydarzenia bez inflacji obrażeń.

## 1. Co już istnieje
Canvas 2D, vanilla JS, bez procesu budowania podczas gry. Edytowalne źródła są ładowane przez dev.html; index.html i app.min.js są generowane. Cztery sloty ruchów, aktywny slot, więzi umożliwiające wspólne rzucanie ruchów, poziomy 1–5 i ewolucje ruchów. Nie należy mylić tych ostatnich z ewolucją gatunku.
Rift przenosi drużynę do areny legendarnego Pokémona (limit 120 s), daje więź. Jest mechanizm zwiększania szansy otwarcia po nieudanych losowaniach. Istnieją już hordy typów, złota godzina, eskorta, złodzieje skarbów, pogoda, przedmioty i Sentencja Arceusa przy 30 min.
Współpracą zarządza host. Nowe systemy muszą respektować ten model, stan zapisów i aktualizator wersji.

## 2. Potwierdzone problemy i liczby
Źródła: enemy.js applyPoison/applyBurn/update, combat.js hit/collide, enemies.js bossScale, rift.js spawnLegend, moves.js ladders/evolve.

Obecne nominalne DPS przy S stackach:
- Poison: `(0.012 × H × S + 1) / 0.6`, H = maksymalne HP celu.
- Burn: `1.6 × S × (1 + 0.06 × poziom) / 0.5`.
Oba statusy mają limit 8; kolejne nałożenie odświeża wspólny czas (4 s / 3 s). Poison nie wymaga utrzymywania wysokiego ataku gracza. Dodatkowe HP bossów i drużyny wzmacnia też jego obrażenia.

| HP celu | Poison 8 DPS | Burn 8 DPS, lvl 40 | H / Poison DPS |
|---:|---:|---:|---:|
| 100 | 17.67 | 87.04 | 5.66 s |
| 1 000 | 161.67 | 87.04 | 6.19 s |
| 10 000 | 1 601.67 | 87.04 | 6.24 s |
| 24 800 | 3 969.67 | 87.04 | 6.25 s |
| 54 000 | 8 641.67 | 87.04 | 6.25 s |

24 800 HP to rzeczywisty wariant solo legendarnego riftu w 40. minucie według formuły, ale rift nie otwiera się po 28. minucie: to punkt ekstrapolacji, nie dostępne normalnie spotkanie. 54 000 HP to zwykły boss ostatniego slotu przy pojawieniu w 15. minucie: round(16 000 × 1.35) × (1 + 900/600). 10 000 i pozostałe punkty są kontrolowanymi scenariuszami, nie konkretnymi gatunkami. Rzeczywisty rift w 20. minucie ma 14 000 HP solo i około 2241.67 Poison DPS przy 8 stackach.

To analiza ustalonego stanu, bez rozruchu stacków, trafień, tarcz i zabicia celu. Pierwszy tick jest natychmiastowy; TTK z tabeli jest ilorazem, a nie dokładnym czasem zabicia. Nie dowodzi, że Poison wygrywa każdy możliwy build, lecz pokazuje źródło jego przewagi przeciw wysokiemu HP.

Dodatkowe ustalenia:
- hit i collide nakładają status po hurt bez sprawdzenia odporności. Steel może dostać Poison mimo mnożnika typu 0. hurt wymusza minimum 1 obrażeń, więc odporność typu także wymaga osobnej korekty w ścieżce obrażeń.
- DOT wywołuje hurt bez onDealt i dmgDealt właściciela; porównywanie statystyk buildów jest niepełne. Nie włączać automatycznie lifesteal/proców dla DOT: grozi pętlami.
- Zegar ticków jest zerowany do interwału zamiast zachowywać resztę. Izolowany test prawdziwego bloku statusów, 10 s, H=24 800, stałe 8 stacków: 30 FPS = 38 112 obrażeń; 60/144 FPS = 40 494. Mock nie zabija celu, aby mierzyć ticki. Różnica obejmuje kwantyzację i granice okna; potrzebny dłuższy test i różne fazy startowe.

## 3. Projekt Poison v1 — kandydat do strojenia
Nie przenosimy turowego procentu HP wprost na tick co 0.6 s. Kanoniczne nazwy i odporności pozostają; wartości czasu są adaptacją do survivor.

Proponowany całkowity DPS statusu na celu:
`D = (S / 8) × min(0.025 × H, 0.35 × B)`.
B = referencyjny DPS pojedynczego celu źródłowego ruchu bez DOT, crit, przewagi typu i proców; obliczany z danych ruchu, poziomu, ewolucji i ataku/recargi właściciela w momencie aplikacji. Dla pocisków używamy jednej trafiającej sztuki na salwę; aura/trail/orbit mają jawny referencyjny interwał trafienia. Nigdy nie estymować B z faktycznie otrzymanych obrażeń celu ani z obrażeń Poison: brak sprzężenia zwrotnego.

Przy B=300 DPS pełne 8 stacków daje 2.5 / 25 / 105 / 105 / 105 DPS dla HP z powyższej tabeli. To celowo mocne ograniczenie, nie zatwierdzony końcowy balans. Przy 54 000 HP spadek wynosi około 98.8%; samo osłabienie statusu bez retuningu ruchów byłoby ryzykowne. Na neutralnym bossie status powinien odpowiadać za około 15–35% łącznego DPS zestawu Poison; próg weryfikujemy pomiarem, nie deklaracją.

Stacki maksymalnie 8 na cel, wspólne dla drużyny. Każdy ma właściciela, B i czas 4 s; ponowna aplikacja odświeża najstarszy własny stack, a przy pełnej puli zastępuje najsłabszy tylko mocniejszym. W puli bierzemy B najsilniejszego żywego stacka; całkowity D dzielimy proporcjonalnie do B stacków, po normalizacji. Host nadaje identyfikator aplikacji i rozlicza obrażenia raz. Brak czterokrotnego mnożenia limitu przez graczy. Testować fairness tej polityki; potencjalnie osobne pule per gracz, ale tylko z globalnym limitem celu.
Poison i Steel są odporne na zwykłe zatrucie; Fire na oparzenie. Inne wyjątki wyłącznie jawnie w danych umiejętności. Odporność oznacza zero, przed zaokrągleniem i statusem. DOT nie krytuje, nie kopiuje się przez więzi i nie uruchamia kolejnego DOT/proców.
Burn początkowo pozostaje punktem odniesienia; następnie otrzymuje skalowanie źródłem i rolę stabilnego DOT z ograniczeniem kontaktowego ataku przeciwnika (propozycja 10%, boss 5%). Nie łączyć tego automatycznie z redukcją wszystkich pocisków.
Poison ma nagradzać utrzymanie kontaktu; ucieczka po jednym trafieniu nie może zabijać każdego bossa. Pojedyncze czasy stacków uniemożliwiają utrzymywanie całej puli jednym słabym trafieniem.
Zegar: akumulator reszty, obsługa wszystkich należnych ticków, również przy spadku FPS, z ustaloną kolejnością wygaśnięcie/tick. Pauza nie nalicza czasu. Host jest jedynym autorytetem. Testy skoków dt nie mogą tracić obrażeń.

## 4. Bezpośrednie obrażenia i budżet mocy
Audyt uruchamia prawdziwe instance/levelUp/evolve z moves.js. Dla lvl 5 + ewolucja, atk=1, neutralnie, bez crit i DOT:

| Ruch | DPS jednej trafiającej sztuki/salwę | Górna granica 5 trafień/salwę |
|---|---:|---:|
| Ember | 120.46 | 602.31 |
| Sludge | 98.60 | 493.00 |
| Poison Sting | 81.88 | 409.41 |
| Water Gun | 110.73 | 553.64 |
| Thunder Shock | 113.10 | 565.50 |

Górna granica nie jest realnym DPS: rozrzut, kolizje, przebicie i rozmiar przeciwnika zmieniają liczbę trafień. Nie mnożyć jej przez liczbę celów bez symulacji geometrii. Podnoszenie dmg Poison o 20–35% jest tylko zakresem do przeszukania po nerfie DOT, nie zaplanowanym bezwarunkowym buffem.
Zmierzyć trail: nakładające się kałuże i ich niezależne ticki; orbit rehit; mine liczba trafianych celów; Hex i statusy; cooldown minimum 0.05; więzi 1–4 ruchów; crit i leczenie. Poison ma wygrywać dłuższe walki przy inwestycji, burst krótkie, AoE hordy, kontrola przeżycie.
Nie dodawać globalnego STAB 1.5 w tym samym patchu: zmieni wszystkie istniejące wyniki. Ewentualny STAB stanowi oddzielny eksperyment z retuningiem i dedykowanym UI.

## 5. Kanoniczny rozwój Pokémonów
### Mega Evolution — pierwszy pakiet
Podstawa kanoniczna: Key Stone trenera + właściwy Mega Stone, tylko kompatybilny gatunek. Źródło: https://pokemonletsgo.pokemon.com/en-us/story/ i https://mega.pokemon.com/en-us/ .
Adaptacja tej gry: wybór specjalizacji na run, maksymalnie jedna Mega forma, do końca runu. Nie przenosić formy do kolekcji jako osobnego złapanego gatunku. Kamień zajmuje slot przedmiotu; nie kumuluje się z Choice przedmiotem w tym samym slocie. Odblokowanie po pierwszej próbie Mega Sanctuary, później kamień pojawia się jako gwarantowany wybór dla kwalifikującego się partnera po 8. minucie. Brak losowania kamieni obcych gatunków.
MVP: Venusaur, Charizard X/Y (wybór jednej formy), Blastoise, Gengar, Lucario. Każda forma osobny rekord: formId, baseDex, typy, modyfikatory, pasywna zdolność, zasoby sprite. Brak substytutu w postaci samego przemalowania; brak assetu blokuje wypuszczenie danej formy.
Cel mocy netto: +20–30% realnego DPS albo porównywalna przeżywalność względem konkurencyjnego przedmiotu. Nie dodawać po +30% ataku, tempa i liczby pocisków jednocześnie.
- Mega Venusaur / Thick Fat: odporność na Fire/Ice zamiast dodatkowego mnożnika Poison; nigdy ponad uzgodniony limit redukcji.
- Mega Charizard X: Fire/Dragon, Tough Claws tylko ruchy oznaczone contact, kandydat +20%.
- Mega Charizard Y: Drought inicjuje istniejący sun; konflikt pogodowy rozstrzyga host. Nie sumować słońc.
- Mega Blastoise: Mega Launcher tylko jawnie oznaczone pulse/aura ruchy, kandydat +25%; nie wszystkie Water.
- Mega Gengar: Shadow Tag ogranicza ruch zwykłych celów w pobliżu, boss tylko krótsze spowolnienie; brak bezwarunkowego unieruchomienia bossa.
- Mega Lucario: Adaptability wymaga najpierw osobnego wdrożenia STAB. Dlatego forma w drugim podpakiecie, bez podmieniania kanonicznej zdolności na dowolny buff.
Wartości procentowe powyżej są adaptacją, nie liczbami z gier Pokémon.

### Kolejne specjalizacje, wykluczające się z Mega w danej runie
Z-Moves: Z-Ring i zgodny Z-Crystal, pojedyncze użycie na run; mocna salwa zamiast aktywnego rzutu, bez dodatkowych proców i bez kopiowania przez więź. Startowy budżet = 6 s referencyjnego DPS ruchu, limit jednego trafienia na cel. Źródło jednorazowości: https://www.nintendo.com/en-gb/News/2016/August/Z-Moves-and-undiscovered-Pokemon-announced-for-Pokemon-Sun-and-Pokemon-Moon-1128345.html .
Terastalizacja: osobny późniejszy pakiet po przygotowaniu STAB; Tera Orb, jawny typ obronny i reguły zachowania oryginalnego STAB. Najpierw projekt i sprawdzenie aktualnych źródeł, bez udawania, że samo +damage to kanoniczna terastalizacja.
Dynamax/Gigantamax: później — obecny system rozmiaru sprite i aren wymaga walidacji kolizji. Prototyp czasowej transformacji 30 s, oddzielny limit HP i Max Moves; nie uruchamiać wraz z Mega/Z/Tera.
Ewolucje gatunku i kamienie ewolucyjne: oddzielny pakiet z grafem gatunków i wyjątkami; bez kasowania stałych ulepszeń partnera i bez automatycznej migracji dex zapisów.

## 6. Wydarzenia
Wspólny EventDirector: jedna duża aktywność naraz, host wybiera seed i wynik. Nie rozpoczynać podczas bossa, riftu ani Sentencji; ostatnie dwie minuty przed Sentencją bez nowych aktywności. Odroczenie zamiast utraty zaplanowanego eventu. Arena i eskorta pauzują konkurencyjne zegary. W co-op wejście do opcjonalnej areny przez gotowość drużyny (15 s), bez teleportu zaskoczonego partnera.

| Event | Cel i czas | Nagroda | Koszt/porażka |
|---|---|---|---|
| Mega Sanctuary | 3 obeliski i mini-boss; 75 s | zgodny Mega Stone albo wybór zwykłego przedmiotu dla niekompatybilnego gatunku | brak kamienia, powrót bez utraty kolekcji |
| Rocket Ambush | 3 telegraphed fale i dowódca; 60 s | zwrot skradzionych w runie zasobów + wybór TM | odliczanie, żadnej kradzieży trwałych walut |
| Space-Time Distortion | arena z rotacją 2 typów i widocznym ostrzeżeniem; 90 s | wybór jednego ruchu z jawnej puli | powrót, bez kaskady kolejnych riftów |
| Berry Grove | obrona drzewa, 45 s, alternatywa dla walki z bossem | wybór berry: leczenie lub jednorazowe oczyszczenie statusów | mniejszy zbiór, bez ujemnych nagród |

Rift zostaje głównym źródłem więzi; pozostałe eventy nie dają dodatkowych więzi, aby nie podwajać tempa rozwoju. Jedna nagroda na eventId/playerId, odporna na ponowione pakiety. Minimum 120 s pomiędzy dużymi eventami, wstępny budżet maksymalnie 4 nowe duże aktywności na 30 min. Nie podnosić jednocześnie istniejącego tempa riftów. W MVP wdrożyć tylko Sanctuary i Rocket; pozostałe po testach tempa.

## 7. Usprawnienia towarzyszące
- Podsumowanie obrażeń: ruch, direct/DOT, faktycznie zdjęte HP, absorpcja, uptime, owner; nie liczyć overkill jako efektywnego DPS.
- HUD stacków i wygaśnięcia, odporność jako komunikat, nie mylące „1 damage”.
- Opcjonalne ostrzeżenia typu/climate i prognoza zmiany mocy na karcie ulepszenia.
- Seedowane scenariusze treningowe; bez nagród i wpisów rankingowych.
- Ograniczenie liczby pól, pooling i profilowanie 64 przeciwników + co-op + 4 linked moves; optymalizacja dopiero po pomiarze.
- Nowe klawisze i przyciski mobile dla transformacji; podpowiedź zgodna z ustawieniami sterowania.
- Fork: odłączyć domyślny zapis/ranking od Firebase oryginału przed publicznym uruchomieniem; guest offline domyślnie. Osobny namespace zapisów i kopia eksportu przed migracją. Zachować credits i licencje; sprawdzić warunki obu plików licencji przed dystrybucją.

## 8. Walidacja i kolejność wdrożenia
1. Fork na koncie użytkownika, branch design/balance; zapis audytu i bazowego SHA. Fork potwierdzony: https://github.com/gaijwin/pokesurvivor . Dokumentacja trafia na osobną gałąź; bez publikacji gry.
2. P0: instrumentacja, odporności, zegar ticków i deterministyczny benchmark; bez zmian mocy. Dane bazowe osobno.
3. P1: Poison v1, indywidualne stacki i ownership, retuning direct Poison, HP bossów tylko jeśli pomiary to uzasadniają. Osobny patch, możliwy rollback.
4. P2: EventDirector + Sanctuary i Mega (początkowo bez Lucario/STAB). Zapis wersjonowany, synchronizacja hosta, zasoby.
5. P3: Rocket, UI, dostępność, pomiary wydajności. Dopiero potem Z-Moves, Tera i dalsze eventy.

Macierz benchmarku: minuty 2/8/15/25/30, poziomy 10/25/40/60 jako kontrolowane wejścia, 1/2/4 graczy, boss i horda 8/32/64 celów, ruch lvl1/lvl5/evolved, więzi 1/2/4, neutral/weak/immune, pogoda, tarcza, shiny, niskie i wysokie ulepszenia stałe. Scenariusze muszą rozróżniać legalnie osiągalne buildy od stress testów.
Porównywać te same legalne budżety ulepszeń i przedmiotów, minimum 30 wspólnych seedów na reprezentatywny build. Rejestrować medianę i p90 TTK, DPS effective, czas przeżycia, procent DOT, uptime, krzywą stacków i czas ukończenia eventów. Realne geometrie ruchu bossa i kałuż, nie wyłącznie nieruchomy manekin.
Kryteria startowe (cele projektu, nie wyniki): neutralny boss, porównywalna inwestycja, mediany TTK konkurencyjnych archetypów w ±15%; Poison ma obszary przewagi i słabości; nie wygrywa wszystkich scenariuszy. Powtarzalność DOT na 30/60/144 FPS w granicach pojedynczego ticka na granicy okna; brak utraty ticków na długim dt; co-op zero podwójnych nagród i obrażeń; 30-min run bez regresji zapisu i Sentencji. Dodatkowy koszt nowego eventu maksymalnie 2 ms p95 klatki względem tej samej sceny bazowej na ustalonym urządzeniu referencyjnym.
Testy jednostkowe: limit/expiry, immunity, cap HP i B, attribution po śmierci właściciela, brak proc recursion, disconnect/rejoin, wielokrotne komunikaty, zmiana formy i powrót z areny. Playtest desktop/mobile + eksport/import starego save.
Przy zmianach gry aktualizować changelog ES/EN. Wydanie zgodnie z CLAUDE.md: edycja dev.html, node tools/build.js, node tools/export_data.js, python tools/make_seo_pages.py. Nie usuwać updatera. Nie wypychać do upstream.

## 9. Co zostało faktycznie sprawdzone
`node tools/balance-audit.cjs` zakończone poprawnie. Wynik: balance-results.json. Skrypt sprawdza użyte wzory w źródle, uruchamia prawdziwe funkcje rozwoju ruchów i prawdziwy blok ticków statusów w izolacji. Nie jest pełną symulacją walki ani testem gry w przeglądarce. Wartości kandydackie nie są wdrożone. Fork GitHub potwierdzony: https://github.com/gaijwin/pokesurvivor . Plan i audyt są publikowane na gałęzi design/balance; nie wdrażano zmian gry.
