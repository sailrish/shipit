{titleCase} = require 'change-case'
request = require 'request'
moment = require 'moment-timezone'

class ShipperClient

  @STATUS_TYPES =
    UNKNOWN: 0
    SHIPPING: 1
    EN_ROUTE: 2
    OUT_FOR_DELIVERY: 3
    DELIVERED: 4
    DELAYED: 5

  presentPostalCode: (rawCode) ->
    rawCode = rawCode?.trim()
    if /^\d{9}$/.test rawCode then "#{rawCode[..4]}-#{rawCode[5..]}" else rawCode

  presentLocationString: (location) ->
    newFields = []
    for field in location?.split(',') or []
      field = field.trim()
      field = titleCase(field) if field.length > 2
      newFields.push field

    newFields.join ', '

  presentLocation: ({city, stateCode, countryCode, postalCode}) ->
    city = titleCase city if city?.length
    if stateCode?.length
      stateCode = stateCode.trim()
      if stateCode.length > 3
        stateCode = titleCase stateCode
      if city?.length
        city = city.trim()
        address = "#{city}, #{stateCode}"
      else
        address = stateCode
    else
      address = city
    postalCode = @presentPostalCode postalCode
    if countryCode?.length
      countryCode = countryCode.trim()
      if countryCode.length > 3
        countryCode = titleCase countryCode
      if address?.length
        address = if countryCode isnt 'US' then "#{address}, #{countryCode}" else address
      else
        address = countryCode
    if postalCode?.length
      address = if address? then "#{address} #{postalCode}" else postalCode
    address

  presentResponse: (response, requestData, cb) ->
    @validateResponse response, (err, shipment) =>
      return cb(err) if err? or !shipment?
      {activities, status} = @getActivitiesAndStatus shipment
      eta = @getEta shipment
      adjustedEta = moment(eta).utc().format().replace /T00:00:00/, 'T23:59:59' if eta?
      adjustedEta = moment(adjustedEta).toDate() if adjustedEta?
      presentedResponse =
        eta: adjustedEta
        service: @getService shipment
        weight: @getWeight shipment
        destination: @getDestination shipment
        activities: activities
        status: status
      if requestData?.raw?
        presentedResponse.raw = response if requestData.raw
      else
        presentedResponse.raw = response if @options?.raw
      presentedResponse.request = requestData
      cb null, presentedResponse

  requestData: (requestData, cb) ->
    opts = @requestOptions requestData
    opts.timeout = requestData?.timeout or @options?.timeout
    request opts, (err, response, body) =>
      return cb(err) if !body? or err?
      return cb("response status #{response.statusCode}") if response.statusCode isnt 200
      @presentResponse body, requestData, cb

module.exports = {ShipperClient}
