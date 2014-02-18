## What is this?
`shipit` is a node module that allows you to retrieve data from shipping carriers like UPS and FedEx in a common format. It interfaces with tracking APIs when available, and falls back to screen scraping. For carriers that expose tracking APIs, user is expected to acquire and provide credentials like license numbers, meter numbers, user IDs and passwords.

### Carriers supported
* UPS
* FedEx

## Usage

Add shipit to your `package.json` and then npm install it.
```
npm install shipit
```

Use it to initialize the shipper clients with your account credentials.
```coffeescript
{UpsClient, FedexClient} = require 'shipit'

ups = new UpsClient
  licenseNumber: '1C999A999B999999'
  userId: 'shipit-user'
  password: 'shhh-secret'

fedex = new FedexClient
  key: 'xyxyxyxyabababab'
  password: 'asdfawasfdasdfasdf1'
  account: '123456789'
  meter: '99999999'
```

Use an initialized client to request tracking data.
```coffeescript
ups.requestData {trackingNumber: '1Z1234567890123456'}, (err, result) ->
  console.log "[ERROR] error retrieving tracking data #{err}" if err?
  console.log "[DEBUG] new tracking data received #{JSON.stringify(result)}" if result?
```

Example response returned:
```
{
    "status": 2,
    "activities": [
        {
            "location": "Memphis, TN 38118",
            "timestamp": "2014-02-16T22:19:00.000Z",
            "details": "Departed FedEx location"
        },
        {
            "location": "East Hanover, NJ 07936",
            "timestamp": "2014-02-15T23:57:00.000Z",
            "details": "Left FedEx origin facility"
        },
        {
            "location": "East Hanover, NJ 07936",
            "timestamp": "2014-02-15T15:57:00.000Z",
            "details": "Picked up"
        }
    ],
    "weight": "0.2 LB",
    "service": "FedEx Priority Overnight",
    "eta": "2014-02-17T15:30:00.000Z",
    "destination": "US"
}
```

## Building
Just use grunt.
```
$ grunt
Running "coffee:compile" (coffee) task

Running "mochaTest:src" (mochaTest) task
 3   -_-__,------,
 0   -_-__|  /\_/\ 
 0   -_-_~|_( ^ .^) 
     -_-_ ""  "" 

  3 passing (11ms)


Done, without errors.
```

## Adding new shipping carriers
* Extend the common class `ShipperClient`
* Implement necessary methods
  - `generateRequest(trk, reference)`
  - `requestOptions({trk, reference})`
  - `validateResponse(response, cb)`

