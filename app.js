// Imports
const express = require("express");
const AWS = require("aws-sdk");
const http = require("http");
const fetch = require("isomorphic-fetch");
const s3 = new AWS.S3();
const bodyParser = require("body-parser");
const socketIO = require("socket.io");

// Create app
const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIO(server);

// AWS bucket name
const bucketName = "cyclic-raspberry-quail-tutu-eu-west-2";

// ThingSpeak API URL
const ThingSpeakAPIURL =
    "https://api.thingspeak.com/channels/2363431/feeds.json?results=2";

// dB threshold
const dBthreshold = 40;

// Frequency at which data is fetched from ThingSpeak
const fetchRate = 10 * 1000;

// Array to store recent sound level samples
let soundLevelSamples = [];

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
    const notification = {
        message: "Event triggered",
        timestamp: new Date().toLocaleString("en-GB", { timeZone: "UTC" }),
    };

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
// Accessing ThingSpeak data

// Function to fetch ThingSpeak data and calculate average sound level
const fetchAndCalculateAverage = async () => {
    try {
        // Fetch data from ThingSpeak (replace with your actual fetching logic)
        const thingSpeakData = await fetchThingSpeakData();

        // Extract sound levels from the fetched data
        const soundLevels = thingSpeakData.map((entry) => entry.soundLevel);

        // Add the latest sound level to the samples array
        soundLevelSamples.push(...soundLevels);

        // Keep only samples from the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        soundLevelSamples = soundLevelSamples.filter(
            (sample) => new Date(sample.timestamp) > twoMinutesAgo
        );

        // Calculate average sound level
        const averageSoundLevel =
            soundLevelSamples.reduce((sum, sample) => sum + sample.level, 0) /
            soundLevelSamples.length;

        // If average level exceeds threshold, generate notification
        if (averageSoundLevel > dBthreshold) {
            const notification = {
                message: `Audio threshold of ${dBthreshold}dB exceeded! Current level: ${averageSoundLevel.toFixed(
                    2
                )}dB`,
                timestamp: new Date().toISOString(),
            };

            // Save the notification to S3
            await s3
                .putObject({
                    Body: JSON.stringify([notification]),
                    Bucket: bucketName,
                    Key: "notifications.json",
                })
                .promise();
        }

        // Return both live and average dB levels
        return {
            liveDbLevel: soundLevels[0], // Assuming the latest entry is the first in the array
            averageDbLevel: averageSoundLevel,
        };
    } catch (error) {
        console.error(
            "Error fetching and calculating average sound level:",
            error
        );
        throw error;
    }
};

// Function to fetch ThingSpeak data (replace with your actual logic)
// Function to fetch ThingSpeak data (replace with your actual logic)
const fetchThingSpeakData = async () => {
    // Retry configuration
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetch(ThingSpeakAPIURL);
            const data = await response.json();

            // Check if the response contains valid data
            if (data && data.feeds) {
                return data.feeds.map((entry) => ({
                    timestamp: entry.created_at,
                    soundLevel: entry.field1, // Adjust field name based on your ThingSpeak setup
                }));
            } else {
                throw new Error("Invalid response from ThingSpeak");
            }
        } catch (error) {
            // Log the error and retry if needed
            console.error(
                `Error fetching ThingSpeak data (retry ${
                    retries + 1
                }/${maxRetries}):`,
                error.message
            );

            // Increment the retry count
            retries += 1;

            // Wait for a short duration before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    // If max retries reached without success, throw an error
    throw new Error(
        `Failed to fetch ThingSpeak data after ${maxRetries} retries`
    );
};

// Periodically fetch ThingSpeak data and calculate average sound level
setInterval(fetchAndCalculateAverage, fetchRate);

// Endpoint to fetch live dB level
app.get("/live-db-level", async (req, res) => {
    try {
        // Fetch data from ThingSpeak (replace with your actual fetching logic)
        const thingSpeakData = await fetchThingSpeakData();

        // Get the latest entry from ThingSpeak data
        const latestEntry = thingSpeakData[0];

        // Extract sound level and timestamp from the latest entry
        const liveDbLevelData = {
            liveDbLevel: parseFloat(latestEntry.soundLevel), // Assuming soundLevel is a string, convert it to a number
            timestamp: latestEntry.timestamp,
        };

        // Send the live dB level and timestamp to the client
        res.json(liveDbLevelData);
    } catch (error) {
        console.error("Error fetching live dB level:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// #############################################################################
// Catch all handler for all other requests
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
