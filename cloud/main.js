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
            // Update the pickupRequest object with the pending volunteer.
            pickupRequest.set("pendingVolunteer", volunteer);

            donor.id = pickupRequest.get("donor").id;

            // Let the donor read the volunteer's user object, so that she can read the volunteer's name.
            var volACL = new Parse.ACL(volunteer);
            volACL.setReadAccess(donor.id, true);
            volunteer.setACL(volACL);
            Parse.Object.saveAll([pickupRequest, volunteer]).then(function () {
                var volunteerName = volunteer.get("name");

                // Send a push to the donor notifying them their pickup request has been claimed.
                generatePushToUser(donor,
                    {
                        "loc-key": "notif_pickup_request_claimed_title",
                        "loc-args": []
                    },
                    {
                        "loc-key": "notif_pickup_request_claimed_msg",
                        "loc-args": volunteerName ? [volunteerName] : [],
                        "action-loc-key": "rsp"
                    },
                    "claimPickupRequest").then(function () {
                    res.success("Request claimed. ACL of volunteer " + volunteer.id + " updated to allow read access for user " + donor.id + ". claimPickupRequest Push Notification sent to " + donor.id);
                }, function (err) {
                    res.error(err);
                });
            });
        });
    } else {
        res.error('Invalid parameters.');
    }
});


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
            donor.id = pickupRequest.get("donor").id;

            // Let the volunteer read the donor's user object, because she will need it to call/msg/etc the donor.
            var donorACL = new Parse.ACL(donor);
            donorACL.setReadAccess(volunteer.id, true);
            donor.setACL(donorACL);

            Parse.Object.saveAll([pickupRequest, volunteer]).then(function () {
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
    } else {
        res.error('Invalid parameters.');
    }
});

Parse.Cloud.define("pickupDonation", function (req, res) {
    if (req.params.pickupRequestId) {
        var volunteer = req.user;
        var donor = new Parse.User();
        var PickupRequest = Parse.Object.extend("PickupRequest");
        var query = new Parse.Query(PickupRequest);
        query.equalTo('objectId', req.params.pickupRequestId + "");
        query.first().then(function (pickupRequest) {
            donor.id = pickupRequest.get("donor").id;

            // Create new Donation object
            var Donation = Parse.Object.extend("Donation");
            var newDonation = new Donation();
            newDonation.set("donor", donor.id);
            newDonation.set("donationCategories", pickupRequest.get("donationCategories"));
            // Readable by the volunteer and donor
            var donationACL = new Parse.ACL();
            donationACL.setReadAccess(volunteer.id, true);
            donationACL.setReadAccess(donor.id, true);
            newDonation.setACL(donationACL);
            console.log("newDonationSet");

            newDonation.save().then(function (donation) {
                console.log("saving pickup request");

                pickupRequest.set("donation", donation.id);
                pickupRequest.save().then(function () {
                    var volunteerName = volunteer.get("name");
                    console.log("newPickupREquestSaved");

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
                        res.success("Request picked up. New donation object " + donation.id + "created. pickupDonation Push Notification sent to " + donor.id);
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