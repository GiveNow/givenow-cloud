require("cloud/app.js");

require("cloud/login.js");

require("cloud/services/PickupService.js");

Parse.Cloud.define("confirmVolunteer", function (req, res) {
    if (req.params.pickupRequestId) {
        var donor = req.user;
        var PickupRequest = Parse.Object.extend("PickupRequest");
        var query = new Parse.Query(PickupRequest);
        query.equalTo('objectId', req.params.pickupRequestId + "");
        query.equalTo('donor', donor);
        query.first().then(function (pickupRequest) {
            var volunteer = pickupRequest.get("pendingVolunteer");

            // Update the pickupRequest object with the confirmed volunteer.

            pickupRequest.set("confirmedVolunteer", volunteer);
            pickupRequest.save().then(function (pickupRequest) {
                // Let the volunteer read the donor's user object, because she will need it to call/msg/etc the donor.
                donor.setACL(addIdToACL(volunteer.id, donor.get("ACL")));

                donor.save().then(function (donor) {
                    var donorName = donor.get("name");
                    var address = pickupRequest.get("address");

                    // Send a push to the volunteer notifying them the donor confirmed them as a volunteer.
                    generatePushToUser(volunteer,
                        {
                            "loc-key": "notif_volunteer_confirmed_title",
                            "loc-args": []
                        },
                        donorName ? {
                            "loc-key": "notif_volunteer_confirmed_msg",
                            "loc-args": [donorName, address],
                            "action-loc-key": "rsp"
                        }
                            :
                        {
                            "loc-key": "notif_volunteer_confirmed_msg_no_name",
                            "loc-args": [address],
                            "action-loc-key": "rsp"
                        },
                        "confirmVolunteer").then(function () {
                        res.success("Volunteer confirmed. ACL of donor " + donor.id + " updated to allow read access for user " + volunteer.id + ". confirmVolunteer Push Notification sent to " + volunteer.id);
                    }, function (err) {
                        res.error(err);
                    });
                });
            });
        });
    } else {
        res.error('Invalid parameters.');
    }
});

var addIdToACL = function (id, acl) {
    console.log("add " + id + " to acl " + acl);
    acl.setReadAccess(id, true);
    return acl;
};

var removeIdFromACL = function (id, acl) {
    console.log("remove " + id + " from acl " + acl);
    acl.setReadAccess(id, false);
    return acl;
};

Parse.Cloud.define("pickupDonation", function (req, res) {
    if (req.params.pickupRequestId) {
        var volunteer = req.user;
        var donor = new Parse.User();
        var PickupRequest = Parse.Object.extend("PickupRequest");
        var query = new Parse.Query(PickupRequest);
        query.equalTo('objectId', req.params.pickupRequestId + "");
        query.first().then(function (pickupRequest) {
            donor = pickupRequest.get("donor");

            // Create new Donation object, readable by the volunteer and donor
            var Donation = Parse.Object.extend("Donation");
            var newDonation = new Donation();
            newDonation.set("donor", donor);
            newDonation.set("donationCategories", pickupRequest.get("donationCategories"));
            newDonation.setACL(addIdToACL(volunteer.id, addIdToACL(donor.id, new Parse.ACL())));
            console.log("newDonationSet");

            // Remove donor id from volunteer ACL
            volunteer.set("ACL", removeIdFromACL(donor.id, volunteer.get("ACL")));
            volunteer.save().then(function (volunteer) {
                newDonation.save().then(function (donation) {
                    // Stick the new Donation objecti nto the pickupRequest
                    pickupRequest.set("donation", donation);
                    pickupRequest.save().then(function () {
                        var volunteerName = volunteer.get("name");
                        console.log("newPickupRequestSaved");

                        // Send a push to the donor notifying them their pickup request has been picked up
                        generatePushToUser(donor,
                            {
                                "loc-key": "notif_pickup_complete_title",
                                "loc-args": []
                            },
                            {
                                "loc-key": "notif_pickup_complete_msg",
                                "loc-args": volunteerName ? [volunteerName] : [],
                                "action-loc-key": "rsp"
                            },
                            "pickupDonation").then(function () {
                            res.success("Request picked up. New donation object " + donation.id + " created. pickupDonation Push Notification sent to " + donor.id);
                        }, function (err) {
                            res.error(err);
                        });
                    });
                }, function (err) {
                    res.error(err)
                });
            });
        });
    } else {
        res.error('Invalid parameters.');
    }
});

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


function generatePushToUser(user, title, alert, type) {
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

}