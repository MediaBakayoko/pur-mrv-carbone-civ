/**
 * ============================================================================
 * CARTE DU LEAF AREA INDEX (LAI) - ZONE PUR, COTE D'IVOIRE
 * Complement analytique a l'outil MRV carbone : le LAI (indice de surface
 * foliaire) mesure la densite du couvert vegetal, variable explicative
 * potentielle de l'heterogeneite du modele de carbone (R2 = 0.28).
 *
 * Source : produit MODIS MOD15A2H (LAI/FPAR, 500m, composite 8 jours) et/ou
 * estimation via relation empirique NDVI -> LAI sur Sentinel-2 (10m).
 * ============================================================================
 */

// 1. ZONE D'ETUDE - identique a l'outil carbone MRV
var punto = ee.Geometry.Point([-6.593, 5.785]);
var zone = punto.buffer(10000); // 10 km
Map.centerObject(zone, 12);

var annee_debut = '2024-01-01';
var annee_fin = '2024-12-31';

// ============================================================================
// 2. LAI HAUTE RESOLUTION VIA SENTINEL-2 (relation empirique NDVI -> LAI)
// ============================================================================
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000)
      .copyProperties(image, ['system:time_start']);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(zone)
  .filterDate(annee_debut, annee_fin)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(maskS2clouds);

print('Nombre images Sentinel-2 disponibles 2024:', s2.size());

var composite = s2.median().clip(zone);

var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');

// Relation empirique NDVI -> LAI (modele exponentiel, calibration
// couramment utilisee en teledetection foret tropicale - source :
// Turner et al. 1999 / adaptation forets tropicales denses)
// LAI = -ln((0.95 - NDVI) / 0.95) / k  avec k coefficient d'extinction ~0.5
var k = 0.5;
var lai_s2 = ee.Image(0.95).subtract(ndvi)
  .divide(0.95)
  .log()
  .multiply(-1)
  .divide(k)
  .rename('LAI_S2')
  .clamp(0, 8); // LAI plausible foret tropicale : 0 a ~7-8

// ============================================================================
// 3. LAI MODIS (produit officiel, validation croisee, 500m)
// ============================================================================
var modisLai = ee.ImageCollection('MODIS/061/MOD15A2H')
  .filterBounds(zone)
  .filterDate(annee_debut, annee_fin)
  .select('Lai_500m')
  .mean()
  .multiply(0.1) // facteur d'echelle officiel MODIS
  .clip(zone)
  .rename('LAI_MODIS');

// ============================================================================
// 4. MASQUE VEGETATION (comme dans l'outil carbone)
// ============================================================================
var vegMask = ndvi.gt(0.3);
var lai_s2_masked = lai_s2.updateMask(vegMask);

// ============================================================================
// 5. VISUALISATION - palette professionnelle (meme esprit que le carbone)
// ============================================================================
var laiPalette = [
  '#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850', '#006837'
];
var visLai = {min: 0, max: 6, palette: laiPalette};

Map.addLayer(composite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3}, 'Composite vraies couleurs', false);
Map.addLayer(lai_s2_masked, visLai, 'LAI (Sentinel-2, 10m)');
Map.addLayer(modisLai, visLai, 'LAI MODIS (500m, reference)', false);

// ============================================================================
// 6. PANNEAU LEGENDE (integre visuellement, meme style que le carbone)
// ============================================================================
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});
legend.add(ui.Label('Leaf Area Index (LAI)', {fontWeight: 'bold', fontSize: '14px'}));
legend.add(ui.Label('Zone PUR - Cote d\'Ivoire - 2024', {fontSize: '11px', color: '666666'}));

var makeRow = function(color, label) {
  var colorBox = ui.Label('', {
    backgroundColor: color, padding: '8px', margin: '0 4px 4px 0'
  });
  var description = ui.Label(label, {margin: '0 0 4px 6px'});
  return ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal'));
};

var laiSteps = [
  ['#d73027', '0 - 1  (sol nu / tres faible couvert)'],
  ['#fc8d59', '1 - 2  (couvert clairseme)'],
  ['#fee08b', '2 - 3  (couvert modere)'],
  ['#d9ef8b', '3 - 4  (couvert moyen-dense)'],
  ['#91cf60', '4 - 5  (couvert dense)'],
  ['#1a9850', '5 - 6  (couvert tres dense)'],
  ['#006837', '> 6  (foret dense multi-etage)']
];
laiSteps.forEach(function(item) {
  legend.add(makeRow(item[0], item[1]));
});
Map.add(legend);

// ============================================================================
// 7. STATISTIQUES DE SYNTHESE
// ============================================================================
var statsLai = lai_s2_masked.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', true)
    .combine(ee.Reducer.minMax(), '', true),
  geometry: zone,
  scale: 10,
  maxPixels: 1e9
});
print('Statistiques LAI (Sentinel-2, zone vegetalisee):', statsLai);

var statsModis = modisLai.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: zone,
  scale: 500,
  maxPixels: 1e9
});
print('LAI moyen MODIS (reference, 500m):', statsModis);

var surfaceVeg = vegMask.multiply(ee.Image.pixelArea()).divide(10000)
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: zone, scale: 10, maxPixels: 1e9});
print('Surface vegetalisee (ha):', surfaceVeg);

// ============================================================================
// 8. EXPORTS
// ============================================================================
Export.image.toDrive({
  image: lai_s2_masked,
  description: 'PUR_LAI_Sentinel2_2024',
  folder: 'GEE_Exports_PUR',
  region: zone,
  scale: 10,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: composite.select(['B4', 'B3', 'B2']),
  description: 'PUR_Composite_VraiesCouleurs_2024_LAI',
  folder: 'GEE_Exports_PUR',
  region: zone,
  scale: 10,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// Export miniature PNG pour rapport/LinkedIn (visualisation directe)
print('Miniature LAI:', lai_s2_masked.getThumbURL({
  min: 0, max: 6, palette: laiPalette, dimensions: 1024, region: zone
}));
print('Miniature composite:', composite.getThumbURL({
  bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3, dimensions: 1024, region: zone
}));
