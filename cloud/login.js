//var language = "en";
//var languages = ["en", "es", "ja", "kr", "pt-BR"];


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
    query.first().then(function (result) {
        var min = 1000;
        var max = 9999;
        var num = Math.floor(Math.random() * (max - min + 1)) + min;
        Parse.Config.get().then(function (config) {
            if (result) {
                result.setPassword(config.get("secretPasswordToken") + num);
                //			result.set("language", language);
                result.save().then(function () {
                    return sendCodeSms(phoneNumber, num, body);
                }).then(function () {
                    res.success("User " + phoneNumber + " exists.");
                }, function (err) {
                    res.error(err);
                });
            } else {
                var user = new Parse.User();
                user.setUsername(phoneNumber);
                user.setPassword(config.get("secretPasswordToken") + num);
                //			user.set("language", language);
                user.setACL({});
                user.save().then(function (a) {
                    return sendCodeSms(phoneNumber, num, body);
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

function sendCodeSms(phoneNumber, code, body) {
    var promise = new Parse.Promise();
    Parse.Config.get().then(function (config) {
        var twilio = require('twilio')(config.get("twilioAccountSid"), config.get("twilioAuthToken"));
        twilio.sendSms({
            to: '+' + phoneNumber.replace(/\D/g, ''),
            from: config.get("twilioPhoneNumber").replace(/\D/g, ''),
            body: body.replace(/{code}/, code) //TODO add a link, for example, verify.givenow.io and then catch it with an intent filter
        }, function (err, responseData) {
            if (err) {
                console.log(err);
                promise.reject(err.message);
            } else {
                promise.resolve();
            }
        });
    });

    return promise;
}

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