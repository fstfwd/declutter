var path = require("path");
var fs = require("fs");
var jsdom = require("jsdom").jsdom;
var declutter = require("./declutter");
var Arc90Readability = require('./benchmark/arc90/readability');
var NodeReadability = require('./benchmark/node-readability/readability');
var MozillaReadability = require("./benchmark/mozilla/Readability");

// Load test pages
var testPageRoot = path.join(__dirname, "test/data");
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
  "lifehacker-working",
  "lifehacker-post-comment-load",
  "medium-1",
  "medium-2",
  "salon-1",
  "tmz-1",
  "wapo-1",
  "wapo-2",
  "webmd-1",
];

testPages = testPages.filter(function(testPage) {
  return referenceTestPages.indexOf(testPage.dir) !== -1;
});

var testPage = testPages[8];
var doc;
var result;

// declutter
doc = jsdom(testPage.source);
result = declutter(doc.documentElement, doc).innerHTML;
fs.writeFileSync('1.html', result);

// // arc90
// doc = jsdom(testPage.source);
// result = Arc90Readability.init(doc.defaultView, doc);
// fs.writeFileSync('1.html', result);

// // node-readability
// doc = jsdom(testPage.source);
// result = new NodeReadability(doc.defaultView, {}).content;
// fs.writeFileSync('1.html', result);

// // Mozilla
// var uri = {
//   spec: "http://fakehost/test/page.html",
//   host: "fakehost",
//   prePath: "http://fakehost",
//   scheme: "http",
//   pathBase: "http://fakehost/test"
// };
// doc = jsdom(testPage.source);
// result = new MozillaReadability(uri, doc).parse();
// fs.writeFileSync('1.html', result.content);
