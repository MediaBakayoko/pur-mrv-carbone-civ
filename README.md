# PUR MRV Carbone - Cote d'Ivoire

Outil d'estimation du stock de carbone de la biomasse aerienne (AGB) pour
les projets d'agroforesterie de PUR en Cote d'Ivoire, construit sur Google
Earth Engine (GEE).

## Objectif

Fournir un outil d'aide a la decision de type **MRV** (Monitoring, Reporting,
Verification) pour suivre le stock de carbone d'une zone d'intervention
agroforestiere :

- **Monitoring** : composite Sentinel-2 annuel rejouable (variable `YEAR`
  dans le script), pour suivre l'evolution du couvert vegetal et de la
  biomasse dans le temps.
- **Reporting** : statistiques agregees (stock total en tonnes de carbone,
  densite moyenne en tC/ha, surface vegetalisee), exportables en CSV/GeoTIFF
  pour un rapport de projet.
- **Verification** : le modele est valide sur un jeu de test independant
  (20% des points, jamais vus a l'entrainement), avec calcul du R2 et du
  RMSE affiches systematiquement dans la console GEE - pas de chiffre
  cache, la fiabilite du modele est visible a chaque execution.

## Methode

1. **Zone d'etude** : point PUR (lat 5.785, lon -6.593), zone d'analyse en
   buffer de 10 km, contexte national via `FAO/GAUL/2015/level0`.
2. **Predicteurs** : composite median Sentinel-2 sans nuages (masquage via
   QA60), bandes B2/B3/B4/B8/B11/B12, indices NDVI et NDWI, plus texture
   GLCM sur le NDVI (contraste, variance, entropie) pour capter
   l'heterogeneite structurale de la canopee.
3. **Reference terrain (verite de calibration)** : points de mesure reels
   **GEDI L4A** (biomasse aerienne mesuree par lidar spatial, NASA/ISS),
   filtres sur les flags qualite officiels (`l4_quality_flag=1`,
   `degrade_flag=0`). Plus de 40 000 points identifies dans un rayon de
   60 km autour du site, dont ~640 directement dans la zone d'analyse.
4. **Modele** : Random Forest en regression (`ee.Classifier.smileRandomForest`,
   200 arbres), entraine sur 80% des points GEDI, valide sur les 20%
   restants.
5. **Sortie** : carte continue du stock de carbone (tC/ha), masquee sur la
   vegetation (NDVI > 0.3), avec palette rouge (zones anthropiques) a vert
   fonce (foret dense).

## Resultats obtenus (annee de reference 2024)

| Indicateur | Valeur |
|---|---|
| Densite moyenne de carbone | ~60 tC/ha |
| Stock total estime (zone 10 km) | ~1 648 000 tonnes de carbone |
| Surface vegetalisee analysee | ~30 900 ha |
| R2 du modele (validation independante) | ~0.28 |
| RMSE | ~81 Mg/ha |

## Limite methodologique assumee

Le R2 du modele (~0.28) reste modeste malgre une calibration sur de vraies
mesures terrain GEDI. Ce n'est pas un defaut d'implementation : c'est une
limite documentee de la teledetection optique en foret tropicale dense, ou
le signal Sentinel-2 **sature** au-dela d'environ 150-200 tC/ha (les
variations de biomasse ne se traduisent plus par des variations de
reflectance detectables).

**Recommandations pour un MRV certifiable (VCS, Gold Standard, etc.)** :

1. Integrer des donnees radar (Sentinel-1, ALOS PALSAR-2), qui saturent
   moins que l'optique en foret dense.
2. Calibrer avec des placettes de terrain (inventaire forestier PUR,
   equations allometriques locales).
3. Utiliser directement l'interpolation des points GEDI comme reference
   la ou leur densite le permet, plutot qu'un modele Sentinel-2 seul.

La carte produite doit etre lue comme un outil de **repérage spatial des
zones a fort/faible stock de carbone relatif**, utile pour prioriser les
interventions agroforestieres, et non comme un chiffre certifiable en
l'etat pour un credit carbone.

## Complement : cartographie du Leaf Area Index (LAI)

Script : `scripts/lai_pur.js` — cartes : `maps/lai/`

Le LAI (indice de surface foliaire) mesure la densite du couvert vegetal et
sert de variable exploratoire pour comprendre l'heterogeneite du modele de
carbone (R2 = 0.28) : une zone a LAI tres variable est mecaniquement plus
difficile a modeliser par un signal optique seul.

Methode : estimation LAI a 10m par relation empirique NDVI (Sentinel-2,
modele exponentiel a coefficient d'extinction k=0.5, calibration usuelle
foret tropicale), avec le produit officiel MODIS MOD15A2H (500m) comme
reference de controle.

Resultats 2024 sur la zone PUR (buffer 10 km) :

| Indicateur | Valeur |
|---|---|
| LAI moyen (Sentinel-2, 10m) | 2,25 (ecart-type 0,69, min 0,76, max 4,61) |
| LAI moyen (MODIS, reference officielle 500m) | 1,07 |
| Surface vegetalisee analysee | ~27 900 ha |

**Limite methodologique assumee** : le LAI estime par Sentinel-2 est environ
2 fois superieur au produit MODIS de reference sur cette zone. C'est une
limite documentee de la relation empirique NDVI -> LAI, qui a tendance a
surestimer en couvert dense (saturation du signal optique, meme phenomene
que celui identifie dans le modele de carbone). A traiter comme un
indicateur **relatif** de densite de couvert (utile pour comparer des zones
entre elles), pas comme une mesure LAI absolue calibree. Seulement 3 images
Sentinel-2 disponibles sans nuage sur 2024 pour cette zone (contre 9 pour le
carbone), ce qui limite egalement la robustesse temporelle de l'estimation.

## Utilisation

1. Ouvrir [Google Earth Engine Code Editor](https://code.earthengine.google.com).
2. Copier-coller le contenu de `scripts/mrv_carbone_pur.js` (carbone) ou
   `scripts/lai_pur.js` (LAI).
3. Cliquer sur **Run**.
4. Consulter la Console pour les statistiques (R2/RMSE pour le carbone,
   moyenne/ecart-type pour le LAI).
5. Onglet **Tasks** : lancer les exports (GeoTIFF) vers Google Drive.
6. Pour le monitoring annuel suivant : changer la variable `YEAR`/date en
   tete de script et relancer. Comparer les resultats d'une annee sur
   l'autre permet de suivre l'evolution dans le temps.

## Structure du depot

```
scripts/
  mrv_carbone_pur.js      Script GEE carbone AGB (JavaScript, Code Editor)
  lai_pur.js              Script GEE LAI (JavaScript, Code Editor)
maps/
  01_carte_carbone_AGB_tCha.png       Carte du stock de carbone (tC/ha)
  02_NDVI_controle.png                NDVI de controle
  03_composite_vraies_couleurs.png    Composite Sentinel-2 vraies couleurs
  04_points_GEDI_verite_terrain.png   Localisation des points GEDI utilises
  lai/
    01_carte_LAI_2024.png             Carte du LAI (Sentinel-2, 10m)
    02_composite_vraies_couleurs_2024.png  Composite de reference
docs/
  Rapport_MRV_Carbone_PUR.docx        Rapport d'interpretation complet
```

## Sources de donnees

- Sentinel-2 Niveau 2A : `COPERNICUS/S2_SR_HARMONIZED` (ESA/Copernicus)
- GEDI L4A (biomasse aerienne) : `LARSE/GEDI/GEDI04_A_002` (NASA)
- MODIS LAI/FPAR : `MODIS/061/MOD15A2H` (NASA)
- Frontieres administratives : `FAO/GAUL/2015/level0`

## Auteur

Media Marcel Bakayoko - Geographe, expert SIG, MRV, Data et GeoAI.
