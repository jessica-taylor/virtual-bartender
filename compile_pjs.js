var Fs = require('fs');
var Path = require('path');

var ProbJS = require('probabilistic-js');

var filePath = Path.join(__dirname, 'lib', 'inference.pjs');
var inferenceImplPjs = Fs.readFileSync(filePath, 'utf8');
var inferenceImplJs = ProbJS.probTransform(inferenceImplPjs);
inferenceImplJs = inferenceImplJs.replace("require('probabilistic", "require('./probabilistic");
Fs.writeFileSync(Path.join(__dirname, 'lib', 'inference.js'), inferenceImplJs);
