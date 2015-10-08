"use strict";

var eslint = require("eslint"),
    fs = require("fs"),
    path = require("path");

var baseDir = "test/fixtures",  // jscs: ignore requireMultipleVarDecl
    formatter;

function readFixture(name)
{
    return fs.readFileSync(path.join(baseDir, name + ".txt"), "utf8");
}

function writeFixture(name, data)
{
    console.log(name);

    return fs.writeFileSync(path.join(baseDir, name + ".txt"), data, { encoding: "utf8" });
}

function check(configName)
{
    var options = {};

    if (configName)
        options.configFile = path.join(baseDir, configName + ".json");

    var cli = new eslint.CLIEngine(options),
        config = cli.getConfigForFile(options.configFile || ".").clangFormatter || {};

    if (!("colorize" in config))
        config.colorize = true;

    if (!formatter)
        formatter = cli.getFormatter("./clang.js");

    var result = cli.executeOnFiles([baseDir]);

    return formatter(result.results, config);
}

function compareWithFixture(name, text)
{
    if (text === readFixture(name))
        console.log(name + " passed");
    else
        console.log(name + " failed: output did match fixture");
}

var generate = process.argv[2] === "generate";

if (generate)
    console.log("Generating fixtures...");

["", "no-color", "show-rule", "custom-colors"].forEach(function(configName)
{
    var output = check(configName),
        name = "test" + (configName ? "-" + configName : "");

    if (generate)
        writeFixture(name, output);
    else
        compareWithFixture(name, output);
});
