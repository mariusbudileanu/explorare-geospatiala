# Licențe software terțe

## GeographicLib geodesic 2.2.0

- Componentă: `js/vendor/geographiclib-geodesic.min.js`, copie locală, 32.204 bytes; fără CDN runtime.
- Funcție: distanță și arie geodezică pe elipsoid WGS 84 în Laborator Proiecții & CRS. Proj4js rămâne responsabil pentru transformările CRS.
- Autor: Charles F. F. Karney; licență MIT/X11, [textul integral](js/vendor/GEOGRAPHICLIB_LICENSE.txt).
- Sursă: [proiectul oficial](https://github.com/geographiclib/geographiclib-js), pachetul `geographiclib-geodesic` 2.2.0; integritatea SHA-512 a arhivei a fost verificată înaintea extragerii.
- SHA-256 distribuție minificată: `06e3512904b346575f475f14d0b27ea0979dbcd2b0eddebf5f1eeefd234395b5`.
- [Documentație oficială](https://geographiclib.sourceforge.io/html/js/). Biblioteca și notificarea sa nu sunt relicențiate prin licențele conținutului platformei.

## Proj4js 2.22.0

- Componentă: `js/vendor/proj4.js` (copie locală, utilizată fără CDN).
- Autorii și textul complet al licenței: [`js/vendor/PROJ4_LICENSE.md`](js/vendor/PROJ4_LICENSE.md).
- Sursă: [pachetul Proj4js](https://www.npmjs.com/package/proj4).
- Tip: licență permisivă de tip MIT, cu notificarea originală păstrată.

Licența MIT din [`LICENSE`](LICENSE) acoperă numai codul original al website-ului. [`CONTENT_LICENSE.md`](CONTENT_LICENSE.md) aplică CC BY 4.0 numai conținutului educațional original. Niciuna nu schimbă termenii componentelor sau materialelor terțe.

## Biblioteci pentru Provocări GIS

- **Leaflet 1.9.4**, BSD 2-Clause, pentru harta interactivă. Distribuția locală și notificarea completă: [`js/vendor/leaflet/LICENSE`](js/vendor/leaflet/LICENSE). [Proiectul Leaflet](https://leafletjs.com/download.html).
- **Turf.js 7.4.0**, MIT, pentru geoprocesare vectorială. Distribuția locală și notificarea completă: [`js/vendor/TURF_LICENSE.txt`](js/vendor/TURF_LICENSE.txt). [Documentația Turf](https://turfjs.org/).
- **GeoTIFF.js 2.1.3**, MIT, copyright EOX IT Services GmbH, pentru decodarea GeoTIFF în browser. Distribuția locală: `js/vendor/geotiff.js`; [licența completă](js/vendor/GEOTIFF_LICENSE.txt). [Proiectul și documentația oficială](https://geotiffjs.github.io/geotiff.js/).

Distribuția GeoTIFF include decodoare și utilitare cu termeni proprii. [Notificările dependențelor](js/vendor/GEOTIFF_DEPENDENCY_LICENSES.txt) păstrează MIT, Zlib, BSD 3-Clause și CC0, iar [textul Apache 2.0](js/vendor/APACHE_2_LICENSE.txt) acoperă componentele LERC (Esri) și web-worker. Intervalele de versiune declarate de GeoTIFF sunt consemnate separat de versiunea fixată a distribuției; nu sunt prezentate drept versiuni exacte ale modulelor interne.

Fișierele runtime sunt păstrate local; harta și analizele nu necesită un CDN sau un serviciu de tile-uri extern.

## Materiale citate și date externe

Manualul istoric, documentația QGIS, referințele EPSG și sursele de date sunt atribuite în [`ATTRIBUTION.md`](ATTRIBUTION.md). Linkurile și includerea unei figuri ori capturi nu transferă drepturile asupra materialului terț. Termenii sursei respective continuă să se aplice; seturile GIS complete pentru curs nu sunt incluse în repository.

Subseturile școlare și medicale pentru Provocări GIS păstrează **CC BY 4.0**, confirmată în metodologiile surselor, și atribuirea Observatorului Urban Metropolitan București / ADIZMB. Celelalte subseturi au starea licenței consemnată în [documentația datelor](data/challenges/README.md); o licență neconfirmată nu este înlocuită de MIT sau CC BY 4.0.
