var assert = require('assert');
var Events = require('events');

var _ = require('underscore');
var ProbJS = require('probabilistic-js');
var Natural = require('natural');

var Drink = require('./drink');

var specialUtterances = {
  'done': [
    'ok', 'good', 'yes', 'yeah'
  ]
};

function recognizeSpeech(listener) {
  if (!window.webkitSpeechRecognition) {
    // TODO: better way to report errors
    alert('no speech recognition API.  Use Chrome!');
  } else {
    var rec = new window.webkitSpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.onresult = function(evt) {
      for (var i = evt.resultIndex; i < evt.results.length; ++i) {
        var result = evt.results[i];
        assert(result.isFinal);
        listener(result);
      }
    };
    rec.onerror = function(evt) {
      alert(evt.error);
      alert(evt.message);
    }
    rec.start();
    return rec;
  }
}

function synthesizeSpeech(str, callback) {
  var u = new SpeechSynthesisUtterance(str);
  u.onend = function() {
    if (callback) callback();
  };
  speechSynthesis.speak(u);
}

function Bartender() {
  var self = this;
  self.suggestedDrink = null;
  self.rec = recognizeSpeech(function(results) {
    self.handleInput(results[0].transcript);
  });
  self.emitter = new Events.EventEmitter();
}

Bartender.prototype.parseCriteria = function(sentence) {
  var self = this;
  var tokenizer = new Natural.WordTokenizer();
  var tokens = tokenizer.tokenize(sentence);
  var criteria = [];
  _.each(tokens, function(tok) {
    if (Drink.isProperty(tok)) {
      criteria.push(['is', tok]);
    }
  });
  return criteria;
};

Bartender.prototype.parseSpecialUtterances = function(sentence) {
  var self = this;
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

Bartender.prototype.handleInput = function(speech) {
  var self = this;
  self.emitter.emit('speech', 'user', speech);
  var criteria = self.parseCriteria(speech);
  var specialUtterances = self.parseSpecialUtterances(speech);
  var sentence;
  if (criteria.length == 0) {
    if (_.contains(specialUtterances, 'done')) {
      if (self.suggestedDrink) {
        sentence = 'OK, glad you are satisfied!';
      } else {
        sentence = "Sorry, I didn't understand that.";
      }
    }
  } else {
    var drinksSatisfying = Drink.drinksSatisfyingCriteria(criteria);
    sentence = 'You want something ' + _.flatten(criteria).join(' ') + '.';
    if (drinksSatisfying.length > 0) {
      self.suggestedDrink = drinksSatisfying[0];
      sentence += '  How about a ' + self.suggestedDrink.name + '?';
    }
  }
  self.emitter.emit('speech', 'system', sentence);
  self.rec.stop();
  synthesizeSpeech(sentence, function() {
    self.rec.start();
  });
};

module.exports = {
  Bartender: Bartender
};
