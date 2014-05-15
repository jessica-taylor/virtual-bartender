var assert = require('assert');
var Fs = require('fs');
var Path = require('path');
var _ = require('underscore');

var drinksJSON = require('./drinksjson'); // JSON.parse(Fs.readFileSync('drinks.json', 'utf8'));
var ingredientsJSON = require('./ingredientsjson'); // JSON.parse(Fs.readFileSync('ingredients.json', 'utf8'));
var allCategories = _.uniq(_.pluck(drinksJSON, 'category'));
var allProperties = ['strong', 'fruity', 'sweet', 'spicy', 'sour',
    'nutty','creamy','hot','iced']

var numericCutoffs = {
  // By percentage abv. 20% = 40proof seems reasonable
  'strong': 20.0 
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
      break;
    case 'fruity':
      return self.isFruity();
    default:
      break;
  }
}

Drink.prototype.isStrong = function() {
  var self = this;
  var volume = 0.0;
  var abv = 0.0;
  for (var ingredient : self.ingredients) {
    var name = ingredient[0];
    var amount = ingredient[1].toLowerCase();
    var oz = 1.0;
    var parts = amount.split(' ');
    var amt = parts[0];
    // If parts has space, should be number (maybe fraction) then unit
    if (parts.length > 1) {
      var unit = parts[1];
      amt = parts[0].split('/');
      if (amt.length > 1) {
        oz = Number(amt[0])/Number(amt[1]);
      }
      else {
        try {
          oz = Number(parts[0]); 
        }
        // Amount string has space but doesn't start with number...
        catch (err) {/* TODO */}
      }
    }
    // Convert units for those not in oz.
    if (units.indexOf('dash') >= 0) {
      oz /= 16;
    }
    else if (units.indexOf('teaspoon') >= 0 || units.indexOf('splash') >= 0) {
      oz /= 8;
    }
    else if (units.indexOf('tablespoon') >= 0) {
      oz *= (3/8);
    }
    else if (units.indexOf('cup') >= 0) {
      oz *= 8;
    }
    else if (units.indexOf('pint') >= 0) {
      oz *= 16;
    }
    else if (units.indexOf('liter') >= 0) {
      oz *= 33.8;
    }
    else if (units.indexOf('quart') >= 0) {
      oz *= 32;
    }
    else if (units.indexOf('gallon') >= 0) {
      oz *= 128;
    }
    volume += oz;
    abv += oz * ingredients[name][0];
  }
  abv /= volume;
  if (abv > numericCutoffs.strong) return true;
  return false;
}

Drink.prototype.isFruity = function() {
  var self = this;
  // For now, just see if there's any juice in the drink; if so it's fruity, if
  // not it's not.
  for (var i = 0; i < self.ingredients.length; i++) {
    if (self.ingredients[i][0].match(/[Jj]uice/g) != null) {
      return true;
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
