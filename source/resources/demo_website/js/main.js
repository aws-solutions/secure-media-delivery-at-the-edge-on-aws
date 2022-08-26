'use strict';

var player = videojs('my_video_1');

const HLS_STREAM = "hls";
const DASH_STREAM = "dash";
var CURRENT_STREAM = "";


$('#hls').on('change', function () {
 console.log(HLS_STREAM);
 CURRENT_STREAM = HLS_STREAM;
 load(HLS_STREAM);

});

$('#dash').on('change', function () {
  console.log(DASH_STREAM);
  CURRENT_STREAM = DASH_STREAM;
  load(DASH_STREAM);

});

function load(type) {
  putStreamTypeLabel(type)
  resetAllDivText();
  const idAsset = type == HLS_STREAM ? 1 : 2;
  const urlToGet = `${location.protocol}\/\/${location.hostname}/tokengenerate?id=` + idAsset;
  $.ajax({
    type: 'GET',
    url: urlToGet,
    success: function (data, status, xhr) {
      showResultDiv();
      showVideo();
      hideErrorDiv();

      var manifest_url = data;
      var l = getLocation(manifest_url);
      var tokens = l.pathname.substring(1, l.pathname.indexOf('/', 1)).split(".");
      const jwtHeader = library.json.prettyPrint(JSON.parse(atob(tokens[1])));
      const jwtPayload = library.json.prettyPrint(JSON.parse(atob(tokens[2])));

      showVideoMetadata(urlToGet, data, jwtHeader, jwtPayload);

      player.src({
        src: manifest_url
      });
      player.play();

    },
    error: function (data, status, xhr) {

      if (data.status == 404) {
        //not found
        showVideoError("Video asset not configured for " + type.toUpperCase()+ " !")
        showVideoErrorDiv();
        showResultDiv();
        hideVideo();

      } else {
        //different error
        $("#errorAsset").text("Unknown error!");

        showVideoErrorDiv();
        showResultDiv();

      }
      resetAllDivText();

    }
  });


}

function putStreamTypeLabel(stream_type) {
  $("#stream_type").text(stream_type.toUpperCase() + ' stream');

}

function resetAllDivText() {
  $("#request_url_value").text('');
  $("#playback_url_value").text('');
  $('#jwt_header').text('');
  $('#jwt_payload').html('');
}


var getLocation = function (href) {
  var l = document.createElement("a");
  l.href = href;
  return l;
};

if (!library)
  var library = {};

library.json = {
  replacer: function (match, pIndent, pKey, pVal, pEnd) {
    var key = '<span class=json-key>';
    var val = '<span class=json-value>';
    var str = '<span class=json-string>';
    var r = pIndent || '';
    if (pKey)
      r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
    if (pVal)
      r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
    return r + (pEnd || '');
  },
  prettyPrint: function (obj) {
    var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
    return JSON.stringify(obj, null, 3)
      .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(jsonLine, library.json.replacer);
  }
};


function showVideoMetadata(requestUrl, playbackUrl, jwtHeader, jwtPayload) {
  $("#request_url_value").text(requestUrl);
  $("#playback_url_value").text(playbackUrl);
  $('#jwt_header').html(jwtHeader);
  $('#jwt_payload').html(jwtPayload);
}

function showVideoError(errorMsg) {
  $("#errorAsset").text(errorMsg);
}
function showResultDiv() {
  $("#result").removeClass('d-none');
  $("#metadataDiv").removeClass('d-none');
}

function hideVideo(){
  $("#video_div").addClass('d-none');
  $("#metadataDiv").addClass('d-none');
}
function showVideo(){
  $("#video_div").removeClass('d-none');
  $("#metadataDiv").removeClass('d-none');
}

function showVideoErrorDiv() {
  $("#errorAsset").removeClass('d-none');
}

function hideErrorDiv() {
  $("#errorMsg").addClass('d-none');
  $("#errorAsset").addClass('d-none');
}

function enableRevokeSessionButton() {
  $('#sessionrevoke').prop('disabled', false);
  $("#sessionrevoke").text("Revoke current session");
}

function loadingRevokeSessionButton() {
  $('#sessionrevoke').prop('disabled', true);
  $("#sessionrevoke").text("Submitting...");
}



$('#refreshtoken').on('click', function () {

  if(CURRENT_STREAM =='hls'){
    load('hls');
  }else{
    load('dash');
  }
});


$('#sessionrevoke').on('click', function () {

  console.log("Session revoke");
  loadingRevokeSessionButton();

  const playback_url = $("#playback_url_value").text();
  var l = getLocation(playback_url);
  const session_id=l.pathname.split(".")[0].substring(1);
  console.log("session_id="+session_id);
  const urlToGet = `${location.protocol}\/\/${location.hostname}/sessionrevoke?sessionid=` + session_id;

  $.ajax({
    type: 'POST',
    url: urlToGet,
    success: function (data, status, xhr) {
      console.log("Session revocation OK");
      enableRevokeSessionButton();
    },
    error: function (data, status, xhr) {
      console.log("Session revocation error:" + JSON.stringify(data));
      if(data.status==0){
        showVideoError("Session revocation feature not deployed!");
      }
      enableRevokeSessionButton();

    }
  });

});



