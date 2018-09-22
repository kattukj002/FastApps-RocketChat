
let AWS = require("aws-sdk");

//Whenever this function is called, a new RocketChat instance will be set up

//PARAMETER DESCRIPTIONS:
//stackName -> the name of the CloudFormation Stack to be created. This name should be descriptive, and should contain the company name
//companyName -> the name of the company for which the RocketChat server is being created
//mongoURL -> the URL of the mongo database that RocketChat will use to store data.
//            this URL should be of the following form:  mongodb://1.2.3.4:27017/databasename
//            NOTE: the port number is always 27017 for MongoDB
//            NOTE: "databasename" is the name of the database that RocketChat will connect to.
//                  this database should already be set up using the "createMongoSchema" function
//accessKeyId -> the accessKeyId of the AWS account that is being used to create the server, the DNS record and the S3 bucket for file storage
//secretAccessKey -> the secret access key of the AWS account that is being used to create the server, the DNS record and the S3 bucket
//chatAccessKeyId -> the accessKeyId of the AWS account used by the bot to communicate with AWS Lex
//chatSecretAccessKey -> the secret access key of the AWS account used by the bot to communicate with AWS Lex
//hostedZone -> The DNS name of an EXISTING Amazon Route 53 hosted zone (Ex: myapps.com)
//hubotScripS3URL -> the URL of the location of the Hubot script in Amazon S3
//         the URL should be of the following form: https://{bucket-name}.s3.amazonaws.com/{path-to-script}
//         this script defines how Hubot responds to messages from RocketChat
//         NOTE: THE SCRIPT AND THE BUCKET MUST BE MADE PUBLIC IN S3 FOR THIS TO WORK!!!!!!!!!
//keyName -> The name of the already existing Key Pair in AWS. This Key Pair can be used to log into the newly created EC2 instance
//securityGroup -> the name of the security group (must already exist in AWS account) for the newly created EC2 instance
//templateURL -> the URL of the CloudFormation Template used to make the CloudFormation Stack. This template will be stored on S3
//               so the S3 URL of the template must be provided in this parameter
//apacheConfigURL -> the URL of the Apache SSL configuration file in S3. This file, along with the bucket it is located within, MUST be made public for this to work
//region -> the AWS region to be used when creating resources (Ex: us-east-1)
//companyDBHost, companyDBUserName, companyDBPassword, companyDBName -> the host name, user name, password, and database name of the company database
//botPassword -> the password used by the bot to log in to the RocketChat server. NOTE: this value CANNOT be changed without first changing the value in the Mongo database

function createRocketChatServer(rocketChatParams) {

    let cloudFormation = new AWS.CloudFormation({
        apiVersion: '2010-05-15',
        region: rocketChatParams.region,
        endpoint: "https://cloudformation." + rocketChatParams.region + ".amazonaws.com",
        accessKeyId: rocketChatParams.accessKeyId,
        secretAccessKey: rocketChatParams.secretAccessKey
    });

    //Got this from this site:    https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateStack.html
    let params = {
        StackName: rocketChatParams.stackName, /* required */
        DisableRollback: true,
        EnableTerminationProtection: false,
        TemplateURL: rocketChatParams.templateURL,
        Parameters: [
            {
                ParameterKey: 'KeyName',
                ParameterValue: rocketChatParams.keyName
            },
            {
               ParameterKey: 'CompanyName',
               ParameterValue: rocketChatParams.companyName
            },
            {
                ParameterKey: 'HostedZone',
                ParameterValue: rocketChatParams.hostedZone
            },
            {
                ParameterKey: "MongoURL",
                ParameterValue: rocketChatParams.mongoURL
            },
            {
                ParameterKey: "hubotScriptS3URL",
                ParameterValue: rocketChatParams.hubotScriptS3URL
            },
            {
                ParameterKey: "SecurityGroup",
                ParameterValue: rocketChatParams.securityGroup
            },
            {
                ParameterKey: "BaseURL",
                ParameterValue: "chat-" + rocketChatParams.companyName.toString().toLowerCase() + "." + rocketChatParams.hostedZone
            },
            {
                ParameterKey: "ApacheConfigURL",
                ParameterValue: rocketChatParams.apacheConfigURL
            },
            {
                ParameterKey: "bucketName",
                ParameterValue: "rocketchat-" + rocketChatParams.companyName.toString().toLowerCase()
            },
            {
                ParameterKey: "fullRocketChatURL",
                ParameterValue: "https://chat-" + rocketChatParams.companyName.toString().toLowerCase() + "." + rocketChatParams.hostedZone
            },
            {
                ParameterKey: "Region",
                ParameterValue: rocketChatParams.region
            },
            {
                ParameterKey: "companyDBHost",
                ParameterValue: rocketChatParams.companyDBHost
            },
            {
                ParameterKey: "companyDBUserName",
                ParameterValue: rocketChatParams.companyDBUserName
            },
            {
                ParameterKey: "companyDBPassword",
                ParameterValue: rocketChatParams.companyDBPassword
            },
            {
                ParameterKey: "companyDBName",
                ParameterValue: rocketChatParams.companyDBName
            },
            {
                ParameterKey: "botPassword",
                ParameterValue: rocketChatParams.botPassword
            },
            {
                ParameterKey: "javaHostName",
                ParameterValue: rocketChatParams.javaHostName
            },
            {
                ParameterKey: "javaPort",
                ParameterValue: rocketChatParams.javaPort
            },
            {
                ParameterKey: "roleName",
                ParameterValue: rocketChatParams.roleName
            }
        ]
    };

    //Create the cloudformation stack using the specified parameters
    cloudFormation.createStack(params, function(err, stackData) {
        if (err) {  //If there is an error, log the error
            console.log(err, err.stack);
        }
        else { //If the stack is successfully created

            console.log("Server creation initiated:");

            //console.log("This is the stack id: " + stackData.StackId);
            let stackId = stackData.StackId;

            //Parameters for the wait function below
            const waitParams = {
              StackName: stackId
            };

            //This function waits for the stack to be created
            cloudFormation.waitFor('stackCreateComplete', waitParams, function(err, waitData) {
                if (err) { //If there is an error while waiting for stack creation
                    console.log(err);
                }
                else { //If stack was successfully created
                    console.log("Stack Creation Complete!");
                }
            });
        }
    });
}

let rocketchatParameters = {
    stackName: "",
    companyName: "",
    mongoURL: "",

    accessKeyId: "",
    secretAccessKey: "",

    hostedZone: "",
    hubotScriptS3URL: "",
    keyName: "",
    securityGroup: "",
    templateURL: "",
    apacheConfigURL: "",
    region: "",
    companyDBHost: "",
    companyDBUserName: "",
    companyDBPassword: "",
    companyDBName: "",
    botPassword: "", //This value cannot be changed without a corresponding change to the Mongo database first!
    javaHostName: "",
    javaPort: "",
    roleName: ""
};


createRocketChatServer(rocketchatParameters);