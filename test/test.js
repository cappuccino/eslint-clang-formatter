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

    return fs.writeFileSync(path.join(baseDir, name + ".txt"), data);
}

function check(configName, method)
{
    var configPath = path.join(baseDir, configName + ".json"),
        cli = new eslint.CLIEngine(),
        configFile = fs.readFileSync(configPath, "utf8"),
        config;

    if (!formatter)
        formatter = cli.getFormatter("lib/index.js");

    if (method === "rc")
        fs.writeFileSync(".clangformatterrc", configFile);
    else
        config = { clangFormatter: JSON.parse(configFile) };

    var result = cli.executeOnFiles([baseDir]),
        output = formatter(result.results, config);

    if (method === "rc")
        fs.unlinkSync(".clangformatterrc");

    return output;
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

fs.readdirSync(baseDir).forEach(function(configName)
{
    if (path.extname(configName) === ".json")
    {
        configName = path.basename(configName, path.extname(configName));

        ["rc", "api"].forEach(function(method)
        {
            var output = check(configName, method),
                name = configName + "-" + method;

            if (generate)
                writeFixture(name, output);
            else
            {
                compareWithFixture(name, output);

                // Also compare rc version to API version, they should be the same
                if (method === "rc")
                {
                    output = readFixture(name);
                    compareWithFixture(configName + "-api", output);
                }
            }
        });
    }
});
