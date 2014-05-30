
var assert = require('assert');
var _ = require('underscore');

var Drink = require('./drink');

var P_WANT_PROPERTY = 0.2;
var P_WANT_NOT_PROPERTY = 0.1;
var P_CARE_ABOUT_PROPERTY = P_WANT_PROPERTY + P_WANT_NOT_PROPERTY;
var P_INDIFFERENT_ABOUT_PROPERTY = 1 - P_CARE_ABOUT_PROPERTY;
var P_SAY_IF_WANT = 0.6;
var P_SAY_IF_INDIFFERENT = 0.02;
var P_SAY_IF_WANT_NOT = 0.01;

var P_POSITIVE = 0.2;
var P_NEGATIVE = 0.2;
var P_POSITIVE_IF_CONFIRM = 0.6;
var P_NEGATIVE_IF_CONFIRM = 0.3;

var P_WANT_SPECIFIC_DRINK = 0.01;
var P_SAY_WANT_SPECIFIC_IF_WANT = P_SAY_IF_WANT;
var P_SAY_WANT_SPECIFIC_IF_NOT_WANT = 0.0001;

function observeHMM(currentDistr, likelihood) {
  assert.equal(currentDistr.length, likelihood.length);
  var joints = _.times(currentDistr.length, function(i) { 
    return currentDistr[i] * likelihood[i];
  });
  var totalJoint = _.reduce(joints, function(x, y) { return x + y; });
  return _.map(joints, function(j) { return j/totalJoint; });
}

function transitionHMM(currentDistr, condDistr) {
  assert.equal(currentDistr.length, condDistr.length);
  assert.equal(currentDistr.length, condDistr[0].length);
  return _.times(currentDistr.length, function(i) {
    var joints = _.map(condDistr, function(cps, j) {
      return currentDistr[j] * cps[i];
    });
    return _.reduce(joints, function(x, y) { return x + y; });
  });
}

function initState() {
  var state = {properties: {}};
  _.each(Drink.allProperties, function(prop) {
    state.properties[prop] = 
      [P_WANT_PROPERTY, P_WANT_NOT_PROPERTY, P_INDIFFERENT_ABOUT_PROPERTY];
  });
  state.positive = [P_POSITIVE, 1 - P_POSITIVE];
  state.negative = [P_NEGATIVE, 1 - P_NEGATIVE];
  return state;
}

function transitionState(state, action) {
  var newState = {properties: _.clone(state.properties)};
  var isConfirm = _.last(action)[0] == 'confirm';
  newState.positive = [P_POSITIVE, 1 - P_POSITIVE];
  newState.negative = [P_NEGATIVE, 1 - P_NEGATIVE];
  return newState;
}

function conditionState(state, observation) {
  var newState = {properties: {}};
  _.each(_.keys(state.properties), function(prop) {
    var p_observe_if_want = 0.0;
    var p_observe_if_want_not = 0.0;
    var p_observe_if_indifferent = 0.0;
    _.each(observation, function(obs) {
      if (obs.saidValues.properties[prop] === true) {
        p_observe_if_want += obs.probability * P_SAY_IF_WANT;
        p_observe_if_want_not += obs.probability * P_SAY_IF_WANT_NOT;
        p_observe_if_indifferent += obs.probability * P_SAY_IF_INDIFFERENT;
      } else if (obs.saidValues.properties[prop] === false) {
        p_observe_if_want += obs.probability * P_SAY_IF_WANT_NOT;
        p_observe_if_want_not += obs.probability * P_SAY_IF_WANT;
        p_observe_if_indifferent += obs.probability * P_SAY_IF_INDIFFERENT;
      } else {
        p_observe_if_want += obs.probability * (1 - P_SAY_IF_WANT - P_SAY_IF_WANT_NOT);
        p_observe_if_want_not += obs.probability * (1 - P_SAY_IF_WANT - P_SAY_IF_WANT_NOT);
        p_observe_if_indifferent += obs.probability * (1 - 2 * P_SAY_IF_INDIFFERENT);
      }
    });
    if (prop == 'has_vodka') {
      console.log('ps',                      [p_observe_if_want,
                                              p_observe_if_want_not,
                                              p_observe_if_indifferent]);
    }
    newState.properties[prop] = observeHMM(state.properties[prop],
                                           [p_observe_if_want,
                                            p_observe_if_want_not,
                                            p_observe_if_indifferent]);
  });
  _.each(['positive', 'negative'], function(emotion) {
    var p_say = 0.0;
    _.each(observation, function(obs) {
      if (obs.saidValues[emotion]) {
        p_say += obs.probability;
      }
    });
    var yes_likelihood = p_say * P_SAY_IF_WANT + (1 - p_say) * (1 - P_SAY_IF_WANT);
    var no_likelihood = p_say * P_SAY_IF_INDIFFERENT + (1 - p_say) * (1 - P_SAY_IF_INDIFFERENT);
    newState[emotion] = observeHMM(state[emotion], [yes_likelihood, no_likelihood]);
  });
  return newState;
}

function inferState(observations, actions) {
  assert.equal(observations.length, actions.length + 1);
  var state = null;
  for (var i = 0; i < observations.length; i++) {
    if (i == 0) {
      state = initState();
    } else {
      state = transitionState(state, actions[i-1]);
    }
    state = conditionState(state, observations[i]);
  }
  return state;
}

module.exports = {
  inferState: inferState
};
