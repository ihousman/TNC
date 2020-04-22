import ee,datetime
ee.Initialize()

ref_time = datetime.datetime(2018,11,23,21,0)

tasks =ee.data.getTaskList()
tasks = [i  for i in tasks if datetime.datetime.fromtimestamp(i['creation_timestamp_ms']/1000.0)  > ref_time]
failed = [i for i in tasks if i['state'] == 'FAILED' and i['source_url'] == 'https://code.earthengine.google.com/a96883e1805493c8ee33c99b35b5df9e?noload=1']
failedNames = [str(i['description']) for i in failed]
print(failedNames)
