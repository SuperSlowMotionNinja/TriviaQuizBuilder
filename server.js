// Modules
const express = require('express');
const fs = require('fs');
let app = express();
app.use(express.json());

// Database variables
let mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
let db;

// View engine
app.set("view engine", "pug");

// Set up routes
app.use(express.static("public"));
app.get("/createquiz", createQuiz);
app.get("/client.js",sendScript);
app.get("/questions/:qID", sendSingleQ);
app.get("/questions", sendQs);
app.get("/quiz/:quizID", sendSingleQuiz);
app.get("/quizzes", sendQuizzes);
app.post("/quizzes", postQuiz);
app.all('*', function (req,res) {
    send404(res);
});

// 404 message
function send404(res) {
    res.status(404).send('Error 404: Resource not found.')
}

function createQuiz(req, res){ // quiz creation page
	res.format({
		'text/html': function () {
			db.collection("questions").distinct("category", function(errC, c) { // load categories
				if(errC){
					res.status(500).send("Error reading database.");
					return;
				}
				if(!c){
					send404();
					return;
				}
				db.collection("questions").distinct("difficulty", function(errD, d) { // load difficulties
					if(errD){
						res.status(500).send("Error reading database.");
						return;
					}
					if(!d){
						send404();
						return;
					}
					res.render("create",{categories: c, difficulties: d}); // render pug file
				});
			});
		},
		'default': function () {
			// error message
			send404(res);
		}
	});
	
}

function sendScript(req, res){ // send client.js for quiz creation
	fs.readFile('client.js', function(err, contents) {
		res.type('.js').send(contents);
    });
}

function sendSingleQ(req, res) {
    //setup ID
    console.log(req.params.qID);
    let oid;
	try{
		oid = new mongo.ObjectID(req.params.qID);
	}catch{
		res.status(404).send("Unknown ID");
		return;
    }
    
    db.collection("questions").findOne({_id:oid}, function(err, result) { // find question
        console.log(result);
        if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			res.status(404).send("Unknown ID");
			return;
		}
		res.format({ // send question info
            'text/html': function () { // render page
                res.render('singleQuestion',{q: result});
            },
            'application/json': function () { // send JSOMN
                res.send(result);
            },
            'default': function () {
                // error message
                send404(res);
            }
        });
	})
    
}

function sendQs(req, res) { // send questions
	/* 
	REMEMBER: 
	Note that some categories in the
	dataset have the character ‘&’ within their text, which will cause issues if you try to
	add the category string directly to a query string for a request (e.g., if making an
	XMLHttpRequest to the /questions route). Use Javascript's
	encodeURIComponent(string) function to encode the category string in URI format
	before adding it to your query string.
	*/

    // query the questions
    let toQuery = {};
    console.log(req.query);
    if (req.query.category != undefined) {
        toQuery.category = req.query.category;
    } if (req.query.difficulty != undefined) {
        toQuery.difficulty = req.query.difficulty;
    }

    db.collection("questions").find(toQuery).limit(25).toArray(function(err, result) {
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			send404();
			return;
		}
		//console.log(result);
		res.format({
            'text/html': function () { // send results to page
                res.render('questions',{questions: result});
            },
            'application/json': function () { // send JSON results
                res.send({questions: result});
            },
            'default': function () {
                // error message
                send404(res);
            }
        });
	})
}

function sendSingleQuiz(req, res) {
	// setup ID
    console.log(req.params.quizID);
    let oid;
	try{
		oid = new mongo.ObjectID(req.params.quizID);
	}catch{
		res.status(404).send("Unknown ID");
		return;
    }
    
    db.collection("quizzes").findOne({_id:oid}, function(err, result) { // find quiz
        //console.log(result);
        if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			res.status(404).send("Unknown ID");
			return;
		}
		res.format({
            'text/html': function () {
				// format tags in quiz
				let quiz = result;
				let tagStr = "";
				if (quiz.tags.length > 1) {
					for (let i=0; i<quiz.tags.length-1; i++) {
						tagStr += quiz.tags[i]+', '
					}
					tagStr += quiz.tags[quiz.tags.length-1];
				} else if (quiz.tags.length == 1) {
					tagStr += quiz.tags[0];
				} else {
					tagStr = "No Tags";
				}
				
                res.render('singleQuiz',{q: result, tag: tagStr}); // send quiz data to page
            },
            'application/json': function () { // send plain JSON
                res.send(result);
            },
            'default': function () {
                // error message
                send404(res);
            }
        });
	})
    
}

function sendQuizzes(req, res) {
	 // query the quizzes
	 let toQuery = {};
	 console.log(req.query);
	 if (req.query.creator !== undefined) {
		 toQuery.creator = {'$regex' : req.query.creator, '$options' : 'i'}; // case insensitive and contains
	 } if (req.query.tag !== undefined) {
		 toQuery.tags = {'$regex' : '^'+req.query.tag+'$', '$options' : 'i'}; // case insensitive, ^ means starts with and $ means endswith
	 }

	 db.collection("quizzes").find(toQuery).toArray(function(err, result) { // find quizzes
		if(err){
			res.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			send404();
			return;
		}
		 console.log(result);
		 res.format({
			 'text/html': function () {
				 res.render('quizzes',{quizzes: result}); // send quiz info to page
			 },
			 'application/json': function () { // send plain JSON data
				 res.send({quizzes: result});
			 },
			 'default': function () {
				 // error message
				 send404(res);
			 }
		 });
	 })
 }

function postQuiz(req, res) {
	// check if valid quiz
	//console.log("POST request:",req.body);
	let quiz = req.body;
	if (quiz.creator != undefined && Array.isArray(quiz.tags)) { // check creator and tags
		if (quiz.tags.length > 0 && quiz.tags[0] != "") {
			// check each question
			db.collection("questions").distinct("_id", function(err, result) {
				if(err){
					res.status(500).send("Error reading database.");
					return;
				}
				if(!result){
					send404();
					return;
				}
				//check question validity
				for (let i=0; i<quiz.questions.length; i++) {
					let oid; // setup ID for searching
					try{
						oid = new mongo.ObjectID(quiz.questions[i]._id);
					}catch{
						res.status(400).send("Unknown ID");
						return;
					}
    
					db.collection("questions").findOne({_id:oid}, function(err, result) { // find question in database
						if(err){
							res.status(500).send("Error reading database.");
							return;
						}
						if(!result){
							res.status(400).send("Quiz data invalid.");
							return;
						}
						quiz.questions[i] = result; // if found, set that full question to quiz
					})
				}
				// add quiz to database
				db.collection("quizzes").insertOne(quiz, function(err, result){
					if (err) {
						res.status(500).send("Error writing to database.")
						return;
					}
					if(!result){
						send404();
						return;
					}
					console.log("go here:",result.insertedId);
					res.status(201).send(result.insertedId); // send new quiz ID back to client

				});

			});

		} else {
			res.status(400).send("Quiz data is invalid.");
		}
	} else {
		res.status(400).send("Quiz data is invalid.");
	}
}

// Initialize database connection
MongoClient.connect("mongodb://localhost:27017/", function(err, client) {
  if(err) throw err;

  //Get the t8 database
  db = client.db('a4');
  
  // Start server once Mongo is initialized
  app.listen(3000);
  console.log("Listening on port 3000");
});
