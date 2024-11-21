// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

import videojs from 'video.js';
import QRCode from 'qrcode';
import $ from 'jquery';

var player = videojs('my_video_1');

const HLS_STREAM = "hls";
const DASH_STREAM = "dash";
var CURRENT_STREAM = "";



$('#hls').on('change', function () {
 CURRENT_STREAM = HLS_STREAM;
 load();

});

$('#dash').on('change', function () {
  CURRENT_STREAM = DASH_STREAM;
  load();

});

function load() {

  putStreamTypeLabel(CURRENT_STREAM)
  resetAllDivText();
  
  const idAsset = CURRENT_STREAM == HLS_STREAM ? 1 : 2;
  const urlToGet = `${location.protocol}\/\/${location.hostname}/tokengenerate?id=` + idAsset;

  $.ajax({
    type: 'GET',
    url: urlToGet,
    success: function (data, status, xhr) {
      showResultDiv();
      showVideo();
      hideErrorDiv();

      const parsedData = JSON.parse(data);
      var manifest_url = parsedData.playback_url;
      var token_policy = parsedData.token_policy;

      $('#referer').each(function(){ this.checked = token_policy.referer == 1 ? true : false });
      $('#ip').each(function(){ this.checked = token_policy.ip == 1 ? true : false });
      $('#ua').each(function(){ this.checked = token_policy.ua == 1 ? true : false });

      $('#ipvalue').html(token_policy.ip_value);
      $('#uavalue').html(token_policy.ua_value);
      $('#referevalue').html(token_policy.referer_value);

      var l = getLocation(manifest_url);
      var tokens = l.pathname.substring(1, l.pathname.indexOf('/', 1)).split(".");
      const jwtHeader = library.json.prettyPrint(JSON.parse(atob(tokens[1])));
      const jwtPayload = library.json.prettyPrint(JSON.parse(atob(tokens[2])));

      showVideoMetadata(urlToGet, manifest_url, jwtHeader, jwtPayload);
      
      // set qr code to the manifest url
      const options = {
        width: 280,
      };
      const canvas = document.getElementById('qrcode');
      QRCode.toCanvas(canvas, manifest_url, options, function (error) {
        if (error) console.error(error);
      });

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

function toggle () {

  const ip = $('#ip:checked').val() ? 1 : 0;
  const ua = $('#ua:checked').val() ? 1 : 0;
  const referer = $('#referer:checked').val() ? 1 : 0;
  const idAsset = CURRENT_STREAM == HLS_STREAM ? 1 : 2;
  const urlToGet = `${location.protocol}\/\/${location.hostname}/updatetoken?id=${idAsset}&ip=${ip}&ua=${ua}&referer=${referer}`;
  console.log("urltoget="+urlToGet);
  $.ajax({
    type: 'POST',
    url: urlToGet,
    success: function (data, status, xhr) {
      console.log("Update token OK");
      enableRevokeSessionButton();
    },
    error: function (data, status, xhr) {
      console.log("Update token error:" + JSON.stringify(data));

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
  $("#video_div").addClass('d-none');

  $('#ipvalue').html('');
  $('#uavalue').html('');
  $('#referevalue').html('');

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
  $("#qrcode").removeClass('d-none');
}

function showVideoError(errorMsg) {
  $("#errorAsset").text(errorMsg);
}
function showResultDiv() {
  //$("#result").removeClass('d-none');
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

    load();
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

