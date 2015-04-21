/**
 * declutter - remove clutter from HTML
 * Copyright (c) 2015, Yaogang Lian. (MIT Licensed)
 * https://github.com/ylian/declutter
 */

;(function() {

/**
 * Helpers
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

function contentScoreForTagName(tagName) {
  var contentScore = 0;
  switch (tagName) {
    case 'P':
    case 'DIV':
      contentScore += 5;
      break;
    case 'PRE':
    case 'TD':
    case 'BLOCKQUOTE':
      contentScore += 3;
      break;
    case 'ADDRESS':
    case 'OL':
    case 'UL':
    case 'DL':
    case 'DD':
    case 'DT':
    case 'LI':
    case 'FORM':
      contentScore -= 3;
      break;
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
    case 'TH':
      contentScore -= 5;
      break;
  }
  return contentScore;
}

function contentScoreForClassName(className) {
  if (className === '') return 0;
  var contentScore = 0;
  if (regexps.negative.test(className)) contentScore -= 25;
  if (regexps.positive.test(classname)) contentScore += 25;
  return contentScore;
}

function contentScoreForId(id) {
  if (id === '') return 0;
  var contentScore = 0;
  if (regexps.negative.test(id)) contentScore -= 25;
  if (regexps.positive.test(id)) contentScore += 25;
  return contentScore;
}

function getLinkDensity(node) {
  var links = node.getElementsByTagName('a');
  var textLength = node.innerText.trim().length;
  var linkLength = 0;
  for (var i=0, l=links.length; i<l; i++) {
    linkLength += links[i].innerText.trim().length;
  }
  return linkLength / textLength;
}


/**
 * Declutter
 */

var topCandidate;

function declutter(node) {
  // Find the top candidate
  topCandidate = null;
  cleanNode(node);

  // Get content from the top candidate and its siblings.
  var articleContent = document.createElement('div');

  var siblingScoreThreshold = topCandidate.contentScore * 0.2;
  var siblingNodes = topCandidate.parentNode.childNodes;
  for (var i=0, l=siblingNodes.length; i<l; i++) {
    var sibling = siblingNodes[i];
    var append = false;

    if (sibling === topCandidate) append = true;

    // Give a bonus if the sibling and top candidate have the same classname
    var contentBonus = 0;
    if (topCandidate.className !== '' && sibling.className === topCandidate.className()) {
      contentBonus += siblingScoreThreshold;
    }

    if (sibling.contentScore + contentBonus >= siblingScoreThreshold) {
      append = true; 
    }

    if (sibling.nodeName === 'P') {
      var linkDensity = getLinkDensity(sibling);
      var nodeContent = sibling.innerText.trim();
      var nodeLength = nodeContent.length;

      if (nodeLength > 80 && linkDensity < 0.25) {
        append = true;
      } else if (nodeLength < 80 && linkDensity === 0 && /\.( |$)/.test(nodeContent)) {
        append = true;
      }
    }

    if (append) {
      articleContent.appendChild(sibling);
    }
  }

  return el;
}

// Clean up a node recursively
function cleanNode(node) {
  if (node.nodeType === 3) { // Text node
    return document.createTextNode(node.nodeValue);
  } else if (node.nodeType === 1) { // Element node
    // Remove nodes that are unlikely candidates
    var unlikelyMatchString = node.className + node.id;
    if (regexps.unlikelyCandidates.test(unlikelyMatchString) && !regexps.okMaybeItsACandidate.test(unlikelyMatchString)) return null;

    // Create a new node
    var el = document.createElement(node.tagName);

    // Assign a content score to the node
    if (/P|TD|PRE|DIV/.test(node.tagName)) {
      el.contentScore = contentScoreForTagName(node.tagName);
      el.contentScore += contentScoreForClassName(node.className);
      el.contentScore += contentScoreForId(node.id);
      el.contentScore *= 1 - getLinkDensity(node);

      // Add points for any commas within this paragraph
      var innerText = node.innerText.trim();
      contentScore += innerText.split(',').length;

      // For every 100 characters in this paragraph, add another point. Up to 3 points.
      contentScore += Math.min(Math.floor(innerText.length / 100), 3);
      if (!topCandidate || contentScore > topCandidate.contentScore) {
        topCandidate = el;
      }

      // Add the score to the parent.
      var parent = el.parentNode;
      if (parent) {
        parent.contentScore += contentScore;
        if (!topCandidate || parent.contentScore > topCandidate.contentScore) {
          topCandidate = parent;
        }
      }

      // The grandparent gets half.
      var grandparent = parentNode ? parentNode.parentNode : null;
      if (grandparent) {
        grandparent.contentScore += contentScore / 2;
        if (!topCandidate || grandparent.contentScore > topCandidate.contentScore) {
          topCandidate = grandparent;
        }
      }
    } else {
      el.contentScore = 0;
    }

    for (var i=0, l=node.childNodes.length; i<l; i++) {
      var childEl = cleanNode(node.childNodes[i]);
      if (childEl) el.appendChild(childEl);
    }

    return el;
  }
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
