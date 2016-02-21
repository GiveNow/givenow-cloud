//var language = "en";
//var languages = ["en", "es", "ja", "kr", "pt-BR"];
var smsService = require("cloud/services/SmsService.js");

//Magic phone number and login. For use for demo purposes.
// +91 91919 19191
const MAGIC_PHONE_NUMBER = "919191919191";
const MAGIC_CODE = "9191";

Parse.Cloud.define("sendCode", function (req, res) {
    var phoneNumber = req.params.phoneNumber;
    phoneNumber = phoneNumber.replace(/\D/g, '');

    var body = req.params.body;
//	var lang = req.params.language;
//  if(lang !== undefined && languages.indexOf(lang) != -1) {
//		language = lang;
//	}

    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.User);
    query.equalTo('username', phoneNumber + "");
    query.first().then(function (existingUser) {
        var min = 1000;
        var max = 9999;
        var code = Math.floor(Math.random() * (max - min + 1)) + min;

        if (phoneNumber == MAGIC_PHONE_NUMBER) {
            code = MAGIC_CODE;
        }
        Parse.Config.get().then(function (config) {
            var password = config.get("secretPasswordToken") + code;
            if (existingUser) {
                existingUser.setPassword(password);
                existingUser.save().then(function () {
                    return smsService.sendCodeSms(phoneNumber, code, body);
                }).then(function () {
                    res.success("User " + phoneNumber + " exists.");
                }, function (err) {
                    res.error(err);
                });
            } else {
                createUser(phoneNumber, password).then(function (newUser) {
                        return smsService.sendCodeSms(phoneNumber, code, body);
                    }).then(function () {
                    res.success("Created new user " + phoneNumber);
                }, function (err) {
                    res.error(err);
                });
            }
        });
    }, function (err) {
        res.error(err);
    });
});

var createUser = function (phoneNumber, password) {
    var user = new Parse.User();
    user.setUsername(phoneNumber);
    user.setPassword(password);
    user.setACL({});
    return user.save();
};

Parse.Cloud.define("logIn", function (req, res) {
    Parse.Cloud.useMasterKey();

    var phoneNumber = req.params.phoneNumber;
    phoneNumber = phoneNumber.replace(/\D/g, '');

    if (phoneNumber && req.params.codeEntry) {
        Parse.Config.get().then(function (config) {
            Parse.User.logIn(phoneNumber, config.get("secretPasswordToken") + req.params.codeEntry).then(function (user) {
                res.success(user.getSessionToken());
            }, function (err) {
                res.error(err);
            });
        });
    } else {
        res.error('Invalid parameters.');
    }
});