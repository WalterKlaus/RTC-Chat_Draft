
$(document).ready(function() {

// WebSocket
    var proId = $('#profileId').text().trim();
    var socket = io.connect('/',{query : {'proId' : proId} });//('/');
    var newChatter;
    var strWinLoc = window.location.toString();
    var pos = strWinLoc.indexOf('newChatter');// zurück von namer
    var msg;
    var iAmNotifier;

    function sendMessage(message){
        socket.emit('message', message);
    }
    if(pos < 0 && strWinLoc != 'https://walterklaus.de:61570/profile?reload'){
        msg = {
            type: 'openedElsewhere',
            profileId: proId
        };
        sendMessage(msg);
    }
    if(pos > -1){// zurück von namer
        msg = {
            type: 'newChatter',
            profileId: proId
        }
        iAmNotifier = true;
        newChatter = strWinLoc.slice(pos + 10);
        socket.emit('newChatter', {regChatName: newChatter, profileId: proId});
        sendMessage(msg);
    }
    pos = strWinLoc.indexOf('removedChatter');
    if( pos > -1){
        msg = {
            type: 'removedChatter',
            profileId: proId
        }
        removedChatter = strWinLoc.slice(pos + 14);
        //socket.emit('removedChatter',{removedChatter, proId});
        iAmNotifier = true;
        sendMessage(msg);
    }

    //pos = strWinLoc.indexOf('profileLinked');
    //if( pos > -1){
    //    msg = {
    //        type: 'profileLinked',
    //        profileId: proId
    //    }
    //    iAmNotifier = true;
    //    sendMessage(msg);
    //}
    pos = strWinLoc.indexOf('unlinked');
    if( pos > -1){
        msg = {
            type: 'profileUnlinked',
            profileId: proId
        }
        iAmNotifier = true;
        sendMessage(msg);
    }
    if(strWinLoc == 'https://walterklaus.de:61570/profile?reload'){
        if($('.alert.alert-danger').length){
            $('.alert.alert-danger').css({fontSize:13});
            $('.alert.alert-danger').html('Your Profile is opened/modified in another browser at: '+ new Date().toString().substring(0,28));
        }
        else{
            $('h1').append('<div class="alert alert-danger">'+'Your Profile is opened/modified in another browser at: '+ new Date().toString().substring(0,28)+'</div>');
            $('.alert.alert-danger').css({fontSize:13});
        }
    }
    socket.on('message', function (message) {
        if(message.profileId != proId){
            return;
        }
        switch (message.type){
            case 'openedElsewhere':
                if(iAmNotifier){
                    iAmNotifier = false;
                    return;
                }
                if($('.alert.alert-danger').length){
                    $('.alert.alert-danger').css({fontSize:13});
                    $('.alert.alert-danger').html('Your Profile is opened/modified in another browser at: '+ new Date().toString().substring(0,28));
                }
                else{
                    $('h1').append('<div class="alert alert-danger">'+'Your Profile is opened/modified in another browser at: '+ new Date().toString().substring(0,28)+'</div>');
                    $('.alert.alert-danger').css({fontSize:13});
                }
                break;
            case 'newChatter':
                window.location = '/profile?reload';
                break;
            case 'removedChatter':
                window.location = '/profile?reload';
                break;
            case 'profileLinked':
                window.location = '/profile?reload';
                break;
            case 'profileUnlinked':
                window.location = '/profile?reload';
                break;
        }
    });

    socket.on('nowOnline', function (userBusy, socketId) {
        $('#' + userBusy).css('opacity', '0.7');
        $('#' + userBusy).css("background", "red");
        $('#' + userBusy).attr('disabled', 'disabled');
        $('#remove' + userBusy).css('opacity', '0.7');
        $('#remove' + userBusy).css("background", "red");
        $('#remove' + userBusy).attr('disabled', 'disabled');

    });
    socket.on('nowOffline', function (chName) {

        $('#' + chName).css('opacity', '0.7');
        $('#' + chName).css("background", "White");
        $('#' + chName).removeAttr('disabled');
        $('#remove' + chName).css('opacity', '0.7');
        $('#remove' + chName).css("background", "White");
        $('#remove' + chName).removeAttr('disabled');

    });
    socket.on('nowUnbusy', function (chName) {

        $('#' + chName).css('opacity', '0.7');
        $('#' + chName).css("background", "White");
        $('#' + chName).removeAttr('disabled');
        $('#remove' + chName).css('opacity', '0.7');
        $('#remove' + chName).css("background", "White");
        $('#remove' + chName).removeAttr('disabled');

    });
    socket.on('profileRemoved', function(id){
        if(id != proId){
            return;
        }
        window.location = '/?profileRemoved' + id;
    });
    //$('.btnToSwitchEnter').each(function(index, obj){
    //    console.log('index: ' + index  + ' and object: ' + obj);
    //});
    //$('.btnToSwitchUnlink').each(function(index, obj){
    //    console.log('index: ' + index  + ' and object: ' + obj);
    //});
    //if( pos > -1){
    //    newChatter = strWinLoc.slice(pos + 10);
    //    socket.emit('newChatter', {newChatter, proId});
    //    console.log('newChatter: ' + newChatter);
    //}
    //var pos = strWinLoc.indexOf('removedChatter');
//
//
    //if( pos > -1){
    //    removedChatter = strWinLoc.slice(pos + 14);
    //    socket.emit('removedChatter',{removedChatter, proId});
    //}
//
//
    //socket.on('removedChatter', function(data){ // removedChatter has changed to be always an object/array
    //    if(data.proId != proId){
    //        return;
    //    }
    //    location.reload(true); // reload from server
    //});
    //socket.on('newChatter', function(data){
    //    if(data.proId == proId){
//
    //        location.reload(true); // reload from server
    //        //if($('enterChatForm').length == 0){
    //        //    var form  = $('<>')
    //        //}
    //        //var but = $('<button/>').attr({
    //        //    name: 'enterchatuser',
    //        //    type: 'submit',
    //        //    class: 'btn btn-default btnToSwitchEnter',
    //        //    id: data.regChatName
    //        //    //value: data.regChatName
    //        //});
    //        //but.append($('<span>::before</span>')
    //        //    .addClass('fa fa-sign-in')
    //        //    .text(data.regChatName));
////
    //        //$('#enterChatForm').append(but);
    //        //but = $('<button/>').attr({
    //        //    name: 'chatuser',
    //        //    type: 'submit',
    //        //    class: 'btn btn-default btnToSwitchUnlink',
    //        //    id: 'remove' + data.regChatName,
    //        //    value: data.regChatName
    //        //});
    //        //but.append($('<span>::before</span>')
    //        //        .addClass('fa fa-sign-out')
    //        //        .text(' ' + data.regChatName));
    //        //$('#unlinkChatForm').append(but);
//
    //    }
//
//
    //});
//
    ////socket.emit('profile', proId);
    //console.log('winLoc: ' + window.location);
    //socket.on('log', function (array) {
    //    console.log.apply(console, array);
    //});
    //socket.on('profileLinked', function(){
    //    window.location = 'profile?profileLinked';
    //});
    //socket.on('profileUnlinked', function(id){
    //    window.location = 'profile?profileUnlinked' + id;
    //});
    //socket.on('profileRemoved', function(id){
    //    window.location = '/?profileRemoved' + id;
    //});
    //socket.on('profileLinkedAndRemoved', function(id, exid){
    //    //window.location = '/?profileLinkedAndRemoved';
    //    location.reload(true);
    //});
//
    //socket.on('profileNew', function(id, exid){
    //    console.log('proID: ' + proId + ' id: ' + id + ' xid: ' + exid);
    //    if(proId == exid){
    //        window.location = '/?profileLinkedAndRemoved';
    //    }
    //});
//
    //socket.on('profileReopened', function(id){
    //    if(id != proId){
    //        return;
    //    }
    //    if($('.alert.alert-danger').length){
    //        $('.alert.alert-danger').css({fontSize:13});
    //        $('.alert.alert-danger').html('Your Profile is open in another browser at: '+ new Date().toString().substring(0,28));
    //    }
    //    else{
    //        $('h1').append('<div class="alert alert-danger">'+'Your Profile is open in another browser at: '+ new Date().toString().substring(0,28)+'</div>');
    //        $('.alert.alert-danger').css({fontSize:13});
    //    }
    //});
//
    //socket.on('profileChanged', function () {
    //    if($('.alert.alert-danger').length){
    //        $('.alert.alert-danger').css({fontSize:13});
    //        $('.alert.alert-danger').html('Your Profile has been changed in another window at: '+ new Date().toString().substring(0,28));
    //    }
    //    else{
    //        $('h1').append('<div class="alert alert-danger">'+'Your Profile has been changed in another window at: '+ new Date().toString().substring(0,28)+'</div>');
    //        $('.alert.alert-danger').css({fontSize:13});
    //    }
    //});
    //socket.on('chatMan', function(user){
    //    if(!user){
    //        window.location.search = 'index';
    //    }
    //    var str = "";
    //    if($('.alert.alert-danger').length){
    //        $('.alert.alert-danger').css({fontSize:13});
    //        $('.alert.alert-danger').html('Your Profile has been opened/modified in another browser at: '+ new Date().toString().substring(0,28));
    //    }
    //    else{
    //        $('h1').append('<div class="alert alert-danger">'+'Your Profile has been opened/modified in another browser at: '+ new Date().toString().substring(0,28) + '</div>');
    //        $('.alert.alert-danger').css({fontSize:13});
    //    }
    //    // profile Information
    //    $('#profileId').value = user._id;
//
    //    //<!-- LOCAL INFORMATION -->
//
    //    $('.localInfo').empty();
    //    str = "<h3><span class=\"fa fa-user\"></span> Local</h3>";
    //    $('.localInfo').append(str);
    //    if (user.local == undefined || !user.local.email) {
    //        str = "<a href=\"/connect/local\" class=\"btn btn-default\" id=\"connectLocal\">Connect Local</a>";
    //    }
    //    else {
    //        str = "<p><strong>username</strong>: " + user.local.email + "<br></p>"+
    //        "<a href=\"/unlink/local\" class=\"btn btn-default\" id=\"localUnlink\">Unlink</a>";
    //    }
    //    $('.localInfo').append(str);
//
    //    $('.facebookInfo').empty();
    //    str = "<h3 class=\"text-primary\"><span class=\"fa fa-facebook\"></span> Facebook</h3>";
    //    $('.facebookInfo').append(str);
    //    if (user.facebook == undefined || !user.facebook.id) {
    //        str = "<a href=\"/connect/facebook\" class=\"btn btn-primary\" id=\"connectFacebook\">Connect Facebook</a>";
    //    } else {
    //        str ="<p><strong>email</strong>: " + user.facebook.email +"<br><strong>name</strong>: " + user.facebook.name +"<br>" +
    //        "</p><a href=\"/unlink/facebook\" class=\"btn btn-primary\" id=\"facebookUnlink\">Unlink</a>" ;
    //        //"<a href=\"/invite/facebook\" class=\"btn btn-primary\" id=\"inviteFacebook\">Invite friends</a>";
    //    }
    //    $('.facebookInfo').append(str);
    //    $('.googleInfo').empty();
    //    str = "<h3 class=\"text-danger\"><span class=\"fa fa-google-plus\"></span> Google+</h3>";
    //    $('.googleInfo').append(str);
    //    if (user.google == undefined || !user.google.id) {
    //        str = "<a href=\"/connect/google\" class=\"btn btn-danger\" id=\"connectGoogle\">Connect Google</a>";
    //    } else {
    //        str = "<p><strong>email</strong>: " + user.google.email + "<br>" +
    //        "<strong>name</strong>: " + user.google.name + "</p>" +
    //        "<a href=\"/unlink/google\" class=\"btn btn-danger\" id=\"googleUnlink\">Unlink</a>";
    //    }
    //    $('.googleInfo').append(str);
//
    //});
    //$('#connectFacebook').click(function(){
    //    socket.emit('connectFacebook','');

    //});
    window.onbeforeunload = function(evt){
        socket.emit('proOff', profileId.innerText);
    };
});
