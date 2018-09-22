"use strict";
//AWS SDK is needed to make Amazon Lex Requests
// See https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html
const AWS = require("aws-sdk");
const http = require("http");
const querystring = require('querystring');

module.exports = (robot) => {

    //Respond to all user input
    robot.respond(/.*/gi, (res) => {

        const robotName = res.robot.name;     //Bot name
        const rawUserInput = res.message.text;  //User input
        const userName = res.message.user.name;  //User name  e.g. Guest-7

        //Remove the bot name from the user input
        let trueUserInput = rawUserInput.replace(robotName + " ", '');

        //This gets rid of the @ symbol if it is present
        if (trueUserInput.indexOf('@') > -1) {
            trueUserInput = trueUserInput.replace('@', '');
        }

        //Test user input against following regexes to determine whether user input
        //was a question or an action
        let isQuestion = /^(who|what|when|where|why|how).*/gi.test(trueUserInput);
        let isAction = /^(?!who|what|when|where|why|how).*/gi.test(trueUserInput);

        //If user input was flagged as a question
        if (isQuestion) {

            //The limit of the number of results returned by the request
            const requestLimit = 10;

            //Set the request path using the user input and the request limit
            let requestPath = encodeURI("/FastChat/" + trueUserInput + "?limit=" + requestLimit);

            //Parameters for connecting to the Java service that handles questions
            let options = {
                hostname: "JAVAHOSTNAME",
                port: 123456789,
                path: requestPath,
                method:"GET"
            };

            //This variable is used to store the content returned by the following http request
            let buffer = "";

            //Send http request using the options defined above
            let req = http.request(options, function(response) {

                //When data 'chunk' arrives, append it to buffer variable
                response.on('data', function (chunk) {
                    buffer+=chunk;
                });

                //After response has ended
                response.on('end', function() {
                    let obj = JSON.parse(buffer);

                    let promise1 = new Promise(function(resolve, reject) {
                        resolve(robot.adapter.chatdriver.getDirectMessageRoomId(userName));
                    });

                    promise1.then(function(value) {
                        //If the message is a DM, reply directly to the user who send the DM
                        if (value.rid == res.message.user.roomID) {
                            robot.adapter.chatdriver.sendMessageByRoomId(obj.plainText, value.rid);
                        }
                        else { //If the message was sent in a channel, reply to the channel
                            res.reply(obj.plainText);
                        }
                    });
                });
            });

            //If there was an error with the request
            req.on('error', (e) => {
                res.reply("Problem with request: " + e.message);
            });

            //End the request
            req.end();
            
        }

        //If user input was flagged as an action
        if (isAction) {

            //Create new LexRuntime object with following information:
            let lexRunTime = new AWS.LexRuntime({
                apiVersion: '2016-11-28',
                region: 'us-east-1',
                endpoint: 'https://runtime.lex.us-east-1.amazonaws.com'
            });

            //Include the following parameters for Lex connection
            let params = {
                botAlias: 'FastChat',
                botName: 'FastChat',
                inputText: trueUserInput,
                userId: userName,
                sessionAttributes: {  //This is where you pass in the JSON input for Lambda
                    "dbHost": "DBHOST",
                    "dbUserName": "DBUSERNAME",
                    "dbPassword": "DBPASSWORD",
                    "dbName": "DBNAME"
                }
            };

            //Send the user input to Amazon Lex
            //See https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/LexRuntime.html
            lexRunTime.postText(params, function (err, data) {

                //Log the error if there is any
                if (err) {
                    robot.logger.info(err.stack)
                }
                else {   //Send the reply to the user

                    let conversationState = data.dialogState;

                    //If the user has entered invalid input 5 times, redirect the conversation to an agent
                    if (conversationState == "Failed" && data.slots.ExpenseName == null) {
                        //This is where you put the code for transferring the conversation to an agent
                        res.reply("I'm sorry, I'm unable to assist you at the moment. I'll transfer you over to an active agent for further help.");
                    }
                    else {

                        let promise1 = new Promise(function(resolve, reject) {
                            resolve(robot.adapter.chatdriver.getDirectMessageRoomId(userName));
                        });

                        promise1.then(function(value) {
                            //If the message is a DM
                           if (value.rid == res.message.user.roomID) {
                               robot.adapter.chatdriver.sendMessageByRoomId(data.message, value.rid);
                           }
                           else { //If the message was sent in a channel
                                res.reply(data.message);
                           }
                        });

                        //This line is for debugging purposes -> outputs all returned data to the console
                        robot.logger.info(data);
                    }
                }
            });
        }
    })
};


