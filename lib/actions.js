var assert = require('assert');
var Util = require('util');

var _ = require('underscore');

var Drink = require('./drink');

var U_GROUND_IF_WANT = 2.0;
var U_GROUND_IF_INDIFFERENT = -1.5;
var U_GROUND_IF_WANT_NOT = -2.0;

var U_CONFIRM_IF_WANT = 1.0;
var U_CONFIRM_IF_INDIFFERENT = -0.5;
var U_CONFIRM_IF_WANT_NOT = -0.7;

var U_SPECIFIC_IF_WANT = 5.0;
var U_SPECIFIC_IF_NOT_WANT = -1.0;

var U_SUGGEST = 0.0;
var U_REJECT_IF_NEGATIVE = 1.5;
var U_REJECT_IF_NOT_NEGATIVE = -2.0;
var U_DONE_IF_POSITIVE = 1.5;
var U_DONE_IF_NOT_POSITIVE = -2.0;


var allCriteria = [];

_.each(Drink.allProperties, function(prop) {
  allCriteria.push(['is', prop]);
  allCriteria.push(['not', prop]);
});

var groundSubActions = _.map(allCriteria, function(criterion) {
  return ['ground', criterion];
});

var finalSubActions = [['suggest'], ['reject'], ['done']];

_.each(allCriteria, function(criterion) {
  finalSubActions.push(['confirm', criterion]);
});

// _.each(Drink.allDrinks, function(drink) {
//   finalSubActions.push(['specific', drink.name]);
// });

function subActionExpectedUtility(stateDistr, subAction) {
  var util = 0;
  if (subAction[0] == 'ground') {
    var prop = subAction[1][1];
    var distr = stateDistr.properties[prop];
    var p_true = distr[0], p_false = distr[1], p_null = distr[2];
    var p_agree = subAction[1][0] === 'is' ? p_true : p_false;
    util = p_null * U_GROUND_IF_INDIFFERENT +
           p_agree * U_GROUND_IF_WANT +
           (1 - p_agree - p_null) * U_GROUND_IF_WANT_NOT;
  } else if (subAction[0] == 'confirm') {
    var prop = subAction[1][1];
    var distr = stateDistr.properties[prop];
    var p_true = distr[0], p_false = distr[1], p_null = distr[2];
    var p_agree = subAction[1][0] === 'is' ? p_true : p_false;
    util = p_null * U_CONFIRM_IF_INDIFFERENT +
           p_agree * U_CONFIRM_IF_WANT +
           (1 - p_agree - p_null) * U_CONFIRM_IF_WANT_NOT;
  } else if (subAction[0] == 'specific') {
    var drink = subAction[1];
    var distr = stateDistr.specificDrinks[drink];
    var p_true = distr[0], p_false = distr[1];
    util = p_true * U_SPECIFIC_IF_WANT + p_false * U_SPECIFIC_IF_NOT_WANT;
  } else if (subAction[0] == 'suggest') {
    util = 0.0;
  } else if (subAction[0] == 'reject') {
    var distr = stateDistr.negative;
    util = distr[0] * U_REJECT_IF_NEGATIVE + distr[1] * U_REJECT_IF_NOT_NEGATIVE;
  } else if (subAction[0] == 'done') {
    var distr = stateDistr.positive;
    util = distr[0] * U_DONE_IF_POSITIVE + distr[1] * U_DONE_IF_NOT_POSITIVE;
  } else {
    assert(false);
  }
  console.log('action', Util.inspect(subAction), 'util', util);
  return util;
}


function bestAction(stateDistr, existingCriteria, drink) {
  var groundedProperties = [];
  var action = [];
  _.each(groundSubActions, function(suba) {
    if (subActionExpectedUtility(stateDistr, suba) > 0) {
      action.push(suba);
      groundedProperties.push(suba[1][1]);
    }
  });
  action.push(_.max(finalSubActions, function(suba) {
    if (suba[0] == 'confirm' && _.contains(groundedProperties, suba[1][1])) {
      return -Infinity;
    }
    if (suba[0] == 'confirm' && _.contains(_.pluck(existingCriteria, 1), suba[1][1])) {
      return -Infinity;
    }
    return subActionExpectedUtility(stateDistr, suba);
  }));

  for (var i = 0; i < action.length; i++) {
    action[i] = convertSubaction(action[i], drink);
  }

  return action;
}

function convertSubaction(suba, drink) {
  if (!suba[1]) {
    return suba;
  }
  
  var newSuba = [];

  for (var i = 0; i < suba.length; i++) {
    newSuba.push(_.clone(suba[i]));
  }

  if (newSuba[1][1].indexOf('more_') != -1) {
    var prop = newSuba[1][1].substring(5);
    if (!drink) {
      newSuba[1] = ['>', prop, Drink.numericCutoffs[prop]];
    } else {
      newSuba[1] = ['>', prop, drink.computeAdjective(prop)];
    }
  } else if (newSuba[1][1].indexOf('less_') != -1) {
    var prop = newSuba[1][1].substring(5);
    if (!drink) {
      newSuba[1] = ['<', prop, Drink.numericCutoffs[prop]];
    } else {
      newSuba[1] = ['<', prop, drink.computeAdjective(prop)];
    }
  }
  return newSuba;
}

module.exports = {
  bestAction: bestAction
};
