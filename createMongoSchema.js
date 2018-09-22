//You need to have the mongodb node module installed for this to work
let mongo = require('mongodb');
let assert = require('assert');

function updateMongoSchema(database, query, newValues, collectionName) {
    database.collection(collectionName).updateOne(query, newValues, function (err, result) {
        if (err) {
            throw err;
        }
        else {
            console.log("Document updated successfully!");
        }
    })
}

//Note: for this function to work, the database that you are trying to copy from must already exist
//mongoURL = url of the mongo database to connect to (EX: mongodb://52.90.136.88:27017/rocketchat)
//companyName = the name of the company for which the mongo database is being created
//copyFrom = name of the database to copy (usually "rocketchatTemplate")
//scdp = SAML_Custom_Default_provider -> this parameter changes the location of the SAML metadata file, usually an arbitrary value such as "chat"
//scdep = SAML_Custom_Default_entry_point -> the url provided by the IDP for logging in
//scdisru = SAML_Custom_Default_idp_slo_redirect_url -> the url provided by the idp for logging out
//hostedZone = The DNS name of an EXISTING Amazon Route 53 hosted zone (Ex: myintranetapps.com)

//For more information on SAML parameters, see https://rocket.chat/docs/administrator-guides/authentication/saml/
function createMongoSchema(mongoURL, companyName, copyFrom, scdp, scdep, scdisru, hostedZone, region) {
    let mongoClient = mongo.MongoClient;

    //Connect to the mongo database -> if successful, this returns a client
    mongoClient.connect(mongoURL, function (err, client) {
        if (err) {  //If the connection was not successful
            throw err;
        }
        else { //If the database connection was successful

            //Get the database which needs to be copied
            let db = client.db(copyFrom);

            let mongoCommand = {
                copydb: 1,
                fromdb: copyFrom,
                todb: companyName
            };

            //Need to run the copy command as admin
            let admin = db.admin();

            admin.command(mongoCommand, function (commandErr, data) {
                if (commandErr) {  //If there was an error while copying the database
                    throw commandErr;
                }
                else { //if database copying was successful

                    //set the siteURL and the SAML customIssuer using parameters provided by user
                    let siteURL = "https://chat-" + companyName.toString().toLowerCase() + "." + hostedZone.toString().toLowerCase();
                    let customIssuer = siteURL + "/_saml/metadata/" + scdp;
                    let s3BucketURL = "https://s3.amazonaws.com/rocketchat-" + companyName.toString().toLowerCase();
                    let bucketName = "rocketchat-" + companyName.toString().toLowerCase();

                    //make a variable for the new database
                    const newDB = client.db(companyName);

                    updateMongoSchema(newDB, {_id: "SAML_Custom_Default"}, {$set: {value: true}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "SAML_Custom_Default_provider"}, {$set: {value: scdp}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "SAML_Custom_Default_entry_point"}, {$set: {value: scdep}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "SAML_Custom_Default_idp_slo_redirect_url"}, {$set: {value: scdisru}}, "rocketchat_settings");

                    updateMongoSchema(newDB, {_id: "SAML_Custom_Default_issuer"}, {$set: {value: customIssuer}}, "rocketchat_settings");

                    updateMongoSchema(newDB, {_id: "Site_Url"}, {$set: {value: siteURL}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "Show_Setup_Wizard"}, {$set: {value: "completed"}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "SAML_Custom_Default_button_label_text"}, {$set: {value: "SAML LOGIN"}}, "rocketchat_settings");

                    updateMongoSchema(newDB, {_id: "FileUpload_Storage_Type"}, {$set: {value: "AmazonS3"}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "FileUpload_S3_Bucket"}, {$set: {value: bucketName}}, "rocketchat_settings");

                    updateMongoSchema(newDB, {_id: "FileUpload_S3_BucketURL"}, {$set: {value: s3BucketURL}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "FileUpload_S3_Acl"}, {$set: {value: "authenticated-read"}}, "rocketchat_settings");
                    updateMongoSchema(newDB, {_id: "FileUpload_S3_Region"}, {$set: {value: region}}, "rocketchat_settings");

                    client.close();
                }
            });
        }
    });
}

//let mongoURL = "mongodb://18.222.252.165:27017/rocketchatTemplate";
//let companyName = "demo";
let mongoURL = "mongodb://52.90.136.88:27017/rocketchatTemplate";
let companyName = "companyKrispies";
let copyFrom = "rocketchatTemplate";
let scdp = "chat";

//let scdep = "https://idp-demo.myintranetapps.com/saml/saml2/idp/SSOService.php";
//let scdisru = "https://idp-demo.myintranetapps.com/saml/saml2/idp/SingleLogoutService.php";
//let hostedZone = "myintranetapps.com";

let scdep = "http://34.229.175.48/simplesaml/saml2/idp/SSOService.php";
let scdisru = "http://34.229.175.48/simplesaml/saml2/idp/SingleLogoutService.php";
let hostedZone = "aboutus123.com";

let region = "us-east-1"; // for S3


createMongoSchema(mongoURL, companyName, copyFrom, scdp, scdep, scdisru, hostedZone, region);