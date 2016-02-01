var pushService = require("cloud/services/PushService.js");

Parse.Cloud.define("claimPickupRequest", function (request, response) {
    if (!request.params.pickupRequestId) {
        return response.error('Invalid parameters.');
    }
    var volunteer = request.user;
    var pickupRequestId = request.params.pickupRequestId;

    claimPickup(pickupRequestId, volunteer).then(function (result) {
        response.success(result);
    }, function (error) {
        response.error(error);
    });
});

Parse.Cloud.define("confirmVolunteer", function (request, response) {
    if (!request.params.pickupRequestId) {
        return response.error('Invalid parameters.');
    }
    var donor = request.user;
    var pickupRequestId = request.params.pickupRequestId;

    confirmVolunteer(pickupRequestId, donor).then(function (result) {
        response.success(result);
    }, function (error) {
        response.error(error);
    });
});

Parse.Cloud.define("pickupDonation", function (request, response) {
    if (!request.params.pickupRequestId) {
        return response.error('Invalid parameters.');
    }
    var volunteer = request.user;
    var pickupRequestId = request.params.pickupRequestId;

    pickupDonation(pickupRequestId, volunteer).then(function (result) {
        response.success(result);
    }, function (error) {
        response.error(error);
    });
});


Parse.Cloud.define("markComplete", function (request, response) {
    if (!request.params.pickupRequestId) {
        return response.error('Invalid parameters.');
    }
    var donor = request.user;
    markComplete(request.params.pickupRequestId, donor).then(function (result) {
        response.success(result);
    }, function (error) {
        response.error(error);
    });
});

//var handleError = function (promise) {
//    return function (error) {
//        console.log("error: " + error);
//        promise.reject();
//    };
//};

var claimPickup = function (pickupRequestId, volunteer) {
    var promise = new Parse.Promise();
    //var handleError = handleError(promise);

    var donor;
    var pickupRequest;

    getPickupRequest(pickupRequestId).then(function (pickup) {
        pickupRequest = pickup;
        donor = pickupRequest.get("donor");
        return setPendingVolunteer(pickupRequest, volunteer)
    }).then(function () {
        return letDonorReadVolunteer(volunteer, donor)
    }).then(function () {
        return notifyDonorPickupClaimed(volunteer, donor)
    }).then(function () {
        promise.resolve("Request claimed. ACL of volunteer " + volunteer.id + " updated to allow read access for user " + donor.id + ". claimPickupRequest Push Notification sent to " + donor.id);
    }, function (err) {
        promise.reject(err);
    });

    return promise;
};

var confirmVolunteer = function (pickupRequestId, donor) {
    var promise = new Parse.Promise();

    var volunteer;
    var pickupRequest;

    getPickupRequest(pickupRequestId).then(function (pickup) {
        pickupRequest = pickup;
        volunteer = pickupRequest.get("pendingVolunteer");
        return setConfirmedVolunteer(pickupRequest, volunteer)
    }).then(function () {
        return letVolunteerReadDonor(donor, volunteer);
    }).then(function (donor) {
        return notifyVolunteerTheyAreConfirmed(pickupRequest, volunteer, donor)
    }).then(function () {
        promise.resolve("Volunteer confirmed. ACL of donor " + donor.id + " updated to allow read access for user " + volunteer.id + ". confirmVolunteer Push Notification sent to " + volunteer.id);
    }, function (err) {
        promise.reject(err);
    });

    return promise;
};

var pickupDonation = function (pickupRequestId, volunteer) {
    var promise = new Parse.Promise();
    var donor;
    var pickupRequest;
    var newDonation;

    getPickupRequest(pickupRequestId).then(function (pickup) {
        pickupRequest = pickup;
        donor = pickupRequest.get("donor");
        newDonation = createDonationObject(pickupRequest, donor, volunteer);
        return dontLetDonorReadVolunteer(volunteer, donor)
    }).then(function () {
        return newDonation.save()
    }).then(function (donation) {
        return setDonation(pickupRequest, donation);
    }).then(function () {
        return notifyDonorPickupComplete(volunteer, donor);
    }).then(function () {
        promise.resolve("Request picked up. New donation object " + newDonation.id + " created. pickupDonation Push Notification sent to " + donor.id);
    }, function (err) {
        promise.reject(err);
    });

    return promise;
};

var markComplete = function (pickupRequestId, donor) {
    var promise = new Parse.Promise();

    getPickupRequest(pickupRequestId).then(function (pickupRequest) {
        return markPickupRequestComplete(pickupRequest);
    }).then(function (pickupRequest) {
        var volunteer = pickupRequest.get("confirmedVolunteer");

        return dontLetVolunteerReadDonor(volunteer, donor);
    }).then(function () {
        promise.resolve("Pickup request " + pickupRequestId + " marked complete.");
    }, function (err) {
        promise.reject(err);
    });

    return promise;
};

var getPickupRequest = function (pickupRequestId) {
    var PickupRequest = Parse.Object.extend("PickupRequest");
    var query = new Parse.Query(PickupRequest);
    query.equalTo('objectId', pickupRequestId + "");
    return query.first();
};

var setPendingVolunteer = function (pickupRequest, volunteer) {
    pickupRequest.set("pendingVolunteer", volunteer);
    return pickupRequest.save();
};

var setConfirmedVolunteer = function (pickupRequest, volunteer) {
    // Update the pickupRequest object with the confirmed volunteer.
    pickupRequest.set("confirmedVolunteer", volunteer);
    return pickupRequest.save();
};

var createDonationObject = function (pickupRequest, donor, volunteer) {
    // Create new Donation object, readable by the volunteer and donor
    var Donation = Parse.Object.extend("Donation");
    var newDonation = new Donation();
    newDonation.set("donor", donor);
    newDonation.set("donationCategories", pickupRequest.get("donationCategories"));
    newDonation.setACL(addIdToACL(volunteer.id, addIdToACL(donor.id, new Parse.ACL())));
    console.log("newDonationSet");
    return newDonation;
};

var setDonation = function (pickupRequest, donation) {
    // Stick the new Donation object into the pickupRequest
    pickupRequest.set("donation", donation);
    return pickupRequest.save();
};


var markPickupRequestComplete = function (pickupRequest) {
    // Mark the pickupRequest object as complete. Currently, by setting it to inactive.
    pickupRequest.set("isActive", false);
    return pickupRequest.save();
};
var letDonorReadVolunteer = function (volunteer, donor) {
    // Let the donor read the volunteer's user object, so that she can read the volunteer's name.
    volunteer.setACL(addIdToACL(donor.id, volunteer.get("ACL")));
    return volunteer.save();
};

var letVolunteerReadDonor = function (donor, volunteer) {
    // Let the volunteer read the donor's user object, because she will need it to call/msg/etc the donor.
    donor.setACL(addIdToACL(volunteer.id, donor.get("ACL")));
    return donor.save();
};

var dontLetDonorReadVolunteer = function (volunteer, donor) {
    // Remove donor id from volunteer ACL
    volunteer.set("ACL", removeIdFromACL(donor.id, volunteer.get("ACL")));
    return volunteer.save();
};

var dontLetVolunteerReadDonor = function (volunteer, donor) {
    // Remove volunteer id from donor ACL
    donor.set("ACL", removeIdFromACL(volunteer.id, donor.get("ACL")));
    return donor.save();
};

var notifyDonorPickupClaimed = function (volunteer, donor) {
    // Send a push to the donor notifying them their pickup request has been claimed.
    var volunteerName = volunteer.get("name");

    return pushService.sendPushToUser(donor,
        "notif_pickup_request_claimed_title",
        [],
        "",
        "notif_pickup_request_claimed_msg",
        volunteerName ? [volunteerName] : [],
        "default_volunteer_name",
        "claimPickupRequest");
};

var notifyVolunteerTheyAreConfirmed = function (pickupRequest, volunteer, donor) {
    // Send a push to the volunteer notifying them the donor confirmed them as a volunteer.
    var donorName = donor.get("name");
    var address = pickupRequest.get("address");

    return pushService.sendPushToUser(volunteer,
        "notif_volunteer_confirmed_title",
        [],
        "",
        donorName ? "notif_volunteer_confirmed_msg" : "notif_volunteer_confirmed_msg_no_name",
        donorName ? [donorName, address] : [address],
        "",
        "confirmVolunteer");
};


var notifyDonorPickupComplete = function (volunteer, donor) {
    var volunteerName = volunteer.get("name");
    console.log("newPickupRequestSaved");

    // Send a push to the donor notifying them their pickup request has been picked up
    return pushService.sendPushToUser(donor,
        "notif_pickup_complete_title",
        [],
        "",
        "notif_pickup_complete_msg",
        volunteerName ? [volunteerName] : [],
        "default_volunteer_name",
        "pickupDonation");
};

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
