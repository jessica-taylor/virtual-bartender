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
  function callCallback(result) {
    if (callback) {
      var cb = callback;
      callback = null;
      cb(result);
    }
  }
  u.onend = function() {
    callCallback(true);
  };
  setTimeout(function() { callCallback(false); }, 4000);
  u.onerror = function(evt) {
    alert(evt.error);
    alert(evt.message);
  }
  setTimeout(function() { speechSynthesis.speak(u); }, 100);
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
  self.criteriaToConfirm = [];
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
    _.map(self.criteria, function(c) { 
      if (c[0] == 'not') return 'not ' + c[1];
      if (c[1].indexOf('has_') == 0) return 'with ' + c[1].substring(4);
      return c[1]; }));
  var sentence = 'You want something ' + criteriaText + '. ';
  if (drinksSatisfying.length > 0) {
    self.suggestedDrink = drinksSatisfying[0];
    sentence += 'How about a ' + self.suggestedDrink.name + '? ';
  } else {
    sentence += "I don't know about any good drink like that. ";
    self.criteria = [];
  }
  self.fillDrinkDiv();
  return sentence;
};

Bartender.prototype.fillDrinkDiv = function() {
  var self = this;
  if (self.suggestedDrink) {
    $('#drinkName').text(self.suggestedDrink.name);
    var img = $('<img>').attr('src', '/images/' + self.suggestedDrink.name + '.jpg').attr('alt', self.suggestedDrink.name);
    $('#drinkImage').empty().append(img);
    Utilities.when(function() { return img.width() > 0 && img.height() > 0; }, function() {
      var width = img.width();
      var height = img.height();
      var maxWidth = 400;
      var maxHeight = 300;
      var scale = Math.min(maxWidth/width, maxHeight/height);
      img.attr('width', Math.floor(width*scale) + 'px');
      img.attr('height', Math.floor(height*scale) + 'px');
    });
    $('#ingredientList').html('');
    var ingredientHtml = '';
    for (var i = 0; i < self.suggestedDrink.ingredients.length; i++) {
      // Add the amount of ingredient then the ingredient name to the html
      var ingredient = self.suggestedDrink.ingredients[i];
      ingredientHtml += '<li>';
      ingredientHtml += ingredient[1] + ' ';
      ingredientHtml += ingredient[0];
      ingredientHtml += '</li>';
    }
    $('#ingredientList').html(ingredientHtml);
    $('#directions').text(self.suggestedDrink.directions);
  }
}

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
  var bestAction = Actions.bestAction(historySamples, self.criteria);
  console.log('bestAction', bestAction);
  self.actions.push(bestAction);
  var sentence = '';
  var newCriteria = [];
  _.each(bestAction, function(subAction) {
    switch (subAction[0]) {
      case 'confirm':
        sentence += 'I didn\'t quite get that. Did you want something ' +
                    subAction[1][1] + '?';
        self.criteriaToConfirm.push(subAction[1]); 
        break;
      case 'ground':
        newCriteria.push(subAction[1]);
        break;
      case 'reject':
        if (self.criteriaToConfirm.length > 0) {
          sentence += 'Sorry, I misheard you. Please try again.';
          self.criteriaToConfirm = [];
        } else if (self.suggestedDrink) {
          self.rejectedDrinks.push(self.suggestedDrink);
          sentence += 'Sorry about that. ';
          sentence += self.suggestNewDrink();
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
            for (var i = 0; i < self.criteria.length; i++) {
              if (self.criteria[i][1] == newCriterion[1] && self.criteria[i][0]
                != newCriterion[0]) {
                self.criteria.splice(i, 1);
              }
            }
            self.criteria.push(newCriterion);
          }
        });
        if (gotNew) {
          sentence += self.suggestNewDrink();
          self.criteriaToConfirm = [];
        } else {
          sentence += "Sorry, I didn't understand that. ";
        }
        break;
      case 'specific':
        var drinkName = subAction[1];
        sentence += 'OK, here is some information about ' + drinkName + '. ';
        self.suggestedDrink = _.filter(Drink.allDrinks, function(d) {
          return d.name == drinkName;
        })[0];
        self.fillDrinkDiv();
      case 'done':
        if (self.criteriaToConfirm.length > 0) {
          // User has confirmed the criteria. 
          for (var i = 0; i < self.criteriaToConfirm.length; i++) {
            self.criteria.push(self.criteriaToConfirm[i]);
          }
          sentence += self.suggestNewDrink();
          self.criteriaToConfirm = [];
        } else {
          sentence += 'OK, glad you are satisfied! ';
        }
        break;
      default:
        assert(false);
    }
  });
  self.emitter.emit('speech', 'system', sentence);
  console.log('emitted');
  console.log('stopped recording');
  synthesizeSpeech(sentence, function(success) {
    console.log('synthesized');
    self.rec.start();
    console.log('started recording');
  });
};

module.exports = {
  Bartender: Bartender
};
