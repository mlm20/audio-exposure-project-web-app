// Imports
const express = require("express");
const path = require("path");
const app = express();
const Handler = require("./handler");

// #############################################################################
// Logs all request paths and method
app.use(function (req, res, next) {
    res.set("x-timestamp", Date.now());
    res.set("x-powered-by", "cyclic.sh");
    console.log(
        `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.path}`
    );
    next();
});

// #############################################################################
// This configures static hosting for files in /public that have the extensions
// listed in the array.
var options = {
    dotfiles: "ignore",
    etag: false,
    extensions: [
        "htm",
        "html",
        "css",
        "js",
        "ico",
        "jpg",
        "jpeg",
        "png",
        "svg",
    ],
    index: ["index.html"],
    maxAge: "1m",
    redirect: false,
};
app.use(express.static("public", options));

// #############################################################################
// New route for handling POST requests
app.post("/", express.json(), (req, res) => {
    const request_object = req.body;

    Handler[request_object.type](request_object).then(function (
        response_object
    ) {
        res.json(response_object);
    });
});

// #############################################################################
// Catch all handler for all other request.
app.use("*", (req, res) => {
    res.json({
        at: new Date().toISOString(),
        method: req.method,
        hostname: req.hostname,
        ip: req.ip,
        query: req.query,
        headers: req.headers,
        cookies: req.cookies,
        params: req.params,
    }).end();
});

module.exports = app;
