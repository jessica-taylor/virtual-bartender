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


function subActionUtility(state, subAction) {
  if (subAction[0] == 'ground') {
    var prop = subAction[1][1];
    if (state.properties[prop] === null) {
      return U_GROUND_IF_INDIFFERENT;
    } else if (state.properties[prop] === (subAction[1][0] === 'is')) {
      return U_GROUND_IF_WANT;
    } else {
      return U_GROUND_IF_WANT_NOT;
    }
  } else if (subAction[0] == 'confirm') {
    var prop = subAction[1][1];
    if (state.properties[prop] === null) {
      return U_CONFIRM_IF_INDIFFERENT;
    } else if (state.properties[prop] === (subAction[1][0] === 'is')) {
      return U_CONFIRM_IF_WANT;
    } else {
      return U_CONFIRM_IF_WANT_NOT;
    }
  } else if (subAction[0] == 'suggest') {
    return 0.0;
  } else if (subAction[0] == 'reject') {
    return state.negative ? U_REJECT_IF_NEGATIVE : U_REJECT_IF_NOT_NEGATIVE;
  } else if (subAction[0] == 'done') {
    return state.positive ? U_DONE_IF_POSITIVE : U_DONE_IF_NOT_POSITIVE;
  } else {
    assert(false);
  }
}

function subActionExpectedUtility(historySamples, subAction) {
  var totalUtility = 0.0;
  _.each(historySamples, function(history) {
    totalUtility += subActionUtility(_.last(history).state, subAction);
  });
  console.log('subAction', Util.inspect(subAction), 'expectedUtility', totalUtility / historySamples.length);
  return totalUtility / historySamples.length;
}

function bestAction(stateSamples) {
  var groundedProperties = [];
  var action = [];
  _.each(groundSubActions, function(suba) {
    if (subActionExpectedUtility(stateSamples, suba) > 0) {
      action.push(suba);
      groundedProperties.push(suba[1][1]);
    }
  });
  action.push(_.max(finalSubActions, function(suba) {
    if (suba[0] == 'confirm' && _.contains(groundedProperties, suba[1][1])) {
      return -Infinity;
    }
    return subActionExpectedUtility(stateSamples, suba);
  }));
  return action;
}

module.exports = {
  bestAction: bestAction
};
