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
  recognizeSpeech(function(results) {
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

Bartender.prototype.handleInput = function(speech) {
  var self = this;
  self.emitter.emit('speech', 'user', speech);
  var criteria = self.parseCriteria(speech);
  var drinksSatisfying = Drink.drinksSatisfyingCriteria(criteria);
  var sentence = 'you want something ' + _.flatten(criteria).join(' ') + '.';
  if (drinksSatisfying.length > 0) {
    sentence += '  How about a ' + drinksSatisfying[0].name + '?';
  }
  self.emitter.emit('speech', 'system', speech);
  synthesizeSpeech(sentence);
};

module.exports = {
  Bartender: Bartender
};
