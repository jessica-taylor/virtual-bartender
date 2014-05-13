var assert = require('assert');
var Fs = require('fs');
var Path = require('path');
var _ = require('underscore');

var drinksJSON = JSON.parse(Fs.readFileSync('drinks.json', 'utf8'));
var ingredientsJSON = JSON.parse(Fs.readFileSync('ingredients.json', 'utf8'));
var allCategories = _.uniq(_.pluck(drinksJSON, 'category'));

function Drink(json) {
  var self = this;
  self.properties = {};
  _.each(allCategories, function(cat) {
    self.properties[cat] = drink.category == cat;
  });
}

Drink.prototype.satisfiesCriterion = function(criterion) {
  var prop = criterion[1];
  switch (criterion[0]) {
    case 'is':
      return this.properties[prop] === true;
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

var allDrinks = _.map(allDrinksJSON, function(json) { 
  return new Drink(json);
});

function drinksSatisfyingCriteria(criteria) {
  return _.filter(allDrinks, function(drink) {
    return drink.satisfiesCriteria(criteria);
  });
}



module.exports = {
  Drink: Drink,
  allDrinks: allDrinks,
  drinksSatisfyingCriteria: drinksSatisfyingCriteria
};
