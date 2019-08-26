//Params
///Module imports
var getImagesLib = require('users/USFS_GTAC/modules:getImagesLib.js');

var startYear = 2010;
var endYear = 2019;


var startJulian = ee.Date.fromYMD(1900,6,21).getRelative('day','year').add(1).getInfo();
var endJulian  = ee.Date.fromYMD(1900,9,22).getRelative('day','year').add(1).getInfo();

// var zoneList = [1,2,3,4,5,10,12,13,19,31];
var zoneList = [12];
var canopyCollection = 'users/Shree1175/CODA_Canopy/FinalCollection';
var msaOutlines = 'users/Shree1175/CODA_assets/MSA_UrbanCities_USA2018_biome_final2019_updated';

var tempReducer = ee.Reducer.mean();
var canopyReducer = ee.Reducer.fixedHistogram(0, 3, 3)
///////////////////////////////////////////////////////////////////////////////
//Load asset with City Boundaries with 102 records, but we are mapping forest for only for 100 dropped 2 cities in PR
//////////////////////////////////////////////////////////////////////////////

var msas =ee.FeatureCollection(msaOutlines).filter(ee.Filter.inList('zone',zoneList));


var blocks = ee.FeatureCollection('TIGER/2010/Blocks').filterBounds(msas);


var canopy = ee.ImageCollection(canopyCollection).filterBounds(msas).mosaic().unmask()
canopy = getImagesLib.setNoData(canopy.clip(msas),2);

var ls = getImagesLib.getProcessedLandsatScenes(msas,startYear,endYear,startJulian,endJulian).select(['temp']).median().clip(msas);

Map.addLayer(canopy,{min:0,max:2,palette:'000,0F0,F00'},'Canopy',false);
Map.addLayer(blocks,{},'Blocks',false)




// function summarizeAreas(areas,image,scale,propertyNameOut,reducer){
//   var props = ee.Feature(areas.first()).propertyNames();
//   print(props);
//   Map.addLayer(areas);
//   Map.addLayer(image);
//   var stats = image.reduceRegions(areas, reducer, scale, crs, null, 1) ;
 
//   // stats = stats.map(function(f){
//   //   var hist = f.get('histogram');
//   //   f  = f.select(props);
//   //   return f.set(propertyName,hist)});
//   return stats
// }


// // blocks12 = summarizeAreas(blocks12.limit(10),mosaic_canopy.unmask(),2,'canopyHist',ee.Reducer.fixedHistogram(0, 2, 2));
// blocks12 = summarizeAreas(blocks12.limit(10),ls,30,'meanTemp',ee.Reducer.mean());

// // Map.addLayer(stats)
// print(blocks12)
// Export.table.toAsset(blocks12, 'blocks-canopy-cover-stats', 'users/ianhousman/urban-canopy/blocks-canopy-cover-stats')
