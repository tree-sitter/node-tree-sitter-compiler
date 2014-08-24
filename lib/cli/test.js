var fs = require("fs"),
    vows = require("vows"),
    specReporter = require("vows/lib/vows/reporters/spec"),
    path = require("path"),
    assert = require("assert");

module.exports = function test(callback) {
  var cwd = process.cwd(),
      language = require(path.join(cwd, "index")),
      Document = require("tree-sitter").Document,
      testDir = path.join(cwd, "grammar_test");

  var document = new Document().setLanguage(language);

  vows
    .describe("The " + language.name + " language")
    .addBatch(suiteForPath(testDir, document))
    .run({ reporter: specReporter }, function(result) {
      callback(result.broken);
    });
};

function suiteForPath(filepath, document) {
  var result = {};

  if (fs.statSync(filepath).isDirectory()) {
    fs.readdirSync(filepath).forEach(function(name) {
      var description = name.split('.')[0];
      result[description] = suiteForPath(path.join(filepath, name), document);
    });
  } else {
    var content = fs.readFileSync(filepath, "utf8");

    for(;;) {
      var headerMatch = content.match(/===+\n([\w-\s]+)\n===+/),
          dividerMatch = content.match(/\n(---+)/);

      if (!headerMatch || !dividerMatch)
        break;

      var testName = headerMatch[1],
          inputStart = headerMatch[0].length,
          inputEnd = dividerMatch.index,
          outputStart = dividerMatch.index + dividerMatch[1].length + 1,
          nextTestStart = content.slice(outputStart).search(/\n===/);
          outputEnd = (nextTestStart > 0) ? (nextTestStart + outputStart) : content.length;

      (function() {
        var input = content.slice(inputStart, inputEnd),
            output = content.slice(outputStart, outputEnd);

        result[testName] = function() {
          document.setInputString(input);
          assert.equal(
            normalizeWhitespace(output),
            stripOuterDocument(document.toString())
          );
        };
      })();

      content = content.slice(outputEnd + 1);
    }
  }

  return result;
}

function normalizeWhitespace(str) {
  return str.replace(/\s+/g, " ").trim()
}

function stripOuterDocument(str) {
  return str.slice("(DOCUMENT ".length, -1)
}