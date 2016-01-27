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

//var handleError = function (promise) {
//    return function (error) {
//        console.log("error: " + error);
//        promise.reject();
//    };
//};

var claimPickup = function (pickupRequestId, volunteer) {
    var promise = new Parse.Promise();
    //var handleError = handleError(promise);

    var donor = new Parse.User();
    var pickupRequest;

    getPickupRequest(pickupRequestId).then(function (pickup) {
        pickupRequest = pickup;
        return pickupRequest.get("donor").fetch();
    }).then(function (fetchedDonor) {
        donor = fetchedDonor;
        return setPickupVolunteer(pickupRequest, volunteer, donor)
    }).then(function () {
        return setDonorPermissions(volunteer, donor)
    }).then(function () {
        return savePickupAndVolunteer(pickupRequest, volunteer)
    }).then(function () {
        return notifyDonorPickupClaimed(volunteer, donor)
    }).then(function () {
        promise.resolve("Request claimed. ACL of volunteer " + volunteer.id + " updated to allow read access for user " + donor.id + ". claimPickupRequest Push Notification sent to " + donor.id);
    }, function (err) {
        promise.reject(err);
    });

    return promise;
};

var getPickupRequest = function (pickupRequestId) {
    var PickupRequest = Parse.Object.extend("PickupRequest");
    var query = new Parse.Query(PickupRequest);
    query.equalTo('objectId', pickupRequestId + "");

    return query.first()
};

var setPickupVolunteer = function (pickupRequest, volunteer, donor) {
    pickupRequest.set("pendingVolunteer", volunteer);

    return Parse.Promise.as(donor.id);
};

var setDonorPermissions = function (volunteer, donor) {
    var promise = new Parse.Promise();
    // Let the donor read the volunteer's user object, so that she can read the volunteer's name.
    var volACL = new Parse.ACL(volunteer);
    volACL.setReadAccess(donor.id, true);
    volunteer.setACL(volACL);
    return promise.resolve();
};

var savePickupAndVolunteer = function (pickupRequest, volunteer) {
    return Parse.Object.saveAll([pickupRequest, volunteer]);
};

var notifyDonorPickupClaimed = function (volunteer, donor) {
    var volunteerName = volunteer.get("name");
    // Send a push to the donor notifying them their pickup request has been claimed.
    return pushService.generatePushToUser(donor,
        {
            "loc-key": "notif_pickup_request_claimed_title",
            "loc-args": []
        },
        {
            "loc-key": "notif_pickup_request_claimed_msg",
            "loc-args": volunteerName ? [volunteerName] : [],
            "action-loc-key": "rsp"
        },
        "claimPickupRequest");
};

