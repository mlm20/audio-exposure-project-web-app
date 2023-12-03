// Imports
const express = require("express");
const fs = require("fs");

// Create app
const app = express();

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
// Handle notifications

// Function to load notifications from the JSON file
const loadNotifications = function () {
    try {
        const data = fs.readFileSync("notifications.json", "utf8");
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("Error loading notifications:", error.message);
        return [];
    }
};

// Function to save notifications to the JSON file
const saveNotifications = function (notifications) {
    try {
        fs.writeFileSync("notifications.json", JSON.stringify(notifications));
    } catch (error) {
        console.error("Error saving notifications:", error.message);
    }
};

// Endpoint to trigger an event and record a notification
app.get("/trigger-event", (req, res) => {
    // This is where you put the code for your event
    const notification = { message: "Event triggered", timestamp: new Date() };

    // Load existing notifications, add the new one, and save it back
    const notifications = loadNotifications();
    notifications.push(notification);
    saveNotifications(notifications);

    // Send a response to the client
    res.json({ success: true, message: "Event triggered" });
});

// Endpoint to get all notifications
app.get("/get-notifications", (req, res) => {
    // Load notifications and send them as a JSON response to the client
    const notifications = loadNotifications();
    res.json(notifications);
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
