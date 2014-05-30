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

var regex = {
  'stronger': ['is', 'more_strong'],
  'weaker': ['is', 'less_strong'],
  'sweeter': ['is', 'more_sweet'],
  'on the rocks': ['is', 'iced'],
  'neat': ['not', 'iced'],
  'less strong': ['is', 'less_strong'],
  'less sweet': ['is', 'less_sweet']
};

_.each(Drink.allProperties, function(prop) {
  regex[prop] = ['is', prop];
});

_.each(propertyAdditionalForms, function(val, key, list) {
  for (var i = 0; i < val.length; i++) {
    regex[val[i]] = ['is', key];
  }
});

var negationWords = '(don\'t|isn\'t|not|doesn\'t)'
var possessorWords = ['has', 'with'];

function isNegation(word) {
  return _.contains(negationWords, word);
};

function isPossessor(word) {
  return _.contains(possessorWords, word);
}

function parseCriteria(sentence) {
  var criteria = [];
  for (var key in regex) {
    var matchExpr = new RegExp(negationWords + '.*' + '(' + key + ')', 'ig');
    var matches = sentence.match(matchExpr);
    if (matches) {
      var crit = regex[key];
      if (crit[0] == 'is') {
        crit[0] = 'not';
      } else {
        crit[0] = 'is';
      }
      criteria.push(crit);
    } else {
      var matchExpr = new RegExp(key, 'ig');
      var matches = sentence.match(matchExpr);
      if (matches) {
        criteria.push(regex[key]);
      }
    }
  }

  // TODO add without
  for (var i = 0; i < possessorWords.length; i++) {
    var matchExpr = new RegExp(possessorWords[i] + ' (.*)');
    var matches = matchExpr.exec(sentence);
    if (matches && matches.length > 1) {
      if (Drink.isProperty('has_' + matches[1])) {
        criteria.push(['is', 'has_' + matches[1]]);
      }
    }
  }
  
  /*var tokenizer = new Natural.WordTokenizer();
  var tokens = tokenizer.tokenize(sentence);
  var criteria = [];
  var want = true;
  var wantIngred = false;
  _.each(tokens, function(tok) {
    if (isNegation(tok)) want = false;
    if (isPossessor(tok)) wantIngred = true;
    if (wantIngred) {
      if (Drink.isProperty('has_' + tok)) {
        criteria.push(['is', 'has_' + tok]);
      }
      wantIngred = false;
    }
    if (Drink.isProperty(tok)) {
      if (want) {
        criteria.push(['is', tok]);
      } else {
        criteria.push(['not', tok]);
      }
    } else {
      if (tok in comparativeProperties) {
        criteria.push(['is',
          comparativeProperties[tok]]);
      }
      _.each(_.pairs(propertyAdditionalForms), function(pair) {
        if (_.contains(pair[1], tok)) {
          if (want) {
            criteria.push(['is', pair[0]]);
          } else {
            criteria.push(['not', pair[0]]);
          }
        }
      });
    }
  });*/
  return criteria;
}

function parseSpecialUtterances(sentence) {
  var tokenizer = new Natural.WordTokenizer();
  var tokens = tokenizer.tokenize(sentence);
  var utterances = [];
  _.each(_.pairs(specialUtterances), function(pair) {
    if (_.any(pair[1], function(word) { 
          return _.contains(tokens, word);
        })) {
      utterances.push(pair[0]);
    }
  });
  console.log('sentence', sentence, 'special', utterances);
  return utterances;
}

function parseSpecificDrinks(sentence) {
  sentence = sentence.toLowerCase();
  var want = {};
  _.each(Drink.allDrinks, function(drink) {
    want[drink.name] = sentence.indexOf(drink.name.toLowerCase()) != -1;
  });
  return want;
}

function getObservation(speechResults) {
  var totalConfidence = _.reduce(_.pluck(speechResults, 'confidence'), function(x, y) { return x + y; });
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
      } else if (criterion[0] == '>') {
        properties[criterion[1]] = criterion[2];
      } else if (criterion[0] == '<') {
        properties[criterion[1]] = criterion[2];
      } else {
        assert(false);
      }
    });
    var saidValues = {properties: properties};
    saidValues.positive = _.contains(specialUtterances, 'positive');
    saidValues.negative = _.contains(specialUtterances, 'negative');
    saidValues.specificDrinks = parseSpecificDrinks(speechResult.transcript);
    return {saidValues: saidValues, probability: speechResult.confidence/totalConfidence};
  });
}

module.exports = {
  getObservation: getObservation
};
