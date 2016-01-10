require("cloud/app.js");

require("cloud/login.js")

Parse.Cloud.define("claimPickupRequest", function(req, res) {
	if (req.params.pickupRequestId) {
        var volunteer = req.user;
        var donor = new Parse.User();

        var PickupRequest = Parse.Object.extend("PickupRequest");
        var query = new Parse.Query(PickupRequest);
        query.equalTo('objectId', req.params.pickupRequestId +"");
        query.first().then(function(pickupRequest) {
            if (pickupRequest) {
        			pickupRequest.set("pendingVolunteer", volunteer);

        			donor.id = pickupRequest.get("donor").id;
                    //Let the donor read the volunteer's user object
                    var volACL = new Parse.ACL(volunteer);
                    volACL.setReadAccess(donor.id,true);
                    volunteer.setACL(volACL);
                    Parse.Object.saveAll([pickupRequest, volunteer]).then(function() {
                        res.success("Request claimed, ACL of volunteer "+ volunteer.id +" updated to allow read access for user "+ donor.id);
                    }, function(err) {
                        res.error(err);
                    });
            } else {
                res.error("No result for query for pickupRequest with id "+ req.params.pickupRequestId);
            }
        }, function (err) {
            res.error(err);
        });
    } else {
		res.error('Invalid parameters.');
	}
});
