var assert = require('assert');

var _ = require('underscore');
var ProbJS = require('probabilistic-js');
var Natural = require('natural');

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
}

Bartender.prototype.findDrinksMatching = function(adjectives) {
};

Bartender.prototype.findAdjectives = function(sentence) {
  var self = this;
  var tokenizer = new Natural.WordTokenizer();
  var tokens = tokenizer.tokenize(sentence);
  _.each(tokens, function(tok) {
    // TODO: check tok against known adjectives
  });
};

Bartender.prototype.handleInput = function(speech) {
  synthesizeSpeech('you said ' + speech);
};

