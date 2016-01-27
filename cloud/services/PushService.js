var smsService = require("cloud/services/SmsService.js");

module.exports.sendSmsToUser = function (user, title, alert, type) {
    return smsService.sendSms(user.get("username"), title + ": " + alert + " - GiveNow")
};

module.exports.generatePushToUser = function (user, title, alert, type) {
    // If user has pushEnabled == false, send the user an SMS.
    if (user.get("pushEnabled") == false) {
        return module.exports.sendSmsToUser(user, title, alert, type);
    }

    // Otherwise, user has pushEnabled == true or undefined. Send a push.
    console.log("sending push to " + user.get("username"));
    var promise = new Parse.Promise();

    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.equalTo("user", user);

    //Send Push message
    Parse.Push.send({
        where: pushQuery,
        data: {
            "aps": {
                "content-available": 1
            },
            "data": {
                title: title,
                alert: alert,
                type: type
            }
        }
    }, {
        success: function () {
            promise.resolve();
        },
        error: function (error) {
            console.log(error);
            promise.reject(error.message);
        }
    });
    return promise;

};
