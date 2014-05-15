virtual-bartender
=================

Dialogue system for ordering drinks

For running this on a Mac, you must modify the following file: virtual-bartender/node_modules/natural/node_modules/sylvester/lib/node-sylvester/matrix.js and comment out lines 872-874 (the internals of the getLapack function) since lapack does not work on Mac.
