"use strict";

var chalk = require("chalk"),
    fs = require("fs"),
    homedir = require("home-dir"),
    path = require("path"),
    pathExists = require("path-exists").sync;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Given a word and a count, append an s if count is not one.
 * @param {int} count A number controlling whether word should be pluralized.
 * @returns {string} "s" if count is not one.
 */
function pluralize(count)
{
    return (count === 1 ? "" : "s");
}

var defaultColorMap = {
    file: chalk.cyan.bold,
    location: chalk.bold,
    error: chalk.red.bold,
    warning: chalk.yellow.bold,
    message: chalk.bold,
    rule: chalk.bold.dim,
    separator: chalk.dim,
    source: null,
    caret: chalk.green.bold
};

function setColorMap(map)
{
    function parseStyle(style)
    {
        var parsedStyle = chalk,
            styles = style.split(".");

        for (var si = 0; si < styles.length; ++si)
        {
            parsedStyle = parsedStyle[styles[si]];

            if (parsedStyle === undefined)
                return undefined;
        }

        return parsedStyle;
    }

    var colors = {};

    Object.keys(defaultColorMap).forEach(function(key)
    {
        var color;

        if (map.hasOwnProperty(key))
            color = parseStyle(map[key]);

        colors[key] = color || defaultColorMap[key];
    });

    return colors;
}

/**
 * Given a color name in colorMap and some text, return a colorized version
 * if chalk is enabled.
 * @param {boolean} colorize
 * @param {object} colorMap
 * @param {string} color - Key in colorMap.
 * @param {string} text - Text to colorize.
 * @returns {string}
 */
function colorizeText(colorize, colorMap, color, text)
{
    if (colorize)
    {
        var func = colorMap[color];

        if (func)
        {
            // enabled flag is in func
            func.enabled = true;
            return func(text);
        }
    }

    return text;
}

function shouldColorize(config)
{
    return (config && typeof config.colorize === "boolean") ? config.colorize : chalk.enabled;
}

function loadConfig()
{
    var dir = process.cwd(),
        home = homedir(),
        visitedHome,
        rcPath;

    while (true)
    {
        visitedHome = dir === home;
        rcPath = path.join(dir, ".clangformatterrc");

        if (pathExists(rcPath))
            return JSON.parse(fs.readFileSync(rcPath, "utf8"));

        var previousDir = dir;

        dir = path.dirname(dir);

        // If it hasn't changed, we were at the root
        if (dir === previousDir)
            break;
    }

    rcPath = path.join(home, ".clangformatterrc");

    if (!visitedHome && pathExists(rcPath))
        return JSON.parse(fs.readFileSync(rcPath, "utf8"));

    return {};
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports = function(results, config)
{
    var output = "\n",
        total = 0,
        errors = 0,
        warnings = 0,
        summaryColor = "warning",
        colorMap = defaultColorMap,
        showRule = true;

    if (!config)
        config = loadConfig();

    if (typeof config.showRule === "boolean")
        showRule = config.showRule;

    if (typeof config.colors === "object")
        colorMap = setColorMap(config.colors);

    var colorize = shouldColorize(config);

    results.forEach(function(result)
    {
        var messages = result.messages;

        if (messages.length === 0)
            return;

        total += messages.length;

        messages.forEach(function(message)
        {
            var severity;

            if (message.fatal || message.severity === 2)
            {
                severity = colorizeText(colorize, colorMap, "error", "error");
                summaryColor = "error";
                ++errors;
            }
            else
            {
                severity = colorizeText(colorize, colorMap, "warning", "warning");
                ++warnings;
            }

            var source = message.source ? colorizeText(colorize, colorMap, "source", message.source) : "",
                file = colorizeText(colorize, colorMap, "file", path.relative("", result.filePath)),
                sep = colorizeText(colorize, colorMap, "separator", ":"),
                rule = showRule ? colorizeText(colorize, colorMap, "rule", " [" + message.ruleId + "]") : "",
                msg = colorizeText(colorize, colorMap, "message", message.message) + rule,
                location = "";

            if (message.column !== undefined)
                location = colorizeText(colorize, colorMap, "location", message.line + ":" + message.column) + sep;

            output += file + sep + location + " " + severity + sep + " " + msg;

            if (source)
            {
                var caret = message.source.substr(0, message.column - 1).replace(/./g, " ") + colorizeText(colorize, colorMap, "caret", "^");

                output += "\n" + source + "\n" + caret;
            }

            output += "\n";
        });
    });

    if (total > 0)
    {
        var summary = "\n";

        if (warnings > 0)
            summary += warnings + " warning" + pluralize(warnings);

        if (errors > 0)
        {
            if (warnings > 0)
                summary += " and ";

            summary += errors + " error" + pluralize(errors);
        }

        if (summary)
            summary += " found.";

        output += colorizeText(colorize, colorMap, summaryColor, summary);
    }

    return total > 0 ? output : "";
};
