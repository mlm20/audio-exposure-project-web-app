// Initialisation
const testButton = document.getElementById("testButton");
const notificationsSection = document.getElementById("notificationsSection");

// #############################################################################
// Notifications

//// Fetch notifications

// Function to update the notifications UI
const updateNotificationsUI = function (notifications) {
    notificationsSection.innerHTML = ""; // Clear existing content

    notifications.forEach((notification) => {
        const notificationElement = document.createElement("div");
        notificationElement.textContent = `${notification.message} - ${notification.timestamp}`;
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
