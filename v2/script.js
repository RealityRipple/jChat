const queryString = {};
(function() { // Thanks to BrunoLM (https://stackoverflow.com/a/3855394)
    const paramsArray = window.location.hash.substr(1).split('&');
    for (let i = 0; i < paramsArray.length; ++i) {
        const param = paramsArray[i]
            .split('=', 2);

        if (param.length !== 2)
            continue;

        queryString[param[0]] = decodeURIComponent(param[1].replace(/\+/g, " "));
    }
})();

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

function escapeHtml(message) {
    return message
        .replace(/&/g, "&amp;")
        .replace(/(<)(?!3)/g, "&lt;")
        .replace(/(>)(?!\()/g, "&gt;");
}

function ajax(options) {
    return new Promise(
        function(resolve) {
            const request = new XMLHttpRequest();
            if (typeof options === 'string')
                options = {url: options};
            if (!options.method)
                options.method = 'GET';
            if (!options.headers)
                options.headers = {};
            if (options.method === 'POST' && !options.headers.hasOwnProperty('content-type'))
                options.headers['content-type'] = 'application/x-www-form-urlencoded';
            request.open(options.method, options.url);
            request.timeout = options.timeout||10000;
            for (const hKey in options.headers) {
                request.setRequestHeader(hKey, options.headers[hKey]);
            }
            request.onreadystatechange = function() {
                if (request.readyState !== 4)
                    return;
                request.ontimeout = null;
                request.onreadystatechange = null;
                resolve({
                    code: request.status,
                    data: request.responseText,
                    get success() { return Math.floor(this.code / 100) === 2; },
                    get json() { try { return JSON.parse(this.data); } catch(ex) { return null; } }
                });
            };
            request.ontimeout = function() {
                request.ontimeout = null;
                request.onreadystatechange = null;
                resolve({
                    code: 408,
                    data: 'Local Timeout',
                    get success(){return false;},
                    get json(){return null;}
                });
            };
            if (!options.data)
                 request.send();
            else
                 request.send(new URLSearchParams(options.data).toString());
        }
    );
}

function makeStyle(sHref) {
    const lCSS = document.createElement('link');
    lCSS.setAttribute('rel', 'stylesheet');
    lCSS.setAttribute('type', 'text/css');
    lCSS.setAttribute('href', sHref);
    document.head.append(lCSS);
}

function TwitchAPI(endpoint) {
    return ajax({
         headers: {
             'Authorization': 'Bearer ' + OAuth.token,
             'Client-Id': OAuth.client
         },
         url: 'https://api.twitch.tv/helix' + endpoint
    });
}

OAuth = {
    token: false,
    client: false,
    channel: false,

    validate: function(token) {
        return ajax({
             url: 'https://id.twitch.tv/oauth2/validate',
             method: 'GET',
             headers: {
                 'Authorization': 'OAuth ' + token
             }
        });
    },

    refresh: function(token) {
        return ajax({
            url: '../oauth.php',
            method: 'POST',
            data: {'refresh': token}
       });
    },

    run: function(token) {
        OAuth.refresh(token).then(function(oRes) {
            if (!oRes.success || !'access_token' in oRes.json) {
                console.log('jChat: OAuth Token Failure');
                return;
            }
            OAuth.validate(oRes.json.access_token).then(function(vRes) {
                if (!vRes.success || !'client_id' in vRes.json || !'login' in vRes.json) {
                    console.log('jChat: OAuth Validation Failure');
                    return;
                }
                OAuth.client = vRes.json.client_id;
                OAuth.token = oRes.json.access_token;
                Chat.connect(vRes.json.login);
            });
        });
    }
};

Chat = {
    info: {
        channel: null,
        animate: ('animate' in queryString ? (queryString.animate.toLowerCase() === 'true') : false),
        showBots: ('bots' in queryString ? (queryString.bots.toLowerCase() === 'true') : false),
        hideCommands: ('hide_commands' in queryString ? (queryString.hide_commands.toLowerCase() === 'true') : false),
        hideBadges: ('hide_badges' in queryString ? (queryString.hide_badges.toLowerCase() === 'true') : false),
        fade: ('fade' in queryString ? parseInt(queryString.fade) : false),
        size: ('size' in queryString ? parseInt(queryString.size) : 3),
        font: ('font' in queryString ? parseInt(queryString.font) : 0),
        emoji: ('emoji' in queryString ? parseInt(queryString.emoji) : 0),
        stroke: ('stroke' in queryString ? parseInt(queryString.stroke) : false),
        shadow: ('shadow' in queryString ? parseInt(queryString.shadow) : false),
        smallCaps: ('small_caps' in queryString ? (queryString.small_caps.toLowerCase() === 'true') : false),
        emotes: {},
        badges: {},
        userBadges: {},
        ffzapBadges: null,
        bttvBadges: null,
        seventvBadges: [],
        chatterinoBadges: null,
        cheers: {},
        lines: [],
        blockedUsers: ('block' in queryString ? queryString.block.toLowerCase().split(',') : false),
        bots: ['streamelements', 'streamlabs', 'nightbot', 'moobot', 'fossabot'],
        nicknameColor: ('cN' in queryString ? queryString.cN : false)
    },

    loadEmotes: function(channelID) {
        Chat.info.emotes = {};
        // Load BTTV, FFZ and 7TV emotes
        ['emotes/global', 'users/twitch/' + encodeURIComponent(channelID)].forEach(endpoint => {
            ajax('https://api.betterttv.net/3/cached/frankerfacez/' + endpoint).then(function(res) {
                res.json?.forEach(emote => {
                    let imageUrl, upscale;
                    if (emote.images['4x']) {
                        imageUrl = emote.images['4x'];
                        upscale = false;
                    } else {
                        imageUrl = emote.images['2x'] || emote.images['1x'];
                        upscale = true;
                    }
                    Chat.info.emotes[emote.code] = {
                        id: emote.id,
                        image: imageUrl,
                        upscale: upscale
                    };
                });
            });
        });

        ['emotes/global', 'users/twitch/' + encodeURIComponent(channelID)].forEach(endpoint => {
            ajax('https://api.betterttv.net/3/cached/' + endpoint).then(function(res) {
                res = res.json;
                if (!Array.isArray(res)) {
                    res = res.channelEmotes.concat(res.sharedEmotes);
                }
                res.forEach(emote => {
                    Chat.info.emotes[emote.code] = {
                        id: emote.id,
                        image: 'https://cdn.betterttv.net/emote/' + emote.id + '/3x',
                        zeroWidth: ['5e76d338d6581c3724c0f0b2', '5e76d399d6581c3724c0f0b8', '567b5b520e984428652809b6', '5849c9a4f52be01a7ee5f79d', '567b5c080e984428652809ba', '567b5dc00e984428652809bd', '58487cc6f52be01a7ee5f205', '5849c9c8f52be01a7ee5f79e'].includes(emote.id) // '5e76d338d6581c3724c0f0b2' => cvHazmat, '5e76d399d6581c3724c0f0b8' => cvMask, '567b5b520e984428652809b6' => SoSnowy, '5849c9a4f52be01a7ee5f79d' => IceCold, '567b5c080e984428652809ba' => CandyCane, '567b5dc00e984428652809bd' => ReinDeer, '58487cc6f52be01a7ee5f205' => SantaHat, '5849c9c8f52be01a7ee5f79e' => TopHat
                    };
                });
            });
        });

        ajax('https://7tv.io/v3/emote-sets/global').then((res) => {
            res.json?.emotes?.forEach(emote => {
                const emoteData = emote.data.host.files.pop();
                Chat.info.emotes[emote.name] = {
                    id: emote.id,
                    image: `https:${emote.data.host.url}/${emoteData.name}`,
                    zeroWidth: emote.data.flags == 256,
                }
            })
        })

        ajax('https://7tv.io/v3/users/twitch/' + encodeURIComponent(channelID)).then((res) => {
            res.json?.emote_set?.emotes?.forEach(emote => {
                const emoteData=emote.data.host.files.pop();
                Chat.info.emotes[emote.name] = {
                    id: emote.id,
                    image: `https:${emote.data.host.url}/${emoteData.name}`,
                    zeroWidth: emote.data.flags == 256,
                }
            })
        })
    },

    load: function(callback) {
        TwitchAPI('/users?login=' + Chat.info.channel).then(function(res) {
            res = res.json?.data[0]
            Chat.info.channelID = res.id;
            Chat.loadEmotes(Chat.info.channelID);

            switch (Chat.info.size) {
                case 1:
                    makeStyle('styles/size_small.css');
                    break;
                case 2:
                    makeStyle('styles/size_medium.css');
                    break;
                default:
                    makeStyle('styles/size_large.css');
                    break;
            }

            switch (Chat.info.font) {
                case 1:
                    makeStyle('styles/font_SegoeUI.css');
                    break;
                case 2:
                    makeStyle('styles/font_Roboto.css');
                    break;
                case 3:
                    makeStyle('styles/font_Lato.css');
                    break;
                case 4:
                    makeStyle('styles/font_NotoSans.css');
                    break;
                case 5:
                    makeStyle('styles/font_SourceCodePro.css');
                    break;
                case 6:
                    makeStyle('styles/font_Impact.css');
                    break;
                case 7:
                    makeStyle('styles/font_Comfortaa.css');
                    break;
                case 8:
                    makeStyle('styles/font_DancingScript.css');
                    break;
                case 9:
                    makeStyle('styles/font_IndieFlower.css');
                    break;
                case 10:
                    makeStyle('styles/font_PressStart2P.css');
                    break;
                case 11:
                    makeStyle('styles/font_Wallpoet.css');
                    break;
                default:
                    makeStyle('styles/font_BalooTammudu.css');
                    break;
            }

            if (Chat.info.stroke) {
                switch (Chat.info.stroke) {
                 case 1:
                     makeStyle('styles/stroke_thin.css');
                     break;
                 case 2:
                     makeStyle('styles/stroke_medium.css');
                     break;
                 case 3:
                     makeStyle('styles/stroke_thick.css');
                     break;
                 case 4:
                     makeStyle('styles/stroke_thicker.css');
                     break;
                }
            }

            if (Chat.info.shadow) {
                switch (Chat.info.shadow) {
                 case 1:
                     makeStyle('styles/shadow_small.css');
                     break;
                 case 2:
                     makeStyle('styles/shadow_medium.css');
                     break;
                 case 3:
                     makeStyle('styles/shadow_large.css');
                     break;
                }
            }
            if (Chat.info.smallCaps) {
                makeStyle('styles/variant_SmallCaps.css');
            }

            // Load badges
            TwitchAPI('/chat/badges/global').then(function(gRes) {
                gRes.json?.data.forEach(badge => {
                    badge?.versions.forEach(version => {
                        Chat.info.badges[badge.set_id + ':' + version.id] = version.image_url_4x;
                    });
                });
                TwitchAPI('/chat/badges?broadcaster_id=' + Chat.info.channelID).then(function(cRes) {
                    cRes.json?.data.forEach(badge => {
                        badge?.versions.forEach(version => {
                            Chat.info.badges[badge.set_id + ':' + version.id] = version.image_url_4x;
                        });
                    });
                    ajax('https://api.frankerfacez.com/v1/_room/id/' + encodeURIComponent(Chat.info.channelID)).then(function(fRes) {
                        if (fRes.json?.room.moderator_badge) {
                            Chat.info.badges['moderator:1'] = 'https://cdn.frankerfacez.com/room-badge/mod/' + Chat.info.channel + '/4/rounded';
                        }
                        if (fRes.json?.room.vip_badge) {
                            Chat.info.badges['vip:1'] = 'https://cdn.frankerfacez.com/room-badge/vip/' + Chat.info.channel + '/4';
                        }
                    });
                });
            });

            if (!Chat.info.hideBadges) {
                ajax('https://api.ffzap.com/v1/supporters')
                    .then(function(res) {
                        if (!!res.json)
                            Chat.info.ffzapBadges = res.json;
                        else
                            Chat.info.ffzapBadges = [];
                    });
                ajax('https://api.betterttv.net/3/cached/badges')
                    .then(function(res) {
                        if (!!res.json)
                            Chat.info.bttvBadges = res.json;
                        else
                            Chat.info.bttvBadges = [];
                    });


                ajax('https://api.chatterino.com/badges')
                    .then(function(res) {
                        if (!!res.json)
                            Chat.info.chatterinoBadges = res.json.badges;
                        else
                            Chat.info.chatterinoBadges = [];
                    });
            }

            // Load cheers images
            TwitchAPI("/bits/cheermotes?broadcaster_id=" + Chat.info.channelID).then(function(res) {
                if (!res.json)
                    return;
                res = res.json.data
                res.forEach(action => {
                    Chat.info.cheers[action.prefix] = {}
                    action.tiers.forEach(tier => {
                        Chat.info.cheers[action.prefix][tier.min_bits] = {
                            image: tier.images.dark.animated['4'],
                            color: tier.color
                        };
                    });
                });
            });

            callback(true);
        });
    },

    update: setInterval(function() {
        const chatLines = document.getElementsByClassName('chat_line');
        if (Chat.info.lines.length > 0) {
            const lines = Chat.info.lines.join('');

            const chatDiv = document.getElementById('chat_container');
            if (Chat.info.animate) {
                const $auxDiv = document.createElement('div');
                //$auxDiv.setAttribute('class', 'hidden');
                $auxDiv.style.opacity = 0.01;
                $auxDiv.innerHTML = lines;
                chatDiv.append($auxDiv);
                const auxHeight = $auxDiv.clientHeight;
                chatDiv.removeChild($auxDiv);

                const $animDiv = document.createElement('div');
                //$animDiv.innerHTML = ' ';
                $animDiv.style.height = '0px';
                $animDiv.style.transition = 'height 150ms linear';
                chatDiv.append($animDiv);
                window.requestAnimationFrame(function() { window.requestAnimationFrame(function() {
                    $animDiv.style.height = auxHeight + 'px';
                    window.setTimeout(function() {
                        chatDiv.removeChild($animDiv);
                        chatDiv.innerHTML += lines;
                    }, 150);
                }); });
            } else {
                chatDiv.innerHTML += lines;
            }
            Chat.info.lines = [];
            while (chatLines.length > 99) {
                chatLines[0].parentElement.removeChild(chatLines[0]);
            }
        } else if (Chat.info.fade) {
            let selLine;
            for (let i = 0; i < chatLines.length; i++) {
               if (chatLines[i].dataset.busy)
                   continue;
               selLine = chatLines[i];
               break;
            }
            if (!selLine)
                return;
            if ((Date.now() - selLine.dataset.time) / 1000 >= Chat.info.fade) {
                selLine.dataset.busy = 1;
                selLine.style.opacity = 1;
                selLine.style.transition = 'opacity 400ms linear';
                window.requestAnimationFrame(function() { window.requestAnimationFrame(function() {
                    if (selLine.parentElement === null)
                        return;
                    selLine.style.opacity = 0;
                    window.setTimeout(function() {
                        if (selLine.parentElement === null)
                            return;
                        selLine.parentElement.removeChild(selLine);
                    }, 400);
                }); });
            }
        }
    }, 200),

    loadUserBadges: function(nick, userId) {
        Chat.info.userBadges[nick] = [];
        ajax('https://api.frankerfacez.com/v1/user/' + nick).then(function(res) {
            if (res.json?.badges) {
                Object.entries(res.json.badges).forEach(badge => {
                    const userBadge = {
                        description: badge[1].title,
                        url: badge[1].urls['4'],
                        color: badge[1].color
                    };
                    if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                });
            }
            Chat.info.ffzapBadges.forEach(user => {
                if (user.id.toString() === userId) {
                    let color = '#755000';
                    if (user.tier == 2) color = (user.badge_color || '#755000');
                    else if (user.tier == 3) {
                        if (user.badge_is_colored == 0) color = (user.badge_color || '#755000');
                        else color = false;
                    }
                    const userBadge = {
                        description: 'FFZ:AP Badge',
                        url: 'https://api.ffzap.com/v1/user/badge/' + userId + '/3',
                        color: color
                    };
                    if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                }
            });
            Chat.info.bttvBadges.forEach(user => {
                if (user.name === nick) {
                    const userBadge = {
                        description: user.badge.description,
                        url: user.badge.svg
                    };
                    if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                }
            });
            Chat.info.seventvBadges.forEach(badge => {
                badge.users.forEach(user => {
                    if (user === nick) {
                        const userBadge = {
                            description: badge.tooltip,
                            url: badge.urls[2][1]
                        };
                        if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                    }
                });
            });
            Chat.info.chatterinoBadges.forEach(badge => {
                badge.users.forEach(user => {
                    if (user === userId) {
                        const userBadge = {
                            description: badge.tooltip,
                            url: badge.image3 || badge.image2 || badge.image1
                        };
                        if (!Chat.info.userBadges[nick].includes(userBadge)) Chat.info.userBadges[nick].push(userBadge);
                    }
                });
            });
        });
    },

    write: function(nick, info, message) {
        if (!info)
            return;
        const $chatLine = document.createElement('div');
        $chatLine.classList.add('chat_line');
        $chatLine.setAttribute('data-nick', nick);
        $chatLine.setAttribute('data-time', Date.now());
        $chatLine.setAttribute('data-id', info.id);
        const $userInfo = document.createElement('span');
        $userInfo.classList.add('user_info');

        // Writing badges
        if (Chat.info.hideBadges) {
            if (typeof(info.badges) === 'string') {
                info.badges.split(',').forEach(badge => {
                    const $badge = document.createElement('img');
                    $badge.classList.add('badge');
                    badge = badge.split('/');
                    $badge.setAttribute('src', Chat.info.badges[badge[0] + ':' + badge[1]]);
                    $userInfo.append($badge);
                });
            }
        } else {
            const badges = [];
            const priorityBadges = ['predictions', 'admin', 'global_mod', 'staff', 'twitchbot', 'broadcaster', 'moderator', 'vip'];
            if (typeof(info.badges) === 'string') {
                info.badges.split(',').forEach(badge => {
                    badge = badge.split('/');
                    const priority = (priorityBadges.includes(badge[0]) ? true : false);
                    badges.push({
                        description: badge[0],
                        url: Chat.info.badges[badge[0] + ':' + badge[1]],
                        priority: priority
                    });
                });
            }
            let $modBadge;
            badges.forEach(badge => {
                if (badge.priority) {
                    const $badge = document.createElement('img');
                    $badge.classList.add('badge');
                    $badge.setAttribute('src', badge.url);
                    if (badge.description === 'moderator') $modBadge = $badge;
                    $userInfo.append($badge);
                }
            });
            if (Chat.info.userBadges[nick]) {
                Chat.info.userBadges[nick].forEach(badge => {
                    const $badge = document.createElement('img');
                    $badge.classList.add('badge');
                    if (badge.color) $badge.setAttribute('style', 'background-color: ' + badge.color);
                    if (badge.description === 'Bot' && info.mod === '1') {
                        $badge.setAttribute('style', 'background-color: rgb(0, 173, 3)');
                        $modBadge.parentElement.removeChild($modBadge);
                    }
                    $badge.setAttribute('src', badge.url);
                    $userInfo.append($badge);
                });
            }
            badges.forEach(badge => {
                if (!badge.priority) {
                    const $badge = document.createElement('img');
                    $badge.classList.add('badge');
                    $badge.setAttribute('src', badge.url);
                    $userInfo.append($badge);
                }
            });
        }

        // Writing username
        const $username = document.createElement('span');
        $username.classList.add('nick');
        let color;
        if (Chat.info.nicknameColor) color = Chat.info.nicknameColor;
        else {
            if (typeof(info.color) === 'string') {
                if (tinycolor(info.color).getBrightness() <= 50) color = tinycolor(info.color).lighten(30);
                else color = info.color;
            } else {
                const twitchColors = ["#FF0000", "#0000FF", "#008000", "#B22222", "#FF7F50", "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E", "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F"];
                color = twitchColors[nick.charCodeAt(0) % 15];
            }
        }
        $username.setAttribute('style', 'color: ' + color);
        $username.innerHTML = info['display-name'] ? info['display-name'] : nick;
        $userInfo.append($username);

        // Writing message
        const $message = document.createElement('span');
        $message.classList.add('message');
        if (/^\x01ACTION.*\x01$/.test(message)) {
            $message.setAttribute('style', 'color: ' + color);
            message = message.replace(/^\x01ACTION/, '').replace(/\x01$/, '').trim();
            const spc = document.createElement('span');
            spc.innerHTML = '&nbsp;';
            $userInfo.append(spc);
        } else {
            const col = document.createElement('span');
            col.setAttribute('class', 'colon');
            col.innerHTML = ':';
            $userInfo.append(col);
        }
        $chatLine.append($userInfo);

        // Replacing emotes and cheers
        const replacements = {};
        if (typeof(info.emotes) === 'string') {
            info.emotes.split('/').forEach(emoteData => {
                const twitchEmote = emoteData.split(':');
                const indexes = twitchEmote[1].split(',')[0].split('-');
                const emojis = new RegExp('[\u1000-\uFFFF]+', 'g');
                const aux = message.replace(emojis, ' ');
                const emoteCode = aux.substr(indexes[0], indexes[1] - indexes[0] + 1);
                replacements[emoteCode] = '<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/' + twitchEmote[0] + '/default/dark/3.0" />';
            });
        }

        Object.entries(Chat.info.emotes).forEach(emote => {
            if (message.search(escapeRegExp(emote[0])) > -1) {
                if (emote[1].upscale) replacements[emote[0]] = '<img class="emote upscale" src="' + emote[1].image + '" />';
                else if (emote[1].zeroWidth) replacements[emote[0]] = '<img class="emote" data-zw="true" src="' + emote[1].image + '" />';
                else replacements[emote[0]] = '<img class="emote" src="' + emote[1].image + '" />';
            }
        });

        message = escapeHtml(message);

        if (info.bits && parseInt(info.bits) > 0) {
            const bits = parseInt(info.bits);
            let parsed = false;
            for (cheerType of Object.entries(Chat.info.cheers)) {
                const regex = new RegExp(cheerType[0] + "\\d+\\s*", 'ig');
                if (message.search(regex) > -1) {
                    message = message.replace(regex, '');

                    if (!parsed) {
                        let closest = 1;
                        for (cheerTier of Object.keys(cheerType[1]).map(Number).sort((a, b) => a - b)) {
                            if (bits >= cheerTier) closest = cheerTier;
                            else break;
                        }
                        message = '<img class="cheer_emote" src="' + cheerType[1][closest].image + '" /><span class="cheer_bits" style="color: ' + cheerType[1][closest].color + ';">' + bits + '</span> ' + message;
                        parsed = true;
                    }
                }
            }
        }

        const replacementKeys = Object.keys(replacements);
        replacementKeys.sort(function(a, b) {
            return b.length - a.length;
        });

        replacementKeys.forEach(replacementKey => {
            const regex = new RegExp("(?<!\\S)(" + escapeRegExp(replacementKey) + ")(?!\\S)", 'g');
            message = message.replace(regex, replacements[replacementKey]);
        });

        let eFont = 'twemoji';
        switch (Chat.info.emoji) {
            case 1:
                eFont = 'openmoji';
                break;
            case 2:
                eFont = 'noto';
                break;
            case 3:
                eFont = 'blob';
                break;
            case 4:
                eFont = 'facebook';
                break;
            case 5:
                eFont = 'apple';
                break;
            case 6:
                eFont = 'joypixels';
                break;
            case 7:
                eFont = 'tossface';
                break;
            case 8:
                eFont = 'whatsapp';
                break;
            case 9:
                eFont = 'oneui';
                break;
        }
        message = remoji.parse(message, {font: eFont});
        $message.innerHTML = message;

        // Writing zero-width emotes
        messageNodes = $message.children;
        for (let i = 1; i < messageNodes.length; i++) {
            if (messageNodes[i].dataset.zw && (messageNodes[i - 1].classList.contains('emote') || messageNodes[i - 1].classList.contains('emoji')) && !messageNodes[i - 1].dataset.zw) {
                const $container = document.createElement('span');
                $container.classList.add('zero-width_container');
                messageNodes[i].classList.add('zero-width');
                messageNodes[i].parentElement.insertBefore($container, messageNodes[i]);
                $container.append(messageNodes[i].parentElement.removeChild(messageNodes[i - 1]), messageNodes[i].parentElement.removeChild(messageNodes[i]));
                i--;
            } else if (messageNodes[i].dataset.zw && messageNodes[i - 1].classList.contains('zero-width_container')) {
                messageNodes[i].classList.add('zero-width');
                messageNodes[i - 1].append(messageNodes[i].parentElement.removeChild(messageNodes[i]));
            }
        }
        $message.innerHTML = $message.innerHTML.trim();
        $chatLine.append($message);
        Chat.info.lines.push($chatLine.outerHTML);
    },

    clearAll: function() {
        setTimeout(function() {
            const chatLines = document.getElementsByClassName('chat_line');
            for (let i = chatLines.length - 1; i >= 0; i--) {
                if (!chatLines[i].parentElement) continue;
                chatLines[i].parentElement.removeChild(chatLines[i]);
            }
        }, 100);
    },

    clearChat: function(nick) {
        setTimeout(function() {
            const chatLines = document.querySelectorAll('.chat_line[data-nick="' + nick + '"]');
            for (let i = chatLines.length - 1; i >= 0; i--) {
                if (!chatLines[i].parentElement) continue;
                chatLines[i].parentElement.removeChild(chatLines[i]);
            }
        }, 100);
    },

    clearMessage: function(id) {
        setTimeout(function() {
            const chatLines = document.querySelectorAll('.chat_line[data-id="' + id + '"]');
            for (let i = chatLines.length - 1; i >= 0; i--) {
                if (!chatLines[i].parentElement) continue;
                chatLines[i].parentElement.removeChild(chatLines[i]);
            }
        }, 100);
    },

    connect: function(channel) {
        Chat.info.channel = channel;
        document.title += Chat.info.channel;

        Chat.load(function() {
            console.log('jChat: Connecting to IRC server...');
            const socket = new ReconnectingWebSocket('wss://irc-ws.chat.twitch.tv', 'irc', { reconnectInterval: 2000 });

            socket.onopen = function() {
                console.log('jChat: Connected');
                socket.send('PASS blah\r\n');
                socket.send('NICK justinfan' + Math.floor(Math.random() * 99999) + '\r\n');
                socket.send('CAP REQ :twitch.tv/commands twitch.tv/tags\r\n');
                socket.send('JOIN #' + Chat.info.channel + '\r\n');
            };

            socket.onclose = function() {
                console.log('jChat: Disconnected');
            };

            socket.onmessage = function(data) {
                data.data.split('\r\n').forEach(line => {
                    if (!line) return;
                    const message = window.parseIRC(line);
                    if (!message.command) return;

                    switch (message.command) {
                        case "PING":
                            socket.send('PONG ' + message.params[0]);
                            return;
                        case "JOIN":
                            console.log('jChat: Joined channel #' + Chat.info.channel);
                            return;
                        case "CLEARMSG":
                            if (message.tags) Chat.clearMessage(message.tags['target-msg-id']);
                            return;
                        case "CLEARCHAT":
                            if (message.params[1])
                                Chat.clearChat(message.params[1]);
                            else
                                Chat.clearAll();
                            return;
                        case "PRIVMSG":
                            if (message.params[0] !== '#' + channel || !message.params[1]) return;
                            const nick = message.prefix.split('@')[0].split('!')[0];

                            if (message.params[1].toLowerCase() === "!refreshoverlay" && typeof(message.tags.badges) === 'string') {
                                let flag = false;
                                message.tags.badges.split(',').forEach(badge => {
                                    badge = badge.split('/');
                                    if (badge[0] === "moderator" || badge[0] === "broadcaster") {
                                        flag = true;
                                        return;
                                    }
                                });
                                if (flag) {
                                    Chat.loadEmotes(Chat.info.channelID);
                                    console.log('jChat: Refreshing emotes...');
                                    return;
                                }
                            }

                            if (message.params[1].toLowerCase() === "!reloadchat" && typeof(message.tags.badges) === 'string') {
                                let flag = false;
                                message.tags.badges.split(',').forEach(badge => {
                                    badge = badge.split('/');
                                    if (badge[0] === "moderator" || badge[0] === "broadcaster") {
                                        flag = true;
                                        return;
                                    }
                                });
                                if (flag) {
                                    location.reload();
                                }
                            }

                            if (Chat.info.hideCommands) {
                                if (/^!.+/.test(message.params[1])) return;
                            }

                            if (!Chat.info.showBots) {
                                if (Chat.info.bots.includes(nick)) return;
                            }

                            if (Chat.info.blockedUsers) {
                                if (Chat.info.blockedUsers.includes(nick)) return;
                            }

                            if (!Chat.info.hideBadges) {
                                if (Chat.info.bttvBadges && Chat.info.seventvBadges && Chat.info.chatterinoBadges && Chat.info.ffzapBadges && !Chat.info.userBadges[nick]) Chat.loadUserBadges(nick, message.tags['user-id']);
                            }

                            Chat.write(nick, message.tags, message.params[1]);
                            return;
                    }
                });
            };
        });
    }
};

window.addEventListener('load', function() {
    OAuth.run(queryString.channel);
});