var playProcess;
var api = require('./doubanapi.js');
var playlist = new Array();
var defaultChannel = channels[0];
var currentChannel = defaultChannel.id;
var cookieToken = null;
var sid;
var lastSong;


$(document).ready(function () {

    playProcess=$('#playProcess');

    $('#nextBtn').bind('click', playNext);

    for (var k = 0; k < channels.length; k++) {
        var li = $('<li channel="' + channels[k].id + '"><a href="javascript:void(0)">' + channels[k].name + '</a></li>');
        $('#channels').append(li);
    }

    $('#channels').children().each(function () {
        $(this).bind('click', function () {
            channelChanged($(this).attr('channel'));
        })
    });

    $('#myCollapsible').on('show', function () {
        showCaptcha();
    })


    if (window.localStorage.cookieExpire != null) {
        var expireTime = new Date(window.localStorage.cookieExpire);
        if (new Date() < expireTime) {
            var userJson = window.localStorage.userInfo;
            var userInfo = JSON.parse(userJson);
            cookieToken = window.localStorage.cookieToken;
            $('#signBtn').html(userInfo.name);
            defaultChannel = channels[7];
            currentChannel=defaultChannel.id;
        }
    }

    if(window.localStorage.autoDownload==null){
        window.localStorage.autoDownload=0;
        api.NEED_DOWNLOAD=0;
    }

    if(window.localStorage.autoDownload==1){
        $('#dlSwitchArea').bootstrapSwitch('setState', true);
        api.NEED_DOWNLOAD=1;
    }else if(window.localStorage.autoDownload==0){
        $('#dlSwitchArea').bootstrapSwitch('setState', false);
        api.NEED_DOWNLOAD=0;
    }


    $("#myModal").on('show', function () {
        $('#channels').children().each(function () {
            if ($(this).attr('channel') == currentChannel) {
                $(this).addClass('active');
            } else {
                $(this).removeClass('active');
            }
        });
    });

    $('#channelName').html(defaultChannel.name);


    $('#savePath').html(api.HOME);

    $('#dlSwitchArea').on('switch-change', function (e, data) {
        if(data.value){
            api.NEED_DOWNLOAD=1;
            window.localStorage.autoDownload=1;
        }else{
            api.NEED_DOWNLOAD=0;
            window.localStorage.autoDownload=0;
        }
    });


    $("#jquery_jplayer_1").jPlayer({

        ready: function (event) {
            getPlaylist(defaultChannel.id, function () {
                playSong(playlist.pop());
            });
        },

        play: function (event) {
            $("#playBtn").hide();
            $('#pauseBtn').show();
        },
        pause: function (event) {
            $("#playBtn").show();
            $('#pauseBtn').hide();
        },
        stop: function (event) {
            $("#playBtn").show();
            $('#pauseBtn').hide();
        },
        timeupdate: function (event) {
            playProcess.css("width", event.jPlayer.status.currentPercentAbsolute + '%');
        },
        ended: function (event) {
            api.playReceipt(sid, currentChannel, cookieToken);
            api.downloadSong(lastSong);
            playNext();
        },
        swfPath: "js",
        supplied: "m4a",
        wmode: "window"
    });
});

function login() {
    var email = $('#email').val();
    var password = $('#password').val();
    var captcha = $('#captcha_value').val();
    var captchaId = $('#captcha').attr('captchaId');
    userLogin(email, password, captchaId, captcha,
        function (userinfo, result) {
            cookieToken = result;


            $('#errorRow').hide();
            $('#errorMsg').html();
            $('#signBtn').html(userinfo.user_info.name);
            $('#myCollapsible').collapse('hide');

            window.localStorage.cookieToken = cookieToken;
            window.localStorage.userInfo = JSON.stringify(userinfo.user_info);
            window.localStorage.cookieExpire = new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000);
        },
        function (failedInfo) {
            if (failedInfo.err_no == 1011) {
                showCaptcha();
            }
            $('#errorMsg').html(failedInfo.err_msg);
            $('#errorRow').fadeIn();
        });
}

function showCaptcha() {
    api.newCaptchaId(function (result) {
        var captchaUrl = 'http://douban.fm/misc/captcha?size=m&id=' + result;
        $('#captcha').attr('src', captchaUrl);
        $('#captcha').attr('captchaId', result);
    });
}

function channelChanged(channel) {
    if (currentChannel == channel) {
        return;
    }
    if ((channel == 0 || channel == -3) && cookieToken == null) {
        $('#memoTip').html('<p class="text-error">私人红心兆赫需先登陆</p>');
        return;
    }
    $('#memoTip').html('频道加载中...');
    currentChannel = channel;
    getPlaylist(currentChannel, function () {
        playSong(playlist.pop());

        for (var k = 0; k < channels.length; k++) {
            if (channels[k].id == channel) {
                $('#channelName').html(channels[k].name);
            }
        }
        $('#memoTip').html('');
        $('#myModal').modal('hide');
    });
}


function playNext() {
    playSong(playlist.pop());
}

function getPlaylist(channel, callback) {

    var getPlaylistCallback = function (result, warning) {
        for (var i = 0; i < result.length; i++) {
            playlist.push(result[i]);
        }
        if (typeof callback == 'function') {
            callback(playlist);
        }
        //登陆过期
        if (warning != null && warning.indexOf('user') != -1) {
            cookieToken = null;
            window.localStorage.removeItem('userInfo');
            window.localStorage.removeItem('cookieToken');
            window.localStorage.removeItem('cookieExpire');
            $('#signBtn').html('sign in');
        }
    };

    if (cookieToken == null) {
        api.getPlaylist(channel, getPlaylistCallback);
    } else {
        api.getPlaylist(channel, getPlaylistCallback, cookieToken);
    }

}

function playSong(song) {

    lastSong=song;

    if (!song) {
        return;
    }

    sid = song.sid;
    var title = song.title;
    var picture = song.picture;
    var url = song.url;
    var artist = song.artist;
    var album = song.album;
    var like = song.like;

    if(picture.indexOf('mpic')!=-1){
        picture=picture.replace('mpic','lpic');
    }


    $('#albumLink').attr('href', 'http://music.douban.com' + album);

    $('#picture').attr('src', picture);

    $('title').html(title + "  --  " + artist);

    if (like == 1) {
        $('#starIcon').removeClass('icon-star-empty');
        $('#starIcon').addClass('icon-star');
    } else {
        $('#starIcon').addClass('icon-star-empty');
        $('#starIcon').removeClass('icon-star');
    }

    $('#jquery_jplayer_1').jPlayer("setMedia", {
        m4a: url
    }).jPlayer("play");

    if (playlist.length < 2) {
        getPlaylist(currentChannel);
    }
}

function likeSong() {
    var action;
    if ($('#starIcon').hasClass('icon-star-empty')) {
        $('#starIcon').removeClass('icon-star-empty');
        $('#starIcon').addClass('icon-star');
        action = 'like';
    } else {
        action = 'dislike';
        $('#starIcon').addClass('icon-star-empty');
        $('#starIcon').removeClass('icon-star');
    }

    api.likeSong(action, sid, currentChannel, cookieToken);
}

