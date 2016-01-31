require("cloud/app.js");

require("cloud/login.js");

require("cloud/services/PickupService.js");


//TODO remove these from this file
var removeIdFromACL = function (id, acl) {
    console.log("remove " + id + " from acl " + acl);
    acl.setReadAccess(id, false);
    return acl;
};

Parse.Cloud.define("markComplete", function (req, res) {
    if (req.params.pickupRequestId) {
        var donor = req.user;
        var PickupRequest = Parse.Object.extend("PickupRequest");
        var query = new Parse.Query(PickupRequest);
        query.equalTo('objectId', req.params.pickupRequestId + "");
        query.equalTo('donor', donor);
        query.first().then(function (pickupRequest) {

            // Mark the pickupRequest object as complete. Currently, by setting it to inactive.
            pickupRequest.set("isActive", false);
            pickupRequest.save().then(function () {
                var volunteer = pickupRequest.get("confirmedVolunteer");

                // Remove volunteer id from donor ACL
                console.log("donor id " + donor.id);
                donor.set("ACL", removeIdFromACL(volunteer.id, donor.get("ACL")));

                donor.save().then(function () {
                    res.success("Pickup request " + pickupRequest.id + " marked complete.");
                }, function (err) {
                    res.error(err);
                });
                });
            });
    }
    else {
        res.error('Invalid parameters.');
    }
    }
);


//function sendPushToUser(user, title, alert, type) {
//    //Set push query
//    var pushQuery = new Parse.Query(Parse.Installation);
//    pushQuery.equalTo("user", user);
//    var promise = new Parse.Promise();
//
//    //Send Push message
//    Parse.Push.send({
//        where: pushQuery,
//        data: {
//            "aps": {
//                "content-available": 1
//            },
//            "data": {
//                title: title,
//                alert: alert,
//                type: type
//            }
//        }
//    }, {
//        success: function () {
//            promise.resolve();
//        },
//        error: function (error) {
//            console.log(error);
//            promise.reject(error.message);
//        }
//    });
//    return promise;
//
//}