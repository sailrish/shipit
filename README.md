## Usage

Add shipit to your `package.json` and then npm install it.
`npm install shipit`

Use it to initialize the UPS and FedEx clients with your account credentials.
```coffeescript
{UpsClient, FedexClient} = require 'shipit'

ups = new UpsClient
  licenseNumber: '1C999A999B999999'
  userId: 'shipit-user'
  password: 'shhh-secret'

fedex = new FedexClient
  key: 'xyxyxyxyabababab'
  password: 'asdfawasfdasdfasdf1`
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

