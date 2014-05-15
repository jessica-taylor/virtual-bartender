import json

def main():
    in_f = open('drinks.json', 'r')
    drinks = json.loads(in_f.read())
    in_f = open('ingredients.json', 'r')
    ingredients = json.loads(in_f.read())
    drink_list = list()
    titles = dict()
    for drink in drinks:
        volume = 0.0
        abv = 0.0
        for ingredient in drink['ingredients']:
            ing = ingredient[0]
            amount = ingredient[1]
            parts = amount.split(' ')
            oz = 1
            if len(parts) > 1:
                unit = parts[1]
                amt = parts[0].split('/')
                if len(amt) > 1:
                    oz = float(amt[0])/float(amt[1])
                else:
                    try: oz = float(parts[0])
                    except Exception: 
                        print parts[0]
                # convert units for those not equal to an oz
                if 'dash' in unit: oz /= 32
                elif 'teaspoon' in unit: oz /= 8
                elif 'tablespoon' in unit: oz *= (3/8)
                elif 'splash' in unit: oz /= 8
                elif 'cup' in unit: oz *= 8
            volume += oz
            abv += oz*ingredients[ing][0]     
        abv /= volume              
        rating = float(drink['rating'][0]) + float(drink['rating'][1]) ** .25
        if drink['title'] not in titles:
            drink_list.append((drink['title'], rating, abv))
            titles[drink['title']] = 1
    drink_list = sorted(drink_list, key=lambda x: x[2])
    for drink in drink_list:
        print drink 

if __name__ == "__main__":
    main()
