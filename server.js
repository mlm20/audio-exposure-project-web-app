// App setup
const app = require("./app");
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

// Misc imports
import Handler from "handler.js";

app.post("/", function (req, res) {
    const request_object = req.body;

    Handler[request_object.type](request_object).then(function (
        response_object
    ) {
        res.json(response_object);
    });
});
