{titleCase} = require 'change-case'
request = require 'request'

class ShipperClient

  @STATUS_TYPES =
    UNKNOWN: 0
    SHIPPING: 1
    EN_ROUTE: 2
    OUT_FOR_DELIVERY: 3
    DELIVERED: 4
    DELAYED: 5

  presentPostalCode: (rawCode) ->
    if /^\d{9}$/.test rawCode then "#{rawCode[..4]}-#{rawCode[5..]}" else rawCode

  presentLocation: ({city, stateCode, countryCode, postalCode}) ->
    city = titleCase city if city?.length
    if stateCode?.length
      if city?.length
        address = "#{city}, #{stateCode}"
      else
        address = stateCode
    else
      address = city
    postalCode = @presentPostalCode postalCode
    if countryCode?.length
      if address?.length
        address = if countryCode isnt 'US' then "#{address}, #{countryCode}" else address
      else
        address = countryCode
    if postalCode?.length
      address = if address? then "#{address} #{postalCode}" else postalCode
    address

  presentResponse: (response, cb) ->
    @validateResponse response, (err, shipment) =>
      return cb(err) if err? or !shipment?
      {activities, status} = @getActivitiesAndStatus shipment
      presentedResponse =
        eta: @getEta shipment
        service: @getService shipment
        weight: @getWeight shipment
        destination: @getDestination shipment
        activities: activities
        status: status
      presentedResponse.raw = shipment if @options?.raw
      cb null, presentedResponse

  requestData: (requestData, cb) ->
    request @requestOptions(requestData), (err, response, body) =>
      return cb(err) if !body? or err?
      return cb("response status #{response.statusCode}") if response.statusCode isnt 200
      @presentResponse body, cb

module.exports = {ShipperClient}
