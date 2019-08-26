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
var canopyReducer = 
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

function getStats(city){
  

  //Get the image for the city, and reduce it
  var cityC = ee.Image(c_unmask.filter(ee.Filter.eq('system:index',city)).first());
  var region = cityC.geometry();
  var counts = cityC.reduceRegion(ee.Reducer.fixedHistogram(0, 2, 2), region, scale,'EPSG:5070',null,true,1e13);
  
  //Convert to client for charting
  var out = counts.toArray().slice(1,1,null).project([0]);
  var total = ee.Array(out).reduce(ee.Reducer.sum(),[0]).get([0]);
  var pcts = out.divide(total);
  var tree = out.get([1])
  var nontree = out.get([0])
  //var sum = 
  pcts = {'name':ee.String(city).split('nowak_canopy_').get(1),'Non Tree':pcts.get([0]),'Tree':pcts.get([1])};
  var count = {'name':ee.String(city).split('nowak_canopy_').get(1),'Non Tree':out.get([0]),'Tree':out.get([1])};
  return ee.Feature(region).setMulti(pcts).setMulti(count);

};
// var blocks = ee.FeatureCollection('TIGER/2010/Blocks');
// Map.addLayer(blocks)
var stats = ee.FeatureCollection(cities.map(getStats));
// Map.addLayer(stats)
// // print(stats);
Export.table.toAsset(stats, 'canopy-cover-stats', 'users/ianhousman/urban-canopy/canopy-cover-stats')
*/


//STEP 2 : Create Block level summary of Canopy for zone 12 - testing before applying to all US cities


/////////////////////////////////////////
//load block level data from GEE for all msa
/////////////////////////////////////////

// print(blocks12.limit(5), 'Load Census block for western biome(12)')
// print('Summarize Temperature and Block level canopy for following cities', city_list)

///////////////////////////////////////////////////////
//load landsat L8 for surface temperature withn zone 12 
///////////////////////////////////////////////////////

// print('Filter Landsat 8 surface temperate for cities withn zone 12')


// Map.addLayer(ls_msa,{min:280,max:330,palette:'00F,888,F00'});


///////////////////////////////////////////////////////////////
//limit the canopy collection for only cities within zone12
///////////////////////////////////////////////////////////////



// Map.addLayer(canopy12, canopyviz, 'Canopy wihtin zone12', false)
// Map.addLayer(outline,{palette: 'c4c4c4'}, 'census blocks within Western Biome')

// print(blocks12.limit(5))

//////////////////////////////////////////////////////////////////////////////////
// Create Map and zonal summary of Tree NonTree pixles by Block10 id for all cities withn Western Biome
/////////////////////////////////////////////////////////////////////////////////

//new collection with only canopy for zone 12
// var cities =ee.Dictionary(c.aggregate_histogram('system:index')).keys()//.map(function(s){return ee.String(s).split('nowak_canopy_').get(1)})
// print(cities)

//function to create block level summarries 

//Create Mean Annual Temperature by block

// var scale = 1;

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
