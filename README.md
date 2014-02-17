## Usage

`npm install shipit`

```coffeescript
{UpsClient, FedexClient} = require 'shipit'

ups = new UpsClient
  licenseNumber: '1C999A999B999999'
  userId: 'shipit-user'
  password: 'shhh-secret'

ups.requestRefresh()
```
