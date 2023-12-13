// Imports
const express = require("express");
const AWS = require("aws-sdk");
const fetch = require("isomorphic-fetch");
const s3 = new AWS.S3();
const bodyParser = require("body-parser");
const math = require("mathjs");

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

// Endpoint to retrieve JSON notifications from S3
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

// Helper function to save a notification to S3
const saveNotification = async function (notification) {
    const filename = "notifications.json";

    try {
        // Fetch existing notifications from S3
        const s3File = await s3
            .getObject({
                Bucket: bucketName,
                Key: filename,
            })
            .promise();

        // Parse existing notifications
        const notifications = JSON.parse(s3File.Body.toString());

        // Add new notification to entry
        notifications.push(notification);

        // Save the updated notifications JSON to S3
        await s3
            .putObject({
                Body: JSON.stringify(notifications),
                Bucket: bucketName,
                Key: filename,
            })
            .promise();

        console.log("Notification saved successfully:", notification);
    } catch (error) {
        console.error("Error saving notification:", error);
        throw error;
    }
};

// Endpoint to create test notification
app.get("/trigger-event", async (req, res) => {
    // This is where you put the code for your event
    const notification = {
        message: "Test Notification",
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

// Constants
// ThingSpeak API URL
const ThingSpeakAPIURL =
    "https://api.thingspeak.com/channels/2363431/feeds.json?results=";

// Function to get ThingSpeak data JSON
const getThingSpeakData = async (numSamples) => {
    // Function inputs determines the number of data samples fetched
    const URL = String(ThingSpeakAPIURL + numSamples);

    try {
        // Fetch from API URL
        const response = await fetch(URL);

        // Throw error if there's a problem with fetching the data
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Return the fetched data if there's no problem
        return response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};

// Function to get latest dB value
const getLatestValue = function (data) {
    // Get data JSON (input=2 since we only want the latest value)
    const dataJSON = data;

    // Get latest dB value from JSON
    const latestdB = dataJSON.feeds[dataJSON.feeds.length - 1].field1;

    // Get timestamp from JSON
    const latestTimestamp =
        dataJSON.feeds[dataJSON.feeds.length - 1].created_at;

    return [latestdB, latestTimestamp];
};

// Function to get 5 minute average dB value
const getAverageValue = function (data) {
    // Get data JSON
    const dataJSON = data;

    // Get last 20 samples (roughly last 5 mins)
    const dbValues = dataJSON.feeds
        .slice(-20)
        .map((entry) => parseFloat(entry.field1));

    // Calulate 5 min average data
    const avgValue =
        dbValues.reduce((accumulator, currentValue) => {
            return accumulator + currentValue;
        }, 0) / dbValues.length;

    // Get current timestamp
    const currentTimestamp = new Date().toISOString();

    return [avgValue, currentTimestamp];
};

// Function to collect dB data for graph
const getDataForGraph = function (data) {
    // Get data JSON
    const dataJSON = data;

    // Extract dbValues and timestamps
    const dbValues = dataJSON.feeds.map((entry) => entry.field1);
    const timestamps = dataJSON.feeds.map((entry) => entry.created_at);

    return [dbValues, timestamps];
};

// Endpoint to fetch live dB level
app.get("/live-db-data", async (req, res) => {
    try {
        // Fetch data from server ((input=100 since that covers roughly the last few hours))
        const dataJSON = await getThingSpeakData(100);

        // Get 5 min average data
        const averageData = getAverageValue(dataJSON);

        // Get latest dB value
        const lastestValueData = getLatestValue(dataJSON);

        // Get data for graph
        const dataForGraph = getDataForGraph(dataJSON);

        // JSON to send to client
        const Data = {
            latestValue: lastestValueData,
            averageValue: averageData,
            graphData: dataForGraph,
        };

        // Send the data JSON to client
        res.json(Data);
    } catch (error) {
        console.error("Error fetching live dB level:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// #############################################################################
// Noise Dose

const referenceTime = 8;
const referenceDB = 85;

// Helper function to calculate noise dose
const calculateNoiseDose = function (averageDecibel, exposureTime) {
    try {
        // Formula from online source
        const noiseDose =
            (100 *
                exposureTime *
                math.pow(10, (averageDecibel - referenceDB) / 10)) /
            referenceTime;
        console.log("Noise Dose: ", noiseDose);
        return noiseDose;
    } catch (error) {
        console.error("Error in noise dose calculation:", error);
        return NaN;
    }
};

// Endpoint for noise dose submissions
app.post("/submit-noise-dose", express.json(), async (req, res) => {
    try {
        const [averageDecibel, exposureTime] = req.body;

        // Check if input values are valid numbers
        if (
            isNaN(parseFloat(averageDecibel)) ||
            isNaN(parseFloat(exposureTime))
        ) {
            throw new Error("Invalid input values");
        }

        // Calculate noise dose
        const noiseDose = calculateNoiseDose(
            parseFloat(averageDecibel),
            parseFloat(exposureTime)
        );

        // Create notification
        const notification = {
            message: `Noise Dose is ${noiseDose.toFixed(1)}%\nTake necessary precautions!`,
            timestamp: new Date().toLocaleString("en-GB", { timeZone: "UTC" }),
        };

        // Save the notification to S3
        await saveNotification(notification);
        console.log("Notification triggered:", notification);

        // Send a response to the client
        res.json({ success: true, message: "Noise dose submitted" });
    } catch (error) {
        console.error("Error submitting noise dose:", error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// #############################################################################
// Loops

// Function to check average sound level and save notification if the threshold has been exceeded
const checkAndSaveNotification = async function () {
    try {
        // Fetch data from the server (input=30 since that covers roughly the last 5 mins)
        const dataJSON = await getThingSpeakData(30);

        // Get 5 min average data
        const averageData = getAverageValue(dataJSON);

        // Set the threshold for triggering the notification (adjust as needed)
        const threshold = 70;

        // Trigger a notification if average dB level is above the threshold
        if (averageData[0] >= threshold) {
            // Trigger notification
            const notification = {
                message: `High sound level detected: ${averageData[0]} dB\nPlease try to be quieter!`,
                timestamp: new Date().toLocaleString("en-GB", {
                    timeZone: "UTC",
                }),
            };

            // Save the notification to S3
            await saveNotification(notification);
            console.log("Notification triggered:", notification);
        }
    } catch (error) {
        console.error("Error checking and saving notification:", error);
    }
};

const intervalMinutes = 5;
setInterval(checkAndSaveNotification, intervalMinutes * 60 * 1000);

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
