var ip = '192.168.1.119';//'10.0.127.103';//192.168.1.119'; // remotemagick server
var port = ':8042'; // remotemagick port
var date = new Date(2014, 10 - 1, 8);// current date for dilbert comic
var weekXML = null;
var frameidx = 0;
var reqDayIdx = 0;

Pebble.addEventListener("ready",
  function(e) {
    console.log("started js app");
    
    //Load the current days comic frame 1
    //needs timeout callback, otherwise blocks "ready" too long and crashes app
    setTimeout(getDilbertXML(date, frameidx++, getDilbertDayImage),1000);
  }
);

function getDilbertXML(reqDate, frame, callback) {
    var xhr = new XMLHttpRequest();
    var strip_url = null;
    var xml = null;
    console.log("Getting: " + 'Year=' + reqDate.getFullYear() + '&Month=' + (reqDate.getMonth() + 1) + '&Day=' + reqDate.getDate());
    xhr.open("GET", 'http://dilbert.com/xml/widget.daily/?'
				+ 'Year=' + reqDate.getFullYear() + '&Month=' + (reqDate.getMonth() + 1) + '&Day='+reqDate.getDate(), true);
    xhr.onload = function (e) {
      if (xhr.readyState === 4) {
        if(xhr.status === 200) {
          console.log("connected");
          //console.log(xhr.responseText);
          //var filename = app_json.nodeDataArray[0].source.substring(2);
          //console.log("getting initial image: " + filename);
          var domParser = new DOMParser();
          console.log("XML:" + xhr.responseText);
          xml = domParser.parseFromString(xhr.responseText,"text/xml");
          callback(frame, xml);
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

function getDilbertDayImage(frame, xml) {
  console.log("getDilbertDayImage");
  var width = [];
  var offset = [];
  var framecnt = 0;
  var dayCount = parseInt(xml.getElementsByTagName("CurrentDay")[0].firstChild.nodeValue);
  //var dayCount = xml.getElementsByTagName("Day").length;
  console.log("DayCount:" + dayCount);
  var dayNode = xml.getElementsByTagName("Day")[dayCount - reqDayIdx - 1];
  for (i=0; i < dayNode.childNodes.length; i++) {
    if (dayNode.childNodes[i].nodeName == "URL_Strip") {
      strip_url = dayNode.childNodes[i].firstChild.nodeValue;
      console.log("strip_url:" + strip_url);
    }
    if (dayNode.childNodes[i].nodeName == "Panels") {
      for (j=0; j < dayNode.childNodes[i].childNodes.length; j++) {
        for (k=0; k < dayNode.childNodes[i].childNodes[j].childNodes.length; k++) {
          if (dayNode.childNodes[i].childNodes[j].childNodes[k].nodeName == "Width") {
            width.push(dayNode.childNodes[i].childNodes[j].childNodes[k].firstChild.data);
          } 
          if (dayNode.childNodes[i].childNodes[j].childNodes[k].nodeName == "OffsetLeft") {
            offset.push(dayNode.childNodes[i].childNodes[j].childNodes[k].firstChild.data);
          } 
        }
      }
    }
  }

  if (strip_url === null || strip_url === undefined) {
    console.log("URL:" + strip_url);
  }

  if (frameidx <= width.length) {
    loadDilbertImage(strip_url, width[frame], offset[frame]);
  }
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

function remoteMagickResize(input_url, crop_width, crop_height, crop_x, crop_y) {
    // Send the image to remote-magick to crop, resize and dither to 1-bit (b&w)
    // few javascript png libraries support compressed 1-bit png, so use imagemagick in the cloud.
    console.log("RemoteMagick start");
    var request = new XmlRpcRequest("http://" + ip + port + "/RPC2", "crop_and_resize");  
    request.addParam(input_url);
    request.addParam(crop_width);  
    request.addParam(crop_height);  
    request.addParam(crop_x);  
    request.addParam(crop_y);  
    request.addParam(144);  
    request.addParam(168);  

    var response = request.send();  
    console.log("RemoteMagick end");
    return response.parseXML(); //base64 string
}

function loadDilbertImage(url, width, offset) {
    var image_base64 = "";
    
    //"http://dilbert.com/dyn/str_strip/000000000/00000000/0000000/200000/00000/4000/700/204789/204789.strip.gif"

    var image_base64 = remoteMagickResize("http://dilbert.com" + url, width, 191, offset, 4); 

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
  if (e.payload.button_event == "1") {
    reqDayIdx++;
    frameidx = 0;
    setTimeout(getDilbertXML(date, frameidx++, getDilbertDayImage),1000);
  }

  if (e.payload.button_event == "3") {
    setTimeout(getDilbertXML(date, frameidx++, getDilbertDayImage),1000);
  }
});

