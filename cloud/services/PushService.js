var generatePushToUser = function (user, title, alert, type) {
    //Set push query
    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.equalTo("user", user);

    var promise = new Parse.Promise();

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