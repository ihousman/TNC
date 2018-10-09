var sa = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg')
var sa2 =  ee.FeatureCollection('projects/igde-work/igde-data/iGDE_AnnualDepth_renamed_oct2018');

var studyArea = ee.Feature(ee.FeatureCollection('TIGER/2016/States')
            .filter(ee.Filter.eq('NAME','California'))
            .first())
            .convexHull(10000)
            .buffer(10000)
            .geometry();
Map.addLayer(studyArea,{},'convexHull',false)
sa = sa.map(function(f){return f.buffer(20000,1000)}).union(1000);
sa2 = sa2.map(function(f){return f.buffer(20000,1000)}).union(1000);
print(sa.size())
Map.addLayer(sa)
Map.addLayer(sa2)
// var output = ee.FeatureCollection('projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping');
// Map.addLayer(output)
Export.table.toAsset(sa, 'Export','projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping')