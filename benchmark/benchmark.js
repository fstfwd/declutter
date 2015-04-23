var path = require("path");
var fs = require("fs");
var jsdom = require("jsdom").jsdom;
var declutter = require("../declutter");
var Arc90Readability = require('./arc90/readability');
var NodeReadability = require('./node-readability/readability');
var MozillaReadability = require("./mozilla/Readability.js");

// Load test pages
var testPageRoot = path.join(__dirname, "../test/data");
var testPages = fs.readdirSync(testPageRoot).map(function(dir) {
  return {
    dir: dir,
    source: fs.readFileSync(path.join(testPageRoot, dir, "source.html"), 'utf8'),
    expectedContent: fs.readFileSync(path.join(testPageRoot, dir, "expected.html"), 'utf8'),
    expectedMetadata: fs.readFileSync(path.join(testPageRoot, dir, "expected-metadata.json"), 'utf8')
  };
});

var referenceTestPages = [
  "002",
  "herald-sun-1",
  // "lifehacker-working",
  // "lifehacker-post-comment-load",
  // "medium-1",
  // "medium-2",
  // "salon-1",
  // "tmz-1",
  // "wapo-1",
  // "wapo-2",
  // "webmd-1",
];

testPages = testPages.filter(function(testPage) {
  return referenceTestPages.indexOf(testPage.dir) !== -1;
});

suite("declutter test page perf", function () {
  set("iterations", 1);
  set("type", "static");
  testPages.forEach(function(testPage) {
    var doc = jsdom(testPage.source);
    bench(testPage.dir + " perf", function() {
      declutter(doc.documentElement, doc).innerHTML;
    });
  });
});

suite("Arc90 test page perf", function () {
  set("iterations", 1);
  set("type", "static");
  testPages.forEach(function(testPage) {
    var doc = jsdom(testPage.source);
    bench(testPage.dir + " declutter perf", function() {
      declutter(doc.documentElement, doc).innerHTML;
    });
  });
});

suite("node-readability test page perf", function () {
  set("iterations", 1);
  set("type", "static");
  testPages.forEach(function(testPage) {
    var doc = jsdom(testPage.source);
    bench(testPage.dir + " perf", function() {
      readability = new NodeReadability(doc.defaultView, {});
      readability.content;
    });
  });
});

suite("Mozilla test page perf", function () {
  set("iterations", 1);
  set("type", "static");

  var uri = {
    spec: "http://fakehost/test/page.html",
    host: "fakehost",
    prePath: "http://fakehost",
    scheme: "http",
    pathBase: "http://fakehost/test"
  };
  testPages.forEach(function(testPage) {
    var doc = jsdom(testPage.source);
    bench(testPage.dir + " perf", function() {
      new MozillaReadability(uri, doc).parse();
    });
  });
});
