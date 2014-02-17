(function() {
  var FedexClient, UpsClient;

  UpsClient = require('./ups').UpsClient;

  FedexClient = require('./fedex').FedexClient;

  module.exports = {
    UpsClient: UpsClient,
    FedexClient: FedexClient
  };

}).call(this);
