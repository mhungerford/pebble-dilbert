var ip = '192.168.1.119';
var port = ':8042'; // remotemagick port
var date = new Date();// current date for dilbert comic
var image_base64 = "";

Pebble.addEventListener("ready",
  function(e) {
    console.log("started js app");
    
    if (window.localStorage.getItem('ip') !== null) {
      ip = window.localStorage.getItem('ip');
      console.log("Loading config ip=" + ip);
    }
    //getDilbertHash(date);
  }
);

function getDilbertHash(reqDate) {
    var xhr = new XMLHttpRequest();
    var strip_url = null;
    xhr.open("GET", 'http://dilbert.com/xml/widget.daily/?'
				+ encodeURIComponent('Year=' + reqDate.getFullYear() + '&Month=' + (reqDate.getMonth() + 1) + '&Day='+reqDate.getDate()), true);
    xhr.onload = function (e) {
      if (xhr.readyState === 4) {
        if(xhr.status === 200) {
          console.log("connected");
          //console.log(xhr.responseText);
          //var filename = app_json.nodeDataArray[0].source.substring(2);
          //console.log("getting initial image: " + filename);
          var xml = new DOMParser();
          xml = xml.parseFromString(xhr.responseText,"text/xml");
          var reqDayIdx = parseInt(xml.getElementsByTagName("CurrentDay")[0].firstChild.nodeValue);
          var dayNode = xml.getElementsByTagName("Day")[reqDayIdx];
          for (i=0; i < dayNode.childNodes.length; i++) {
            if (dayNode.childNodes[i].nodeName == "URL_Strip") {
              strip_url = dayNode.childNodes[i].firstChild.nodeValue;
            }
          }

          if (strip_url !== null || strip_url !== undefined) {
            getPNG(filename, function(bytes) {transferImageBytes(bytes, 2044);});
          }
 
        } else {
          console.log(xhr.statusText);
        }
      }else{
        console.log("status wrong " + xhr.statusText);
      }
    }
    xhr.onerror = function (e) {
      console.log(xhr.statusText);
    }
    xhr.send(null);
}

function remoteMagickResize(input_url, crop_width, crop_height, crop_x, crop_y, output_base64) {
    var xhr = new XMLHttpRequest();
    var strip_url = null;
    xhr.open("GET", 'http://dilbert.com/xml/widget.daily/?'
				+ encodeURIComponent('Year=' + reqDate.getFullYear() + '&Month=' + (reqDate.getMonth() + 1) + '&Day='+reqDate.getDate()), true);
    xhr.onload = function (e) {
      if (xhr.readyState === 4) {
        if(xhr.status === 200) {
          console.log("connected");
          var xml = new DOMParser();
          xml = xml.parseFromString(xhr.responseText,"text/xml");
          var reqDayIdx = parseInt(xml.getElementsByTagName("CurrentDay")[0].firstChild.nodeValue);
          var dayNode = xml.getElementsByTagName("Day")[reqDayIdx];
          for (i=0; i < dayNode.childNodes.length; i++) {
            if (dayNode.childNodes[i].nodeName == "URL_Strip") {
              strip_url = dayNode.childNodes[i].firstChild.nodeValue;
            }
          }

          if (strip_url !== null || strip_url !== undefined) {
            getPNG(filename, function(bytes) {transferImageBytes(bytes, 2044);});
          }
 
        } else {
          console.log(xhr.statusText);
        }
      }else{
        console.log("status wrong " + xhr.statusText);
      }
    }
    xhr.onerror = function (e) {
      console.log(xhr.statusText);
    }
    xhr.send(null);
}

function transferImageBytes(bytes, chunkSize) {
  var retries = 0;
  console.log("transferImagesBytes");

  // This function sends chunks of data.
  sendChunk = function(start) {
    var txbuf = bytes.slice(start, start + chunkSize);
    console.log("Sending " + txbuf.length + " bytes - starting at offset " + start);
    Pebble.sendAppMessage({ "png_data": txbuf },
        function(e) {
          // If there is more data to send - send it.
          if (bytes.length > start + chunkSize) {
            sendChunk(start + chunkSize);
          }
        },
        // Failed to send message - Retry a few times.
        function (e) {
          if (retries++ < 3) {
            console.log("Got a nack for chunk #" + start + " - Retry...");
            sendChunk(start);
          }
        }
    );
  };

  //start sending png data to pebble
  sendChunk(0);
}

// Get a png from the web
function getPNG(filename, callback, errorCallback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "http://" + ip + port + "/" + filename,true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function(e) {
    console.log("loaded");
    var buf = xhr.response;
    if(xhr.status == 200 && buf) {
      var byteArray = new Uint8Array(buf);
      var arr = [];
      for(var i=0; i<byteArray.byteLength; i++) {
        arr.push(byteArray[i]);
      }

      console.log("Received image with " + byteArray.length + " bytes.");
      callback(arr);
    } else {
      errorCallback("Request status is " + xhr.status);
    }
  }
  xhr.onerror = function(e) {
    errorCallback(e);
  }
  xhr.send(null);
}

// got message from pebble
Pebble.addEventListener("appmessage", function(e) {
  //console.log("got message " + JSON.stringify(e.payload));
  //if (e.payload.button_event !== undefined) {
    console.log("button_event: " + e.payload.button_event);
    var button_map = {
    "1": "Up", 
    "2": "Sel",
    "3": "Dwn"
    };

    // Send the image to remote-magick to crop, resize and dither to 1-bit (b&w)
    // few javascript png libraries support compressed 1-bit png, so use imagemagick in the cloud.
    console.log("RemoteMagick start");
    var request = new XmlRpcRequest("http://10.0.127.103:8042/RPC2", "crop_and_resize");  
    request.addParam("http://dilbert.com/dyn/str_strip/000000000/00000000/0000000/200000/00000/4000/700/204789/204789.strip.gif");
    request.addParam(172);  
    request.addParam(166);  
    request.addParam(386);  
    request.addParam(4);  
    request.addParam(144);  
    request.addParam(168);  
    var response = request.send();  
    image_base64 = response.parseXML();
    console.log("RemoteMagick end");

    // Convert base64 to arrayBuffer
    var buf = window.atob(image_base64);
    var byteArray = new Uint8Array(new ArrayBuffer(buf.length));
    for (var i = 0; i < buf.length; i++) {
       byteArray[i] = buf.charCodeAt(i);
    }

    var arrayBuffer = [];
    for(var i=0; i<byteArray.byteLength; i++) {
      arrayBuffer.push(byteArray[i]);
    }

    transferImageBytes(arrayBuffer, 2044);
    console.log("ImageTransferred");

/*
    for( var link_id in app_json.linkDataArray){
      if( app_json.linkDataArray[link_id].from === current &&
        app_json.linkDataArray[link_id].fromPort === button_map[e.payload.button_event]){
          console.log("to:" + app_json.linkDataArray[link_id].to);
          //set the new current node
          current = app_json.linkDataArray[link_id].to;

          for (var node_id in app_json.nodeDataArray) {
            if( app_json.nodeDataArray[node_id].key === current) {
              var filename = app_json.nodeDataArray[node_id].source.substring(2);
              console.log("image:" + filename);

              getPNG(filename, function(bytes) {transferImageBytes(bytes, 2044);
                });
              break;
            }
          }
          break;
        }
    }
    */
  //}
});

Pebble.addEventListener("showConfiguration", function() {
  console.log("showing configuration");
  //setCurrent(0);
  Pebble.openURL("data:text/html,"+encodeURI('<!DOCTYPE html> <html> <head> <title>Configure_Sketchup</title> <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><img src="data:image/png;base64,' + image_base64 + '"/></body></html><!--.html'));
});

Pebble.addEventListener("webviewclosed", function(e) {
  console.log("configuration closed");
  if (e.response && e.response.length) {
    var json_data = decodeURIComponent(e.response);
    var config = JSON.parse(json_data);
    window.localStorage.setItem("ip",config.ip);
    console.log("setting ip to " + config.ip);
  }
});

