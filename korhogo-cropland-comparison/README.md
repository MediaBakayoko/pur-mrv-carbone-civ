# Limites des produits globaux de land cover en zone de savane ouest-africaine

Etude de cas comparative **MODIS Land Cover** vs **ESA WorldCover** sur le
bassin agricole de Korhogo / Ferkessedougou (Zone des Savanes, Nord de la
Cote d'Ivoire) — coton, anacarde, cultures vivrieres.

## Constat central

MODIS Land Cover (MCD12Q1, 500m) classe **95,3%** de la zone en
*Grassland* et seulement **0,05%** en *Cropland* (2024), alors qu'ESA
WorldCover (10m, 2021) identifie **36,0%** de terres cultivees sur la
meme zone geographique — un ecart de plus de 700 fois.

La serie temporelle MODIS 2001-2024 montre une **derive de classification
progressive** (Cropland : 29,8 km2 en 2001 -> moins de 2 km2 des 2004,
Grassland : 84,5% -> 95,3%), incompatible avec l'expansion agricole reelle
connue de la region (la Cote d'Ivoire est devenue 1er producteur mondial
d'anacarde sur cette meme periode).

## Explication methodologique

A 500m de resolution, un pixel MODIS agrege plusieurs hectares — dans un
paysage d'agriculture familiale morcelee (parcelles de 0,5 a 3 ha en
mosaique avec jachere, paturage et arbres eparses), le signal spectral
moyen ressemble a de la prairie herbeuse plutot qu'a une monoculture, d'ou
la sur-classification systematique en *Grassland*. La resolution de 10m
d'ESA WorldCover reduit fortement cet effet de melange spectral.

## Contenu

```
scripts/
  cropland_korhogo_modis_vs_worldcover.js   Script GEE complet (JS, Code Editor)
maps/
  01_worldcover_complet_2021.png            Classification ESA WorldCover complete
  02_cropland_seul_2021.png                 Terres cultivees isolees (WorldCover)
  03_derive_modis_cropland_2001_2024.png    Graphique : derive MODIS 2001-2024
  04_comparaison_modis_worldcover.png       Graphique comparatif des 3 estimations
data/
  donnees_completes.json                    Histogrammes de classes (2001/2012/2024)
                                             + serie temporelle complete (JSON brut)
docs/
  Rapport_Comparaison_MODIS_WorldCover_Korhogo.docx   Rapport complet
                                             (base pour article scientifique)
```

## Reproductibilite

1. Ouvrir [Google Earth Engine Code Editor](https://code.earthengine.google.com).
2. Copier-coller `scripts/cropland_korhogo_modis_vs_worldcover.js`.
3. Adapter le polygone `zoneAgricole` a toute autre zone d'interet pour
   repliquer la comparaison.

## Sources de donnees

- MODIS Land Cover Type : `MODIS/061/MCD12Q1` (NASA)
- ESA WorldCover v200 (2021) : `ESA/WorldCover/v200` (Agence spatiale europeenne)

## Auteur

Media Marcel Bakayoko — Geographe, expert SIG, MRV, Data et GeoAI.
