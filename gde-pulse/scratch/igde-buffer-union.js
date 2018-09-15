var sa = ee.FeatureCollection('projects/igde-work/igde-data/GDEpulse2018_iGDE_V1_20180802_joined_annual_depth_macro_veg')

sa = sa.map(function(f){return f.buffer(20000,1000)}).union(1000)

Export.table.toAsset(sa, 'Export','projects/igde-work/igde-data/igde_buffer_20k_union_for_clipping')