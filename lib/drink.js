var assert = require('assert');
var Fs = require('fs');
var Path = require('path');
var _ = require('underscore');

var drinksJSON = require('./drinksjson'); // JSON.parse(Fs.readFileSync('drinks.json', 'utf8'));
var ingredientsJSON = require('./ingredientsjson'); // JSON.parse(Fs.readFileSync('ingredients.json', 'utf8'));
var allCategories = _.uniq(_.pluck(drinksJSON, 'category'));
var allProperties = ['strong', 'fruity', 'sweet', 'spicy', 'sour',
    'nutty','creamy','hot','iced', 'cold', 'flaming', 'blended']

var numericCutoffs = {
  // By percentage abv. 20% = 40proof seems reasonable
  'strong': 20.0,
  'sweet': 5.0 // avg sweetness is 4.18, so a little above this is fine
};

function isProperty(prop) {
  return _.contains(allProperties, prop);
}

function Drink(json) {
  var self = this;
  self.properties = {};
  self.name = json.title;
  self.ingredients = json.ingredients;
  self.popularity = parseFloat(json.rating[0]) * Math.log(parseFloat(json.rating[1]))
  self.directions = json.directions;
  _.each(allCategories, function(cat) {
    self.properties[cat] = json.category == cat;
  });
  _.each(allProperties, function(adj) {
    self.properties[adj] = self.getPropertyValue(adj);
  });
}

Drink.prototype.getPropertyValue = function(property) {
  var self = this;
  switch(property) {
    case 'strong':
      return self.isStrong();
    case 'fruity':
      return self.isFruity();
    case 'sweet':
      return self.isSweet();
    case 'spicy':
      return self.isSpicy();
    case 'sour':
      return self.isSour();  
    case 'nutty':
      return self.isNutty();
    case 'creamy':
      return self.isCreamy();
    case 'hot':
      return self.isHot();
    case 'cold':
      return self.isCold();
    case 'iced':
      return self.isCold() && !self.isBlended();
    case 'blended':
      return self.isBlended();
      break;
    case 'flaming':
      return self.isFlaming();
    default:
      return false;
  }
}

Drink.prototype.isHot = function() {
  var self = this;
  if (self.isFlaming()) {
    return true;
  }

  return self.properties['Hot cocktail'];
}

Drink.prototype.isSpicy = function() {
  var self = this;
  if (self.name.match('/[Ss]picy/g')) return true;
  for (var i = 0; i < self.ingredients.length; i++) {
    if (self.ingredients[i][0] == 'Cayenne pepper') return true;
    var categoryList = ingredientsJSON[self.ingredients[i][0]][2];
    if (categoryList.length > 1) {
      if (categoryList[0] == 'Liqueur' && categoryList[1] == 'Cinnamon') {
        return true;
      }
    }
  }
  return false;
}

Drink.prototype.isNutty = function() {
  var self = this;
  if (self.name.match(/nutty/ig)) return true;
  for (var i = 0; i < self.ingredients.length; i++) {
    var categoryList = ingredientsJSON[self.ingredients[i][0]][2];
    for (var j = 0; j < categoryList.length; j++) {
      if
        (categoryList[j].match(/\b(almond|nut|pistachio|hazelnut|peanut|walnut)/ig)) {
        return true;
      }
    }
  }
  return false;
}

Drink.prototype.isFlaming = function() {
  var self = this;
  if (self.properties['Flaming shot']) return true;
  if (self.name.match(/[Ff]laming/g)) return true;
  return false;
}

Drink.prototype.isBlended = function() {
  var self = this;
  if (self.properties['Frozen cocktail']) {
    return true;
  }
  if (self.directions.match(/\b[Bb]lend(e[dr])?\b/g)) return true;
  return false;
}

Drink.prototype.isSweet = function() {
  var self = this;
  var sweetness = self.computeAdjective('sweet');
  return sweetness > numericCutoffs.sweet;
}

Drink.prototype.isCold = function() {
  var self = this;
  if (self.properties['Frozen cocktail']) return true;
  if (self.directions.match(/\b[Ii]ce\b/g)) return true;
  for (var i = 0; i < self.ingredients.length; i++) {
    if (self.ingredients[i][0].match(/\bice\b/ig)) {
      return true;
    }
  }
  return false;
}

Drink.prototype.isCreamy = function() {
  var self = this;
  if (self.properties['Short, creamy cocktail']) return true;
  for (var i = 0; i < self.ingredients.length; i++) {
    if (self.ingredients[i][0].match(/[Cc]ream/g)) return true;

    var categoryList = ingredientsJSON[self.ingredients[i][0]][2];
    for (var j = 0; j < categoryList.length; j++) {
      if (categoryList[j].match(/[Cc]ream/g)) return true;
      if (categoryList[j].match(/[Mm]ilk/g)) return true;
    }
  }
  return false;
}
      
Drink.prototype.isSour = function() {
  var self = this;
  var sourness = self.computeAdjective('sour');
  if (sourness > 0.4) {
    // outliers -- computation faulty because of lemon
    if (self.name != 'Rusty Nail' && self.name != 'Chocolate Cake Shooter') {
      return true;
    }
  }
  
  if (self.name.match(/sour/ig)) {
    return true;
  }
  return false;
}

// Returns alcohol by volume.
Drink.prototype.computeAdjective = function(adj, print) {
  var self = this;
  var volume = 0.0;
  var adjAmt = 0.0;
  _.each(self.ingredients, function(ingredient) {
    var name = ingredient[0];
    var amount = ingredient[1].toLowerCase();
    var oz = 1.0;
    var parts = amount.split(' ');
    var amt = parts[0];
    // If parts has space, should be number (maybe fraction) then unit
    if (parts.length > 1) {
      var unit = findFirstNonNumeric(parts);
      if (parts[1].indexOf('-') >= 0) {
        oz = convertMixedNumber([parts[0]]);
      } else if (parts.length >= 3 && parts[2].indexOf('-') >= 0) {
        oz = convertMixedNumber([parts[0], parts[1]]);
      } else {
        var unit = parts[1];
        amt = parts[0].split('/');
        if (amt.length > 1) {
          oz = Number(amt[0])/Number(amt[1]);
        } else {
            oz = Number(parts[0]); 
            if (isNaN(oz)) {
              var special = getOzSpecialCase(name, parts, adj);
              oz = special[0];
              unit = special[1];
            }
        }
      }
      if (!unit) {
        oz = 0.0;
        unit = 'oz';
      }
    } else {
      // Catches 2 cases -- a number with no units and unit with implied "1"
      var special = getOzSpecialCase(name, parts, adj);
      oz = special[0];
      var unit = special[1];
    }
    // Convert units for those not in oz.
    if (unit.indexOf('dash') >= 0) {
      oz /= 16;
    }
    else if (unit.indexOf('teaspoon') >= 0 || unit.indexOf('splash') >= 0) {
      oz /= 8;
    }
    else if (unit.indexOf('tablespoon') >= 0) {
      oz *= (3/8);
    }
    else if (unit.indexOf('cup') >= 0) {
      oz *= 8;
    }
    else if (unit.indexOf('pint') >= 0) {
      oz *= 16;
    }
    else if (unit.indexOf('liter') >= 0) {
      oz *= 33.8;
    }
    else if (unit.indexOf('quart') >= 0) {
      oz *= 32;
    }
    else if (unit.indexOf('gallon') >= 0) {
      oz *= 128;
    } 
    else if (unit.indexOf('can') >= 0) {
      oz *= 12;
    }
    else if (unit.match(/ml/gi)) {
      oz *= .034;     
    } else if (unit.indexOf('glass') >= 0) {
      oz *= 12;
    } else if (unit.indexOf('msr') >= 0) {
      oz *= 0.9;
    } else if (unit.indexOf('jigger') >= 0) {
      oz *= 1.5;
    } else if (unit.indexOf('jug') >= 0) {
      oz *= 32;
    }
    volume += oz;
    if (adj == 'strong') {
      adjAmt += oz * ingredientsJSON[name][0];
    } else if (adj == 'sweet') {
      // We don't care if the units match here -- just ranking by how much
      // sugar.

      var sugarContent = ingredientsJSON[name][1];
      if (sugarContent == 'n/a') {
        sugarContent = '0.0 g';
      }
      if (name.indexOf('sugar') >= 0 && oz == 0) {
        // Sometimes we ignore sugar in special cases if there aren't units
        // attached, so just default to 1oz if it gets ignored.
        oz = 1.0;
      }

      var gramsSugar = Number(sugarContent.split(' ')[0]);
      adjAmt += oz * gramsSugar;
    } else if (adj == 'sour') {
      adjAmt += oz * getSourness(name);
    }
  });
  adjAmt /= volume;
  return adjAmt;
}

// Returns a "sourness rating" for a given ingredient.
var getSourness = function(name) {
  switch(name.toLowerCase()) {
    case 'lemon':
    case 'lemons':
    case 'lemon juice':
    case 'lime juice':
    case 'lime':
    case 'limes':
      return 1;
    default:
      break;
  }

  if (name.match(/sour mix/ig)) {
    return 1;
  }

  if (name.match(/grapefruit/ig)) {
    return 0.5;
  }

  return 0;
}

// Converts array containing 1 or 2 strings (both numeric values) into an
// appropriate mixed number, so 1 1/2 becomes 1.5, 1/2 becomes 0.5, etc.
var convertMixedNumber = function(values) {
  var num = 0;
  if (values.length == 2) {
    num += Number(values[0]);
    var mixedParts = values[1].split('/');
    num += Number(mixedParts[0]) / Number(mixedParts[1]);
  } else {
    if (values[0].match(/[0-9]\/[0-9]/g)) {
      var mixedParts = values[0].split('/');
      num += Number(mixedParts[0]) / Number(mixedParts[1]);
    } else {
      num += Number(values[0]);
    }
  }
  return num;
}

// Returns first element of an array that doesn't have any numeric values and
// isn't a dash.
var findFirstNonNumeric = function(values) {
  for (var i = 0; i < values.length; i++) {
    if (!values[i].match(/[0-9\-]/g)) {
      return values[i];
    }
  }
}

// Special cases for getting the oz in a drink.
var getOzSpecialCase = function(name, parts, adj) {
  // Default to 1 oz for certain cases. 0 for everything else.
  oz = Number(parts[0]);
  oz = 1.0;

  // Special case for beer, stout, other drinks
  if (name.match(/beer/gi) || name.match(/stout/gi)) {
    oz = 12.0;
  } else if (name.match(/champagne/gi) || name.match(/red bull/gi) ||
      name.match(/hot chocolate/gi)) {
    oz = 4.0;
  } 

  var unit = parts[0];
  if (!((name.match(/lemon/gi) ||
      name.match(/juice/gi) || name.match(/rum/gi) ||
      name.match(/cream/gi)) || name.match(/lime/gi) || 
      name.match(/mix/gi) || name.match(/soda/gi) ||
      name.match(/cider/gi) || name.match(/tea/gi) ||
      name.match(/coffee/gi) || name.match(/half-and-half/gi) ||
      name.match(/milk/gi) || name.match(/beer/gi) || name.match(/stout/gi)
      || name.match(/champagne/gi) || name.match(/liqueur/gi) ||
      name.match(/vodka/gi) || name.match(/red bull/gi) || 
      name.match(/hot chocolate/gi))) {
    oz = 0.0;
  }
  
  return [oz, unit];
}

Drink.prototype.isStrong = function() {
  var self = this;
  var abv = self.computeAdjective('strong');
  if (abv > numericCutoffs.strong) return true;
  return false;
}

Drink.prototype.isFruity = function() {
  var self = this;

  // Return true if any ingredient has "juice" in the title or if it belongs to
  // a category that contains the string "juice".
  for (var i = 0; i < self.ingredients.length; i++) {
    if (self.ingredients[i][0].match(/[Jj]uice/g) != null) {
      return true;
    }
    var categoryList = ingredientsJSON[self.ingredients[i][0]][2];
    for (var j = 0; j < categoryList.length; j++) {
      if (categoryList[j].match(/[Jj]uice/g)) {
        return true;
      }
    }
  }

  return false;
}

Drink.prototype.satisfiesCriterion = function(criterion) {
  var prop = criterion[1];
  switch (criterion[0]) {
    case 'is':
    case 'not':
      var wantTrue = criterion[0] == 'is';
      var propValue = this.properties[prop];
      if (typeof propValue == 'boolean') {
        return propValue == wantTrue;
      } else {
        assert.equal('number', typeof propValue);
        assert(prop in numericCutoffs);
        return (propValue > numericCutoffs[prop]) == wantTrue;
      }
    case 'has':
      var propRegex = new RegExp(prop, 'ig');
      for (var i = 0; i < this.ingredients.length; i++) {
        if (this.ingredients[i][0].match(propRegex)) {
          return true;
        }
      }
      return false;
    case 'not':
      return this.properties[prop] === false;
    case '<':
      return this.properties[prop] < criterion[2];
    case '>':
      return this.properties[prop] > criterion[2];
    default:
      assert(false);
  }
};

Drink.prototype.satisfiesCriteria = function(criteria) {
  return _.every(criteria, _.bind(this.satisfiesCriterion, this));
};

var allDrinks = _.map(drinksJSON, function(json) { 
  return new Drink(json);
});

function drinksSatisfyingCriteria(criteria) {
  var drinks = _.filter(allDrinks, function(drink) {
    return drink.satisfiesCriteria(criteria);
  });
  return _.sortBy(drinks, function(d) { return -d.popularity; });
}



module.exports = {
  Drink: Drink,
  allDrinks: allDrinks,
  isProperty: isProperty,
  allProperties: allProperties,
  drinksSatisfyingCriteria: drinksSatisfyingCriteria
};
