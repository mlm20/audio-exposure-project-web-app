////
// Header
////

const Algorithm = Object.create(null);

////
// Helper Functions
////

// returns key from object value
const getKeyByValue = function (object, value) {
    return Object.keys(object).find((key) => object[key] === value);
};

// copy object
const copy_obj = (input_object) => Object.assign({}, input_object);

// returns object of candidate names, each with value of 0
const empty_candidate_obj = function (raw_data) {
    let first_vote = copy_obj(raw_data[0]); // avoids changes to reference obj
    const keys = Object.keys(first_vote);
    keys.forEach(function (key) {
        first_vote[key] = 0;
    });
    return first_vote;
};

// adds up the first choice results from raw data
// return object containing number of first choice votes each candidate received
const add_first_choices = function (raw_data) {
    // create object to store number of first choices
    const storage_obj = empty_candidate_obj(raw_data);

    // loop through results, adding first choices to storage_obj
    raw_data.forEach(function (single_voter_obj) {
        Object.values(single_voter_obj).forEach(function (value) {
            if (value === 1) {
                storage_obj[getKeyByValue(single_voter_obj, value)] += 1;
            }
        });
    });
    return storage_obj;
};

// takes raw data
// returns obj containing percentage each candidate received that round
const percentage_from_round = function (raw_data) {
    // get obj of first choice votes
    const first_choice_votes = add_first_choices(raw_data);

    // create obj to store percentages in
    let storage_obj = empty_candidate_obj(raw_data);

    // get total num votes
    const total_num_votes = raw_data.length;

    // do percentages
    Object.keys(storage_obj).forEach(function (key) {
        storage_obj[key] = (first_choice_votes[key] / total_num_votes) * 100;
    });
    return storage_obj;
};

// returns name of candidate in case of majority
// returns "DRAW" in case of draw in two horse race
// else returns null
const who_has_majority = function (raw_data) {
    const percentage_obj = percentage_from_round(raw_data);

    let fifty_percent_results = 0;

    // create variable for output of function, null is default
    let function_output = null;

    Object.keys(percentage_obj).forEach(function (key) {
        // return candidate name if they have a majority
        if (percentage_obj[key] > 50) {
            function_output = key;
        }

        // detect draws
        if (percentage_obj[key] === 50) {
            fifty_percent_results += 1;
        }
    });

    // return "DRAW" in case of draw
    if (fifty_percent_results === 2 && Object.keys(raw_data[0]).length === 2) {
        function_output = "DRAW";
    }

    // return output
    return function_output;
};

// takes in Obj of percentage results
// returns candidate name with plurality
// returns "DRAW" in case of draw
const most_votes = function (results_obj) {
    //// detect draw ////
    let fifty_percent_results = 0;
    Object.keys(results_obj).forEach(function (key) {
        if (results_obj[key] === 50) {
            fifty_percent_results += 1;
        }
    });
    // return "DRAW" in case of draw
    if (fifty_percent_results === 2 && Object.keys(results_obj).length === 2) {
        return "DRAW";
    }

    //// return candidate name with plurality
    const max_value = Math.max(...Object.values(results_obj));
    return getKeyByValue(results_obj, max_value);
};

// input voting data
// returns name of candidate with fewest votes
// if there are multiple candidates with the fewest votes, choose a random one
// returns "DRAW" in case of 50:50 draw
const fewest_votes = function (raw_data) {
    const added_votes = add_first_choices(raw_data);

    const min_value = Math.min(...Object.values(added_votes));

    return getKeyByValue(added_votes, min_value);
};

// eliminates last candidate
// distributes their ballots to second choice
// return voter data with the above adjusted
const eliminate_last_candidate = function (raw_data) {
    const eliminated_candidate_name = fewest_votes(raw_data);
    // new array to put updated objects in
    const new_data = [];

    // loop over single array containing voting objects
    raw_data.forEach(function (single_voter_obj) {
        // create seperate copy of voter object
        const voter_obj_copy = copy_obj(single_voter_obj);
        let elim_can_value = 0;

        // loop over object keys
        Object.keys(voter_obj_copy).forEach(function (key) {
            // shift preferences by one for candidates prefered
            // less than the eliminated candidate
            const value = voter_obj_copy[key];

            if (elim_can_value === 0) {
                elim_can_value = voter_obj_copy[eliminated_candidate_name];
            }

            if (value > elim_can_value) {
                voter_obj_copy[key] = voter_obj_copy[key] - 1;
            }

            // delete entry for voter to be eliminated
            delete voter_obj_copy[eliminated_candidate_name];
        });

        // push new object to array
        new_data.push(voter_obj_copy);
    });
    return new_data;
};

////
// Public Interface
////

// return an array of objects for results in each runoff round
Algorithm.results = function (raw_data) {
    // assign input data to variable
    let current_round_data = raw_data;

    // array to store results objects
    const results = [];

    // add initial round of results to array
    results.push(percentage_from_round(current_round_data));

    // while no candidate has a majority
    while (who_has_majority(current_round_data) === null) {
        // eliminate candidate in last place
        current_round_data = eliminate_last_candidate(current_round_data);

        // add round to array
        results.push(percentage_from_round(current_round_data));
    }

    // return results array
    return results;
};

// return string of the name of election winner
// returns "DRAW" in case of draw
Algorithm.name_of_winner = function (raw_data) {
    // get object of final round results
    const final_round_obj =
        Algorithm.results(raw_data)[Algorithm.results(raw_data).length - 1];

    // apply helper function
    return most_votes(final_round_obj);
};

// return percentage won by in final round
// returns "DRAW" in case of draw
Algorithm.percentage_of_winner = function (raw_data) {
    // get object of final round results
    const final_round_obj =
        Algorithm.results(raw_data)[Algorithm.results(raw_data).length - 1];

    // handle draws
    if (most_votes(final_round_obj) === "DRAW") {
        return "DRAW";
    }

    // regular output
    return final_round_obj[most_votes(final_round_obj)];
};

// returns number of rounds data
Algorithm.how_many_rounds = (raw_data) => Algorithm.results(raw_data).length;

// export module
export default Object.freeze(Algorithm);
