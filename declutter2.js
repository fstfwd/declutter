var candidates;

function declutter(node, doc) {
  candidates = [];
  cleanNode(node);
  return getContent(doc);
}

// Clean up a node recursively
function cleanNode(node) {
  if (node.nodeType === 3) { // Text node
    return new Node(node, 'text');
  } else if (node.nodeType === 1) { // Element node
    // Remove nodes that are unlikely candidates
    var unlikelyMatchString = node.className + ' ' + node.id;
    if (regexps.unlikelyCandidates.test(unlikelyMatchString) && !regexps.okMaybeItsACandidate.test(unlikelyMatchString)) return null;

    var tagName = node.tagName;
    if (/script|style|meta/i.test(tagName)) return null;

    // Empty node
    //if (getInnerText(node) === '') return null;

    // Create a new node
    var el = new Node(node, 'element');

    // Assign a content score to the node
    if (/MAIN|ARTICLE|SECTION|P|TD|PRE|DIV/.test(tagName)) {
      el.contentScore = contentScoreForTagName(tagName);
      el.contentScore += contentScoreForClassName(node.className);
      el.contentScore += contentScoreForId(node.id);
      el.contentScore *= 1 - getLinkDensity(node);

      // Add points for any commas within this paragraph
      var innerText = getInnerText(node);
      el.contentScore += innerText.split(',').length;

      // For every 100 characters in this paragraph, add another point. Up to 3 points.
      el.contentScore += Math.min(Math.floor(innerText.length / 100), 3);
      if (!topCandidate || el.contentScore > topCandidate.contentScore) {
        topCandidate = el;
      }

      // Add the score to the parent.
      var parent = el.parentNode;
      if (parent) {
        parent.contentScore += el.contentScore;
        if (!topCandidate || parent.contentScore > topCandidate.contentScore) {
          topCandidate = parent;
        }
      }

      // The grandparent gets half.
      var grandparent = parent ? parent.parentNode : null;
      if (grandparent) {
        grandparent.contentScore += el.contentScore / 2;
        if (!topCandidate || grandparent.contentScore > topCandidate.contentScore) {
          topCandidate = grandparent;
        }
      }
    } else {
      el.contentScore = 0;
    }

    var childNodes = node.childNodes;
    for (var i=0, l=childNodes.length; i<l; i++) {
      var childEl = cleanNode(childNodes[i]);
      if (childEl) el.appendChild(childEl);
    }

    return el;
  }
  return null;
}

// Get content from the top candidate and its siblings.
function getContent(doc) {
  var articleContent = doc.createElement('div');
  if (!topCandidate) return articleContent;

  var siblingScoreThreshold = topCandidate.contentScore * 0.2;
  var siblingNodes = topCandidate.parentNode.childNodes;
  for (var i=0, l=siblingNodes.length; i<l; i++) {
    var sibling = siblingNodes[i];
    var append = false;
    if (!sibling) continue;

    if (sibling === topCandidate) append = true;

    // Give a bonus if the sibling and top candidate have the same classname
    var contentBonus = 0;
    if (topCandidate.el.className !== '' && sibling.el.className === topCandidate.el.className) {
      contentBonus += siblingScoreThreshold;
    }

    if (sibling.contentScore + contentBonus >= siblingScoreThreshold) {
      append = true; 
    }

    if (sibling.nodeName === 'P') {
      var linkDensity = getLinkDensity(sibling);
      var nodeContent = getInnerText(sibling);
      var nodeLength = nodeContent.length;

      if (nodeLength > 80 && linkDensity < 0.25) {
        append = true;
      } else if (nodeLength < 80 && linkDensity === 0 && /\.( |$)/.test(nodeContent)) {
        append = true;
      }
    }

    if (append) {
      articleContent.appendChild(sibling.cloneNode(doc));
    }
  }
  return articleContent;
}
