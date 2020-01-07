let selected = [];
let searchQ = [];

document.getElementById("remove").addEventListener("click", function () {
    // remove value from selected (using index value)
    let IDs = findChecks("resultBox");
    for (let i=selected.length-1; i>=0; i--) { // backwards loop so remaining indexes don't change when one is removed
        if (IDs.includes(selected[i]._id)) {
            // remove selected[i] question
            selected.splice(i, 1);
        }
    }
    // call reloadCurrent to reload selected
    reloadCurrent();
});

document.getElementById("add").addEventListener("click", function () {
    let indexes = findChecks("searchBox");
    // loop thru each checked question, and each selected and compare ids
    for (let i=0; i<indexes.length; i++) {
        let toAdd = "true";
        // search thru selected to see if that index's question is in selected already
        for (let s=0; s<selected.length; s++) {
            if (searchQ[indexes[i]]._id == selected[s]._id) {
                toAdd = "false";
                break;
            }
        }
        // add or not
        if (toAdd == "true") {
            selected.push(searchQ[indexes[i]]);
        }
    }
    reloadCurrent();
    reloadSearch();
});

document.getElementById("submit").addEventListener("click", function () {
    let creatorEle = document.getElementById("creator");
    let tagEle = document.getElementById("tag");
    // check if user has inputted a valid form
    if (creatorEle.value == "" || tagEle.value == "" || selected.length == 0) {
        alert("Please fill in all data and make sure to have at least 1 question in the quiz.");
        return;
    }

    let tags = tagEle.value.split(" ");
    console.log("Sending POST request with:",creatorEle.value,tags,selected);
    // send POST request
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 201) {
            // id should be given back, redirect user to new quiz page
            console.log(this.responseText.replace(/['"]+/g, ''));
            window.location.href = "http://localhost:3000/quiz/"+this.responseText.replace(/['"]+/g, '');
        }
    };
    //console.log(link);
    xhttp.open("POST", "http://localhost:3000/quizzes", true);
    xhttp.setRequestHeader("Content-Type","application/json");
    xhttp.send(JSON.stringify({"creator": creatorEle.value, "tags": tags, "questions": selected}));

});

function findChecks(name) {
    let checkboxes = document.getElementsByName(name);
    let checkedValues = [];
    for(let i=0; i<checkboxes.length; i++){ // check each checkbox based on name
        if (checkboxes[i].checked) {
            checkedValues.push(checkboxes[i].value);
        }
    }
    return checkedValues;
}

function reloadSearch() {
    // reload search results based on category and difficulty selected
    let c = document.getElementById("category").value;
    let d = document.getElementById("difficulty").value;
    let link = "http://localhost:3000/questions?";
    if (c != "all") {
        link += "category="+encodeURIComponent(c); // add category query
    }
    if (d != "all") {
        if (c != "all") {
            link+= "&";
        }
        link += "difficulty="+d; // add difficulty query
    }

    // make request
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            let response = JSON.parse(this.responseText);
            //console.log(response, response.questions.length, response.questions[0]);
            let search = document.getElementById("searchQuestions");
            search.innerHTML = "";
            searchQ = [];
            if (response.questions.length == 0) {
                search.innerHTML += "No available questions."
            }
            for (let i=0; i<response.questions.length; i++) {
                //searchQ.push({"_id":response.questions[i]._id, "question": response.questions[i].question});
                searchQ.push(response.questions[i]); // save each question
                search.innerHTML += "<li><input type='checkbox' name='searchBox' value='"+i+"'><a target='_blank' href='/questions/"+response.questions[i]._id+"'>"+response.questions[i].question+"</a></li>";
            }
            //console.log(searchQ);
        }
    };
    //console.log(link);
    xhttp.open("GET", link, true);
    xhttp.setRequestHeader("Accept","application/json");
    xhttp.send();
    console.log(selected);
}

function reloadCurrent() {
    console.log(selected);
    // use selected to do this
    let current = document.getElementById("currentQuestions");
    current.innerHTML = "";
    if (selected.length == 0) {
        current.innerHTML += "<li>No questions in quiz.</li>"
    }
    for (let i=0; i<selected.length; i++) {
        current.innerHTML += "<li><input type='checkbox' name='resultBox' value='"+selected[i]._id+"'><a target='_blank' href='/questions/"+selected[i]._id+"'>"+selected[i].question+"</a></li>";
    }
}

document.onload = reloadSearch();