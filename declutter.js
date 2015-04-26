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
  extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single/i
};

var tagsToIgnore = ['head', 'script', 'noscript', 'style', 'meta', 'link', 'object', 'form', 'textarea'];

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

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


/**
 * NodeRef: a lightweight object referencing a node
 */

function NodeRef(node, type, text) {
  this.node = node;
  this.type = type;
  this.text = text;
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
      return doc.createTextNode(nodeRef.text);
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

var start = 0;
function profileStart() {
  start = Date.now();
}

function profile (msg) {
  var t = Date.now();
  console.log(msg + ': ' + (t - start) + 'ms');
  start = t;
}

function declutter(node, doc) {
  profileStart();

  // First, traverse the node tree, construct a NodeRef object for each node
  // that we intend to keep, based on its content score.
  // A content score measures how likely a node contains main content. It is 
  // based on several factors: word count, link density, tagName, className, etc.
  var nodeRef = cleanNode(node);

  profile('cleanNode');

  // Find the NodeRef object with the highest content score
  var topCandidate = findTopCandidate(nodeRef);
  
  profile('find top candidate');

  // Output topCandidate as a Node tree
  var articleContent = doc.createElement("DIV");
  articleContent.appendChild(topCandidate.cloneNode(doc));

  profile('cloneNode');

  return articleContent;
}

function cleanNode(node) {
  if (node.nodeType === 3) { // Text node
    var text = node.nodeValue;

    // Ignore empty text nodes
    if (trim(text).length === 0) return null;

    // Collpase whitespaces, but don't trim spaces at two ends
    text = text.replace(/\s+/g, ' ');

    // Cache the clean text in a NodeRef object
    var ref = new NodeRef(node, 'text', text);

    // Assign a content score based on character count
    ref.contentScore = Math.floor(text.length / 25);

    return ref;
  } else if (node.nodeType === 1) { // Element node
    // Remove nodes that are unlikely to be main content
    var matchString = node.className + ' ' + node.id;
    if (regexps.unlikelyCandidates.test(matchString) && !regexps.okMaybeItsACandidate.test(matchString)) return null;

    // Ignore nodes with certain tag names
    var tagName = node.tagName.toLowerCase();
    if (tagNamesToIgnore.indexOf(tagName) !== -1) return null;

    // Create a NodeRef object
    var ref = new NodeRef(node, 'element');

    // Clean child nodes
    for (var i=0, l=node.childNodes.length; i<l; i++) {
      var childRef = cleanNode(node.childNodes[i]);
      if (childRef) {
        if (childRef.contentScore > 0) {
          // Only append a childRef if it has a good content score
          ref.appendChild(childRef);
        } else {
          // Penalize the node if a childRef has a bad content score
          ref.contentScore -= 5;
        }
      }
    }

    // Tags, classNames, ids also contribute to the content score
    ref.contentScore += contentScoreForTagName(tagName);
    return ref;
  }

  // Ignore other node types (comment, etc.)
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
