//Setup Stripe
var Stripe = require('stripe');
Parse.Config.get().then(function(config) {
    Stripe.initialize(config.get("stripeInitializer"));
});

// Charge a new stripe card.  Create a stripe customer and save to the user
Parse.Cloud.define("stripe_charge", function(request, response) {
	var amount = request.params.amount;
	var stripeToken = request.params.token; // the token id should be sent from the client
	var name = request.params.user_name;

	Stripe.Customers.create({
	  card: stripeToken,
	  description: name
	}).then(function(customer) {
	  return Stripe.Charges.create({
	    amount: amount * 100, /// dollar amount expressed in cents
	    currency: "usd",
	    customer: customer.id
	  },{
		success: function(httpResponse) {
		  //save stripe customer id
		  response.success(customer.id);
		},
		error: function(httpResponse) {
		  response.error("Uh oh, something went wrong");
		}
	  });
	});
});

// Charge an existing Stripe customer.
Parse.Cloud.define("stripe_charge_customer", function(request, response) {
	var amount = request.params.amount;
	var stripeCustomer = request.params.stripeCustomer;

	Stripe.Charges.create({
	  amount: amount * 100, // dollar amount expressed in cents
	  currency: "usd",
	  customer: stripeCustomer
	},{
	  success: function(httpResponse) {
	    response.success("User donated $" + amount + "!");
	  },
	  error: function(httpResponse) {
	    response.error("Uh oh, something went wrong");
	  }
	});
});
