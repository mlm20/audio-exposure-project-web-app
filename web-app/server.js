// Express setup
const express = require("express");
const app = express();

// Misc imports
import Handler from "handler.js";

app.use("/", express.static("src/static"));

app.use("/", express.json());
app.post("/", function (req, res) {
    const request_object = req.body;

    Handler[request_object.type](request_object).then(function (
        response_object
    ) {
        res.json(response_object);
    });
});

app.listen(process.env.PORT || 3000);
