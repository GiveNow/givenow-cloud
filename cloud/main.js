require("cloud/app.js");

require("cloud/login.js");

Parse.Cloud.define("claimPickupRequest", function (req, res) {
    if (req.params.pickupRequestId) {
        var volunteer = req.user;
        var donor = new Parse.User();
        var PickupRequest = Parse.Object.extend("PickupRequest");
        var query = new Parse.Query(PickupRequest);
        query.equalTo('objectId', req.params.pickupRequestId + "");
        query.first().then(function (pickupRequest) {
            pickupRequest.set("pendingVolunteer", volunteer);

            donor.id = pickupRequest.get("donor").id;
            //Let the donor read the volunteer's user object
            var volACL = new Parse.ACL(volunteer);
            volACL.setReadAccess(donor.id, true);
            volunteer.setACL(volACL);
            Parse.Object.saveAll([pickupRequest, volunteer]).then(function () {
                volunteerName = volunteer.get("name") || "A volunteer";
                generatePushToUser(donor,
                    {
                        "loc-key": "notif_volunteer_confirmed_title",
                        "loc-args": []
                    },
                    {
                        "loc-key": "notif_volunteer_confirmed_msg",
                        "loc-args": [volunteerName],
                        "action-loc-key": "rsp"
                    },
                    "confirmPendingVolunteer").then(function () {
                    res.success("Request claimed, ACL of volunteer " + volunteer.id + " updated to allow read access for user " + donor.id + ". confirmPendingVolunteer Push Notification sent to " + donor.id);
                }, function (err) {
                    res.error(err);
                });
            });
        });
    } else {
        res.error('Invalid parameters.');
    }
});


function generatePushToUser(user, title, alert, type) {
    //Set push query
    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.equalTo("user", user);

    var promise = new Parse.Promise();

    //Send Push message
    Parse.Push.send({
        where: pushQuery,
        data: {
            title: title,
            alert: alert,
            type: type
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

}