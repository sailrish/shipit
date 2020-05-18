## Disclaimer!
> I am in the process of converting the original coffeescript and callback based project to use Typescript and promises instead. I'll try to keep the below [To-Do](https://github.com/heuristicAL/shipit-async#conversion-to-do) as up-to-date as possible so feel free to hack away and open up a PR if you wish! I'll be more than happy for the help!

## What is this?
# Shipping APIs Adapter
`shipit` is a node module that allows you to retrieve data from shipping carriers like UPS and FedEx in a common format. It interfaces with tracking APIs when available, and falls back to screen scraping. For carriers that expose tracking APIs, user is expected to acquire and provide credentials like license numbers, meter numbers, user IDs and passwords.

### Carrier Guessing
Really, why do users have to know that a tracking number was provided by a particular carrier. That step is just totally unnecessary, given that we can guess the carrier from the tracking number in 90% of the cases. `shipit` provides a convenience function for this.

### Try it
There's a [Heroku](http://www.heroku.com) hobby app that allows you to see `shipit` in action.  For example, try this:
```
http://shipit-api.herokuapp.com/api/carriers/ups/1ZV5E9420444964064
```
And replace `ups` with a [canonical name](https://github.com/sailrish/shipit/blob/master/src/guessCarrier.coffee#L91-L121) for any of the supported carriers, and provide a valid tracking number for that carrier.

Or try this, to detect the carrier(s) associated with a tracking number:
```
http://shipit-api.herokuapp.com/api/guess/1ZV5E9420444964064
```

_*Note*: `shipit-api` Heroku app is not meant for production use, and there are no guarantees included here, regarding it's availability, or up-time. It is only meant as a preview for the `shipit` node module._

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
            "datetime": "2014-02-16T17:19:00",
            "details": "Departed FedEx location"
        },
        {
            "location": "East Hanover, NJ 07936",
            "timestamp": "2014-02-15T23:57:00.000Z",
            "datetime": "2014-02-15T18:57:00",
            "details": "Left FedEx origin facility"
        },
        {
            "location": "East Hanover, NJ 07936",
            "timestamp": "2014-02-15T15:57:00.000Z",
            "datetime": "2014-02-15T10:57:00",
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
#### A Note on `timestamp` and `datetime`
There are two types of shipping carriers - one that provide a date and time in their shipping activities that represents the local time at the location indicated. And another that provide a timestamp, which includes a UTC offset. In the first case, since a timezone is not known, shipit just assumes UTC, and returns a `timestamp` attribute in the `activity` objects. In the second case, shipit returns a `timestamp` attribute which has a UTC offset embedded in it, and also a `datetime` attribute which represents the local time.

#### Optional parameters for shipper clients
Shipper clients that require account credentials can be provided options as their second argument. And those that don't require any credentials can be provided options as their first argument
```
upsClient = new UpsClient credentials, [options]
upsmiClient = new UpsMiClient [options]
```
Valid options:
* `raw` - response includes the raw response received from the shipping carrier API.
* `timeout` - how many milliseconds to wait for a shipping carrier API response before returning a timeout error. This option can be overridden by a `timeout` attribute in the object passed on to the `requestData()` call.

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

## Conversion To-Do
- [x] Convert .coffee files.
- [x] Migrate grunt to vanilla tsc.
- [x] Migrate tests to use ts-node/register as a runner.
- [ ] Fix library files (`src/**/*.ts`).
  - [ ] Edit tsconfig to include  `src/**/*.ts` instead of `src/*.ts` once done
  - [ ] Syntax and typerrors
    - [x] fedex.ts
    - [x] shipper.ts
    - [x] usps.ts
    - [x] guessCarrier.ts
    - [x] upsmi.ts
    - [ ] lasership.ts
    - [ ] dhl.ts
    - [x] canada_post.ts
    - [ ] ontrac.ts
    - [ ] prestige.ts
    - [ ] a1.ts
    - [ ] dhlgm.ts
    - [x] ups.ts
    - [x] checkdigit.ts
    - [ ] main.ts
    - [ ] amazon.ts
  - [ ] Tests run and functioning
    - [x] fedex.ts
    - [ ] shipper.ts
    - [x] usps.ts
    - [x] guessCarrier.ts
    - [x] upsmi.ts
    - [ ] lasership.ts
    - [ ] dhl.ts
    - [x] canada_post.ts
    - [ ] ontrac.ts
    - [ ] prestige.ts
    - [ ] a1.ts
    - [ ] dhlgm.ts
    - [x] ups.ts
    - [ ] main.ts
    - [ ] amazon.ts
  - [ ] Cleanup Bulk-Decaf comment suggestions
    - [ ] fedex.ts
    - [ ] shipper.ts
    - [ ] nowork
    - [ ] usps.ts
    - [ ] guessCarrier.ts
    - [ ] upsmi.ts
    - [ ] lasership.ts
    - [ ] dhl.ts
    - [ ] canada_post.ts
    - [ ] ontrac.ts
    - [ ] prestige.ts
    - [ ] a1.ts
    - [ ] dhlgm.ts
    - [ ] ups.ts
    - [ ] main.ts
    - [ ] amazon.ts
- [ ] Fix test files (`test/**/*.ts`). !!! NOTE: 5 or 6 tests were already broken in the original shipit repo. I did not bother fixing them as I am not fluent in coffeescript and I felt it was a waste of time since we're reqriting most of the code here.
  - [ ] Rename files from `test/**/*.ts` to `test/**/*.spec.ts` INCREMENTALLY
  - [ ] Syntax and typerrors
    - [x] fedex.ts
    - [ ] shipper.ts
    - [x] usps.ts
    - [x] guessCarrier.ts
    - [x] upsmi.ts
    - [ ] lasership.ts
    - [ ] dhl.ts
    - [x] canada_post.ts
    - [ ] ontrac.ts
    - [ ] prestige.ts
    - [ ] a1.ts
    - [ ] dhlgm.ts
    - [X] ups.ts
    - [ ] main.ts
    - [ ] amazon.ts
  - [ ] Tests run and functioning
    - [x] fedex.ts
    - [x] shipper.ts
    - [ ] nowork
    - [x] usps.ts
    - [x] guessCarrier.ts
    - [x] upsmi.ts
    - [ ] lasership.ts
    - [ ] dhl.ts
    - [x] canada_post.ts
    - [ ] ontrac.ts
    - [ ] prestige.ts
    - [ ] a1.ts
    - [ ] dhlgm.ts
    - [x] ups.ts
    - [ ] main.ts
    - [ ] amazon.ts
  - [ ] Cleanup Bulk-Decaf comment suggestions
    - [ ] fedex.ts
    - [ ] shipper.ts
    - [ ] nowork
    - [ ] usps.ts
    - [ ] guessCarrier.ts
    - [ ] upsmi.ts
    - [ ] lasership.ts
    - [ ] dhl.ts
    - [ ] canada_post.ts
    - [ ] ontrac.ts
    - [ ] prestige.ts
    - [ ] a1.ts
    - [ ] dhlgm.ts
    - [ ] ups.ts
    - [ ] main.ts
    - [ ] amazon.ts
- [ ] Update README
- [ ] Update License?
- [ ] Update StatusMaps for carriers to match the actual shipment status better (ex: `Delayed` instead of still `In_Transit` in certain cases).
- [ ] Figure out a new name?
- [ ] Clear up the `any`s :anguished:
- [ ] Clean up the `__guard__` methods that were generated by decaffeinate.