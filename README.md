## What is this?
### Shipping APIs Adapter
`shipit` is a node module that allows you to retrieve data from shipping carriers like UPS and FedEx in a common format. It interfaces with tracking APIs when available, and falls back to screen scraping. For carriers that expose tracking APIs, user is expected to acquire and provide credentials like license numbers, meter numbers, user IDs and passwords.
### Carrier Guessing
Really, why do users have to know that a tracking number was provided by a particular carrier. That step is just totally unnecessary, given that we can guess the carrier from the tracking number in 90% of the cases. `shipit` provides a convenience function for this.

### Carriers supported
* UPS
* FedEx
* FedEx Smartpost
* USPS
* Canada Post
* DHL
* UPS Mail Innovations
* DHL Global Mail
* LaserShip
* OnTrac
* Amazon
* A1 International
* Prestige

## Usage

Add shipit to your `package.json` and then npm install it.
```
npm install shipit
```

### Using the API Adapter

Use it to initialize the shipper clients with your account credentials.
```coffeescript
{
  UpsClient,
  FedexClient,
  UspsClient,
  DhlClient,
  LasershipClient,
  OnTracClient,
  UpsMiClient,
  DhlGmClient,
  CanadaPostClient,
  AmazonClient,
  PrestigeClient
} = require 'shipit'

ups = new UpsClient
  licenseNumber: '1C999A999B999999'
  userId: 'shipit-user'
  password: 'shhh-secret'

fedex = new FedexClient
  key: 'xyxyxyxyabababab'
  password: 'asdfawasfdasdfasdf1'
  account: '123456789'
  meter: '99999999'

usps = new UspsClient
  userId: '590XABCR3210'
  clientIp: '10.5.5.1'

lsClient = new LasershipClient()

dhlClient = new DhlClient
  userId: 'SHIPI_79999'
  password: 'shipit'

dhlgmClient = new DhlGmClient()

canadaPostClient: new CanadaPostClient
  username: 'maple-leafs'
  password: 'zamboni'

onTrac = new OnTracClient()

upsmi = new UpsMiClient()

amazonClient = new AmazonClient()

prestige = new PrestigeClient()
```

Use an initialized client to request tracking data.
```coffeescript
ups.requestData {trackingNumber: '1Z1234567890123456'}, (err, result) ->
  console.log "[ERROR] error retrieving tracking data #{err}" if err?
  console.log "[DEBUG] new tracking data received #{JSON.stringify(result)}" if result?
```

You can use the Amazon client to query status of an item by its order ID and shipment ID (packageIndex defaults to 1 - shipit does not yet support multiple shipments per order).
```coffeescript
orderID = '106-9151392-7203433'
orderingShipmentId = 'DmZd0KS8k'
amazonClient.requestData {orderID, orderingShipmentId}, (err, result) ->
  console.log "[ERROR] error retrieving tracking data #{err}" if err?
  console.log "[DEBUG] new tracking data received #{JSON.stringify(result)}" if result?
```

Note that `orderId` and `shipmentId` can be found in the URL embedded in the *"Track your package"* yellow button.  Here's the format of that URL:
```
https://www.amazon.com/gp/css/shiptrack/view.html
/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8
&orderID={orderID}
&orderingShipmentId={orderingShipmentId}
&packageId=1
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
    "destination": "US",
    "request": {
      "trackingNumber": "9400110200881269505160"
    }
}
```

### Using the Carrier Guesser
There's usually only one carrier that matches a tracking number (UPS is the only carrier that uses '1Z' prefix for its tracking numbers), but there are several cases, where there are multiple matches.  For example, FedEx uses a service called SmartPost, where it relies on USPS to deliver the package at the last mile.  In such cases, FedEx provides tracking through most of the package's journey, and then USPS either takes over, or provides duplicate tracking in the last leg.  The tracking number used is the same between the two carriers.  Similar situation with UPS Mail Innovations as well.  Therefore, the `guessCarrier()` function returns an array, and we leave it up to the user to decide manually or through other automated means which carrier is the real one or provides more accurate tracking.
```coffeescript
{guessCarrier} = require 'shipit'
possibleCarriers = guessCarrier '1Z6V86420323794365'
[ 'ups' ]
possibleCarriers = guessCarrier '9274899992136003821767'
[ 'fedex', 'usps' ]
possibleCarriers = guessCarrier 'EC207920162US'
[ 'usps' ]
```

## Building
Clone this repo (or first fork it)
```
git clone git@github.com:sailrish/shipit.git
```
Install dependencies
```
npm install
```
Just use grunt.
```
$ grunt

. . .
. . .

  182 passing (347ms)


Done, without errors.
```

## Adding new shipping carriers
* Extend the common class `ShipperClient`
* Implement necessary methods
  - `generateRequest(trk, reference)`
  - `requestOptions({trk, reference})`
  - `validateResponse(response, cb)`

## License
Copyright (c) 2014 Rishi Arora

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Credits
I learnt how to build a node module from Nick Desaulniers [here](http://nickdesaulniers.github.io/blog/2013/08/28/making-great-node-dot-js-modules-with-coffeescript/). This article talks about everything you need to know - using grunt to set up test tasks, using mocha and chai for testing, and how to npm publish, etc.
