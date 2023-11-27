const Ajax = Object.create(null);

const fetch = window.fetch;
const json = (response) => response.json();

Ajax.query = function (request_object) {
    const body = JSON.stringify(request_object);

    return fetch("/", {
        method: "POST",
        body: body,
        headers: {
            "Content-Type": "application/json",
        },
    }).then(json);
};

export default Object.freeze(Ajax);
