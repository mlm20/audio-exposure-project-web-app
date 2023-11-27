import Algorithm from "./RCV_algorithm.js";
const Handler = Object.create(null);

Handler.results = function (request_object) {
    return Promise.resolve({
        response: {
            results: Algorithm.results(request_object.raw_data),
            name_of_winner: Algorithm.name_of_winner(request_object.raw_data),
            percentage_of_winner: Algorithm.percentage_of_winner(
                request_object.raw_data
            ),
            how_many_rounds: Algorithm.how_many_rounds(request_object.raw_data),
        },
    });
};

export default Object.freeze(Handler);
