'use strict';

//var videoElement = document.querySelector('video');
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');;
var isAndroid = false;
var audioInputSelect = document.querySelector('select#audioSource');
var audioOutputSelect = document.querySelector('select#audioOutput');
var videoSelect = document.querySelector('select#videoSource');
var selectors = [audioInputSelect, audioOutputSelect, videoSelect];
var isChannelReady;
var isInitiator = false;
var isStarted = false;
var localStream;
var localAudioStream;
var localVideoStream;
var constraints;
var audioSource;
var videoSource;
var hasAddTrack;
var pc;
var remoteStream;
var turnReady;
var atrx;
var vtrx;

var pc_config = {'iceServers': [{'urls': 'turn:numb.viagenie.ca:3478',
        'credential': '!Boingo_01',
        'username': 'walter@walterklaus.de'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
    'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
    }
};
var chatName;
var textChannel = false;
var fileChannel = false;
var contactCaller = "";
var contactCallee = "";
var acceptCall;
var Freiton = new Audio('../audio/Freiton1.ogg');
var Klingelton = new Audio('../audio/Ring.mp3');
var hangupName = '';
var room;
var acceptBox;
var origFSize;
var origFName;
var socket;
var notification = '';


//requestTurn();

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
        return select.value;
    });
    selectors.forEach(function(select) {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (var i = 0; i !== deviceInfos.length; ++i) {
        var deviceInfo = deviceInfos[i];
        var option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label ||
                'microphone ' + (audioInputSelect.length + 1);
            audioInputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'audiooutput') {
            option.text = deviceInfo.label || 'speaker ' +
                (audioOutputSelect.length + 1);
            audioOutputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
            videoSelect.appendChild(option);
        } else {
            console.log('Some other kind of source/device: ', deviceInfo);
        }
    }
    selectors.forEach(function(select, selectorIndex) {
        if (Array.prototype.slice.call(select.childNodes).some(function(n) {
                return n.value === values[selectorIndex];
            })) {
            select.value = values[selectorIndex];
        }
    });
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(sinkId)
            .then(function() {
                console.log('Success, audio output device attached: ' + sinkId);
            })
            .catch(function(error) {
                var errorMessage = error;
                if (error.name === 'SecurityError') {
                    errorMessage = 'You need to use HTTPS for selecting audio output ' +
                        'device: ' + error;
                }
                console.error(errorMessage);
                // Jump back to first output device in the list as it's the default.
                audioOutputSelect.selectedIndex = 0;
            });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}
function changeAudioDestination() {
    var audioDestination = audioOutputSelect.value;
    attachSinkId(localVideo, audioDestination);
}

function gotStream(stream) {
    //window.stream = stream; // make stream available to console
    if(localStream) {
        localStream.getTracks().forEach(function(track) {
            track.stop();
            //track.remove;
        });
    }
    localVideo.srcObject = null;
    localStream = stream;
    localVideo.srcObject = localStream;
    return new Promise(resolve => localVideo.onplaying = resolve);
}
function start() {
    if(localStream) {
        localStream.getTracks().forEach(function(track) {
            track.stop();
            //track.remove;
        });
    }
    $('#DeviceSettingsButton').hide();
    //var audioSource = audioInputSelect.value;
    //var videoSource = videoSelect.value;
    constraints = {
        audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
        video: {deviceId: videoSource ? {exact: videoSource} : undefined}
    };
    isStarted = false;
    navigator.mediaDevices.getUserMedia(constraints).
    then(gotStream).
    then(function () {
        localVideo.srcObject = localStream;
        $('#DeviceSettingsButton').show();
        return navigator.mediaDevices.enumerateDevices();
    }).
    then(gotDevices).catch(handleError('no valid stream at start'));
}
function contact(caller, callee) {
    //todo:check if busy
    //isCaller = true;
    contactCaller = caller;
    contactCallee = callee;
    console.log('caller: ' + caller + ' callee: ' + callee);
    isInitiator = true;
    $('#DeviceSettingsButton').hide();
    isStarted = true;
    Freiton.pause();
    Freiton.currentTime = 0;
    $('.settings').hide();
    $('.chatters').hide();
    socket.emit('nowBusy', chatName);

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        if(localStream) {
            localStream.getTracks().forEach(function(track) {
                track.stop();
                //track.remove;
            });
        }
        localVideo.srcObject = null;
        /* use the stream */
        localStream = stream;
        localVideo.srcObject = localStream;
        return new Promise(resolve => localVideo.onplaying = resolve);
    }).then(function () {
        hangupName = contactCallee;
        $('#dataChannelSend').show();
        $('#hangup')[0].childNodes[2].nodeValue = 'Hangup: "' + contactCallee + '"';
        $('#hangup').show();

    } );
    socket.emit('contact', contactCaller, contactCallee);
}
function sendData() {
    var textSender = '';
    if(isInitiator){
        textSender = contactCaller;
    }
    else{
        textSender = contactCallee;
    }
    var d = new Date().toLocaleTimeString();
    var data = '\n' +  textSender + ' schrieb um: ' + d + ':\n\n' + $("#dataChannelSend").val();
    $('#dataChannelReceive').val($('#dataChannelReceive').val() + '\n' + data);
    $('#dataChannelReceive').scrollTop($('#dataChannelReceive')[0].scrollHeight);

    textChannel.send(data);
    $('#dataChannelSend').val('');
}
function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}
function hangup(chatName) {
    socket.emit('hangup', chatName);
    $('#hangup').hide();
    console.log('Hanging up.');
    Freiton.pause();
    Freiton.currentTime = 0;
    Klingelton.pause();
    Klingelton.currentTime = 0;
    isStarted = false;
    stop();
}

function handleRemoteHangup() {
    //acceptBox.hide();
    if(acceptBox != undefined){
        acceptBox.hide();
        var d = new Date();
        notification = 'verpasster Anruf von: ' + contactCaller + ' am: ' + d.toLocaleString() + ('<br>');
        $('.chatters').append(notification);
    }
    stop();
    //localStream.getTracks().forEach(function (track) {
    //    console.log('still tracks!');
    //    track.stop();
    //    localStream.removeTrack(track);
    //    //track.remove;
    //});
    console.log('remote Hangup.');
    Freiton.pause();
    Freiton.currentTime = 0;
    Klingelton.pause();
    Klingelton.currentTime = 0;
    isInitiator = false;
}

function stop() {
    console.log('Session stopped?');
    $('.settings').hide();
    $('#DeviceSettingsButton').show();
    contactCallee = contactCaller = '';
    if (localStream) {
        localStream.getTracks().forEach(function(track) {
            track.stop();
            //track.remove;
        });
    }else
    {

        console.log('no localStream');
    }
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    $('.chatters').show();
    $('.textchat').hide();
    $('#files').hide();
    $('#downloadList').empty();
    $('#files').val('');
    $('#dataChannelReceive').val('');
    $('#dataChannelSend').val('');
    sendProgress.style.visibility = "hidden";
    isStarted = false;
    isInitiator = false;
    isChannelReady = true;
    $('#hangup').hide();
    fileChannel = null;
    textChannel = null;
    socket.emit('nowUnbusy', chatName);
    if(pc){
        pc.close();
        pc = null;
    }
}

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
    var sdpLines = sdp.split('\r\n');
    var mLineIndex;
    // Search for m line.
    for (var i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('m=audio') !== -1) {
            mLineIndex = i;
            break;
        }
    }
    if (mLineIndex === null) {
        return sdp;
    }

    // If Opus is available, set it as the default in m line.
    for (i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('opus/48000') !== -1) {
            var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
            if (opusPayload) {
                sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
            }
            break;
        }
    }

    // Remove CN in m line and sdp.
    sdpLines = removeCN(sdpLines, mLineIndex);

    sdp = sdpLines.join('\r\n');
    return sdp;
}

function extractSdp(sdpLine, pattern) {
    var result = sdpLine.match(pattern);
    return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
    var elements = mLine.split(' ');
    var newLine = [];
    var index = 0;
    for (var i = 0; i < elements.length; i++) {
        if (index === 3) { // Format of media starts from the fourth.
            newLine[index++] = payload; // Put target payload to the first.
        }
        if (elements[i] !== payload) {
            newLine[index++] = elements[i];
        }
    }
    return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
    var mLineElements = sdpLines[mLineIndex].split(' ');
    // Scan from end for the convenience of removing an item.
    for (var i = sdpLines.length - 1; i >= 0; i--) {
        var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
        if (payload) {
            var cnPos = mLineElements.indexOf(payload);
            if (cnPos !== -1) {
                // Remove CN payload from m line.
                mLineElements.splice(cnPos, 1);
            }
            // Remove CN line in sdp
            sdpLines.splice(i, 1);
        }
    }

    sdpLines[mLineIndex] = mLineElements.join(' ');
    return sdpLines;
}


audioInputSelect.onchange = deviceSel;
audioOutputSelect.onchange = changeAudioDestination;
videoSelect.onchange = deviceSel;

function deviceSel() {
    audioSource = audioInputSelect.value;
    videoSource = videoSelect.value;
    start();// start nur hier durchführen?


}
//start();

function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}
function createPeerConnection() {
    //dataConstraint = null;
    try {

        pc = new RTCPeerConnection(null);
        // Do we have addTrack()? If not, we will use streams instead.

        hasAddTrack = (pc.addTrack !== undefined);

        pc.onicecandidate = handleIceCandidate;
        pc.onremovestream = handleRemoteStreamRemoved;
        if (hasAddTrack) {
            pc.ontrack = handleRemoteStreamTrackAdded;
        } else {
            pc.onaddstream = handleRemoteStreamAdded;
        }

        textChannel = pc.createDataChannel('tChannel');
        fileChannel = pc.createDataChannel('fChannel');
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}
function handleIceCandidate(event) {
    //console.log('handleIceCandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        console.log('End of candidates.');
    }
}
function handleRemoteStreamTrackAdded(event) {
    console.log('Remote streamTrack added.');
    //remoteVideo.srcObject = event.streams[0];

    $('#hangup')[0].childNodes[2].nodeValue = 'Hangup: "' + hangupName + '"';
    $('#hangup').show();
    Freiton.pause();
    Freiton.currentTime = 0;
    $('#files').show();
    //socket.emit('nowBusy', chatName);
    textChannel = pc.createDataChannel('tChannel');
    fileChannel = pc.createDataChannel('fChannel');
    $('.textchat').show();
    textChannel.onmessage = function(e){
        $('#dataChannelReceive').val('\n' + $('#dataChannelReceive').val() + '\n' + e.data);
        console.log('received text:' + '\n' + $('#dataChannelReceive').val() + '\n' + e.data);
        $('#dataChannelReceive').scrollTop($('#dataChannelReceive')[0].scrollHeight);
    }
    fileChannel.binaryType = 'arraybuffer';
    var receiveBuffer = [];
    var receivedSize = 0;
    fileChannel.onmessage = function(event){
        receiveBuffer.push(event.data);
        receivedSize += event.data.byteLength;
        // we are assuming that our signaling protocol told
        // about the expected file size (and name, hash, etc).
        if (receivedSize === origFSize) {
            var received = new window.Blob(receiveBuffer);
            receiveBuffer = [];

            var save = document.createElement('a');
            var fUrl = URL.createObjectURL(received);
            save.href = fUrl;
            save.target = '_blank';
            save.download = origFName || fUrl;
            save.innerHTML = 'Download: ' + origFName;
            var listItem = document.createElement('li');
            listItem.appendChild(save);
            $('#downloadList').append(listItem);
            receiveBuffer = [];
            receivedSize = 0;
        }

    }
    $('#dataChannelSend').disabled = false;
    $('#sendButton').show();
    $('#dataChannelReceive').show();
    $('#dataChannelSend').show();
    //$('#dataChannelReceive').disabled = false;
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;

}
function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteVideo.srcObject = event.stream;
    $('#hangup')[0].childNodes[2].nodeValue = 'Hangup: "' + hangupName + '"';
    $('#hangup').show();
    Freiton.pause();
    Freiton.currentTime = 0;
    $('#files').show();
    //socket.emit('nowBusy', chatName);
    textChannel = pc.createDataChannel('tChannel');
    fileChannel = pc.createDataChannel('fChannel');
    $('.textchat').show();
    textChannel.onmessage = function(e){
        $('#dataChannelReceive').val('\n' + $('#dataChannelReceive').val() + '\n' + e.data);
        console.log('received text:' + '\n' + $('#dataChannelReceive').val() + '\n' + e.data);
        $('#dataChannelReceive').scrollTop($('#dataChannelReceive')[0].scrollHeight);
    }
    fileChannel.binaryType = 'arraybuffer';
    var receiveBuffer = [];
    var receivedSize = 0;
    fileChannel.onmessage = function(event){
        receiveBuffer.push(event.data);
        receivedSize += event.data.byteLength;
        // we are assuming that our signaling protocol told
        // about the expected file size (and name, hash, etc).
        if (receivedSize === origFSize) {
            var received = new window.Blob(receiveBuffer);
            receiveBuffer = [];

            var save = document.createElement('a');
            var fUrl = URL.createObjectURL(received);
            save.href = fUrl;
            save.target = '_blank';
            save.download = origFName || fUrl;
            save.innerHTML = 'Download: ' + origFName;
            var listItem = document.createElement('li');
            listItem.appendChild(save);
            $('#downloadList').append(listItem);
            receiveBuffer = [];
            receivedSize = 0;
        }

    }
    $('#dataChannelSend').disabled = false;
    $('#sendButton').show();
    $('#dataChannelReceive').show();
    $('#dataChannelSend').show();
    //$('#dataChannelReceive').disabled = false;
}


function handleCreateOfferError(event) {
    console.log('createOffer() error: ', e);
}
function doAnswer() {
    console.log('Sending answer to peer.');
    textChannel = pc.createDataChannel('tChannel');
    fileChannel = pc.createDataChannel('fChannel');
    pc.ondatachannel = function(e){// datachannel wird vom offerer angelegt und vom answerer per ondatachannel abgeh?rt
        if(e.channel.label == 'tChannel'){
            textChannel = e.channel;
            textChannel.onmessage = function(e){
                $('#dataChannelReceive').val('\n' + $('#dataChannelReceive').val() + '\n' + e.data);
                console.log('received text:' + '\n' + $('#dataChannelReceive').val() + '\n' + e.data);
                $('#dataChannelReceive').scrollTop($('#dataChannelReceive')[0].scrollHeight);
            }
        }
        else if(e.channel.label == 'fChannel'){
            var receiveBuffer = [];
            var receivedSize = 0;
            fileChannel = e.channel;
            fileChannel.binaryType = 'arraybuffer';
            fileChannel.onmessage = function(event){
                receiveBuffer.push(event.data);
                receivedSize += event.data.byteLength;
                // we are assuming that our signaling protocol told
                // about the expected file size (and name, hash, etc).
                if (receivedSize === origFSize) {
                    var received = new window.Blob(receiveBuffer);
                    receiveBuffer = [];

                    var save = document.createElement('a');
                    var fUrl = URL.createObjectURL(received);
                    save.href = fUrl;
                    save.target = '_blank';
                    save.download = origFName || fUrl;
                    save.innerHTML = 'Download: ' + origFName;
                    var listItem = document.createElement('li');
                    listItem.appendChild(save);
                    $('#downloadList').append(listItem);
                    receiveBuffer = [];
                    receivedSize = 0;

                }
            };
            console.log('received File');
        }
        console.log('onData');
    };
    $('#dataChannelSend').disabled = false;
    $('#sendButton').show();
    $('#dataChannelReceive').show();
    $('.settings').hide();
    $('.chatters').hide();
    Klingelton.pause();
    Klingelton.currentTime = 0;
}
function handleCreateAnswerError(e){
    console.log(e);

}
var chunkLength = 16384;
var file;
function addFiles(files){
    console.log('AddFiles');
    file = files[0];
    var chunkSize = 16384;
    var sliceFile = function(offset) {
        socket.emit('file', file.size, file.name);
        var reader = new window.FileReader();
        sendProgress.max = file.size;
        sendProgress.style.visibility = "visible";
        //sendProgress.value = 30;
        reader.onload = (function() {
            return function(e) {
                fileChannel.send(e.target.result);
                if (file.size > offset + e.target.result.byteLength) {
                    window.setTimeout(sliceFile, 0, offset + chunkSize);
                }
                sendProgress.value = offset + e.target.result.byteLength;
                if(sendProgress.value >= file.size - chunkSize){
                    sendProgress.style.visibility = "hidden";
                }
            };
        })(file);
        var slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    };
    sliceFile(0);

}
function onReadAsDataURL(event, text) {
    var data = {}; // data object to transmit over data channel
    $('#files').disabled = true;
    if (event){
        text = event.target.result; // on first invocation
        socket.emit('file', file);
    }

    if (text.length > chunkLength) {
        data.message = text.slice(0, chunkLength); // getting chunk using predefined chunk length
    } else {
        data.message = text;
        data.last = true;
        $('#dataChannelReceive').val('\n' + $('#dataChannelReceive').val() + '\n' + 'You shared a file: ' + file.name);
        $('#files').disabled = false;
    }
    console.log(JSON.stringify(data));
    fileChannel.send(JSON.stringify(data)); // use JSON.stringify for chrome!

    var remainingDataURL = text.slice(data.message.length);
    if (remainingDataURL.length) setTimeout(function () {
        onReadAsDataURL(null, remainingDataURL); // continue transmitting
    }, 500)
}
function saveToDisk(fileUrl, fileName, fileOrigName) {
    $('#dataChannelReceive').val('\n' + $('#dataChannelReceive').val() + '\n' + 'You received: ' + fileOrigName + ' Download it?');
    var save = document.createElement('a');
    save.href = fileUrl;
    save.target = '_blank';
    save.download = fileName || fileUrl;
    save.innerHTML = 'Download: ' + fileOrigName;
    var listItem = document.createElement('li');
    listItem.appendChild(save);
    $('#downloadList').append(listItem);
    var event = document.createEvent('Event');
    event.initEvent('click', true, true);
    (window.URL || window.webkitURL).revokeObjectURL(save.href);
}
function setLocalAndSendMessage(sessionDescription) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    //sendMessage(sessionDescription);
}

function requestTurn() {
    var turnExists = false;
    for (var i in pc_config.iceServers) {
        if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
            turnExists = true;
            turnReady = true;
            break;
        }
    }
    //if (!turnExists) {
    //    console.log('Getting TURN server from ', turn_url);
    //    // No TURN server. Get one from computeengineondemand.appspot.com:
    //    var xhr = new XMLHttpRequest();
    //    xhr.onreadystatechange = function () {
    //        if (xhr.readyState === 4 && xhr.status === 200) {
    //            var turnServer = JSON.parse(xhr.responseText);
    //            console.log('Got TURN server: ', turnServer);
    //            pc_config.iceServers.push({
    //                'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
    //                'credential': turnServer.password
    //            });
    //            turnReady = true;
    //        }
    //    };
    //    xhr.open('GET', turn_url, true);
    //    xhr.send();
    //}
}

window.onbeforeunload = function (e) {//raus
    socket.emit('accountInactive', chatName);
    stop();
    socket.emit('nowOffline', chatName);
    socket.emit('hangup', hangupName);
    //sendMessage('bye');
}
function sendMessage(message){
    //console.log('Client sending message: ', message);
    // if (typeof message === 'object') {
    //   message = JSON.stringify(message);
    // }
    socket.emit('message', message);
}
/////////////////////////////////////////////////////////


$(document).ready(function() {
    $('#DeviceSettingsButton').hide();

    socket = io.connect();
    if (window.performance) {
        console.info("window.performance work's fine on this browser");
    }
    if (performance.navigation.type == 1) {
        console.info( "This page is reloaded" );
        //stop();

    } else {
        console.info( "This page is not reloaded");
    }
    var ua = navigator.userAgent;
    var checker = {
        iphone: ua.match(/(iPhone|iPod|iPad)/),

        blackberry: ua.match(/BlackBerry/),
        android: ua.match(/Android/)
    };
    if (checker.android) {
        isAndroid = true;
    }
    else if (checker.iphone) {
    }
    else if (checker.blackberry) {
    }
    else {
    }

    $('.settings').show();
    $('.chatters').hide();
    $('#DeviceSettingsButton').css({background : 'lightgreen'});
    chatName = $('#chatUser').text();
    socket.emit('nowOffline', chatName);
    room = chatName;
    socket.emit('accountActive', chatName);
    start();
    $('#DeviceSettingsButton').click(function(){
        if(this.innerText == 'Use this Device Settings'){
            this.innerText = 'Device Settings';
            $('#DeviceSettingsButton').css({background : 'white'});
            $('.settings').hide();
            $('.chatters').show();
            socket.emit('nowOnline', chatName);
            if (localStream) {
                localStream.getTracks().forEach(function(track) {
                    track.stop();
                    //track.remove;
                });
                localVideo.srcObject = null;
            }
            //start();
            audioSource = audioInputSelect.value;
            videoSource = videoSelect.value;
            constraints = {
                audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
                video: {deviceId: videoSource ? {exact: videoSource} : undefined}
            };
            return;
        }
        $('#DeviceSettingsButton').hide();
        $('#DeviceSettingsButton').css({background : 'lightgreen'});
        socket.emit('nowOffline', chatName);
        start();
        this.innerText = 'Use this Device Settings';
        //localVideo.srcObject = window.stream;

        $('.chatters').hide();
        $('.settings').show();
    });
    $('#sendButton').click(sendData);
    $('#hangup').click(function () {
        hangup(hangupName);
    });
    $('#logout').click(function () {
        socket.emit('nowOffline', chatName);
    })
    $('#profile').click(function () {
        socket.emit('nowOffline', chatName);
    })


    $('.textchat').hide();
    $('#hangup').hide();
    $('#files').hide();

    //remoteVideo = document.querySelector('#remoteVideo');
    var sendProgress = document.querySelector('#sendProgress');
    sendProgress.style.visibility = "hidden";
    sendProgress.style.display = "inline";

    $('.users').each(function (i) {
        console.log($('.users')[i].id);
        $('.users')[i].style.opacity = '0.7';
        if ($('.users')[i].style.backgroundColor == 'lightgreen' || $('.users')[i].style.backgroundColor == "rgb(144, 238, 144)") {
            $('.users')[i].disabled = false;
        }
        else {
            $('.users')[i].disabled = true;
        }
    });


    if (room !== '') {
        isChannelReady = true;
        console.log('Create or join room', room);
        socket.emit('create or join', room);
    }

    // erstmal den Signalbruder aufsetzen
    socket.emit('createDialogRoom', chatName);
    socket.on('created', function (room) {
        console.log('Created room ' + room);
        isInitiator = true;
    });
    socket.on('full', function (room) {
        console.log('Room ' + room + ' is full');
    });
    socket.on('join', function (room) {
        console.log('Another peer made a request to join room ' + room);
        console.log('This peer is the initiator of room ' + room + '!');
        isChannelReady = true;
    });
    socket.on('joined', function (room) {
        console.log('This peer has joined room ' + room);
        isChannelReady = true;
    });
    socket.on('log', function (array) {
        console.log.apply(console, array);
    });
    socket.on('contact', function (caller, callee) {
        contactCaller = caller;
        contactCallee = callee;
        if (chatName == callee) {

            socket.emit('nowBusy', chatName);
            Klingelton.loop = true;
            Klingelton.volume = 0.2;
            Klingelton.play();

            console.log('I am Callee: ' + callee);
            //isChannelReady = true;
            if (!isInitiator && !isStarted) {
                $('.chatters').hide();
                acceptBox =  bootbox.confirm("Accept Call from "+ contactCaller +"?", function(result) {
                    acceptCall = result;
                    if (!acceptCall) {
                        Klingelton.pause();
                        Klingelton.currentTime = 0;
                        hangup(contactCaller);
                        return;
                    }
                    else{
                        sendMessage({type: 'callAccepted',caller: caller, callee: callee});
                    }
                });
            }
        }
    });
    socket.on('hangup', function(name){
        if(chatName == name){
            handleRemoteHangup();
        }
    });
    socket.on('message', function (message) {
        //console.log('Client received message:', message);
        if (message === 'got user media') {
            //maybeStart();
        } else if (message.type === 'offer' && message.target == chatName) { //&& contactCallee == chatName
            if (!isInitiator && !isStarted) {
                createPeerConnection();
                doAnswer();
                isStarted = true;
                contactCaller = hangupName = message.name;
                pc.setRemoteDescription(message.sdp).then(function () {
                    return navigator.mediaDevices.getUserMedia(constraints);
                }).then(function (stream) {
                    if(localStream) {
                        localStream.getTracks().forEach(function(track) {
                            track.stop();
                            //track.remove;
                        });
                    }
                    localStream = stream;
                    if (hasAddTrack) {
                        localStream.getTracks().forEach(track =>
                        pc.addTrack(track, localStream));
                    } else {
                        pc.addStream(localStream);
                    }
                    localVideo.srcObject = null;
                    localVideo.srcObject = localStream;
                    return; //new Promise(resolve => localVideo.onplaying = resolve);

                })
                    .then(function () {
                        return pc.createAnswer();
                    })
                    .then(function (answer) {
                        setLocalAndSendMessage(message);
                        answer.sdp = preferOpus(answer.sdp);
                        return pc.setLocalDescription(answer);
                    })
                    .then(function() {
                        var msg = {
                            type: "answer",
                            sdp: pc.localDescription
                        };
//
                        // We've configured our end of the call now. Time to send our
                        // answer back to the caller so they know that we want to talk
                        // and how to talk to us.
//
                        sendMessage(msg);
                    })
                    .catch(handleError('unable to answer'));
                $('#DeviceSettingsButton').hide();
            }
        } else if (message.type === 'answer' && isStarted) {
            pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === 'candidate' && isStarted) {
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: message.label,
                candidate: message.candidate
            });
            pc.addIceCandidate(candidate);
        } else if (message === 'bye' && isStarted) {
            handleRemoteHangup();
        } else if (message.type === 'callAccepted' && isStarted) {
            createPeerConnection();
            if (hasAddTrack) {
                localStream.getTracks().forEach(track =>
                pc.addTrack(track, localStream));
            } else {
                pc.addStream(localStream);
            }
            pc.createOffer().then(function(offer) {
                return pc.setLocalDescription(offer);
            }).then(function() {
                sendMessage({
                    name: contactCaller,
                    target: contactCallee,
                    type: 'offer',
                    sdp: pc.localDescription
                });
            }).catch(function(err) {
                console.log('setLocalDescription failed! '  + err.message);
            });
            console.log('accepted');
        }

    });
    socket.on('file', function(fileSize, fileName){
        origFSize = fileSize;
        origFName = fileName;
        console.log('file info');
    });
    socket.on('newChatter',function(data){
        var btnCount = 0;
        var bExit = false;
        var str = '<button type=\"submit\" disabled class=\"btn btn-default users\" id=\"' + data.regChatName + '\" value = \"' + data.regChatName + '\"><span class=\"fa fa-sign-in\"></span> ' + data.regChatName + ' </button>';
        $('.users').each(function(index){
            btnCount += 1;
            if(data.regChatName < $('.users')[index].value ){
                console.log('found ' + $('.users')[index].value);
                $('#' + $('.users')[index].value).before(str);
                bExit = true;
                return false;
            }
        });
        if(!bExit || btnCount == 0){
            $('.chatters').append(str);
        }
    });
    socket.on('removedChatter', function(removedChatter){
        $('#' + removedChatter).remove();
    });
    socket.on('nowOnline', function (chName) {

        if ($('#' + chName) && chName != chatName) {
            $('#' + chName).css('opacity', '0.7');
            $('#' + chName).css("background", "lightgreen");
            $('#' + chName).removeClass('disabled');
            $('#' + chName).removeAttr('disabled');
            // $('#' + chName).prop('disabled', 'false');
            //$('#' + chName).enable();
            //$('#' + chName).css('disabled','false');
        }
    });
    socket.on('nowBusy', function (userBusy) {
        if ($('#' + userBusy)) {
            $('#' + userBusy).css('opacity', '0.7');
            $('#' + userBusy).css("background", "red");
            $('#' + userBusy).attr('disabled', 'disabled');

            //$('#' + userBusy).disabled = true;
        }
    });
    socket.on('nowUnbusy', function (userUnbusy) {
        console.log('unbusy: ' + userUnbusy);
        if ($('#' + userUnbusy)) {
            $('#' + userUnbusy).css('opacity', '0.7');
            $('#' + userUnbusy).css("background", "lightgreen");
            $('#' + userUnbusy).removeAttr('disabled');
            //$('#' + chName).disabled = false;
        }
    });
    socket.on('nowOffline', function (chName) {

        if ($('#' + chName) && chName != chatName) {
            $('#' + chName).css('opacity', '0.7');
            $('#' + chName).css("background", "White");
            //$('#' + chName).disable();
            //$('#' + chName).disabled = true;
            $('#' + chName).attr('disabled', 'disabled');
            $('#' + chName).addClass('disabled');
        }
    });
    socket.on('unlinkedAccount', function (chName) {

        if ($('#' + chName)) {
            $('#' + chName).remove();
        }
    });


});
