var assert = require('assert');
var Fs = require('fs');
var Path = require('path');
var _ = require('underscore');

var drinksJSON = JSON.parse(Fs.readFileSync('drinks.json', 'utf8'));
var ingredientsJSON = JSON.parse(Fs.readFileSync('ingredients.json', 'utf8'));
var allCategories = _.uniq(_.pluck(drinksJSON, 'category'));
var allProperties = ['strong', 'fruity', 'sweet', 'spicy', 'sour',
    'nutty','creamy','hot','iced']

var numericCutoffs = {
  'strong': 30.0 // TODO what is reasonable?
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
    // TODO move Ryan's strength-computing code here
      break;
    case 'fruity':
      return self.isFruity();
    default:
      break;
  }
}

Drink.prototype.isFruity = function() {
  var self = this;
  // For now, just see if there's any juice in the drink; if so it's fruity, if
  // not it's not.
  for (var i = 0; i < self.ingredients.length; i++) {
    if (self.ingredients[0].indexOf('juice') != -1) {
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
  return _.sortBy(drinks, function(d) { return d.popularity; });
}



module.exports = {
  Drink: Drink,
  allDrinks: allDrinks,
  isProperty: isProperty,
  allProperties: allProperties,
  drinksSatisfyingCriteria: drinksSatisfyingCriteria
};
