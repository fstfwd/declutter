/**
 * declutter - remove clutter from HTML
 * Copyright (c) 2015, Yaogang Lian. (MIT Licensed)
 * https://github.com/ylian/declutter
 */

;(function() {

/**
 * Helper Functions
 */

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}


/**
* Declutter
*/

function declutter(node, opt) {
  opt = merge({}, declutter.defaults, opt || {});
}


/**
* Options
*/

declutter.options =
declutter.setOptions = function(opt) {
 merge(declutter.defaults, opt);
 return declutter;
};

declutter.defaults = {
};


/**
* Expose
*/

if (typeof exports === 'object') {
  module.exports = declutter;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return declutter; });
} else {
  this.declutter = declutter;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
