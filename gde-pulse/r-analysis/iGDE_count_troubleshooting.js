var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');

var selectFields = ee.List.sequence(1985,2018).getInfo().map(function(i){return 'Depth'+ i.toString()});
var allIDs = ee.Dictionary(igdes.aggregate_histogram('POLYGON_ID')).keys();

print('Total igdes:',igdes.size());
print('Total unique POLYGON_IDs:',allIDs.size());
//Filter out no data values for each year to only retain igdes with obs for each year
var out = selectFields.map(function(i){
  var t = igdes.filter(ee.Filter.neq(i,-999));
  return t;
});
out = ee.FeatureCollection(out).flatten();

//Find the count of unique polygons that ever had DGW
var hist = ee.Dictionary(out.aggregate_histogram('POLYGON_ID'));
var idsWithValues = hist.keys();
print('Total igdes that ever had data',hist.keys().length());

var badIds = allIDs.map(function(i){
  var isGood = idsWithValues.indexOf(i);
  return ee.List([i,isGood]);
});

