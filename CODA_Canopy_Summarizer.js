//Params

//Function to set null value for export or conversion to arrays
function setNoData(image,noDataValue){
  var m = image.mask();
  image = image.mask(ee.Image(1));
  image = image.where(m.not(),noDataValue);
  return image;
}
/////////////////////////////////////////////////////
var startYear = 2010;
var endYear = 2019;

var crs = 'EPSG:5070';
var transform30 = [30,0,-2361915.0,0,-30,3177735.0];
var transform2 = [2,0,-2361915.0,0,-2,3177735.0];

var startJulian = ee.Date.fromYMD(1900,6,21).getRelative('day','year').add(1).getInfo();
var endJulian  = ee.Date.fromYMD(1900,9,22).getRelative('day','year').add(1).getInfo();

// var zoneList = [1,2,3,4,5,10,12,13,19,31];
var zoneList = [12];
var canopyCollection = 'users/Shree1175/CODA_Canopy/FinalCollection';
var msaOutlines = 'users/Shree1175/CODA_assets/MSA_UrbanCities_USA2018_biome_final2019_updated';

var assetFolder = 'projects/igde-work/CODA_UrbanCanopy/CODA-MSA-Temperatures';
var tableAssetFolder = 'projects/igde-work/CODA_UrbanCanopy';
var temperatureName = 'Landsat_Temperature_'+startYear.toString() + '_' + endYear.toString()+ '_'+ startJulian.toString() + '_' + endJulian.toString();

var tempReducer = ee.Reducer.mean()
                .combine(ee.Reducer.stdDev()
                .combine(ee.Reducer.percentile(ee.List.sequence(0,100,5).getInfo()),null,true));
var canopyReducer = ee.Reducer.fixedHistogram(0, 3, 3);
///////////////////////////////////////////////////////////////////////////////
//Load asset with City Boundaries with 102 records, but we are mapping forest for only for 100 dropped 2 cities in PR
//////////////////////////////////////////////////////////////////////////////
//Get data
var msas =ee.FeatureCollection(msaOutlines).filter(ee.Filter.inList('zone',zoneList));

var blocks = ee.FeatureCollection('TIGER/2010/Blocks').filterBounds(msas);//msas;//
Map.addLayer(blocks)
var canopy = ee.ImageCollection(canopyCollection).filterBounds(msas).mosaic().unmask();
canopy = setNoData(canopy.clip(msas),2);

var temperature = ee.ImageCollection(assetFolder).mosaic().clip(msas).subtract(273.15);

function exportTemp(){
  //Module imports
  var getImagesLib = require('users/USFS_GTAC/modules:getImagesLib.js');
  var temperature = getImagesLib.getProcessedLandsatScenes(msas,startYear,endYear,startJulian,endJulian).select(['temp']).median();
  ee.Dictionary(msas.aggregate_histogram('Name')).keys().getInfo().map(function(nm){
    var outline = ee.Feature(msas.filter(ee.Filter.eq('Name',nm)).first()).bounds().buffer(5000,1000);
    
    nm = nm.replace(', ','_');
    nm = nm.replace('.','');
    nm = nm.replace(' ','_');
    nm = nm.replace(' ','_');
    nm = nm.replace(' ','_');
    nm = nm.replace(' ','_');
    nm = nm.replace(' ','_');
    nm = nm.replace(',','_');
    nm = nm.replace('-----','_');
    nm = nm.replace('----','_');
    nm = nm.replace('---','_');
    nm = nm.replace('--','_');
    nm = nm.replace('--','_');
    nm = nm.replace('--','_');
    nm = nm.replace('-','_');
    nm = nm.replace('-','_');
    nm = nm.replace('-','_');
    nm = nm.replace('/','_');
   
    
    var temperatureT = temperature.clip(outline);
    // Map.addLayer(temperatureT,{min:280,max:320,palette:'00F,888,F00'},nm);
    var nameT = nm + '_' + temperatureName;
    Export.image.toAsset(temperatureT, nameT, assetFolder +'/'+ nameT, null, null, outline, null, crs, transform30, 1e13);
  });
}
///////////////////////////////////////////////////////////////////////////////
var tempViz = {min:10,max:40,palette:'00F,888,F00'};
Map.addLayer(canopy,{min:0,max:2,palette:'000,0F0,F00'},'Canopy',false);
Map.addLayer(temperature,tempViz,'Temperature',false);
// Map.addLayer(blocks,{},'Blocks',false);
// Map.addLayer(msas,{},'MSAs',false);
// print(blocks.size())
///////////////////////////////////////////////////////////////////////////////
// blocks = blocks.limit(1);

var nonCanopy = canopy.eq(0);
nonCanopy = nonCanopy.mask(nonCanopy);

var isCanopy = canopy.eq(1);
isCanopy = isCanopy.mask(isCanopy);

var isNull = canopy.eq(2);
isNull = isNull.mask(isNull);

var canopyStack = nonCanopy.addBands(isCanopy).addBands(isNull).rename(['nonCanopy_count','canopy_count','nullCanopy_count']);

var temperatureCanopy = temperature.updateMask(canopy.eq(1));
var temperatureNotCanopy = temperature.updateMask(canopy.eq(0));
var temperatureStack = temperature.addBands(temperatureNotCanopy).addBands(temperatureCanopy).rename(['temperature_all','temperature_nonCanopy','temperature_canopy']);

Map.addLayer(canopyStack,{},'Canopy Stack',false);
var summaries = blocks.limit(3);
summaries =temperatureStack.reduceRegions(summaries,tempReducer , null, 'EPSG:5070', transform30, 1) ;


var summaries =canopyStack.reduceRegions(summaries, ee.Reducer.sum(), null, 'EPSG:5070', transform2, 1) ;

Map.addLayer(temperatureCanopy,tempViz,'temp Canopy',false)
Map.addLayer(temperatureNotCanopy,tempViz,'temp not Canopy',false)


print(summaries)


var tableName = 'blocks-z12-canopy-cover-stats';
Export.table.toAsset(summaries, tableName, tableAssetFolder + '/'+tableName);

//Function for exporting CONUS LCMS
//Code for starting all tasks once this script has ran
//Press f12, then paste functions into console
//Then paste function calls into console


// function runTaskList() {

//     //1. task local type-EXPORT_FEATURES awaiting-user-config

//     //2. task local type-EXPORT_IMAGE awaiting-user-config

//     var tasklist = document.getElementsByClassName('awaiting-user-config');

//     for (var i = 0; i < tasklist.length; i++)

//         tasklist[i].children[2].click();

// }

// // confirmAll();

// function confirmAll() {

//     var ok = document.getElementsByClassName('goog-buttonset-default goog-buttonset-action');

//     for (var i = 0; i < ok.length; i++)

//         ok[i].click();

// }
// runTaskList()
// confirmAll()