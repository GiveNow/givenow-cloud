var smsService = require("cloud/services/SmsService.js");
var locService = require("cloud/services/LocalizationService.js");

module.exports.sendSmsToUser = function (user, title, alert) {
    return smsService.sendSms(user.get("username"), "GiveNow: " + title + " \n" + alert)
};

module.exports.sendPushToUser = function (user, titlekey, titleArgs, titleDefaultKey, alertkey, alertArgs, alertDefaultKey, type) {
    // Send a localized push or SMS.

    // We'll need access to attributes on the user object, so engage the master key and fetch the user.
    Parse.Cloud.useMasterKey();
    return user.fetch().then(function (user) {
        console.log("Decoding push " + titlekey + " / " + alertkey + " to " + user.get("username"));

        return locService.getLocalization(titlekey).then(function (locTitle) {
            return locService.getLocalization(alertkey).then(function (locAlert) {
                return locService.getLocalization(titleDefaultKey).then(function (locTitleDefault) {
                    return locService.getLocalization(alertDefaultKey).then(function (locAlertDefault) {
                        // If user has pushEnabled == false, send the user an SMS.
                        if (user.get("pushEnabled") == false) {
                            return locService.getLocalization("sms_signature").then(function (signature) {
                                // The SMS uses the language from the most recently used installation for this user.
                                return locService.getMostRecentLangForUser(user).then(function (lang) {
                                    lang = lang.replace("-", "");
                                    var titleDefault = locTitleDefault === undefined ? "" : locTitleDefault.get(lang);
                                    var alertDefault = locAlertDefault === undefined ? "" : locAlertDefault.get(lang);
                                    console.log("localertdefault:" + alertDefault);
                                    return module.exports.sendSmsToUser(
                                        user,
                                        formatArgs(locTitle.get(lang), titleArgs, titleDefault),
                                        formatArgs(locAlert.get(lang), alertArgs, alertDefault) + " \n" + signature.get(lang)
                                    );
                                });

                            });
                        } else {
                            // Otherwise, user has pushEnabled == true or undefined. Send a push.
                            return sendLocalizedPush(user, locTitle, titleArgs, locTitleDefault, locAlert, alertArgs, locAlertDefault);
                        }
                    });
                });
            });
        });
    });
};


var sendLocalizedPush = function (user, locTitle, titleArgs, locTitleDefault, locAlert, alertArgs, locAlertDefault) {
    var englishQuery = new Parse.Query(Parse.Installation);
    englishQuery.equalTo("user", user);
    englishQuery.equalTo("localeIdentifier", "en-US");

    var germanQuery = new Parse.Query(Parse.Installation);
    germanQuery.equalTo("user", user);
    germanQuery.equalTo("localeIdentifier", "de-DE");

    // Pushes use the language set for each installation.
    // So, for German installations, push in German. For English ones, push in English.
    return sendPush(
        englishQuery,
        formatArgs(locTitle.get("enUS"), titleArgs, locTitleDefault ? locTitleDefault.get("enUS") : ""),
        formatArgs(locAlert.get("enUS"), alertArgs, locAlertDefault ? locAlertDefault.get("enUS") : "")
    ).then(function () {
        return sendPush(
            germanQuery,
            formatArgs(locTitle.get("deDE"), titleArgs, locTitleDefault ? locTitleDefault.get("deDE") : ""),
            formatArgs(locAlert.get("deDE"), alertArgs, locAlertDefault ? locAlertDefault.get("deDE") : ""));
    });
};

// Format a string containing "{0} is an example of a {1} formatted string." [ "This", "nice"]
// = "This is an example of a nice formatted string."
// If the argument list is empty, the defaultArg provided is inserted.
var formatArgs = function (formatstring, stringArgs, defaultArg) {
    var string = formatstring;
    if (stringArgs.length == 0) {
        string = string.replace("{0}", defaultArg);
    } else {
        for (var i = 0; i < stringArgs.length; i++) {
            string = string.replace("{" + i + "}", stringArgs[i]);
            console.log(i);
            console.log(string);
            console.log(stringArgs);
        }
    }
    return string;
};

var sendPush = function (pushQuery, title, alert, type) {
    var promise = new Parse.Promise();
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