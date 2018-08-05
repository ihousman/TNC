/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var eeBoundsPoly = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-120.57117462158203, 36.92793899776678],
          [-120.42423248291016, 36.93178119236919],
          [-120.3936767578125, 37.00063338417457],
          [-120.56636810302734, 36.99843985286533]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/


//Function for zero padding
//Taken from: https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

//Bring in igdes
var f = ee.FeatureCollection('users/Shree1175/iGDE_5_2018_V1_joined_ndvi_annDepth')

//Set up the years to filter on- this is hard-coded since its set up oddly
var years1 = ee.List.sequence(85,99);
var yearsOddballs = ee.List.sequence(20,20);
var years2 = ee.List.sequence(1,18);
var years = years1.cat(yearsOddballs).cat(years2);
var yearsInt = ee.List.sequence(1985,2018);
var yearsZ = years.zip(yearsInt).getInfo();

//Specify which depths to look at
var depths = ee.List.sequence(0,50,1);

//Reformat the igdes to have a unique feature per year
var reformatted = yearsZ.map(function(yz){
  var fieldName ='AvgAnnD_'+ pad(yz[0],2).toString();
  var t = f.select([fieldName], ['AvgAnnD'])
          .map(function(ft){return ft.set('year',yz[1])});
  return t;
});
reformatted = ee.FeatureCollection(reformatted).flatten();
Map.addLayer(f);

//Convert each year-feature to a raster by iterating across the depths
var igdeyr = yearsInt.map(function(yr){
    yr = ee.Number(yr);
    var t = reformatted.filter(ee.Filter.equals('year',yr));
    var depthC = depths.map(function(d){
      d = ee.Number(d);
      var tt = t.filter(ee.Filter.gte('AvgAnnD',d));
      var ttFill = ee.Image().paint(tt,1);
      ttFill = ttFill.where(ttFill.mask(),d).int16();
      return ttFill.rename(['AvgAnnD']);
      
    });
    depthC  = ee.ImageCollection.fromImages(depthC).max().divide(100)
              .set('system:time_start',ee.Date.fromYMD(yr,6,1).millis())
              .rename(['Depth-To-Groundwater-divided-by-one-hundred']);
    // Map.addLayer(depthC,{},yr,false)
    return depthC;
   
  });
//Reformat time series of depth to gw
igdeyr = ee.ImageCollection.fromImages(igdeyr);


var startYear = 1985;
var endYear = 2018;
var startJulian = 190;
var endJulian = 250;
var timeBuffer = 2;
var weights = [1,1,5,1,1];
var compositingMethod = 'medoid'
var ls = getLandsat(startYear,endYear,startJulian,endJulian,eeBoundsPoly);
var ts = compositeTimeSeries(ls,startYear,endYear,timeBuffer,weights,compositingMethod)
        .map(simpleAddIndices)
        .map(getTasseledCap)
        .map(simpleAddTCAngles)
        .map(addYear)
var joined = joinCollections(ts.select(['NDVI','NBR']),igdeyr) ;

Map.addLayer(joined,{'min':0,'max':0.5},'igde depth to gw (divided by 100)',false);


