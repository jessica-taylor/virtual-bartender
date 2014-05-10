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
  cat_url_suffixes = find_drink_url_suffixes_and_cat()
  print(len(cat_url_suffixes))

  drinks = set()

  for (category, suffix) in cat_url_suffixes:
    drink = {}
    drink['category'] = category

    f = urllib2.urlopen(DOMAIN + suffix)   
    html = f.read()

    drink['title'] = get_drink_title(html)

# Returns a list of tuples whose first element is the drink category and whose
# second element is a URL pointing to a particular drink in that category.
def find_drink_url_suffixes_and_cat():
  suffixes = []
  for url in CATEGORY_PAGES:
    f = urllib2.urlopen(url)
    html = f.read()
    soup = BeautifulSoup(html)
    category = soup.find('div', {'class': 'pm'}).find('h1').text
    category = category.replace(' recipes', '')
    results = soup.find('p', {'class': 'l2c'}).findAll('a')
    for result in results: 
      suffixes.append((category, result['href']))
  return suffixes

def get_drink_title(html):
  soup = BeautifulSoup(html)
  title = soup.find('h1', {'class': 'recipe_title'}).text.replace(' recipe',
      '')
  return title

if __name__ == "__main__":
  main()
