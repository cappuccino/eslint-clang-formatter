"use strict";

var chalk = require("chalk"),
    CLIEngine = require("eslint").CLIEngine,
    path = require("path"),
    util = require("util");

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

var colorMap = {
    file: chalk.cyan.bold,
    location: chalk.gray.bold,
    error: chalk.red.bold,
    warning: chalk.yellow.bold,
    message: chalk.gray.bold,
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

    Object.keys(map).forEach(function(key)
    {
        if (colorMap.hasOwnProperty(key))
        {
            var style = parseStyle(map[key]);

            if (style !== undefined)
                colorMap[key] = style;
        }
    });
}

/**
 * Given a color name in colorMap and some text, return a colorized version
 * if chalk is enabled.
 * @param {boolean} colorize
 * @param {string} color - Key in colorMap.
 * @param {string} text - Text to colorize.
 * @returns {string}
 */
function colorizeText(colorize, color, text)
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
    return typeof config.colorize === "boolean" ? config.colorize : chalk.enabled;
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

var cli = new CLIEngine({ useEslintrc: true });

module.exports = function(results, config)
{
    var output = "\n",
        total = 0,
        errors = 0,
        warnings = 0,
        summaryColor = "warning";

    results.forEach(function(result)
    {
        var messages = result.messages;

        if (messages.length === 0)
            return;

        total += messages.length;

        if (!config)
            config = cli.getConfigForFile(result.filePath).clangFormatter || {};

        var colorize = shouldColorize(config),
            showRule = typeof config.showRule === "boolean" ? config.showRule : false;

        if (typeof config.colors === "object")
            setColorMap(config.colors);

        messages.forEach(function(message)
        {
            var severity;

            if (message.fatal || message.severity === 2)
            {
                severity = colorizeText(colorize, "error", "error");
                summaryColor = "error";
                ++errors;
            }
            else
            {
                severity = colorizeText(colorize, "warning", "warning");
                ++warnings;
            }

            var source = message.source ? colorizeText(colorize, "source", message.source) : "",
                file = colorizeText(colorize, "file", path.relative("", result.filePath)),
                sep = colorizeText(colorize, "separator", ":"),
                rule = showRule ? " [" + message.ruleId + "]" : "",
                msg = colorizeText(colorize, "message", message.message + rule),
                location = "";

            if (message.column !== undefined)
                location = colorizeText(colorize, "location", message.line + ":" + message.column) + sep;

            output += file + sep + location + " " + severity + sep + " " + msg;

            if (source)
            {
                var caret = message.source.substr(0, message.column - 1).replace(/./g, " ") + colorizeText(colorize, "caret", "^");

                output += "\n" + source + "\n" + caret;
            }

            output += "\n";
        });
    });

    if (total > 0)
    {
        var baseConfig = config || (cli.getConfigForFile(".").clangFormatter || {}),
            colorize = shouldColorize(baseConfig);

        output += colorizeText(colorize, summaryColor, util.format(
            "\n\u2716 %d problem%s (%d error%s, %d warning%s)",
            total,
            pluralize(total),
            errors,
            pluralize(errors),
            warnings,
            pluralize(warnings))
        );
    }

    return total > 0 ? output : "";
};
