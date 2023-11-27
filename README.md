# Project

The project in this repository is the primary submission for my DE1 **Computing 2: Applications** module at Imperial College London. The aim of this module was to become comfortable developing web-apps with a server and client side.

## Brief

For this project I sought to create a _voting machine_ style election calculator for Instant Runoff (Ranked Choice Voting) elections.

On the first page the user is able to nominate (input) the candidates/choices for the election.

Next the user is presented with a voting page where one-by-one (on the same computer) users rank the candidates in order of preference (they **must **use all their votes). When everyone has voted the user can press a button to see the results of the election.

The voting data is sent to the server which calculates the results of the election and sends it back to the client. These results are presented to the user in a table as well as in a one sentence summary, the table shows the results of each instant runoff round until a winner (candidate with more than 50% of the vote) was found.

## Coding

First I wrote out the structure of the web-app as a whole on paper, planning the functionality of each of the three pages, the data-flow and order of events.

Next I coded the html and CSS files for the front-end client, creating floating boxes for the content to appear in. Next I coded the client-side JavaScript files (`main.js`, `Voting.js`, `Results.js`), adding functionality to my buttons and input fields. I used JavaScript to dynamically generate the tables for voting and displaying the final results. I passed data between these browser JavaScript files by putting it in `sessionStorage`.

Next I wrote the server-side JavaScript file `RCV_algorithm.js` which takes in the voting data, applies the Instant Runoff Algorithm and returns the election results among other items. This is where I implemented the functional programming principles we were taught. I set up Ajax with a Handler to pass data between the client and the server-side algorithm.

## UX/UI

My goal with the UI and UX was to create a simple interface which was intuitive enough for the user to use without detailed prior explanation.

I ensured that the function of each button and input field was self-evident and that the user felt that the web-app was dynamic.

On the voting page I tried hard to make the voting interface mimic an actual Instant Runoff ballot paper, this would make the user experience far more intuitive. Additionally the “Number of Votes”counter was added so the user could keep track of how many people have voted.

![](https://d3n8a8pro7vhmx.cloudfront.net/fairvote/pages/106/attachments/original/1494001599/CCD_Grid.jpg?1494001599)

For the results presentation page, a short summary was added to the stop of the page to increase ease of use of the app for people unfamiliar with the multi-round IRV process.

## Data

Once the user inputs the candidates for the election these are stored as strings in an array, e.g. `["Blue Party", "Red Party", "Orange Party"]`, this array is then sotred in the browsers `sessionStorage` where it can be accessed on other pages.

The voting data extracted in `Voting.js` is storage as an Array of Objects, where each Object represents the votes of a single voter and the candidate’s value represents their order of preference, e.g.

```javascript
[
    {
        blue: 4,
        red: 1,
        yellow: 3,
        pink: 2,
    },
    {
        blue: 1,
        red: 2,
        yellow: 3,
        pink: 4,
    },
    {
        blue: 2,
        red: 3,
        yellow: 1,
        pink: 4,
    },
];
```

This data is sent via Ajax to the `RCV_algorithm.js` on the server where various Array manipulation methods are applied to calculate the results of the election. These results are also an Array of Objects but where each Object represents the percentage each candidate got in each runoff round, e.g.

```javascript
[
    {
        blue: 16.666666666666664,
        red: 25,
        yellow: 33.33333333333333,
        pink: 25,
    },
    {
        red: 33.33333333333333,
        yellow: 41.66666666666667,
        pink: 25,
    },
    {
        red: 50,
        yellow: 50,
    },
];
```

## Debugging

I wrote unit tests to test the functionality of `RCV_algorithm.js`, ensuring the functions work in a range of election outcomes including where a candidate wins, where two candidates draw in the final round, and where a candidate wins in the first round. Due to my unique data structure, I found it difficult to implement property-based tests and so used test-cases instead.

I used the node.js debugging tool frequently to test and debug the various helper functions in `RCV_algorithm.js`.

For example, I encountered a bug where the `empty_candidate_obj()` function was outputting weird results. Using the debugger tool I identified that it was changing the Object passed into it and subsequently from using StackOverflow I realised that I since Objects inherit from each other I had to construct a brand new copy of the input Object before performing any manipulation.

## Best Practice

I made sure to separate my code into various modules and into separate folders named after the contents’ function.

I added very frequent comments to my code making clear each section’ purpose.

I made frequent commits using git to properly version control my code to prevent code-breaking bugs later down the line.

I followed ES6 guidelines and made sure to eliminate almost all JSLint error messages.
