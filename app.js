// Imports
const express = require("express");
// const fs = require("fs");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const bodyParser = require("body-parser");

// Create app
const app = express();
app.use(bodyParser.json());

// AWS bucket name
const bucketName = "cyclic-raspberry-quail-tutu-eu-west-2";

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

// Function to initialize notifications file with an empty array if it doesn't exist
const initializeNotificationsFile = async function () {
    const filename = "notifications.json";

    try {
        // Check if the file exists in S3
        await s3.headObject({ Bucket: bucketName, Key: filename }).promise();
    } catch (error) {
        if (error.code === "NotFound") {
            // File doesn't exist; create and initialize with an empty array
            await s3
                .putObject({
                    Body: "[]",
                    Bucket: bucketName,
                    Key: filename,
                    ContentType: "application/json",
                })
                .promise();
            console.log(
                "notifications.json created and initialized with an empty array."
            );
        } else {
            // Handle other errors
            console.error("Error checking notifications.json:", error);
        }
    }
};
initializeNotificationsFile();

// Retrieve JSON notifications from S3
app.get("/get-notifications", async (req, res) => {
    const filename = "notifications.json";

    try {
        const s3File = await s3
            .getObject({
                Bucket: bucketName,
                Key: filename,
            })
            .promise();

        res.json(JSON.parse(s3File.Body.toString()));
    } catch (error) {
        if (error.code === "NoSuchKey") {
            console.log(`No such key ${filename}`);
            res.json([]); // Return an empty array if the file doesn't exist yet
        } else {
            console.log(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
});

// Save JSON notifications to S3
app.post("/save-notification", async (req, res) => {
    const filename = "notifications.json";

    try {
        const existingNotifications = await s3
            .getObject({
                Bucket: bucketName,
                Key: filename,
            })
            .promise();

        const notifications = JSON.parse(existingNotifications.Body.toString());

        // Assuming req.body is a valid notification object
        notifications.push(req.body);

        await s3
            .putObject({
                Body: JSON.stringify(notifications),
                Bucket: bucketName,
                Key: filename,
            })
            .promise();

        res.json({ success: true, message: "Notification saved successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete all notifications from S3
app.delete("/delete-notifications", async (req, res) => {
    const filename = "notifications.json";

    try {
        await s3
            .deleteObject({
                Bucket: bucketName,
                Key: filename,
            })
            .promise();

        res.json({
            success: true,
            message: "Notifications deleted successfully",
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Endpoint to trigger an event and record a notification
app.get("/trigger-event", async (req, res) => {
    // This is where you put the code for your event
    const notification = { message: "Event triggered", timestamp: new Date() };

    try {
        // Fetch the existing notifications from S3
        const existingNotifications = await s3
            .getObject({
                Bucket: bucketName,
                Key: "notifications.json",
            })
            .promise();

        // Parse the existing notifications
        const notifications = JSON.parse(existingNotifications.Body.toString());

        // Add the new notification to the array
        notifications.push(notification);

        // Save the updated notifications back to S3
        await s3
            .putObject({
                Body: JSON.stringify(notifications),
                Bucket: bucketName,
                Key: "notifications.json",
            })
            .promise();

        // Send a response to the client
        res.json({ success: true, message: "Event triggered" });
    } catch (error) {
        console.error("Error triggering event:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Endpoint to dismiss a notification
app.post("/dismiss-notification", express.json(), async (req, res) => {
    const dismissedNotification = req.body;

    try {
        // Fetch the existing notifications from S3
        const existingNotifications = await s3
            .getObject({
                Bucket: bucketName,
                Key: "notifications.json",
            })
            .promise();

        // Parse the existing notifications
        const notifications = JSON.parse(existingNotifications.Body.toString());

        // Remove the dismissed notification from the array
        const updatedNotifications = notifications.filter((notification) => {
            // Assuming the timestamp uniquely identifies a notification
            return notification.timestamp !== dismissedNotification.timestamp;
        });

        // Save the updated notifications back to S3
        await s3
            .putObject({
                Body: JSON.stringify(updatedNotifications),
                Bucket: bucketName,
                Key: "notifications.json",
            })
            .promise();

        // Send a response to the client
        res.json({ success: true, message: "Notification dismissed" });
    } catch (error) {
        console.error("Error dismissing notification:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
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
