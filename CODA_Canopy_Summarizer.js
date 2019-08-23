/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var table = ee.FeatureCollection("users/Shree1175/CODA_assets/MSA_UrbanCities_USA2018_biome_final2019_updated");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
///////////////////////////////////////////////////////////////////////////////
//Load asset with City Boundaries with 102 records, but we are mapping forest for only for 100 dropped 2 cities in PR
//////////////////////////////////////////////////////////////////////////////

var msa = ee.FeatureCollection('users/Shree1175/CODA_assets/MSA_UrbanCities_USA2018_biome_final2019_updated');

var cities =ee.FeatureCollection(table)

//check the column attributes
// print(cities.limit(10), 'Load Cities shapefile')
//Name = City Name, Zone = zone no., zone Name 

//////////////////////////////////////////////////////
//select all the cities we have mapped to decide the study area boundary
//zone no grabs all the cities within each zone. Western or California Biome is 12
///////////////////////////////////////////////////////

var sa = cities.filter(ee.Filter.inList('zone',[1,2,3,4,5,10,12,13,19,31]));
// var city_list = ee.Dictionary(sa.aggregate_histogram('Name'))
// print('Urban Canopy mapped for following cities', city_list)

// var zone_list = ee.Dictionary(sa.aggregate_histogram('zone'))
// print('Urban Canopy mapped in following zones', zone_list)

// var zone_names = ee.Dictionary(sa.aggregate_histogram('zone_names'))
// print('Zone Names', zone_names)

/////////////////////////////////////////////////////////////////////////////////
//Load the final collection with Canopy mapped from NAIP2016 to show on the viewer
/////////////////////////////////////////////////////////////////////////////////

var c = ee.ImageCollection('users/Shree1175/CODA_Canopy/FinalCollection');
print(c)
var c_unmask = c.map(function(img){return img.unmask()});
var proj = ee.Image(c_unmask.first()).projection()
var scale = proj.nominalScale();
var transform = proj.transform()
var crs = proj.crs();
print(scale,crs,transform);
var footprints = c.geometry();
//print(footprints);

//Map.addLayer(c, viz_canopy, 'Urban Canopy within US cities')
var mosaic_canopy=c.mosaic()
var canopyviz = {bands: ["classification"], opacity: 1,palette: ["84da66"]}
Map.addLayer(mosaic_canopy, canopyviz, 'Mosaic canopy across US cities')

var empty = ee.Image().byte();
var outline = empty.paint({featureCollection: sa, color: 2, width: 2});
Map.addLayer(outline, {palette: 'be1c0b'}, "Cities Mapped", true)


/*
////////////////////////////////////////////////////////
// STEP 1 Export count of Tree - NonTree Pixel for all 1000 cities mapped
///////////////////////////////////////////////////
var cities =ee.Dictionary(c.aggregate_histogram('system:index')).keys()//.map(function(s){return ee.String(s).split('nowak_canopy_').get(1)})
print(cities)


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
var blocks = ee.FeatureCollection('TIGER/2010/Blocks').filterBounds(sa);

//subset only for zone12 - 9 cities
var zn12 = cities.filter(ee.Filter.inList('zone',[12]));
var city_list = ee.Dictionary(zn12.aggregate_histogram('Name'))
var blocks12 =blocks.filterBounds(zn12);

// print(blocks12.limit(5), 'Load Census block for western biome(12)')
// print('Summarize Temperature and Block level canopy for following cities', city_list)

///////////////////////////////////////////////////////
//load landsat L8 for surface temperature withn zone 12 
///////////////////////////////////////////////////////

// print('Filter Landsat 8 surface temperate for cities withn zone 12')
///Module imports
var getImagesLib = require('users/USFS_GTAC/modules:getImagesLib.js');

var startYear = 2010;
var endYear = 2019;


var startJulian = ee.Date.fromYMD(1900,6,21).getRelative('day','year').add(1).getInfo();
var endJulian  = ee.Date.fromYMD(1900,9,22).getRelative('day','year').add(1).getInfo();
var ls = getImagesLib.getProcessedLandsatScenes(zn12,startYear,endYear,startJulian,endJulian).select(['temp']).median();
var ls_msa =  ls.clip(zn12)

// Map.addLayer(ls_msa,{min:280,max:330,palette:'00F,888,F00'});


///////////////////////////////////////////////////////////////
//limit the canopy collection for only cities within zone12
///////////////////////////////////////////////////////////////

var c = ee.ImageCollection('users/Shree1175/CODA_Canopy/FinalCollection').filterBounds(zn12);
var c_unmask = c.map(function(img){return img.unmask()});
var canopy12 =mosaic_canopy.clip(zn12)

var empty = ee.Image().byte();
var outline = empty.paint({featureCollection: blocks12, color: 1, width: 1});

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

var scale = 1;

function summarizeAreas(areas,image,scale,propertyNameOut,reducer){
  var props = ee.Feature(areas.first()).propertyNames();
  print(props);
  Map.addLayer(areas);
  Map.addLayer(image);
  var stats = image.reduceRegions(areas, reducer, scale, crs, null, 1) ;
 
  // stats = stats.map(function(f){
  //   var hist = f.get('histogram');
  //   f  = f.select(props);
  //   return f.set(propertyName,hist)});
  return stats
}


blocks12 = summarizeAreas(blocks12.limit(2),mosaic_canopy.unmask(),2,'canopyHist',ee.Reducer.fixedHistogram(0, 2, 2));
blocks12 = summarizeAreas(blocks12,ls,30,'canopyHist',ee.Reducer.mean());
print(blocks12)
// summarizeAreas(sa.limit(2),mosaic_canopy.unmask())

