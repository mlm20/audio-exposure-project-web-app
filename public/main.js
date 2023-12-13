// #############################################################################
// Setup

const testButton = document.getElementById("testButton");
const notificationsSection = document.getElementById("notificationsSection");

const liveDbLevel = document.getElementById("liveDbLevel");
const liveDbTimestamp = document.getElementById("liveDbTimestamp");

const avgDbLevel = document.getElementById("averageDbLevel");
const averageDbTimestamp = document.getElementById("averageDbTimestamp");

// #############################################################################
// General helper functions

// Reformat timestamp from ISO to en-GB format
const formatTimestampToGB = function (timestamp) {
    const date = new Date(timestamp);
    const options = {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false, // Use 24-hour format
    };

    return new Intl.DateTimeFormat("en-GB", options).format(date);
};

// #############################################################################
// Notifications

// Calls the dismiss-notification function on the backend
const dismissNotification = function (notification) {
    fetch("/dismiss-notification", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(notification),
    })
        .then((response) => response.json())
        .then((data) => {
            // Handle the response from the server (if needed)
            console.log(data);
        })
        .catch((error) =>
            console.error("Error dismissing notification:", error)
        );
};

// Create UI elements for each notification in the JSON file
const updateNotificationsUI = function (notifications) {
    notificationsSection.innerHTML = ""; // Clear existing content

    notifications.forEach((notification) => {
        // Create elements
        const notificationElement = document.createElement("div");
        const copyContainer = document.createElement("div");
        const notifMessage = document.createElement("div");
        const notifTime = document.createElement("div");

        // Add classes
        notificationElement.classList.add("notificationElement");
        copyContainer.classList.add("copyContainer");
        notifMessage.classList.add("notifMessage");
        notifTime.classList.add("notifTime");

        // Update text content of notification element
        notifMessage.textContent = notification.message;
        notifTime.textContent = notification.timestamp;

        // Append to container
        copyContainer.appendChild(notifMessage);
        copyContainer.appendChild(notifTime);
        notificationElement.appendChild(copyContainer);

        // Create a dismiss button for each notification
        const dismissButton = document.createElement("button");
        dismissButton.classList.add("dismissButton");
        const imgElement = document.createElement("img");

        imgElement.setAttribute("src", "images/dismissIcon.svg");
        imgElement.classList.add("dismissIcon");
        dismissButton.appendChild(imgElement);

        dismissButton.addEventListener("click", function () {
            // Remove the notification from the UI
            notificationElement.remove();

            // Remove the notification from the JSON file
            dismissNotification(notification);
        });
        // Append dismiss button to the notification element
        notificationElement.appendChild(dismissButton);

        // Append the notification element to the UI
        notificationsSection.appendChild(notificationElement);
    });
};

// Notification test button
testButton.addEventListener("click", function () {
    // Make an HTTP request to trigger the event
    fetch("/trigger-event", { method: "GET" })
        .then((response) => response.json())
        .then((data) => {
            // Handle the response from the server (if needed)
            console.log(data);

            // After triggering the event, fetch and update notifications
            fetchNotificationsAndUpdateUI();
        })
        .catch((error) => console.error("Error triggering event:", error));
});

// #############################################################################
// Live dB display

// Function to update live dB level UI
const updateLiveDbLevelUI = function (latestDbLevel, timestamp) {
    liveDbLevel.textContent = `${latestDbLevel} dB`;
    liveDbTimestamp.textContent = formatTimestampToGB(timestamp);
};

// Function to update average dB level UI
const updateAverageDbLevelUI = function (averageDbLevel, timestamp) {
    avgDbLevel.textContent = `${averageDbLevel} dB`;
    averageDbTimestamp.textContent = formatTimestampToGB(timestamp);
};

const fetchSoundLevelData = async function () {
    try {
        // Fetch from backend endpoint
        const response = await fetch("/live-db-data");

        // Throw error if there's a problem with fetching the data
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Return the fetched data if there's no problem
        return response.json();
    } catch (error) {
        console.error("Error fetching data from server:", error);
    }
};

// #############################################################################
// dB graph

// Function to make graph
const drawGraph = function (dbValues, timestamps) {
    // Get graph element
    const ctx = document.getElementById("dbGraph").getContext("2d");

    // Format timestamps as "HH:mm"
    const formattedTimestamps = timestamps.map((timestamp) =>
        new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            minute: "numeric",
            hour12: false,
        }).format(new Date(timestamp))
    );

    // Data object, needed for chart.js
    const data = {
        labels: formattedTimestamps,
        datasets: [
            {
                label: "Sound Level (dB)",
                data: dbValues,
                fill: false,
                borderColor: "rgb(75, 192, 192)",
                lineTension: 0.1,
                hidden: true,
            },
        ],
    };

    // Set graph options
    const options = {
        scales: {
            x: [
                {
                    type: "time",
                    time: {
                        unit: "minute",
                        tooltipFormat: "HH:mm",
                        displayFormats: {
                            minute: "HH:mm",
                        },
                        parser: "HH:mm",
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Time (HH:mm)",
                    },
                    ticks: {
                        beginAtZero: true,
                        maxTicksLimit: Infinity,
                    },
                    gridLines: {
                        drawOnChartArea: true,
                    },
                },
            ],
            y: {
                scaleLabel: {
                    display: true,
                    labelString: "Sound Level (dB)",
                },
            },
        },
        legend: {
            display: false,
        },
    };

    // Set graph configuration
    const config = {
        type: "line",
        data: data,
        options: options,
    };

    // Create or update graph
    if (window.myLineChart) {
        window.myLineChart.data = data;
        window.myLineChart.options = options;
        window.myLineChart.update();
    } else {
        window.myLineChart = new Chart(ctx, config);
    }
};

// #############################################################################
// Update UI

// Fetch ThingSpeak data & run UI update functions
const fetchAndUpdateUI = async function () {
    try {
        // Fetch data
        const responseJSON = await fetchSoundLevelData();

        console.log(responseJSON);

        // Update live dB
        updateLiveDbLevelUI(
            String(responseJSON.latestValue[0]),
            String(responseJSON.latestValue[1])
        );

        // Update average dB
        updateAverageDbLevelUI(
            String(responseJSON.averageValue[0]),
            String(responseJSON.averageValue[1])
        );

        // Draw graph
        drawGraph(responseJSON.graphData[0], responseJSON.graphData[1]);
    } catch (error) {
        console.error("Error updating UI:", error);
    }
};

// Fetch notifications and & run UI update functions
const fetchNotificationsAndUpdateUI = function () {
    fetch("/get-notifications")
        .then((response) => response.json())
        .then((notifications) => {
            // Update the UI with the notifications
            updateNotificationsUI(notifications);
        })
        .catch((error) =>
            console.error("Error fetching notifications:", error)
        );
};

// Initial fetch and update when the page loads
fetchNotificationsAndUpdateUI();

// Fetch and update UI when page loads
fetchAndUpdateUI();
