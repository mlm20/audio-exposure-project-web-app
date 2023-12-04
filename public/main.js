// #############################################################################

// Configuration for ThingSpeak
const thingspeakChannelId = "2363431";
const thingspeakReadAPIKey = "80YIH02KW5FXTKXA";
const resultsNum = 50;
const thingspeakDataURL = `https://api.thingspeak.com/channels/${thingspeakChannelId}/feeds.json?api_key=${thingspeakReadAPIKey}&results=${resultsNum}`;

// Chart update frequency (ms)
const updateTime = 10 * 1000;

const testButton = document.getElementById("testButton");
const notificationsSection = document.getElementById("notificationsSection");

// #############################################################################
// Notifications

// Function to dismiss a notification
function dismissNotification(notification) {
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
}

// Function to update the notifications UI
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

// Function to fetch notifications and update UI
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

// Initial fetch and update when the page loads
fetchNotificationsAndUpdateUI();
