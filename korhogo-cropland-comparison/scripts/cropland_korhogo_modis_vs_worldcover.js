/**
 * ============================================================================
 * SUIVI DES TERRES CULTIVEES - ZONE DES SAVANES (KORHOGO / FERKESSEDOUGOU)
 * Bassin des cultures extensives de rente et vivrieres (coton, anacarde, mais).
 *
 * Source principale : ESA WorldCover v200 (2021, 10m) - classification
 * mondiale haute resolution, nettement plus fiable que MODIS Land Cover
 * en zone de savane ouest-africaine (voir note methodologique).
 * Complement : MODIS MCD12Q1 pour la tendance historique 2001-2024.
 * ============================================================================
 */

// 1. ZONE D'ETUDE - Korhogo / Ferkessedougou
var zoneAgricole = ee.Geometry.Polygon([
  [[-5.80, 9.70],
   [-5.20, 9.70],
   [-5.20, 10.2],
   [-5.80, 10.2],
   [-5.80, 9.70]]
]);
Map.centerObject(zoneAgricole, 9);
Map.addLayer(zoneAgricole, {color: 'red'}, 'Zone d\'etude', false);

// ============================================================================
// 2. CARTE PRINCIPALE : ESA WORLDCOVER (10m, 2021)
// ============================================================================
var worldCover = ee.ImageCollection('ESA/WorldCover/v200').first().clip(zoneAgricole);

var CROPLAND = 40;
var croplandMask = worldCover.select('Map').eq(CROPLAND);
var croplandOnly = worldCover.select('Map').updateMask(croplandMask);

// Palette officielle ESA WorldCover
var wcPalette = [
  '006400', 'ffbb22', 'ffff4c', 'f096ff', 'fa0000', 'b4b4b4',
  'f0f0f0', '0064c8', '0096a0', '00cf75', 'fae6a0'
];
Map.addLayer(worldCover.select('Map'), {min: 10, max: 100, palette: wcPalette},
  'ESA WorldCover 2021 (complet)', false);
Map.addLayer(croplandOnly, {palette: ['ffbb22']}, 'Terres cultivees (ESA WorldCover 2021)');

// ============================================================================
// 3. STATISTIQUES DE SURFACE (WorldCover)
// ============================================================================
var surfaceTotale = ee.Image.pixelArea().divide(1e6).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: zoneAgricole, scale: 10, maxPixels: 1e10
});
print('Surface totale de la zone (km2):', surfaceTotale);

var surfaceCropland = croplandMask.multiply(ee.Image.pixelArea()).divide(1e6).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: zoneAgricole, scale: 10, maxPixels: 1e10
});
print('Surface cultivee - ESA WorldCover 2021 (km2):', surfaceCropland);

// ============================================================================
// 4. COMPLEMENT : TENDANCE HISTORIQUE MODIS (2001-2024)
// ============================================================================
// Note methodologique : MODIS Land Cover (500m) classe cette zone a 95% en
// "Grassland" et quasiment 0% en "Cropland" au sens strict - une limite
// documentee du produit MODIS en zone de savane ouest-africaine, ou
// l'agriculture familiale morcelee/en mosaique avec jachere et paturage est
// mal separee de la savane herbeuse naturelle par cet algorithme global.
// On utilise ici la classe combinee 10 (Grassland) + 12 (Cropland) +
// 14 (Cropland/Natural Mosaic) comme proxy de "zone d'usage agro-pastoral",
// pas comme une mesure de cropland pur - la tendance temporelle relative
// reste neanmoins informative.
var modisLC = ee.ImageCollection('MODIS/061/MCD12Q1').select('LC_Type1').filterBounds(zoneAgricole);

function surfaceAgroPastoraleAnnee(image) {
  var year = ee.Date(image.get('system:time_start')).get('year');
  var mask = image.eq(10).or(image.eq(12)).or(image.eq(14)); // Grassland + Cropland + Mosaic
  var area = mask.multiply(ee.Image.pixelArea()).divide(1e6);
  var stats = area.reduceRegion({
    reducer: ee.Reducer.sum(), geometry: zoneAgricole, scale: 500, maxPixels: 1e9
  });
  return ee.Feature(null, {'annee': year, 'surface_agro_pastorale_km2': stats.get('LC_Type1')});
}

var serieTemporelle = ee.FeatureCollection(modisLC.map(surfaceAgroPastoraleAnnee));
print('Serie temporelle usage agro-pastoral MODIS (proxy, km2/an):', serieTemporelle);

var chart = ui.Chart.feature.byFeature(serieTemporelle, 'annee', 'surface_agro_pastorale_km2')
  .setChartType('LineChart')
  .setOptions({
    title: 'Tendance usage agro-pastoral (proxy MODIS, 2001-2024) - Korhogo/Ferke',
    hAxis: {title: 'Annee', format: '####'},
    vAxis: {title: 'Surface (km2)'},
    lineWidth: 3, pointSize: 6, colors: ['b58900']
  });
print(chart);

// ============================================================================
// 5. PANNEAU LEGENDE (integre visuellement)
// ============================================================================
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});
legend.add(ui.Label('Terres cultivees (ESA WorldCover 2021)', {fontWeight: 'bold', fontSize: '14px'}));
legend.add(ui.Label('Zone Korhogo / Ferkessedougou - Nord Cote d\'Ivoire', {fontSize: '11px', color: '666666'}));
var makeRow = function(color, label) {
  var colorBox = ui.Label('', {backgroundColor: color, padding: '8px', margin: '0 4px 4px 0'});
  var description = ui.Label(label, {margin: '0 0 4px 6px'});
  return ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal'));
};
legend.add(makeRow('#ffbb22', 'Terres cultivees'));
legend.add(makeRow('#006400', 'Couvert arbore (contexte)'));
legend.add(makeRow('#ffff4c', 'Prairie/savane herbeuse (contexte)'));
Map.add(legend);

// ============================================================================
// 6. EXPORTS
// ============================================================================
Export.image.toDrive({
  image: worldCover.select('Map'),
  description: 'Korhogo_ESA_WorldCover_2021',
  folder: 'GEE_Exports_Korhogo',
  region: zoneAgricole,
  scale: 10,
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'
});

Export.table.toDrive({
  collection: serieTemporelle,
  description: 'Korhogo_serie_temporelle_MODIS_proxy',
  folder: 'GEE_Exports_Korhogo',
  fileFormat: 'CSV'
});

print('Miniature carte cropland:', croplandOnly.getThumbURL({
  palette: ['ffbb22'], dimensions: 1024, region: zoneAgricole
}));
print('Miniature WorldCover complet:', worldCover.select('Map').getThumbURL({
  min: 10, max: 100, palette: wcPalette, dimensions: 1024, region: zoneAgricole
}));
