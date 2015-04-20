/**
 * declutter - remove clutter from HTML
 * Copyright (c) 2015, Yaogang Lian. (MIT Licensed)
 * https://github.com/ylian/declutter
 */

;(function() {

/**
 * Helper Functions
 */


/**
 * Declutter
 */

// Define all the regexps here so we don't instantiate them repeatedly in loops.
var regexps = {
  unlikelyCandidates: /combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter/i,
  okMaybeItsACandidate: /and|article|body|column|main|shadow/i,
  positive: /article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/i,
  negative: /combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/i,
  extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single/i,
  divToPElements: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
  replaceBrs: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
  replaceFonts: /<(\/?)font[^>]*>/gi,
  trim: /^\s+|\s+$/g,
  normalize: /\s{2,}/g,
  killBreaks: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
  videos: /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
};

function declutter(node) {
  return null;
}


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
