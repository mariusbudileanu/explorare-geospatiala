# Seturi demonstrative sintetice

Toate hărțile din `method-datasets.js` folosesc date fictive, deterministe, în coordonate SVG locale. Unitățile sunt pedagogice, nu măsurători ale unor locuri reale. Fiecare lecție despre o metodă are propria geografie și temă; laboratorul separat „Același set de date, reprezentări diferite” păstrează intenționat un singur set pentru comparație.

| Set (`id`) | Metodă | Scop și variabile | Unități | Statut |
| --- | --- | --- | --- | --- |
| `water-cities` | Diagrame | Structura utilizării apei în șase orașe; `domestic`, `industry`, `services` și poziții locale | mii m³/zi | Sintetic |
| `density-regions` | Cartogramă | Clasificarea a opt poligoane; `density`, `growth` și contururi regionale | locuitori/km²; creștere în ‰ | Sintetic |
| `energy-provinces` | Cartodiagramă | Diagrame peste șapte alte provincii; `solar`, `wind`, `hydro` și contururi | GWh/an | Sintetic |
| `civic-services` | Metoda semnelor | Categorii de puncte într-un oraș schematic; `type`, nume și poziții | obiecte | Sintetic |
| `vegetation-ranges` | Metoda arealelor | Cinci pete neregulate, inclusiv categorii discontinui; `type` și traseu al arealului | suprafețe schematice | Sintetic |
| `land-cover` | Fond calitativ | Mozaic complet de nouă celule; `type` nominal și contur | categorii nominale | Sintetic |
| `urban-commutes` | Linii de mișcare | Rețea de șase centre și opt relații origine–destinație; `value` | mii călătorii/zi | Sintetic |
| `temperature-field` | Izolinii | Grilă numerică 7×7 pentru o suprafață continuă și curbe de egală valoare | °C | Sintetic |
| `rural-population` | Metoda punctului | Șase districte cu `population`; număr de puncte derivat din valoarea aleasă pentru un punct | locuitori | Sintetic |

Pozițiile punctelor statistice sunt generate reproductibil în poligoane. Ele nu indică locuințe sau persoane individuale. Nivelurile isoliniilor sunt calculate local din grila numerică. Niciun exemplu nu accesează API-uri sau date externe.
