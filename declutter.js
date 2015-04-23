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

function cleanNode(node, nodesToScore) {
  if (node.nodeType === 3) { // Text node
    return new NodeRef(node, 'text');
  } else if (node.nodeType === 1) { // Element node
    // Remove nodes that are unlikely candidates
    var unlikelyMatchString = node.className + ' ' + node.id;
    if (regexps.unlikelyCandidates.test(unlikelyMatchString) && !regexps.okMaybeItsACandidate.test(unlikelyMatchString)) return null;

    var tagName = node.tagName;
    if (/script|style|meta|objectform/i.test(tagName)) return null;

    // Create a NodeRef
    var el = new NodeRef(node, 'element');

    if (tagName !== 'PRE') {
      var childNodes = node.childNodes;
      for (var i=0, l=childNodes.length; i<l; i++) {
        var childEl = cleanNode(childNodes[i], nodesToScore);
        if (childEl) el.appendChild(childEl);
      }
    }

    if (node.tagName === "P" || node.tagName === "TD" || node.tagName === "PRE") {
      nodesToScore.push(el);
    }

    return el;
  }
  return null;
}

function declutter(page, doc) {
  var nodesToScore = [];
  cleanNode(page, nodesToScore);

  var candidates = [];
  for (var i=0, l=nodesToScore.length; i<l; i++) {
      var parentNode = nodesToScore[i].parentNode;
      var grandParentNode = parentNode ? parentNode.parentNode : null;
      var innerText = getInnerText(nodesToScore[i].node);

      if(!parentNode || typeof(parentNode.node.tagName) === 'undefined') {
          continue;
      }

      /* If this paragraph is less than 25 characters, don't even count it. */
      if (innerText.length < 25) continue;

      /* Initialize readability data for the parent. */
      if (typeof parentNode.readability === 'undefined') {
          initializeNode(parentNode);
          candidates.push(parentNode);
      }

      /* Initialize readability data for the grandparent. */
      if (grandParentNode && typeof(grandParentNode.readability) === 'undefined' && typeof(grandParentNode.node.tagName) !== 'undefined') {
          initializeNode(grandParentNode);
          candidates.push(grandParentNode);
      }

      var contentScore = 0;

      /* Add a point for the paragraph itself as a base. */
      contentScore += 1;

      /* Add points for any commas within this paragraph */
      contentScore += innerText.split(',').length;
      
      /* For every 100 characters in this paragraph, add another point. Up to 3 points. */
      contentScore += Math.min(Math.floor(innerText.length / 100), 3);
      
      /* Add the score to the parent. The grandparent gets half. */
      parentNode.readability.contentScore += contentScore;

      if(grandParentNode) {
          grandParentNode.readability.contentScore += contentScore/2;             
      }
  }

  var topCandidate = null;
  for (var i=0, l=candidates.length; i<l; i++) {
      /**
       * Scale the final candidates score based on link density. Good content should have a
       * relatively small link density (5% or less) and be mostly unaffected by this operation.
      **/
      candidates[i].readability.contentScore *= 1 - getLinkDensity(candidates[i].node);

      //console.log('Candidate: ' + candidates[i] + " (" + candidates[i].node.className + ":" + candidates[i].node.id + ") with score " + candidates[i].readability.contentScore);

      if (!topCandidate || candidates[i].readability.contentScore > topCandidate.readability.contentScore) {
          topCandidate = candidates[i]; }
  }

  var articleContent = doc.createElement("DIV");
  articleContent.appendChild(topCandidate.cloneNode(doc));
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
