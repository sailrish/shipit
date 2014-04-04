## What is this?
`shipit` is a node module that allows you to retrieve data from shipping carriers like UPS and FedEx in a common format. It interfaces with tracking APIs when available, and falls back to screen scraping. For carriers that expose tracking APIs, user is expected to acquire and provide credentials like license numbers, meter numbers, user IDs and passwords.

### Carriers supported
* UPS
* FedEx
* FedEx Smartpost
* USPS
* DHL
* UPS Mail Innovations
* LaserShip
* OnTrac

## Usage

Add shipit to your `package.json` and then npm install it.
```
npm install shipit
```

Use it to initialize the shipper clients with your account credentials.
```coffeescript
{UpsClient, FedexClient, UspsClient, DhlClient, LasershipClient, OnTracClient, UpsMiClient} = require 'shipit'

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

onTrac = new OnTracClient()

upsmi = new UpsMiClient()
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

## License
Copyright (c) 2014 Rishi Arora

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Credits
I learnt how to build a node module from Nick Desaulniers [here](http://nickdesaulniers.github.io/blog/2013/08/28/making-great-node-dot-js-modules-with-coffeescript/). This article talks about everything you need to know - using grunt to set up test tasks, using mocha and chai for testing, and how to npm publish, etc.
