var Fs = require('fs');
var Path = require('path');

var ProbJs = require('probabilistic-js');

var filePath = Path.join(__dirname, 'lib', 'inference.pjs');
var inferenceImplPjs = Fs.readFileSync(filePath, 'utf8');
var inferenceImplJs = ProbJs.probTransform(inferenceImplPjs);
inferenceImplJs = inferenceImplJs.replace("require('probabilistic", "require('./probabilistic");
inferenceImplJs = inferenceImplJs.replace('(arg0)', "('assert')");
inferenceImplJs = inferenceImplJs.replace('(arg0)', "('underscore')");
inferenceImplJs = inferenceImplJs.replace('(arg0)', "('./drink')");
Fs.writeFileSync(Path.join(__dirname, 'lib', 'inference.js'), inferenceImplJs);
