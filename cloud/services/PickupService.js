
Parse.Cloud.define("claimPickupRequest", function (request, response) {
  claimPickup().then(function(result) {
    response.success(result);
  }, function(error) {
    response.error(error);
  });

let handleError = function(promise) {
  var fn = function(error) {
    console.log("error: " + error);
    promise.reject();
  }

  return fn;
};

let claimPickup = function() {
  var promise = new Parse.Promise();
  var handleError = handleError(promise);

  if (!req.params.pickupRequestId) {
    return promise.reject('Invalid parameters.');
  }

  var volunteer = req.user;
  var donor = new Parse.User();
  var pickupRequest;

  return getPickupRequest().then( function(pickup) {
    pickupRequest = pickup
    return setPickupVolunteer(pickupRequest, volunteer)
  }).then( function() {
    return setDonorPermissions(pickupRequest, volunteer)
  }).then( function() {
    return sendPushToDonor()
  }).then(function () {
      promise.resolve("Request claimed. ACL of volunteer " + volunteer.id + " updated to allow read access for user " + donor.id + ". claimPickupRequest Push Notification sent to " + donor.id);
  }, function (err) {
      promise.reject(err);
  });

  return promise;
};

let getPickupRequest = function() {
  var PickupRequest = Parse.Object.extend("PickupRequest");
  var query = new Parse.Query(PickupRequest);
  query.equalTo('objectId', req.params.pickupRequestId + "");

  return query.first()
};

let setPickupVolunteer = function(pickupRequest, volunteer) {
  pickupRequest.set("pendingVolunteer", volunteer);

  var promise = new Parse.Promise().as(donor.id);
  return promise;
};

let setDonorPermissions = function(pickupRequest, volunteer) {
  var promise = new Parse.Promise();
  // Let the donor read the volunteer's user object, so that she can read the volunteer's name.
  var volACL = new Parse.ACL(volunteer);
  var donor.id = pickupRequest.get("donor").id;

  volACL.setReadAccess(donor.id, true);
  volunteer.setACL(volACL);
  return promise.resolve();
};

let savePickupAndVolunteer = function(pickupRequest, volunteer){
  Parse.Object.saveAll([pickupRequest, volunteer]);
};

let notifyDonorPickupClaimed = function(pickupRequest, volunteer) {
  var donor.id = pickupRequest.get("donor").id;
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
    "claimPickupRequest");
};

