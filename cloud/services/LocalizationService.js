module.exports.getLocalization = function (key) {
    var Localization = Parse.Object.extend("Localization");
    var query = new Parse.Query(Localization);
    query.equalTo("key", key);
    return query.first();
};

module.exports.getLocalizations = function (keys) {
    var Localization = Parse.Object.extend("Localization");
    var query = new Parse.Query(Localization);
    query.containedIn("key", keys);
    return query.find();
};

module.exports.getMostRecentLangForUser = function (user) {
    //Return the language from the most recently used installation for this user.
    var installationQuery = new Parse.Query(Parse.Installation);
    installationQuery.equalTo("user", user);
    installationQuery.descending("updatedAt");
    return installationQuery.first().then(function (installation) {
        return installation.get("localeIdentifier");
    });
};

