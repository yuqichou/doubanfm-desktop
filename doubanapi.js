var http = require('http');
var rest = require('./restler')
var fs=require('fs');

var HOME=process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']+'/douban_music/';
fs.exists(HOME, function (exists) {
    if(!exists){
        fs.mkdir(HOME);
    }
});

var API_PLAYLIST = 'http://douban.fm/j/mine/playlist';

var NEED_DOWNLOAD=0;



/**
 * 播放列表
 * @param channel
 * @param callback
 * @param cookieToken
 */
function getPlaylist(channel, callback,cookieToken) {

    var random = Math.round(Math.random() * 10000000000);

    var headers = {};
    if(cookieToken!=null){
        headers.Cookie='dbcl2='+cookieToken+';';
    }

    rest.get(API_PLAYLIST + '?type=n&from=mainsite&channel=' + channel + '&pb=192&kbps=192&r=' + random
        , {
            headers: headers
        }).on('complete', function (result) {
            if (result instanceof Error) {
                this.retry(5000);
            } else {
                if(result['song']){
                    callback(result['song'],result['warning']);
                }
            }
        });
}

/**
 * 验证码id
 * @param callback
 */
function newCaptchaId(callback) {
    rest.get('http://douban.fm/j/new_captcha').on('complete', function (result) {
        if (result instanceof Error) {
            this.retry(5000);
        } else {
            if (typeof callback == 'function') {
                callback(result);
            }
        }
    });
}


/**
 * 用户登陆
 * @param email
 * @param password
 * @param captcha_id
 * @param captcha_value
 * @param callback
 * @param callbackfail
 */
function userLogin(email,password,captcha_id,captcha_value,callback,callbackfail) {
    rest.post('http://douban.fm/j/login', {
        data: { source: 'radio',
            alias: email,
            form_password: password,
            captcha_solution: captcha_value,
            captcha_id: captcha_id,
            task: 'sync_channel_list'}
    }).on('complete', function (data, response) {
            if(data['err_no']!=null && data['err_msg']!=null){
                if (typeof callbackfail == 'function') {
                    callbackfail(data);
                }
            }
            var cookies = response.headers['set-cookie'];
            for(var i = 0;i<cookies.length;i++){
                var setCookies=cookies[i].split(';');
                for (var j = 0; j < setCookies.length; j++) {
                    var cookie = setCookies[j];
                    if(cookie.indexOf('dbcl2')!=-1){
                        if (typeof callback == 'function') {
                            callback(data,cookie.split('=')[1].replace("\"","").replace("\"",""));
                        }
                    }
                }
            }
        });
}

/**
 * 播放完毕回执
 * @param sid
 * @param channel
 */
function playReceipt(sid,channel,cookieToken){
    var random = Math.round(Math.random() * 10000000000);

    var headers = {};
    if(cookieToken!=null){
        headers.Cookie='dbcl2='+cookieToken+';';
    }

//    type=e&sid=701054&channel=1&pt=253.6&pb=192&from=mainsite&r=3e40b3c8b3

    rest.get(API_PLAYLIST + '?type=e&from=mainsite&sid='+sid+'&channel=' + channel + '&pb=192&kbps=192&r=' + random
        , {
            headers: headers
        }).on('complete', function (result) {
            if (result instanceof Error) {
                this.retry(5000);
            }
        });
}


/**
 * 加/减 红心
 * @param like
 * @param sid
 * @param channel
 */
function likeSong(like,sid,channel,cookieToken){
    var random = Math.round(Math.random() * 10000000000);

    //like    http://douban.fm/j/mine/playlist?type=r&sid=422119&pt=42.4&channel=4&pb=192&from=mainsite&kbps=192&r=ce3b1347ae
    //dislike http://douban.fm/j/mine/playlist?type=u&sid=422119&pt=102.3&channel=4&pb=192&from=mainsite&kbps=192&r=03e08c36c4
    var headers = {};
    if(cookieToken!=null){
        headers.Cookie='dbcl2='+cookieToken+';';
    }

    var type;
    if(like == 'like'){
        type = 'r';
//        url = '?type=r&sid='+sid+'&pt=42.4&channel='+channel+'&pb=192&from=mainsite&kbps=192&r='+random;
    }else if(like == 'dislike'){
        type = 'u'
//        url = '?type=u&sid='+sid+'&pt=102.3&channel='+channel+'&pb=192&from=mainsite&kbps=192&r='+random;
    }
    var url='?type='+type+'&sid='+sid+'&pt=102.3&channel='+channel+'&pb=192&from=mainsite&kbps=192&r='+random;

    rest.get(API_PLAYLIST + url
        , {
            headers: headers
        }).on('complete', function (result) {
            if (result instanceof Error) {
                this.retry(5000);
            }
        });

}

function downloadSong(song){

    var options=require('url').parse(song.url, true);
    var fileName=song.title;
    if(song.artist.length>0){
        fileName+=' -- '+song.artist;
    }

    fileName=fileName.replace(/\//g,"&")+'.mp3'

    fs.exists(HOME+fileName, function (exists) {
        if(!exists){
            http.get(options, function(res){
                var data = ''
                res.setEncoding('binary')
                res.on('data', function(chunk){
                    data += chunk
                })
                res.on('end', function(){
                    fs.writeFile(HOME+fileName, data, 'binary', function(err){
                        console.log(err);
                    })
                })
            })
        }
    });
}

module.exports['HOME']=HOME 
module.exports['NEED_DOWNLOAD']=NEED_DOWNLOAD
module.exports['getPlaylist']=getPlaylist;
module.exports['newCaptchaId']=newCaptchaId;
module.exports['userLogin']=userLogin;
module.exports['playReceipt']=playReceipt;
module.exports['likeSong']=likeSong;
module.exports['downloadSong']=downloadSong;
