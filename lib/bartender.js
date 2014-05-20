var assert = require('assert');
var Events = require('events');

var _ = require('underscore');
var Natural = require('natural');

var Utilities = require('./utilities');
var Drink = require('./drink');
var Inference = require('./inference');
var Actions = require('./actions');
var Matching = require('./matching');

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
  u.onerror = function(evt) {
    alert(evt.error);
    alert(evt.message);
  }
  speechSynthesis.speak(u);
}

function Bartender() {
  var self = this;
  self.suggestedDrink = null;
  self.rejectedDrinks = [];
  self.rec = recognizeSpeech(function(results) {
    self.handleInput(results);
  });
  self.emitter = new Events.EventEmitter();
  self.criteria = [];
  self.actions = [];
  self.observations = [];
}

Bartender.prototype.suggestNewDrink = function() {
  var self = this;
  var drinksSatisfying = Drink.drinksSatisfyingCriteria(self.criteria);
  drinksSatisfying = _.filter(drinksSatisfying, function(d) {
    return !_.any(self.rejectedDrinks, function(r) {
      return r.name == d.name;
    });
  });
  var criteriaText = Utilities.commaSeparatedItems(
    _.map(self.criteria, function(c) { return c[1]; }));
  var sentence = 'You want something ' + criteriaText + '. ';
  if (drinksSatisfying.length > 0) {
    self.suggestedDrink = drinksSatisfying[0];
    sentence += 'How about a ' + self.suggestedDrink.name + '? ';
  } else {
    sentence += "I don't know about any good drink like that. ";
    self.criteria = [];
  }
  return sentence;
};

Bartender.prototype.handleInput = function(speech) {
  var self = this;
  self.rec.stop();
  var observation = Matching.getObservation(speech);
  self.observations.push(observation);
  var historySamples = Inference.inferHistory(self.observations, self.actions);
  console.log('historySamples', historySamples);
  var saidIndexCounts = _.countBy(historySamples, function(h) { return _.last(h).saidIndex; });
  var bestIndex = Number(_.max(_.pairs(saidIndexCounts), function(p) {
    return p[1];
  })[0]);
  self.emitter.emit('speech', 'user', speech[bestIndex].transcript);
  var bestAction = Actions.bestAction(historySamples);
  console.log('bestAction', bestAction);
  self.actions.push(bestAction);
  var sentence = '';
  var newCriteria = [];
  _.each(bestAction, function(subAction) {
    switch (subAction[0]) {
      case 'ground':
        newCriteria.push(subAction[1]);
        break;
      case 'reject':
        if (self.suggestedDrink) {
          self.rejectedDrinks.push(self.suggestedDrink);
          sentence += 'Sorry about that. ';
        } else {
          sentence += "Sorry. I don't know what you want. ";
        }
        break;
      case 'suggest':
        var gotNew = false;
        _.each(newCriteria, function(newCriterion) {
          if (!_.any(self.criteria, function(oldCriterion) {
            return _.isEqual(newCriterion, oldCriterion);
          })) {
            gotNew = true;
            self.criteria.push(newCriterion);
          }
        });
        if (gotNew) {
          sentence += self.suggestNewDrink();
        } else {
          sentence += "Sorry, I didn't understand that. ";
        }
        break;
      case 'done':
        if (self.suggestedDrink) {
          sentence += 'OK, glad you are satisfied! ';
        } else {
          sentence += "Sorry, I didn't understand that. ";
        }
        break;
      default:
        assert(false);
    }
  });
  self.emitter.emit('speech', 'system', sentence);
  console.log('emitted');
  console.log('stopped recording');
  synthesizeSpeech(sentence, function() {
    console.log('synthesized');
    self.rec.start();
    console.log('started recording');
  });
};

module.exports = {
  Bartender: Bartender
};
