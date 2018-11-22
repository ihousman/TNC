import ee
ee.Initialize()
tasks =ee.data.getTaskList()
failed = [i for i in tasks if i['state'] == 'FAILED']
failedNames = [i['description'] for i in failed]
print(failedNames)