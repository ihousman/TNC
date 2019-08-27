//Params
///Module imports
var getImagesLib = require('users/USFS_GTAC/modules:getImagesLib.js');

var startYear = 2010;
var endYear = 2019;

var crs = 'EPSG:5070';
var transform30 = [30,0,-2361915.0,0,-30,3177735.0];
var transform2 = [2,0,-2361915.0,0,-2,3177735.0];

var startJulian = ee.Date.fromYMD(1900,6,21).getRelative('day','year').add(1).getInfo();
var endJulian  = ee.Date.fromYMD(1900,9,22).getRelative('day','year').add(1).getInfo();

var zoneList = [1,2,3,4,5,10,12,13,19,31];
// var zoneList = [12];
var canopyCollection = 'users/Shree1175/CODA_Canopy/FinalCollection';
var msaOutlines = 'users/Shree1175/CODA_assets/MSA_UrbanCities_USA2018_biome_final2019_updated';

var assetFolder = 'projects/igde-work/CODA_UrbanCanopy/CODA-MSA-Temperatures/';
var temperatureName = 'Landsat_Temperature_'+startYear.toString() + '_' + endYear.toString()+ '_'+ startJulian.toString() + '_' + endJulian.toString();

var tempReducer = ee.Reducer.mean();
// var canopyReducer = ee.Reducer.fixedHistogram(0, 3, 3);
///////////////////////////////////////////////////////////////////////////////
//Load asset with City Boundaries with 102 records, but we are mapping forest for only for 100 dropped 2 cities in PR
//////////////////////////////////////////////////////////////////////////////
//Get data
var msas =ee.FeatureCollection(msaOutlines).filter(ee.Filter.inList('zone',zoneList)).limit(5);

var blocks = msas;//ee.FeatureCollection('TIGER/2010/Blocks').filterBounds(msas);

var canopy = ee.ImageCollection(canopyCollection).filterBounds(msas).mosaic().unmask();
canopy = getImagesLib.setNoData(canopy.clip(msas),2);

var temperature = getImagesLib.getProcessedLandsatScenes(msas,startYear,endYear,startJulian,endJulian).select(['temp']).median();
ee.Dictionary(msas.aggregate_histogram('Name')).keys().getInfo().map(function(nm){
  print(nm)
  var outline = ee.Feature(msas.filter(ee.Filter.eq('Name',nm)).first());
  var temperatureT = temperature.clip(outline.bounds().buffer(5000,1000));
  Map.addLayer(temperatureT,{min:280,max:320,palette:'00F,888,F00'},nm);
  var nameT = nm + '_' + temperatureName
  Export.image.toAsset(temperatureT, nameT, assetFolder + nameT, null, null, msas, null, crs, transform30, 1e13);
})
// 
///////////////////////////////////////////////////////////////////////////////
// Map.addLayer(canopy,{min:0,max:2,palette:'000,0F0,F00'},'Canopy',false);
// Map.addLayer(temperature,{min:280,max:320,palette:'00F,888,F00'},'Temperature',false);
// Map.addLayer(blocks,{},'Blocks',false);
// Map.addLayer(msas,{},'MSAs',false);
// print(blocks.size())
///////////////////////////////////////////////////////////////////////////////
// blocks = blocks.limit(10);

var nonCanopy = canopy.eq(0);
nonCanopy = nonCanopy.mask(nonCanopy);

var isCanopy = canopy.eq(1);
isCanopy = isCanopy.mask(isCanopy);

var isNull = canopy.eq(2);
isNull = isNull.mask(isNull);

var summaries = blocks;
// var summaries =temperature.reduceRegions(summaries, tempReducer, null, 'EPSG:5070', transform30, 1) ;
// var propsOld = ee.Feature(summaries.first()).propertyNames();
// var propsNew = propsOld.replace('mean','mean_temperature');
// summaries = summaries.map(function(f){return f.select(propsOld, propsNew)});

// summaries = canopy.reduceRegions(summaries, canopyReducer, 2, 'EPSG:5070', null, 1) ;
// propsOld = ee.Feature(summaries.first()).propertyNames();
// propsNew = propsOld.replace('histogram','histogram_canopy');
// summaries = summaries.map(function(f){return f.select(propsOld, propsNew)});

// summaries = nonCanopy.reduceRegions(summaries, ee.Reducer.count(), null, 'EPSG:5070', transform2, 1) ;
// var propsOld = ee.Feature(summaries.first()).propertyNames();
// var propsNew = propsOld.replace('count','count_nonCanopy');
// summaries = summaries.map(function(f){return f.select(propsOld, propsNew)});

// summaries = isCanopy.reduceRegions(summaries, ee.Reducer.count(), null, 'EPSG:5070', transform2, 1) ;
// propsOld = ee.Feature(summaries.first()).propertyNames();
// propsNew = propsOld.replace('count','count_canopy');
// summaries = summaries.map(function(f){return f.select(propsOld, propsNew)});


// summaries = isNull.reduceRegions(summaries, ee.Reducer.count(), null, 'EPSG:5070', transform2, 1) ;
// propsOld = ee.Feature(summaries.first()).propertyNames();
// propsNew = propsOld.replace('count','count_null');
// summaries = summaries.map(function(f){return f.select(propsOld, propsNew)});

// summaries = summaries.set({'canopy_res':2,'temperature_res':30});

// print(summaries.size())

// Export.table.toAsset(summaries, 'msas-canopy-cover-stats', 'users/ianhousman/urban-canopy/msas-canopy-cover-stats');
