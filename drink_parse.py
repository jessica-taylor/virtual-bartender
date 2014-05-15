# This file will parse a list of drinks and their ingredients from the web.

from bs4 import BeautifulSoup,SoupStrainer
import urllib2
import json

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
  f = urllib2.urlopen('http://www.drinksmixer.com/drinkrq20761.html')

  cat_url_suffixes = find_drink_url_suffixes_and_cat()

  drinks = []
  ingredients = {}
  ingr_out = open('ingredients_updated.json', 'w')
  for (category, suffix) in cat_url_suffixes:
    drink = {}
    drink['category'] = category

    f = urllib2.urlopen(DOMAIN + suffix)   
    html = f.read()

    drink['title'] = get_drink_title(html)
    drink['directions'] = get_drink_directions(html)
    drink['rating'] = get_drink_rating(html)
    ingred_info = get_ingredients(html)

    drink['ingredients'] = [(ingred['name'], ingred['amount']) for ingred in
        ingred_info]

    for ingred in ingred_info:
      ingredient = get_ingredient_info(ingred['link'])
      ingredients[ingred['name']] = ingredient
      #print ingredient

    drinks.append(drink)
  ingr_out.write(json.dumps(ingredients))

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

def get_drink_rating(html):
  soup = BeautifulSoup(html)
  all= list(soup.find('div', {'class': 'ratingsBox rating'}).children)[1]
  rating = list(all.children)[0].string
  numReviews = all.find('span', {'class': 'count'}).string
  return (rating, numReviews)

def get_drink_directions(html):
  soup = BeautifulSoup(html)
  directions = soup.find('div', {'class':
    'RecipeDirections'}).text.split('\n', 1)[0]
  return directions

# Returns a list of dicts containing ingredient amount, name, and link to the
# ingredient page for further processing.
def get_ingredients(html):
  ingredients = []

  soup = BeautifulSoup(html)
  
  ingredient_html = soup.findAll('span', {'class': 'ingredient'})
  
  for ingredient_txt in ingredient_html:
    ingredient = {}
    soup = BeautifulSoup(str(ingredient_txt))
    ingredient['amount'] = soup.find('span', {'class': 'amount'}).text.strip()
    ingredient['name'] = soup.find('span', {'class': 'name'}).text
    ingredient['link'] = soup.find('a')['href']
    ingredients.append(ingredient)

  return ingredients

# Returns ingredient information as a tuple. First element in the tuple is ABV
# as a float, second element is a string with the amount of sugar, third
# element is the ingredient category..
def get_ingredient_info(link):
  ingredient_html = urllib2.urlopen(DOMAIN + link).read()

  soup = BeautifulSoup(ingredient_html)

  abv = soup.find('p', {'class': 'p10'})

  if (abv is not None):
    abv = abv.text
    abv = abv.replace('Alcohol (ABV): ', '')
    abv = abv.split('%', 1)[0]
    abv = float(abv)
  else:
    abv = 0.0

  table = soup.find('table', {'id': 'cl'})

  soup = BeautifulSoup(str(table))

  # Hax... Find the first thing that comes after a line break in the fourth
  # column, this should be the sugar content....
  fourth_col = soup.findAll('td')
  if (fourth_col is not None):
    if (len(fourth_col) >= 4):
      fourth_col = fourth_col[3]
      fourth_col = str(fourth_col).split('<br>')
      sugar = fourth_col[1]
    else:
      sugar = 'n/a'
  else:
    sugar = 'n/a'

  # Sometimes no sugar is listed as "-", other times it's listed as 0 g.
  # Normalize this.
  if (sugar == '-'):
    sugar = '0 g'

  soup = BeautifulSoup(ingredient_html)
  category = list()
  cat_links = soup.find('div', {'class':'pm'}).findAll('a')
  for cat_link in cat_links[1:]:
    link_str = cat_link.get('href')
    if 'desc' not in link_str: 
      break
    category.append(cat_link.text)
  return (abv, sugar, category)

if __name__ == "__main__":
  main()
