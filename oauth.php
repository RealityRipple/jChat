<?php
 $GLOBALS['api'] = json_decode(file_get_contents('credentials.json'), true);
 $GLOBALS['req'] = 'https://'.$_SERVER['SERVER_NAME'].$_SERVER['SCRIPT_NAME'];

 if (array_key_exists('error', $_GET) && $_GET['error'] === 'access_denied') {
     $contents = <<<PAGE
<html lang="en">
 <head>
  <title>Twitch Authentication</title>
  <script>window.close();</script>
 </head>
</html>
PAGE;
     echo $contents;
     exit();
 }

 function showFailure($data) {
     $contents = <<<PAGE
<!doctype html>
<html lang="en">
 <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Twitch Authentication</title>
  <style>
   body {
    margin: 1em 2em;
    font-size: 150%;
   }
   p.code {
    white-space: pre;
    font-family: sans-serif;
    margin-left: 0.25em;
    border-left: 1px solid black;
    padding-left: 1em;
   }
   .buttons {
    text-align: center;
   }
   button {
    font-size: 150%;
    padding: 0.25em 0.5em;
    border: 1px solid black;
    border-radius: 0.25em;
    background-color: white;
    margin: 0.5em 1em;
    vertical-align: top;
   }
   button:hover {
    padding: 0.2em 0.55em 0.3em 0.45em;
   }
   button:active {
    padding: 0.3em 0.45em 0.2em 0.55em;
   }
  </style>
  <script>
   function goBack() {
    window.history.go(-1);
   }
   function initO() {
    document.getElementById('cmdReAuth').addEventListener('click', goBack);
    document.getElementById('cmdCancel').addEventListener('click', window.close);
   }
   window.addEventListener('load', initO);
  </script>
 </head>
 <body>
  %BODY%
  <p class="buttons"><button id="cmdReAuth">Re-Authenticate</button><button id="cmdCancel">Cancel</button></p>
 </body>
</html>
PAGE;
     if (is_array($data)) {
         if (array_key_exists('status', $data) && array_key_exists('message', $data)) {
             $body = '  <p>Twitch returned a '.$data['status'].' error:</p>'."\n";
             $body.= '  <p>'.$data['message'].'</p>';
         } else {
              $body = '  <p>Twitch returned an unknown response:</p>'."\n";
              $body.= '  <p class="code">'.print_r($data, true).'</p>';
         }
     } else {
         $body = '  <p>Twitch returned an unknown response:</p>'."\n";
         $body.= '  <p class="code">'.$data.'</p>';
     }
     $contents = str_replace('%BODY%', $body, $contents);
     echo $contents;
 }

 function showSuccess($rTok, $uName) {
     $contents = <<<PAGE
<!doctype html>
<html lang="en">
 <head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Twitch Authentication</title>
  <style>
   body {
    margin: 1em 2em;
    font-size: 150%;
   }
  </style>
  <script>window.opener.authedOnTwitch('%REFRESH_TOKEN%', '%CHANNEL_LOGIN%');</script>
 </head>
 <body>
  <p>Thank you for authenticating! This window should close in a moment.</p>
 </body>
</html>
PAGE;
     $contents = str_replace('%REFRESH_TOKEN%', $rTok, $contents);
     $contents = str_replace('%CHANNEL_LOGIN%', $uName, $contents);
     echo $contents;
 }

 function parseCode($code) {
     $url = 'https://id.twitch.tv/oauth2/token';
     $vars = 'client_id='.urlencode($GLOBALS['api']['client_id']).
             '&client_secret='.urlencode($GLOBALS['api']['client_secret']).
             '&grant_type='.urlencode('authorization_code').
             '&code='.urlencode($_GET['code']).
             '&redirect_uri='.urlencode($GLOBALS['req']);
     $hHdrs = array();
     $hHdrs[] = 'Content-Type: application/x-www-form-urlencoded';
     $ch = curl_init();
     curl_setopt($ch, CURLOPT_URL, $url);
     curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
     curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
     curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
     curl_setopt($ch, CURLOPT_TIMEOUT, 45);
     curl_setopt($ch, CURLOPT_HTTPHEADER, $hHdrs);
     curl_setopt($ch, CURLOPT_POST, true);
     curl_setopt($ch, CURLOPT_POSTFIELDS, $vars);
     $buffer = curl_exec($ch);
     if ($buffer === false)
      $buffer = curl_error($ch);
     unset($ch);
     $j = json_decode($buffer, true);
     if ($j === null) {
         showFailure($buffer);
         exit();
     }
     if (!array_key_exists('access_token', $j)
      || !array_key_exists('token_type', $j)
      || !array_key_exists('refresh_token', $j)) {
         showFailure($j);
         exit();
     }
     if (array_key_exists('scope', $j)) {
         showFailure('Scopes are not allowed!');
         exit();
     }
     $v = getUserID($j['access_token']);
     if ($v === false) {
         showFailure('Received Token not valid.');
         exit();
     }
     $chLogin = false;
     if (array_key_exists('login', $v))
         $chLogin = $v['login'];
     showSuccess($j['refresh_token'], $chLogin);
 }

 function parseRefresh($token) {
     $url = 'https://id.twitch.tv/oauth2/token';
     $vars = 'client_id='.urlencode($GLOBALS['api']['client_id']).
             '&client_secret='.urlencode($GLOBALS['api']['client_secret']).
             '&grant_type='.urlencode('refresh_token').
             '&refresh_token='.urlencode($token);
     $hHdrs = array();
     $hHdrs[] = 'Content-Type: application/x-www-form-urlencoded';
     $ch = curl_init();
     curl_setopt($ch, CURLOPT_URL, $url);
     curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
     curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
     curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
     curl_setopt($ch, CURLOPT_TIMEOUT, 45);
     curl_setopt($ch, CURLOPT_HTTPHEADER, $hHdrs);
     curl_setopt($ch, CURLOPT_POST, true);
     curl_setopt($ch, CURLOPT_POSTFIELDS, $vars);
     $buffer = curl_exec($ch);
     if ($buffer === false)
         $buffer = curl_error($ch);
     unset($ch);
     $j = json_decode($buffer, true);
     if (array_key_exists('scope', $j)) {
         showFailure(json_encode(array('status' => 400, 'message' => 'Scopes are not allowed')));
         exit();
     }
     if (array_key_exists('access_token', $j)) {
         $v = getUserID($j['access_token']);
         if ($v !== false && array_key_exists('user_id', $v)) {
             require_once(posix_getpwuid(posix_getuid())['dir'].'/rrs/inc/users/usercount.php.inc');
             recordUser('TJC', $v['user_id']);
         }
     }
     echo $buffer;
     exit();
 }

 function getUserID($token) {
     $url = 'https://id.twitch.tv/oauth2/validate';
     $hHdrs = array();
     $hHdrs[] = 'Client-Id: '.urlencode($GLOBALS['api']['client_id']);
     $hHdrs[] = 'Authorization: Bearer '.urlencode($token);
     $ch = curl_init();
     curl_setopt($ch, CURLOPT_URL, $url);
     curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
     curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
     curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
     curl_setopt($ch, CURLOPT_TIMEOUT, 45);
     curl_setopt($ch, CURLOPT_HTTPHEADER, $hHdrs);
     $buffer = curl_exec($ch);
     if ($buffer === false)
         return false;
     unset($ch);
     $j = json_decode($buffer, true);
     if ($j === null)
         return false;
     return $j;
 }

 function redirectTo($redirURI) {
     $proto = 'HTTP/1.0';
     if (isset($_SERVER['SERVER_PROTOCOL']))
         $proto = $_SERVER['SERVER_PROTOCOL'];
     $respType = $proto.' 302 Found';
     if (substr($proto, 0, 5) == 'HTTP/') {
         $protocolVer = floatval(substr($proto, 5));
         if ($protocolVer > 1.0)
             $respType = $proto.' 307 Temporary Redirect';
     }
     header($respType);
     header('Location: '.$redirURI);
     exit();
 }

 if (array_key_exists('code', $_GET)) {
     parseCode($_GET['code']);
     exit();
 }

 if (array_key_exists('refresh', $_POST)) {
     parseRefresh($_POST['refresh']);
     exit();
 }

 $uAuth = 'https://id.twitch.tv/oauth2/authorize'.
          '?client_id='.urlencode($GLOBALS['api']['client_id']).
          '&redirect_uri='.urlencode($GLOBALS['req']).
          '&response_type=code'.
          '&scope='.
          '&force_verify=true';
 redirectTo($uAuth);
?>