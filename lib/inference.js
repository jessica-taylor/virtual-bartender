/*
 * This module just translates inference_impl.pjs to js and then exports its
 * exports.
 */
var Fs = require('fs');
var Path = require('path');

var ProbJS = require('probabilistic-js');

// from http://stackoverflow.com/questions/17581830/load-node-js-module-from-string-in-memory
function requireFromString(src, filename) {
  var Module = module.constructor;
  var m = new Module();
  m._compile(src, filename);
  return m.exports;
}

var filePath = Path.join(__dirname, 'inference_impl.pjs', 'utf8');
var inferenceImplPjs = Fs.readFileSync(filePath);
var inferenceImplJs = ProbJS.probTransform(inferenceImplPjs);
var inferenceImpl = requireFromString(inferenceImplJS, filePath);

module.exports = inferenceImpl;
