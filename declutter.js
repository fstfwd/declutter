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
    case 'MAIN':
    case 'ARTICLE':
      contentScore += 10;
      break;
    case 'SECTION':
      contentScore += 8;
      break;
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
  var contentScore = 0;
  if (typeof(className) === 'string' && className !== '') {
    if (regexps.negative.test(className)) contentScore -= 25;
    if (regexps.positive.test(className)) contentScore += 25;
  }
  return contentScore;
}

function contentScoreForId(id) {
  var contentScore = 0;
  if (typeof(id) === 'string' && id !== '') {
    if (regexps.negative.test(id)) contentScore -= 25;
    if (regexps.positive.test(id)) contentScore += 25;
  }
  return contentScore;
}

function initializeNode(node) {
  node.readability = {"contentScore": 0};
  node.readability.contentScore += contentScoreForTagName(node.tagName);
  node.readability.contentScore += contentScoreForClassName(node.className);
  node.readability.contentScore += contentScoreForId(node.id);
}

function getInnerText(node) {
  return node.textContent;
}

function getLinkDensity(node) {
  var links = node.getElementsByTagName('a');
  var textLength = getInnerText(node).length;
  var linkLength = 0;
  for (var i=0, l=links.length; i<l; i++) {
    linkLength += getInnerText(links[i]).length;
  }
  return linkLength / textLength;
}


/**
 * A Lightweight Node Object
 */

function NodeRef(node, type) {
  this.node = node;
  this.type = type;
  this.childNodes = [];
  this.parentNode = null;
  this.contentScore = 0;
  this.isBlock = false;
}

NodeRef.prototype.appendChild = function(child) {
  this.childNodes.push(child);
  child.parentNode = this;
}

NodeRef.prototype.cloneNode = function(doc) {
  var cloneNode = function(nodeRef, doc) {
    if (nodeRef.type === 'text') {
      return doc.createTextNode(nodeRef.node.nodeValue);
    } else if (nodeRef.type === 'element') {
      var tagName = nodeRef.node.tagName;
      var el = doc.createElement(tagName);
      if (tagName === 'A') {
        el.setAttribute('href', nodeRef.node.getAttribute('href') || '');
      } else if (tagName === 'IMG') {
        el.setAttribute('src', nodeRef.node.getAttribute('src') || '');
        el.setAttribute('alt', nodeRef.node.getAttribute('alt') || '');
      }

      if (tagName === 'PRE') {
        el.innerHTML = nodeRef.node.textContent;
      } else {
        for (var i=0, l=nodeRef.childNodes.length; i<l; i++) {
          var childEl = cloneNode(nodeRef.childNodes[i], doc);
          if (childEl) el.appendChild(childEl);
        }
      }
      return el;
    }
    return null;
  }
  return cloneNode(this, doc);
}


/**
 * Declutter
 */

function cleanNode(node) {
  if (node.nodeType === 3) { // Text node
    var innerText = node.nodeValue.replace(regexps.normalize, ' ').trim();
    var nodeRef = new NodeRef(node, 'text');
    if (innerText.length > 0) {
      nodeRef.contentScore = 1;
      nodeRef.contentScore += Math.floor(innerText.length / 25);
    } else {
      nodeRef.contentScore = 0;
    }
    return nodeRef;
  } else if (node.nodeType === 1) { // Element node
    // Remove nodes that are unlikely candidates
    var unlikelyMatchString = node.className + ' ' + node.id;
    if (regexps.unlikelyCandidates.test(unlikelyMatchString) && !regexps.okMaybeItsACandidate.test(unlikelyMatchString)) return null;

    var tagName = node.tagName;
    if (/^(head|script|noscript|style|meta|link|object|form|textarea)$/i.test(tagName)) return null;

    if (tagName === 'IMG') {
      var src = node.getAttribute('src') || '';
      if (src.trim().length === 0 || /data:image/.test(src)) {
        return null;
      }
    }

    // Create a NodeRef
    var el = new NodeRef(node, 'element');

    if (tagName !== 'PRE') {
      var childNodes = node.childNodes;
      for (var i=0, l=childNodes.length; i<l; i++) {
        var childEl = cleanNode(childNodes[i]);
        if (childEl) {
          if (childEl.contentScore > 0) {
            if (childEl.node.tagName !== 'A') {
              el.contentScore += childEl.contentScore;
            }
            el.appendChild(childEl);
          } else if (childEl.contentScore < -1) {
            el.contentScore -= 1;
          }
        }
      }

      if (/^(DIV|P|PRE|FIGURE|FIGCAPTION|H1|H2)$/.test(tagName)) {
        el.isBlock = true;
        el.contentScore -= 1;
      } else if (tagName === 'UL' || tagName === 'OL') {
        el.contentScore -= 2;
      } else if (tagName === 'IMG') {
        el.contentScore += 10;
      }
    }
    return el;
  }
  return null;
}

function findTopCandidate(nodeRef) {
  var topCandidate = nodeRef;
  for (var i=0, l=nodeRef.childNodes.length; i<l; i++) {
    var c = findTopCandidate(nodeRef.childNodes[i]);
    if (c.contentScore > topCandidate.contentScore) {
      topCandidate = c;
    }
  }
  return topCandidate;
}

var start = 0;
function profileStart() {
  start = Date.now();
}

function profile (msg) {
  var t = Date.now();
  console.log(msg + ': ' + (t - start) + 'ms');
  start = t;
}

function declutter(page, doc) {
  profileStart();

  var nodeRef = cleanNode(page);

  profile('cleanNode');

  var topCandidate = findTopCandidate(nodeRef);
  
  profile('find top candidate');

  var articleContent = doc.createElement("DIV");
  articleContent.appendChild(topCandidate.cloneNode(doc));

  profile('cloneNode');

  return articleContent;
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
