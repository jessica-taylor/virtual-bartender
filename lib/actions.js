var assert = require('assert');
var _ = require('underscore');

var Drink = require('./drink');

var U_GROUND_IF_WANT = 1.0;
var U_GROUND_IF_INDIFFERENT = -3.0;
var U_GROUND_IF_WANT_NOT = -6.0;

var U_SUGGEST = 0.0;
var U_REJECT_IF_NEGATIVE = 1.0;
var U_REJECT_IF_NOT_NEGATIVE = -3.0;
var U_DONE_IF_POSITIVE = 1.0;
var U_DONE_IF_NOT_POSITIVE = -3.0;

var groundSubActions = [];

_.each(Drink.allProperties, function(prop) {
  groundSubActions.push(['ground', ['is', prop]]);
  groundSubActions.push(['ground', ['not', prop]]);
});

var finalSubActions = ['suggest', 'reject', 'done'];

function subActionUtility(state, subAction) {
  if (subAction[0] == 'ground') {
    var prop = subAction[1][1];
    if (state[prop] === null) {
      return U_GROUND_IF_INDIFFERENT;
    } else if (state[prop] === (subAction[1][0] === 'is')) {
      return U_GROUND_IF_WANT;
    } else {
      return U_GROUND_IF_WANT_NOT;
    }
  } else if (subAction[0] == 'suggest') {
    return 0.0;
  } else if (subAction[0] == 'rejecct') {
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
  return totalUtility / historySamples.length;
}

function bestAction(stateSamples) {
  var action = [];
  _.each(groundSubActions, function(suba) {
    if (subActionExpectedUtility(stateSamples, suba) > 0) {
      action.push(suba);
    }
  });
  action.push(_.max(finalSubAction, function(suba) {
    return subActionExpectedUtility(stateSamples, suba);
  }));
  return action;
}

module.exports = {
  bestAction: bestAction
};
