COCOP Requested History Data Publisher
======================================

---

<img src="logos.png" alt="COCOP and EU" style="display:block;margin-right:auto" />

COCOP - Coordinating Optimisation of Complex Industrial Processes  
https://cocop-spire.eu/

This project has received funding from the European Union's Horizon 2020
research and innovation programme under grant agreement No 723661. This piece
of software reflects only the authors' views, and the Commission is not
responsible for any use that may be made of the information contained therein.

---


Author
------

Antti Kätkytniemi, Tampere University, Finland

**Please make sure to read and understand [LICENSE.txt](./LICENSE.txt)!**


COCOP Toolkit
-------------

This application is a part of COCOP Toolkit, which was developed to enable a
decoupled and well-scalable architecture in industrial systems. Please see
https://kannisto.github.io/Cocop-Toolkit/


Introduction
------------

This sofware application was created as a part of the research project COCOP.
The purpose is to get (history) data from database using AMQP message bus.

For using this the publisher needs MariaDB (or MySQL) database for (history)
data to be installed and running somewhere. Data in database must have
timestamp DATETIME(1) and value DOUBLE (other types works as well). AMQP
message bus is also needed for getting the requests and sending the message
back.

**Note: configuration file must be filled before using**

For this case to get data from database using publisher send a GetObservation
request to message bus. Publisher then tries to get the data from database and
send back a GetObservationResponse message with the data or error message.

GetObservation request message example:

```xml
<?xml version="1.0" encoding="UTF-8"?>

<sos:GetObservation service="SOS" version="2.0.0" xmlns:fes="http://www.opengis.net/fes/2.0" xmlns:gco="http://www.isotc211.org/2005/gco" xmlns:gmd="http://www.isotc211.org/2005/gmd" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:gsr="http://www.isotc211.org/2005/gsr" xmlns:gss="http://www.isotc211.org/2005/gss" xmlns:gts="http://www.isotc211.org/2005/gts" xmlns:om="http://www.opengis.net/om/2.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:sos="http://www.opengis.net/sos/2.0" xmlns:swe="http://www.opengis.net/swe/2.0" xmlns:swes="http://www.opengis.net/swes/2.0" xmlns:tns="http://www.w3.org/2005/08/addressing" xmlns:wstop="http://docs.oasis-open.org/wsn/t-1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xml="http://www.w3.org/XML/1998/namespace" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sos/2.0 ../obs_meas/sos/2.0.1/sos.xsd ">



  <sos:temporalFilter>
    <fes:After>
      <fes:ValueReference>resultTime</fes:ValueReference>
      <gml:TimeInstant gml:id="tm876dsdf">
        <gml:timePosition>2018-03-28T12:01:59</gml:timePosition>
      </gml:TimeInstant>
    </fes:After>
  </sos:temporalFilter>

  <sos:temporalFilter>
    <fes:During>
      <fes:ValueReference>phenomenonTime</fes:ValueReference>
      <gml:TimePeriod gml:id="tm876">
        <gml:beginPosition>2018-05-18T03:23:11</gml:beginPosition>
        <gml:endPosition>2018-05-18T03:23:29</gml:endPosition>
      </gml:TimePeriod>
    </fes:During>
  </sos:temporalFilter>

  <sos:featureOfInterest>somefeature</sos:featureOfInterest>

</sos:GetObservation>
```

**Note: Only one of the sos:temporalFilter parts in one message depending if
the requested data is all from some point or all from some time interval.**

There is two versions of the publisher: one sending response as separate pairs
and one sending response as time series.

Starting the publisher use command "node publisher.js publisher.config" or
"node publisher_time_series.js publisher.config" in command line.

All message structures are based on existing open standards. In this API, the
standards have been created by and are copyrighted to the Open Geospatial
Consortium, Inc. (OGC(r)); https://www.ogc.org/). However, OGC is _not_ the
creator of this software, and this software has _not_ been certified for
compliance with any OGC standard.

See also:

* Github repo: (the planned URL in Github)


Environment and Libraries
-------------------------

The development environment was Atom.

The runtime was NodeJs (version 10.15.3).

This distribution does not include any external NodeJs libraries. These are the
following:

* mysql
* amqplib
* xmlbuilder
* xml-js
