import urllib
import urllib2
import simplejson
import cStringIO
import subprocess
import time
import os.path

drinks = simplejson.load(open('drinks.json'))

def get_images(drink_name):
  fetcher = urllib2.build_opener()
  searchTerm = drink_name + ' drink'
  searchUrl = "http://ajax.googleapis.com/ajax/services/search/images?" + urllib.urlencode({'v': '1.0', 'q': searchTerm, 'start': '0'})
  f = fetcher.open(searchUrl)
  json = simplejson.load(f)
  results = json['responseData']['results']
  return [result['unescapedUrl'] for result in results]

print len(drinks)
for i,drink in enumerate(drinks):
  name = drink['title']
  filepath = 'images/' + name + '.jpg'
  print i, name
  if not os.path.isfile(filepath):
    img = get_images(name)[0]
    subprocess.call(['wget', img, '-O', filepath])
    time.sleep(2)



print get_images('mojito');
