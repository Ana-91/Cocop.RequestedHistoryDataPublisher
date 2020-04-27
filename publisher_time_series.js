//
// Please make sure to read and understand README.md and LICENSE.txt.
//
// This file was prepared in the research project COCOP (Coordinating
// Optimisation of Complex Industrial Processes).
// https://cocop-spire.eu/
// Author: Antti Kätkytniemi, Tampere University, Finland
// Last modified: 4/2020
//
// This application has been derived from standards and XML schemata provided
// by the Open Geospatial Consortium (OGC(r)). Please make sure to read and
// understand the following legal conditions:
// (1) Copyright Notice and Disclaimers at https://www.ogc.org/ogc/legal
// (2) OGC(r) Document Notice; the most recent version is at
//     https://www.ogc.org/ogc/document and another enclosed in file
//     "ogc_document_notice.txt"
// (3) OGC(r) Software Notice; the most recent version is at
//     https://www.ogc.org/ogc/software and another enclosed in file
//     "ogc_software_notice.txt"
// (4) The license of each related standard. Please see
//     "ref_and_license_filter.txt", "ref_and_license_gml.txt",
//     "ref_and_license_om.txt", "ref_and_license_sos.txt",
//     "ref_and_license_swecommon.txt", "ref_and_license_swes.txt" and
//     "ref_and_license_tsml.txt".

"use strict";

//libraries
var mysql = require('mysql');
var amqp = require('amqplib/callback_api');
var builder = require('xmlbuilder');
var convert = require('xml-js');
var fs = require('fs');

function removeComments(params){
  var array = [];
  var j = 0;
  for(var i = 0; i < params.length; i++){
    if(params[i].charAt(0) !== '#'){
      if(params[i] !== ''){
        array[j] = params[i];
        ++j;
      }
    }
  }
  return array;
}

function makeObject(params){
  params = removeComments(params);
  var array = params[0].split(":");
  var string = '{"' + array[0] + '":' + array[1];
  for(var i = 1; i < params.length; i++){
    array = params[i].split(":");
    string = string + ', "' + array[0] + '":' + array[1];
  }
  params = string + "}";
  return JSON.parse(params);
}

var connparams = makeObject(fs.readFileSync(process.argv[2], 'utf-8').replace(/\r\n/g,'\n').replace(/\\/g,'\\\\').split('\n'));

var opts = {
  ca: [fs.readFileSync(connparams.cert)]
};

var dBconnection = mysql.createConnection({
  host: connparams.host,
  port: connparams.port,
  user: connparams.user,
  password: connparams.password,
  database: connparams.database,
  dateStrings: true
});

var amqpchannel;
var ex = connparams.exchange;
var key = connparams.gettopic;
var amqpconnection;
var amqpqueue;
var request = {};
amqp.connect(connparams.amqpprotocol+'://'+connparams.amqpuser+':'+connparams.amqppassword+'@'+connparams.amqphost+':'+connparams.amqpport, opts, function(err, conn) {
  if(err) throw err;
  amqpconnection = conn;
  amqpchannel = conn.createChannel(function(err, ch){
    if(err) throw err;
    amqpchannel.assertExchange(ex, 'topic');
    amqpchannel.assertQueue('', {exclusive: true, autoDelete: true, messageTtl: 5 * 60 * 1000}, function(err, q) {
      amqpqueue = q;
      amqpchannel.bindQueue(q.queue, ex, key);
      console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
      amqpchannel.consume(amqpqueue.queue, function(msg) {
        var options = {ignoreComment: true, compact: true};
        try {
          var json = convert.xml2js(msg.content.toString(), options);
          console.log(json);
          request.table = encodeFilename(JSON.stringify(json['sos:GetObservation']['sos:featureOfInterest']['_text'])).toLowerCase().replace(/\"/g, '');
          if(json['sos:GetObservation']['sos:temporalFilter']['fes:After']){
            request.from = isotodatestring(JSON.stringify(json['sos:GetObservation']['sos:temporalFilter']['fes:After']['gml:TimeInstant']['gml:timePosition']['_text'])).replace(/\"/g, '');
          }else if (json['sos:GetObservation']['sos:temporalFilter']['fes:During']) {
            request.from = isotodatestring(JSON.stringify(json['sos:GetObservation']['sos:temporalFilter']['fes:During']['gml:TimePeriod']['gml:beginPosition']['_text'])).replace(/\"/g, '');
            request.to = isotodatestring(JSON.stringify(json['sos:GetObservation']['sos:temporalFilter']['fes:During']['gml:TimePeriod']['gml:endPosition']['_text'])).replace(/\"/g, '');
          }
        }catch(err){
          var error = {
            'sos:GetObservationResponse': {
              '@xmlns:fes': "http://www.opengis.net/fes/2.0",
              '@xmlns:gco': "http://www.isotc211.org/2005/gco",
              '@xmlns:gmd': "http://www.isotc211.org/2005/gmd",
              '@xmlns:gml': "http://www.opengis.net/gml/3.2",
              '@xmlns:gsr': "http://www.isotc211.org/2005/gsr",
              '@xmlns:gss': "http://www.isotc211.org/2005/gss",
              '@xmlns:gts': "http://www.isotc211.org/2005/gts",
              '@xmlns:om': "http://www.opengis.net/om/2.0",
              '@xmlns:ows': "http://www.opengis.net/ows/1.1",
              '@xmlns:sos': "http://www.opengis.net/sos/2.0",
              '@xmlns:swe': "http://www.opengis.net/swe/2.0",
              '@xmlns:swes': "http://www.opengis.net/swes/2.0",
              '@xmlns:tns': "http://www.w3.org/2005/08/addressing",
              '@xmlns:wstop': "http://docs.oasis-open.org/wsn/t-1",
              '@xmlns:xlink': "http://www.w3.org/1999/xlink",
              '@xmlns:xml': "http://www.w3.org/XML/1998/namespace",
              '@xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
              '@xsi:schemaLocation': "http://www.opengis.net/sos/2.0 ../obs_meas/sos/2.0.1/sosGetObservation.xsd",
              '@xmlns:tsml': "http://www.opengis.net/tsml/1.0",
              'swes:extension': {
                'xsi:type': "swe:DataRecordPropertyType",
                'swe:DataRecord': {
                  'swe:identifier': 'cocop/requestresult',
                  'swe:field': [{
                    '@name': "result",
                    'swe:Category': {
                      'swe:value': 'BadRequest'
                    }},
                  {
                    '@name': "message",
                    'swe:Text': {
                      'swe:value': 'The request doesn\'t have all properties'
                    }
                  }]
                }
              }
            }
          }
          var badresponse = builder.create(error).end({pretty: true});
          amqpchannel.publish(ex, connparams.pushtopic, Buffer.from(badresponse));
          console.log('Message error response send to message bus.');
          return;
        }
        getData(request.from, request.to, request.table);
      }, {noAck: true});
    });
    process.on('SIGINT', () => {
      console.log('Closing...');
      conn.close();
      process.exit();
    });
  });
});

function decodeFilename(filename){
  filename = filename.replace(/%2e/g, '\.');
  filename = filename.replace(/%25/g, '%');
  return filename;
}

function encodeFilename(filename){
  filename = filename.replace(/%/g, '%25');
  filename = filename.replace(/\./g, '%2e');
  return filename;
}

function addMilliseconds(dateString, milliseconds){
  dateString = dateString.trim();
  var split = dateString.lastIndexOf(' ');
  dateString = [dateString.substr(0, split), dateString.substr(split + 1)];
  var timestring = dateString[1].trim();
  dateString = dateString[0].trim();
  dateString = dateString.split("-");
  var year = dateString[0].trim();
  var month = dateString[1].trim();
  var day = dateString[2].trim();
  timestring = timestring.split(":");
  var h = timestring[0].trim();
  var m = timestring[1].trim();
  var s = timestring[2].trim();
  s = s.split(".");
  var ms = s[1].trim();
  s = s[0].trim();
  var date = new Date(Number(year), Number(month) - 1, Number(day), Number(h), Number(m), Number(s), convertFromStringMilliseconds(ms));
  date.setMilliseconds(Number(date.getMilliseconds()) + Number(milliseconds));
  return "" + date.getFullYear() + "-" + addZero((date.getMonth() + 1)) + "-" + addZero(date.getDate()) + " " + addZero(date.getHours()) + ":" + addZero(date.getMinutes()) + ":" + addZero(date.getSeconds()) + "." + convertToStringMilliseconds(date.getMilliseconds());
}

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function convertFromStringMilliseconds(milliseconds){
  if(milliseconds.charAt(2)){
      return Number(milliseconds);
  }
  else if(milliseconds.charAt(1)){
      return Number(milliseconds) * 10;
  }
  else{
    return Number(milliseconds) * 100;
  }
}

function convertToStringMilliseconds(milliseconds){
  if(milliseconds < 10){
    return '00' + milliseconds;
  }
  else if(milliseconds < 100){
    return '0' + milliseconds;
  }
  else{
    return '' + milliseconds;
  }
}

function datestringtoiso(dateString){
  dateString = dateString.trim();
  var split = dateString.lastIndexOf(' ');
  dateString = [dateString.substr(0, split), dateString.substr(split + 1)];
  var timestring = dateString[1].trim();
  dateString = dateString[0].trim();
  dateString = dateString.split("-");
  var year = dateString[0].trim();
  var month = dateString[1].trim();
  var day = dateString[2].trim();
  timestring = timestring.split(":");
  var h = timestring[0].trim();
  var m = timestring[1].trim();
  var s = timestring[2].trim();
  s = s.split(".");
  var ms = s[1].trim();
  s = s[0].trim();
  var date = new Date(Number(year), Number(month) - 1, Number(day), Number(h), Number(m), Number(s), convertFromStringMilliseconds(ms));
  return date.toISOString();
}

function isotodatestring(dateString){
  dateString = dateString.trim();
  var split = dateString.lastIndexOf('T');
  dateString = [dateString.substr(0, split), dateString.substr(split + 1)];
  var timestring = dateString[1].trim();
  dateString = dateString[0].trim();
  dateString = dateString.split("-");
  var year = dateString[0].trim();
  var month = dateString[1].trim();
  var day = dateString[2].trim();
  timestring = timestring.split(":");
  var h = timestring[0].trim();
  var m = timestring[1].trim();
  var s = timestring[2].trim();
  s = s.split(".");
  var ms = s[1].trim();
  s = s[0].trim();
  var date = year + '-' + month + '-' + day + ' ' + h + ':' + m + ':' + s + '.' + ms;
  return date;
}

function getData(firstValue, lastValue, table){
  var sql;
  var params = [];
  if(lastValue){
    sql = "SELECT * FROM ?? WHERE (timestamp >= ? AND timestamp < ?)";
    params = [table, firstValue, lastValue];
  }else{
    sql = "SELECT * FROM ?? WHERE (timestamp >= ?)";
    params = [table, firstValue];
  }
  dBconnection.query(sql, params, function (err, result) {
    if (err){
      var error = {
        'sos:GetObservationResponse': {
          '@xmlns:fes': "http://www.opengis.net/fes/2.0",
          '@xmlns:gco': "http://www.isotc211.org/2005/gco",
          '@xmlns:gmd': "http://www.isotc211.org/2005/gmd",
          '@xmlns:gml': "http://www.opengis.net/gml/3.2",
          '@xmlns:gsr': "http://www.isotc211.org/2005/gsr",
          '@xmlns:gss': "http://www.isotc211.org/2005/gss",
          '@xmlns:gts': "http://www.isotc211.org/2005/gts",
          '@xmlns:om': "http://www.opengis.net/om/2.0",
          '@xmlns:ows': "http://www.opengis.net/ows/1.1",
          '@xmlns:sos': "http://www.opengis.net/sos/2.0",
          '@xmlns:swe': "http://www.opengis.net/swe/2.0",
          '@xmlns:swes': "http://www.opengis.net/swes/2.0",
          '@xmlns:tns': "http://www.w3.org/2005/08/addressing",
          '@xmlns:wstop': "http://docs.oasis-open.org/wsn/t-1",
          '@xmlns:xlink': "http://www.w3.org/1999/xlink",
          '@xmlns:xml': "http://www.w3.org/XML/1998/namespace",
          '@xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
          '@xsi:schemaLocation': "http://www.opengis.net/sos/2.0 ../obs_meas/sos/2.0.1/sosGetObservation.xsd",
          '@xmlns:tsml': "http://www.opengis.net/tsml/1.0",
          'swes:extension': {
            'xsi:type': "swe:DataRecordPropertyType",
            'swe:DataRecord': {
              'swe:identifier': 'cocop/requestresult',
              'swe:field': [{
                '@name': "result",
                'swe:Category': {
                  'swe:value': 'BadRequest'
                }},
              {
                '@name': "message",
                'swe:Text': {
                  'swe:value': 'Database could not handle the request'
                }
              }]
            }
          }
        }
      }
      var badresponse = builder.create(error).end({pretty: true});
      amqpchannel.publish(ex, connparams.pushtopic, Buffer.from(badresponse));
      console.log('Database error response send to message bus.');
      return;
    }
    console.log('Data got from database.');
    var xml = [];
    var timelist;
    var valuelist;
    var qualitylist;
    if(result.length != 0){
      timelist = datestringtoiso(result[0].timestamp);
      valuelist = result[0].value.toFixed(2);
      qualitylist = 'good';
      for(var i = 1; i < result.length; ++i){
        timelist = timelist + ' ' + datestringtoiso(result[i].timestamp);
        valuelist = valuelist + ' ' + result[i].value.toFixed(2);
        qualitylist = qualitylist + ' good';
      }
    }
    var msg = {
      'sos:GetObservationResponse': {
        '@xmlns:fes': "http://www.opengis.net/fes/2.0",
        '@xmlns:gco': "http://www.isotc211.org/2005/gco",
        '@xmlns:gmd': "http://www.isotc211.org/2005/gmd",
        '@xmlns:gml': "http://www.opengis.net/gml/3.2",
        '@xmlns:gsr': "http://www.isotc211.org/2005/gsr",
        '@xmlns:gss': "http://www.isotc211.org/2005/gss",
        '@xmlns:gts': "http://www.isotc211.org/2005/gts",
        '@xmlns:om': "http://www.opengis.net/om/2.0",
        '@xmlns:ows': "http://www.opengis.net/ows/1.1",
        '@xmlns:sos': "http://www.opengis.net/sos/2.0",
        '@xmlns:swe': "http://www.opengis.net/swe/2.0",
        '@xmlns:swes': "http://www.opengis.net/swes/2.0",
        '@xmlns:tns': "http://www.w3.org/2005/08/addressing",
        '@xmlns:wstop': "http://docs.oasis-open.org/wsn/t-1",
        '@xmlns:xlink': "http://www.w3.org/1999/xlink",
        '@xmlns:xml': "http://www.w3.org/XML/1998/namespace",
        '@xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
        '@xsi:schemaLocation': "http://www.opengis.net/sos/2.0 ../obs_meas/sos/2.0.1/sosGetObservation.xsd",
        '@xmlns:tsml': "http://www.opengis.net/tsml/1.0",

        'sos:observationData': {
          'om:OM_Observation': {
            '@gml:id': decodeFilename(table) + "_" + datestringtoiso(result[0].timestamp),
            '@xmlns:gmlcov': "http://www.opengis.net/gmlcov/1.0",

            'gml:name': decodeFilename(table) + ' measurements',

            'om:type': {
              '@xlink:href': "cocop/observationType/TimeSeriesFlexible"
            },

            'om:phenomenonTime': {
              'gml:TimeInstant': {
                '@gml:id': "phenomenonTimeInstant",
                'gml:timePosition': datestringtoiso(result[0].timestamp)
              }
            },

            'om:resultTime': {
              'gml:TimeInstant': {
                '@gml:id': "resultTimeInstant",
                'gml:timePosition': datestringtoiso(result[0].timestamp)
              }
            },

            'om:result': {
              '@xsi:type': "tsml:TimeseriesDomainRangeType",
              '@gml:id': "ts_dr",
              'gml:description': decodeFilename(table) + ' measurements',
              'gml:domainSet': {
                'tsml:TimePositionList': {
                  '@gml:id': "temporal_domain",
                  'tsml:timePositionList': timelist
                }
              },
              'gml:rangeSet': {
                'gml:QuantityList': {
                  '@uom': "t",
                  '#text': valuelist
                }
              },
              'gmlcov:rangeType': '',
              'tsml:metadata': {
                'tsml:TimeseriesMetadataExtension': {
                  'tsml:annotation': {
                    'tsml:AnnotationCoverage': {
                      '@gml:id': "quality_cov",
                      'gml:domainSet': {
                        '@xlink:href': "#temporal_domain"
                      },
                      'gml:rangeSet': {
                        'gml:CategoryList': {
                          '@codeSpace': "http://cocop",
                          '#text': qualitylist
                        }
                      },
                      'gmlcov:rangeType': ''
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    var response = builder.create(msg, {encoding: 'UTF-8'}).end({pretty: true});
    amqpchannel.publish(ex, connparams.pushtopic, Buffer.from(response));
    console.log('Data send to message bus.');
  });
}
