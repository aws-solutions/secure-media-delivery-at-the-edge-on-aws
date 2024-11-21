// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import 'bootstrap/dist/css/bootstrap.min.css';
import 'video.js/dist/video-js.css';
import './css/app.css';

import $ from 'jquery';
import 'bootstrap';
import videojs from 'video.js';
import QRCode from 'qrcode'

window.$ = $;
window.jQuery = $;
window.videojs = videojs;
window.QRCode = QRCode;

import './js/main.js';