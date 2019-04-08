var igdes = ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018_v2');

var selectFields = ee.List.sequence(1985,2018).getInfo().map(function(i){return 'Depth'+ i.toString()});

print('Total igdes:',igdes.size());

//Filter out no data values for each year to only retain igdes with obs for each year
var out = selectFields.map(function(i){
  var t = igdes.filter(ee.Filter.neq(i,-999));
  return t;
});
out = ee.FeatureCollection(out).flatten();

//Find the count of unique polygons that ever had DGW
var hist = ee.Dictionary(out.aggregate_histogram('POLYGON_ID'));
print('Total igdes that ever had data',hist.keys().length());