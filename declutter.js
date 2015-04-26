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
  emptyTagsToKeep: /^(img|br)$/i, 
  block: /^(p|div)$/i
};

var tagsToIgnore = ['head','script','noscript','style','meta','link','object','form','textarea','header','footer','nav','iframe','h1'];

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

function contentScoreForTagName(tagName) {
  var contentScore = 0;
  switch (tagName) {
    case 'main':
    case 'article':
      contentScore += 10;
      break;
    case 'section':
      contentScore += 8;
      break;
    case 'p':
    case 'div':
      contentScore += 5;
      break;
    case 'pre':
    case 'td':
    case 'blockquote':
      contentScore += 3;
      break;
    case 'address':
    case 'ol':
    case 'ul':
    case 'dl':
    case 'dd':
    case 'dt':
    case 'li':
    case 'form':
      contentScore -= 3;
      break;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
    case 'th':
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

      // Output contentScore for debugging
      el.setAttribute('contentScore', nodeRef.contentScore);

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
  // First, traverse the node tree, construct a NodeRef object for each node
  // and assign it a content score.
  var nodeRef = rankNode(node);

  // Find the NodeRef object with the highest content score
  var topCandidate = findTopCandidate(nodeRef);

  // Output topCandidate as a Node tree
  var articleContent = doc.createElement("DIV");
  articleContent.appendChild(prune(topCandidate).cloneNode(doc));
  return articleContent;
}

function rankNode(node) {
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
    // Ignore nodes that are unlikely to be main content
    var matchString = node.className + ' ' + node.id;
    if (regexps.unlikelyCandidates.test(matchString) && !regexps.okMaybeItsACandidate.test(matchString)) return null;

    // Ignore nodes with certain tag names
    var tagName = node.tagName.toLowerCase();
    if (tagsToIgnore.indexOf(tagName) !== -1) return null;

    // Create a NodeRef object
    var ref = new NodeRef(node, 'element');
    ref.isBlock = regexps.block.test(tagName);

    // Clean child nodes
    for (var i=0, l=node.childNodes.length; i<l; i++) {
      var childRef = rankNode(node.childNodes[i]);
      if (childRef) {
        ref.appendChild(childRef);
        
        if (ref.isBlock) {
          // Content score decays when it encounters a block element
          ref.contentScore += childRef.contentScore * 0.5;
        } else {
          ref.contentScore += childRef.contentScore;
        }
      }
    }

    // If a node is empty or has a negative content score, set its score to -1.
    if ((ref.childNodes.length === 0 && !regexps.emptyTagsToKeep.test(tagName)) || ref.contentScore < 0) {
      ref.contentScore = -1;
    }
    return ref;
  }

  // Ignore other node types (comments, etc.)
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

function prune(nodeRef) {
  // Traverse backwards so deleting an item doesn't affect the traversal
  for (var i=nodeRef.childNodes.length-1; i>=0; i--) {
    if (nodeRef.childNodes[i].contentScore < 0) {
      nodeRef.childNodes.splice(i, 1);
    }
  }

  for (var i=0, l=nodeRef.childNodes.length; i<l; i++) {
    prune(nodeRef.childNodes[i]);
  }

  return nodeRef;
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
