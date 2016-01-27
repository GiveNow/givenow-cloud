module.exports.sendCodeSms = function (phoneNumber, code, body) {
    return module.exports.sendSms(phoneNumber, body.replace(/{code}/, code)); //TODO add a link, for example, verify.givenow.io and then catch it with an intent filter
};

module.exports.sendSms = function (phoneNumber, body) {
    var promise = new Parse.Promise();
    Parse.Config.get().then(function (config) {
        var twilio = require('twilio')(config.get("twilioAccountSid"), config.get("twilioAuthToken"));
        twilio.sendSms({
            to: '+' + phoneNumber.replace(/\D/g, ''),
            from: config.get("twilioPhoneNumber").replace(/\D/g, ''),
            body: body
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
};