var path = require("path");
var fs = require("fs");
var assert = require("assert");
var declutter = require("../declutter");
var jsdom = require("jsdom").jsdom;
var prettyPrint = require("html").prettyPrint;

var testPageRoot = path.join(__dirname, "data");
var testPages = fs.readdirSync(testPageRoot).map(function(dir) {
  return {
    dir: dir,
    source: fs.readFileSync(path.join(testPageRoot, dir, "source.html"), 'utf8'),
    expectedContent: fs.readFileSync(path.join(testPageRoot, dir, "expected.html"), 'utf8'),
    expectedMetadata: fs.readFileSync(path.join(testPageRoot, dir, "expected-metadata.json"), 'utf8')
  };
});

console.log(testPages);

describe('Test Pages', function() {
  testPages.forEach(function(testPage) {
    describe(testPage.dir, function() {
      var result;
      before(fundction() {
        var doc = jsdom(testPage.source);
        result = declutter(doc.documentElement, options);
      });

      it("should extract expected content", function() {
        assert.equal(prettyPrint(result.content), testPage.expectedContent);
      });

      it("should extract expected metadata", function() {
        assert.equal(JSON.stringify(result.metaData), testPage.expectedMetadata);
      });
    });
  });
});
