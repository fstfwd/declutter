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

function initializeNode(node) {
  node.readability = {"contentScore": 0};         

  switch(node.tagName) {
      case 'DIV':
          node.readability.contentScore += 5;
          break;

      case 'PRE':
      case 'TD':
      case 'BLOCKQUOTE':
          node.readability.contentScore += 3;
          break;
          
      case 'ADDRESS':
      case 'OL':
      case 'UL':
      case 'DL':
      case 'DD':
      case 'DT':
      case 'LI':
      case 'FORM':
          node.readability.contentScore -= 3;
          break;

      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
      case 'TH':
          node.readability.contentScore -= 5;
          break;
  }
 
  node.readability.contentScore += getClassWeight(node);
}

function getClassWeight(e) {
  var weight = 0;

  /* Look for a special classname */
  if (typeof(e.className) === 'string' && e.className !== '')
  {
      if(e.className.search(regexps.negative) !== -1) {
          weight -= 25; }

      if(e.className.search(regexps.positive) !== -1) {
          weight += 25; }
  }

  /* Look for a special ID */
  if (typeof(e.id) === 'string' && e.id !== '')
  {
      if(e.id.search(regexps.negative) !== -1) {
          weight -= 25; }

      if(e.id.search(regexps.positive) !== -1) {
          weight += 25; }
  }

  return weight;
}

function getInnerText(e, normalizeSpaces) {
  var textContent    = "";

  if(typeof(e.textContent) === "undefined" && typeof(e.innerText) === "undefined") {
      return "";
  }

  normalizeSpaces = (typeof normalizeSpaces === 'undefined') ? true : normalizeSpaces;

  textContent = e.textContent.replace(regexps.trim, "" );

  if(normalizeSpaces) {
      return textContent.replace(regexps.normalize, " "); }
  else {
      return textContent; }
}

function getLinkDensity(e) {
  var links      = e.getElementsByTagName("a");
  var textLength = getInnerText(e).length;
  var linkLength = 0;
  for(var i=0, il=links.length; i<il;i+=1)
  {
      linkLength += getInnerText(links[i]).length;
  }
  return linkLength / textLength;
}


/**
 * A Lightweight Node Object
 */

function Node(el, type) {
  this.el = el;
  this.type = type;
  this.childNodes = [];
  this.parentNode = null;
}

Node.prototype.appendChild = function(child) {
  this.childNodes.push(child);
  child.parentNode = this;
}

Node.prototype.cloneNode = function(doc) {
  var cloneNode = function(node, doc) {
    if (node.type === 'text') {
      return doc.createTextNode(node.el.nodeValue);
    } else if (node.type === 'element') {
      var tagName = node.el.tagName;
      var el = doc.createElement(tagName);
      if (tagName === 'A') {
        el.setAttribute('href', node.el.getAttribute('href') || '');
      } else if (tagName === 'IMG') {
        el.setAttribute('src', node.el.getAttribute('src') || '');
        el.setAttribute('alt', node.el.getAttribute('alt') || '');
      }
      for (var i=0, l=node.childNodes.length; i<l; i++) {
        var childEl = cloneNode(node.childNodes[i], doc);
        if (childEl) el.appendChild(childEl);
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
    return new Node(node, 'text');
  } else if (node.nodeType === 1) { // Element node
    // Remove nodes that are unlikely candidates
    var unlikelyMatchString = node.className + ' ' + node.id;
    if (regexps.unlikelyCandidates.test(unlikelyMatchString) && !regexps.okMaybeItsACandidate.test(unlikelyMatchString)) return null;

    var tagName = node.tagName;
    if (/script|style|meta/i.test(tagName)) return null;

    // Create a new node
    var el = new Node(node, 'element');
    var childNodes = node.childNodes;
    for (var i=0, l=childNodes.length; i<l; i++) {
      var childEl = cleanNode(childNodes[i], nodesToScore);
      if (childEl) el.appendChild(childEl);
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

  /**
   * Loop through all paragraphs, and assign a score to them based on how content-y they look.
   * Then add their score to their parent node.
   *
   * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
  **/
  var candidates = [];
  for (var pt=0; pt < nodesToScore.length; pt+=1) {
      var parentNode      = nodesToScore[pt].parentNode;
      var grandParentNode = parentNode ? parentNode.parentNode : null;
      var innerText       = getInnerText(nodesToScore[pt].el);

      if(!parentNode || typeof(parentNode.el.tagName) === 'undefined') {
          continue;
      }

      /* If this paragraph is less than 25 characters, don't even count it. */
      if(innerText.length < 25) {
          continue; }

      /* Initialize readability data for the parent. */
      if(typeof parentNode.readability === 'undefined') {
          initializeNode(parentNode);
          candidates.push(parentNode);
      }

      /* Initialize readability data for the grandparent. */
      if(grandParentNode && typeof(grandParentNode.readability) === 'undefined' && typeof(grandParentNode.el.tagName) !== 'undefined') {
          initializeNode(grandParentNode);
          candidates.push(grandParentNode);
      }

      var contentScore = 0;

      /* Add a point for the paragraph itself as a base. */
      contentScore+=1;

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

  /**
   * After we've calculated scores, loop through all of the possible candidate nodes we found
   * and find the one with the highest score.
  **/
  var topCandidate = null;
  for(var c=0, cl=candidates.length; c < cl; c+=1)
  {
      /**
       * Scale the final candidates score based on link density. Good content should have a
       * relatively small link density (5% or less) and be mostly unaffected by this operation.
      **/
      candidates[c].readability.contentScore = candidates[c].readability.contentScore * (1-getLinkDensity(candidates[c].el));

      console.log('Candidate: ' + candidates[c].el + " (" + candidates[c].el.className + ":" + candidates[c].el.id + ") with score " + candidates[c].readability.contentScore);

      if(!topCandidate || candidates[c].readability.contentScore > topCandidate.readability.contentScore) {
          topCandidate = candidates[c]; }
  }

  /**
   * Now that we have the top candidate, look through its siblings for content that might also be related.
   * Things like preambles, content split by ads that we removed, etc.
  **/
  var articleContent        = doc.createElement("DIV");
  articleContent.appendChild(topCandidate.cloneNode(doc));
  return articleContent;


  var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
  var siblingNodes          = topCandidate.parentNode.childNodes;


  for(var s=0, sl=siblingNodes.length; s < sl; s+=1) {
      var siblingNode = siblingNodes[s];
      var append      = false;

      /**
       * Fix for odd IE7 Crash where siblingNode does not exist even though this should be a live nodeList.
       * Example of error visible here: http://www.esquire.com/features/honesty0707
      **/
      if(!siblingNode) {
          continue;
      }

      console.log("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.readability !== 'undefined') ? (" with score " + siblingNode.readability.contentScore) : ''));
      console.log("Sibling has score " + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

      if(siblingNode === topCandidate)
      {
          append = true;
      }

      var contentBonus = 0;
      /* Give a bonus if sibling nodes and top candidates have the example same classname */
      if(siblingNode.className === topCandidate.className && topCandidate.className !== "") {
          contentBonus += topCandidate.readability.contentScore * 0.2;
      }

      if(typeof siblingNode.readability !== 'undefined' && (siblingNode.readability.contentScore+contentBonus) >= siblingScoreThreshold)
      {
          append = true;
      }
      
      if(siblingNode.nodeName === "P") {
          var linkDensity = getLinkDensity(siblingNode);
          var nodeContent = getInnerText(siblingNode);
          var nodeLength  = nodeContent.length;
          
          if(nodeLength > 80 && linkDensity < 0.25)
          {
              append = true;
          }
          else if(nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1)
          {
              append = true;
          }
      }

      if(append) {
          console.log("Appending node: " + siblingNode);

          var nodeToAppend = null;
          if(siblingNode.nodeName !== "DIV" && siblingNode.nodeName !== "P") {
              /* We have a node that isn't a common block level element, like a form or td tag. Turn it into a div so it doesn't get filtered out later by accident. */
              
              console.log("Altering siblingNode of " + siblingNode.nodeName + ' to div.');
              nodeToAppend = doc.createElement("DIV");
              try {
                  nodeToAppend.id = siblingNode.id;
                  nodeToAppend.innerHTML = siblingNode.innerHTML;
              }
              catch(er) {
                  console.log("Could not alter siblingNode to div, probably an IE restriction, reverting back to original.");
                  nodeToAppend = siblingNode;
                  s-=1;
                  sl-=1;
              }
          } else {
              nodeToAppend = siblingNode;
              s-=1;
              sl-=1;
          }
          
          /* To ensure a node does not interfere with readability styles, remove its classnames */
          nodeToAppend.className = "";

          /* Append sibling and subtract from our list because it removes the node when you append to another node */
          articleContent.appendChild(nodeToAppend);
      }
  }

  /**
   * So we have all of the content that we need. Now we clean it up for presentation.
  **/
  //prepArticle(articleContent);

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
