function authOnTwitch(event) {
    if (wndT !== false) {
        wndT.close();
        wndT = false;
    }
    const aURL = window.location.href + 'oauth.php';
    if (window.top.outerWidth > 600) {
        const y = window.top.outerHeight / 2 + window.top.screenY - (730 / 2);
        const x = window.top.outerWidth / 2 + window.top.screenX - (600 / 2);
        wndT = window.open(aURL, 'wndTwitch', 'popup,top=' + y + ',left=' + x + ',width=600,height=730');
    }
    else
        wndT = window.open(aURL, 'wndTwitch');
}

function authedOnTwitch(rTok) {
    $channel.value = rTok;
    $authorize.setAttribute('disabled', 'disabled');
    $authorize.setAttribute('value', 'Connected');
    if (wndT !== false) {
        wndT.close();
        wndT = false;
    }
}

function fadeOption(event) {
    if ($fade_bool.checked) {
        $fade.classList.remove('hidden');
        $fade_seconds.classList.remove('hidden');
    } else {
        $fade.classList.add('hidden');
        $fade_seconds.classList.add('hidden');
    }
}

function makeStyle(sHref, sClass, bErase = true) {
    if (bErase) {
        for (const oLnk of document.getElementsByTagName('link')) {
            if (oLnk.classList.contains(sClass))
                oLnk.parentElement.removeChild(oLnk);
        }
    }
    if (!sHref)
        return;
    const lCSS = document.createElement('link');
    lCSS.setAttribute('rel', 'stylesheet');
    lCSS.setAttribute('type', 'text/css');
    lCSS.setAttribute('class', sClass);
    lCSS.setAttribute('href', sHref);
    document.head.appendChild(lCSS);
}

function sizeUpdate(event) {
    switch($size.value) {
        case '1':
            makeStyle('styles/size_small.css', 'size');
            break;
        case '2':
            makeStyle('styles/size_medium.css', 'size');
            break;
        default:
            makeStyle('styles/size_large.css', 'size');
            break;
    }
}

function fontUpdate(event) {
    switch($font.value) {
        case '1':
            makeStyle('styles/font_SegoeUI.css', 'font');
            break;
        case '2':
            makeStyle('styles/font_Roboto.css', 'font');
            break;
        case '3':
            makeStyle('styles/font_Lato.css', 'font');
            break;
        case '4':
            makeStyle('styles/font_NotoSans.css', 'font');
            break;
        case '5':
            makeStyle('styles/font_SourceCodePro.css', 'font');
            break;
        case '6':
            makeStyle('styles/font_Impact.css', 'font');
            break;
        case '7':
            makeStyle('styles/font_Comfortaa.css', 'font');
            break;
        case '8':
            makeStyle('styles/font_DancingScript.css', 'font');
            break;
        case '9':
            makeStyle('styles/font_IndieFlower.css', 'font');
            break;
        case '10':
            makeStyle('styles/font_PressStart2P.css', 'font');
            break;
        case '11':
            makeStyle('styles/font_Wallpoet.css', 'font');
            break;
        default:
            makeStyle('styles/font_BalooTammudu.css', 'font');
            break;
    }
}

function emojiUpdate(event) {
    let eFont = 'twemoji';
    switch($emoji.value) {
        case '1':
            eFont = 'openmoji';
            break;
        case '2':
            eFont = 'noto';
            break;
        case '3':
            eFont = 'blob';
            break;
        case '4':
            eFont = 'facebook';
            break;
        case '5':
            eFont = 'apple';
            break;
        case '6':
            eFont = 'joypixels';
            break;
        case '7':
            eFont = 'tossface';
            break;
        case '8':
            eFont = 'whatsapp';
            break;
        case '9':
            eFont = 'oneui';
            break;
    }
    document.getElementById('premoji').setAttribute('src', 'https://cdn.jsdelivr.net/gh/realityripple/emoji/' + eFont + '/1fae7.png');
}

function strokeUpdate(event) {
    switch($stroke.value) {
        case '1':
            makeStyle('styles/stroke_thin.css', 'stroke');
            break;
        case '2':
            makeStyle('styles/stroke_medium.css', 'stroke');
            break;
        case '3':
            makeStyle('styles/stroke_thick.css', 'stroke');
            break;
        case '4':
            makeStyle('styles/stroke_thicker.css', 'stroke');
            break;
        default:
            makeStyle(false, 'stroke');
            break;
    }
}

function shadowUpdate(event) {
    switch ($shadow.value) {
        case '1':
            makeStyle('styles/shadow_small.css', 'shadow');
            break;
        case '2':
            makeStyle('styles/shadow_medium.css', 'shadow');
            break;
        case '3':
            makeStyle('styles/shadow_large.css', 'shadow');
            break;
        default:
            makeStyle(false, 'shadow');
            break;
    }
}

function badgesUpdate(event) {
    if ($badges.checked) {
        for (const spBadge of document.getElementsByTagName('img')) {
            if (spBadge.classList.contains('badge') && spBadge.classList.contains('special'))
                spBadge.classList.add('hidden');
        }
    } else {
        for (const spBadge of document.getElementsByTagName('img')) {
            if (spBadge.classList.contains('badge') &&  spBadge.classList.contains('special') && spBadge.classList.contains('hidden'))
                spBadge.classList.remove('hidden');
        }
    }
}

function capsUpdate(event) {
    if ($small_caps.checked) {
        makeStyle('styles/variant_SmallCaps.css', 'small_caps');
    } else {
        makeStyle(false, 'small_caps');
    }
}

function generateURL(event) {
    event.preventDefault();

    let generatedUrl = 'https://jchat.realityripple.com/v2/#channel=' + $channel.value;
    if ($animate.checked)
        generatedUrl += '&animate=true';
    if ($bots.checked)
        generatedUrl += '&bots=true';
    if ($fade_bool.checked)
        generatedUrl += '&fade=' + $fade.value;
    if ($commands.checked)
        generatedUrl += '&hide_commands=true';
    if ($badges.checked)
        generatedUrl += '&hide_badges=true';
    generatedUrl += '&size=' + $size.value;
    generatedUrl += '&font=' + $font.value;
    generatedUrl += '&emoji=' + $emoji.value;
    if ($stroke.value != '0')
        generatedUrl += '&stroke=' + $stroke.value;
    if ($shadow.value != '0')
        generatedUrl += '&shadow=' + $shadow.value;
    if ($small_caps.checked)
        generatedUrl += '&small_caps=true';

    $url.setAttribute('value', generatedUrl);

    $generator.classList.add('hidden');
    $result.classList.remove('hidden');
}

function changePreview(event) {
    if ($example.classList.contains('white')) {
        $example.classList.remove('white');
        $brightness.setAttribute('src', 'img/light.png');
    } else {
        $example.classList.add('white');
        $brightness.setAttribute('src', 'img/dark.png');
    }
}

function copyUrl(event) {
    navigator.clipboard.writeText($url.value);

    $alert.style.visibility = 'visible';
    $alert.style.opacity = 1;
}

function showUrl(event) {
    $alert.style.opacity = 0;
    setTimeout(function() {
        $alert.style.visibility = 'hidden';
    }, 200);
}

function resetForm(event) {
    $authorize.removeAttribute('disabled');
    $authorize.setAttribute('value', 'Log In');
    $channel.value = '';
    $bots.checked = false;
    $commands.checked = false;
    $badges.checked = false;
    $animate.checked = false;
    $fade_bool.checked = false;
    $fade.classList.add('hidden');
    $fade_seconds.classList.add('hidden');
    $fade.value = 30;
    $small_caps.checked = false;
    for (const capLnk of document.getElementsByTagName('link')) {
        if (capLnk.classList.contains('small_caps'))
            capLnk.parentElement.removeChild(capLnk);
    }
    for (const spBadge of document.getElementsByTagName('img')) {
        if (spBadge.classList.contains('badge') && spBadge.classList.contains('special') && spBadge.classList.contains('hidden'))
            spBadge.classList.remove('hidden');
    }
    $result.classList.add('hidden');
    $generator.classList.remove('hidden');
    showUrl();
}

const $generator = document.getElementsByName('generator')[0];
const $authorize = document.getElementsByName('authorize')[0];
const $channel = document.getElementsByName('channel')[0];
const $animate = document.getElementsByName('animate')[0];
const $bots = document.getElementsByName('bots')[0];
const $fade_bool = document.getElementsByName('fade_bool')[0];
const $fade = document.getElementsByName('fade')[0];
const $fade_seconds = document.getElementById('fade_seconds');
const $commands = document.getElementsByName('commands')[0];
const $small_caps = document.getElementsByName('small_caps')[0];
const $badges = document.getElementsByName('badges')[0];
const $size = document.getElementsByName('size')[0];
const $font = document.getElementsByName('font')[0];
const $emoji = document.getElementsByName('emoji')[0];
const $stroke = document.getElementsByName('stroke')[0];
const $shadow = document.getElementsByName('shadow')[0];
const $brightness = document.getElementById('brightness');
const $example = document.getElementById('example');
const $result = document.getElementById('result');
const $url = document.getElementById('url');
const $alert = document.getElementById('alert');
const $reset = document.getElementById('reset');

var wndT = false;
var slideHover=false;
$authorize.addEventListener('click', authOnTwitch);
$fade_bool.addEventListener('change', fadeOption);
$size.addEventListener('change', sizeUpdate);
$font.addEventListener('change', fontUpdate);
$emoji.addEventListener('change', emojiUpdate);
$stroke.addEventListener('change', strokeUpdate);
$shadow.addEventListener('change', shadowUpdate);
$small_caps.addEventListener('change', capsUpdate);
$badges.addEventListener('change', badgesUpdate);
$generator.addEventListener('submit', generateURL);
$brightness.addEventListener('click', changePreview);
$url.addEventListener('click', copyUrl);
$alert.addEventListener('click', showUrl);
$reset.addEventListener('click', resetForm);