var assert = require('assert');

var _ = require('underscore');
var ProbJS = require('probabilistic-js');


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
