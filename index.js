var path = require("path");
var fs = require("fs");
var declutter = require("./declutter");
var jsdom = require("jsdom").jsdom;

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

var testPage = testPages[0];
var doc = jsdom(testPage.source);
var result = declutter(doc.documentElement, doc).innerHTML;
fs.writeFileSync('1.html', result);
