var assert = require('assert');
var Fs = require('fs');
var Path = require('path');
var _ = require('underscore');

var drinksJSON = JSON.parse(Fs.readFileSync('drinks.json', 'utf8'));
var ingredientsJSON = JSON.parse(Fs.readFileSync('ingredients.json', 'utf8'));
var allCategories = _.uniq(_.pluck(drinksJSON, 'category'));

function Drink(json) {
  var self = this;
  self.adjectives = {};
  _.each(allCategories, function(cat) {
    self.adjectives[cat] = drink.category == cat;
  });
}

Drink.prototype.satisfiesCriterion = function(criterion) {
  var adj = criterion[1];
  switch (criterion[0]) {
    case 'is':
      return this.adjectives[adj] === true;
    case 'not':
      return this.adjectives[adj] === false;
    case '<':
      return this.adjectives[adj] < criterion[2];
    case '>':
      return this.adjectives[adj] > criterion[2];
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
function drinksWithCriteria(criteria) {
  return _.filter(drinksJSON, function(drink) {
    if (
  });
}



module.exports = {
  drinksJSON: drinksJSON,
  ingredientsJSON: ingredientsJSON,
  getAdjectives: getAdjectives
};
