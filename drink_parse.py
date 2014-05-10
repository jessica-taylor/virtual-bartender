# This file will parse a list of drinks and their ingredients from the web.

from bs4 import BeautifulSoup,SoupStrainer
import urllib2

DOMAIN = 'http://www.drinksmixer.com'

CATEGORY_PAGES = ['http://www.drinksmixer.com/cat/1/',
    'http://www.drinksmixer.com/cat/3/',
    'http://www.drinksmixer.com/cat/4/',
    'http://www.drinksmixer.com/cat/7/',
    'http://www.drinksmixer.com/cat/9/',
    'http://www.drinksmixer.com/cat/11/',
    'http://www.drinksmixer.com/cat/12/',
    'http://www.drinksmixer.com/cat/13/',
    'http://www.drinksmixer.com/cat/14/',
    'http://www.drinksmixer.com/cat/16/',
    'http://www.drinksmixer.com/cat/22/']

def main():
  url_suffixes = find_drink_url_suffixes()
  urls = [DOMAIN + suffix for suffix in url_suffixes]

def find_drink_url_suffixes():
  suffixes = []
  for url in CATEGORY_PAGES:
    f = urllib2.urlopen(url)
    html = f.read()
    soup = BeautifulSoup(html)
    results = soup.find('p', {'class': 'l2c'}).findAll('a')
    for result in results: 
      suffixes.append(result['href'])
  return suffixes

if __name__ == "__main__":
  main()
