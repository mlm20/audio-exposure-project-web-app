const candidate_list = JSON.parse(sessionStorage.candidate_list);
const num_candidates = candidate_list.length;

const see_results_button = document.getElementById("SeeResultsButton");
const table_div = document.getElementById("VotingTableContainer");
const next_voter_button = document.getElementById("NextVoterButton");
const vote_counter = document.getElementById("Vote-Counter");

//// table creation ////
const CreateTable = function () {
    // create table element and header
    let voting_table = document.createElement("table");
    voting_table.id = "voting_table";

    let voting_table_head = document.createElement("thead");
    voting_table_head.id = "voting_table_head";

    let voting_table_header_row = document.createElement("tr");
    voting_table_header_row.id = "voting_table_header_row";

    // apply first column "candidate" title label
    let voting_header = document.createElement("th");
    voting_header.innerText = "Candidate";
    voting_table_header_row.append(voting_header);

    // apply radio button label to header row
    candidate_list.forEach(function (name, value) {
        voting_header = document.createElement("th");
        let index_num = value + 1;
        let header_text = function (index_num) {
            if (index_num === 1) {
                return String(index_num + "st Choice");
            } else if (index_num === 2) {
                return String(index_num + "nd Choice");
            } else if (index_num === 3) {
                return String(index_num + "rd Choice");
            } else {
                return String(index_num + "th Choice");
            }
        };
        voting_header.innerText = header_text(index_num);
        voting_table_header_row.append(voting_header);
    });

    // append header row to table header group element
    voting_table_head.append(voting_table_header_row);
    voting_table.append(voting_table_head);

    // create table body element
    let voting_table_body = document.createElement("tbody");
    voting_table_body.id = "voting_table_body";

    // create table body
    candidate_list.forEach(function (name) {
        // create new table row for candidate
        let new_row = document.createElement("tr");
        new_row.id = name;

        // add candidate name to cell 1
        let candidate_name = document.createElement("td");
        candidate_name.innerText = name;
        new_row.append(candidate_name);

        // add radio buttons
        let i;
        for (i = 1; i <= num_candidates; i += 1) {
            // create cell for individual radio button
            let button_cell = document.createElement("td");
            // create radio button
            let radio_button = document.createElement("input");
            radio_button.setAttribute("type", "radio");
            radio_button.setAttribute("name", String(name));
            radio_button.id = String(name + "_" + i);
            // add radio button to cell
            button_cell.append(radio_button);
            // add cell to row
            new_row.append(button_cell);
        }

        // add new_row to body
        voting_table_body.append(new_row);
    });

    // append table body to table element
    voting_table.append(voting_table_body);

    // append table to div container
    table_div.append(voting_table);
};

// call CreateTable()
window.onload = CreateTable;

//// make columns mutually exclusive ////

//// data collation ////
let number_of_votes = 0;
let votes = [];

const final_char = (string) => string.charAt(string.length - 1);

next_voter_button.onclick = function () {
    //// collect data from radio buttons ////

    // create object to store votes from 1 voter
    let VoterObject = {};

    let i;
    // loop through rows
    for (i = 1; i <= num_candidates; i += 1) {
        // get name for current row
        let rowname = candidate_list[i - 1];

        let j;
        // loop through columns
        for (j = 1; j <= num_candidates; j += 1) {
            // loop through radio buttons on row
            let RadioButton = document.getElementById(
                String(rowname + "_" + j)
            );

            // add preference number to VoterObject if button is selected
            if (RadioButton.checked === true) {
                VoterObject[rowname] = j;
            }
        }
    }

    // add VoterObject to "votes" array
    votes.push(VoterObject);

    //// reset radio buttons ////
    candidate_list.forEach(function (rowname) {
        let RadioButtons = document.getElementsByName(rowname);
        RadioButtons.forEach(function (button) {
            button.checked = false;
        });
    });

    //// increase vote counter by 1 ////
    number_of_votes += 1;
    vote_counter.textContent = number_of_votes;
};

// data sendoff function
const push_to_session_storage = function (input) {
    let JSON_String = JSON.stringify(input);
    sessionStorage.setItem("votes", JSON_String);
};

// see results button
see_results_button.onclick = function () {
    // send voting data to sessionStorage
    push_to_session_storage(votes);
    console.log("Moved to results page");
    // send user to results page
    location.href = "../Results/Results.html";
};
