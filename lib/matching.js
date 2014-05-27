var assert = require('assert');

var Natural = require('natural');
var _ = require('underscore');

var Drink = require('./drink');

var specialUtterances = {
  'positive': [
    'ok', 'good', 'yes', 'yeah', 'great', 'awesome', 'excellent', 'excellence', 'thank', 'thanks', 'love'
  ],
  'negative': [
    'bad', 'no', 'nope', 'gross', 'eww', 'disgusting', 'hate', 'terrible', 'awful'
  ]
};

var propertyAdditionalForms = {
  'fruity': ['frutti', 'fruit', 'fruits'],
  'sweet': ['sweets', 'suite', 'suites'],
  'flaming': ['fire', 'firey'],
  'nutty': ['naughty'],
  // TODO add on the rocks, fix parseCriteria to allow this
  'iced': ['ice']
};

function parseCriteria(sentence) {
  var tokenizer = new Natural.WordTokenizer();
  var tokens = tokenizer.tokenize(sentence);
  var criteria = [];
  _.each(tokens, function(tok) {
    if (Drink.isProperty(tok)) {
      criteria.push(['is', tok]);
    } else {
      _.each(_.pairs(propertyAdditionalForms), function(pair) {
        if (_.contains(pair[1], tok)) {
          criteria.push(['is', pair[0]]);
        }
      });
    }
  });
  return criteria;
};

function parseSpecialUtterances(sentence) {
  var tokenizer = new Natural.WordTokenizer();
  var tokens = tokenizer.tokenize(sentence);
  var utterances = [];
  _.each(_.pairs(specialUtterances), function(pair) {
    if (_.any(pair[1], function(word) { 
          return _.any(tokens, function(tok) { return tok == word; });
        })) {
      utterances.push(pair[0]);
    }
  });
  return utterances;
};

function getObservation(speechResults) {
  return _.map(speechResults, function(speechResult) {
    var criteria = parseCriteria(speechResult.transcript);
    var specialUtterances = parseSpecialUtterances(speechResult.transcript);
    var properties = {};
    _.each(Drink.allProperties, function(prop) { properties[prop] = null; });
    _.each(criteria, function(criterion) {
      if (criterion[0] == 'is') {
        properties[criterion[1]] = true;
      } else if (criterion[0] == 'not') {
        properties[criterion[1]] = false;
      } else {
        assert(false);
      }
    });
    var saidValues = {properties: properties};
    saidValues.positive = _.contains(specialUtterances, 'positive');
    saidValues.negative = _.contains(specialUtterances, 'negative');
    return {saidValues: saidValues, probability: speechResult.confidence};
  });
}

module.exports = {
  getObservation: getObservation
};
