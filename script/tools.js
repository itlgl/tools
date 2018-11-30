//由于模块都一次性加载，因此不用执行 layui.use() 来加载对应模块，直接使用即可：
;!function(){
  var layer = layui.layer
  ,form = layui.form;

  // 回到顶部的按钮
  var util = layui.util;
  util.fixbar();

  // 监听hash的radio单选监听
  // 直接在radio上设置监听不管用
  form.on('radio(hashInputTypeFilter)', function(data){
    calcHash();
  });

}();

$(document).ready(function(){
  calcHash();

  $("#hashBtn").click(function(event){
    event.preventDefault();
    calcHash();
  });

  $("#baseEncodeUtf8Btn").click(function(event){
    event.preventDefault();
    baseEncodeUtf8();
  });

  $("#baseEncodeHexBtn").click(function(event){
    event.preventDefault();
    baseEncodeHex();
  });

  $("#baseDecodeToHexBtn").click(function(event){
    event.preventDefault();
    baseDecodeToHex();
  });

  $("#baseDecodeToUtf8Btn").click(function(event){
    event.preventDefault();
    baseDecodeToUtf8();
  });
});

function calcHash() {
  var hashInput = $("#hashInputText").val();
  var inputType = $('input:radio[name="hashInputType"]:checked').val();
  // 如果输入的hex串不是偶数，那么Hex.parse解析出来的数据在base64以后WordArray.toString()出来的hex会变化，所以先转化为hex串再转回去
  var valueHex = inputType==='1' ? CryptoJS.enc.Hex.parse(hashInput) : CryptoJS.enc.Utf8.parse(hashInput);
  var valueHexStr = valueHex.toString();
  valueHex = CryptoJS.enc.Hex.parse(valueHexStr);
  console.log("valueHex=" + valueHexStr);
  $("#hashInputHexValue").val(valueHexStr);
  if(inputType === '1' && hashInput !== valueHexStr) {
    layui.layer.msg('输入的hex值不合法，查看\"输入的HEX\"来查看实际解析值');
  }

  // md5
  try {
    var hash = CryptoJS.MD5(valueHex).toString();
    $("#hashOutputMd5").val(hash);
    console.log("md5=" + hash);
  } catch(e) {
    $("#hashOutputMd5").val("[Error]" + e.message);
    console.log("md5 e=" + e.message);
  }

  // sha1
  try {
    var hash = CryptoJS.SHA1(valueHex).toString();
    $("#hashOutputSha1").val(hash);
    console.log("SHA1=" + hash);
  } catch(e) {
    $("#hashOutputSha1").val("[Error]" + e.message);
    console.log("SHA1 e=" + e.message);
  }

  // sha224
  try {
    var hash = CryptoJS.SHA224(valueHex).toString();
    $("#hashOutputSha224").val(hash);
    console.log("SHA224=" + hash);
  } catch(e) {
    $("#hashOutputSha224").val("[Error]" + e.message);
    console.log("SHA224 e=" + e.message);
  }

  // sha256
  try {
    var hash = CryptoJS.SHA256(valueHex).toString();
    $("#hashOutputSha256").val(hash);
    console.log("SHA256=" + hash);
  } catch(e) {
    $("#hashOutputSha256").val("[Error]" + e.message);
    console.log("SHA256 e=" + e.message);
  }

  // sha384
  try {
    var hash = CryptoJS.SHA384(valueHex).toString();
    $("#hashOutputSha384").val(hash);
    console.log("SHA384=" + hash);
  } catch(e) {
    $("#hashOutputSha384").val("[Error]" + e.message);
    console.log("SHA384 e=" + e.message);
  }

  // Ripemd160
  try {
    var hash = CryptoJS.RIPEMD160(valueHex).toString();
    $("#hashOutputRipemd160").val(hash);
    console.log("RIPEMD160=" + hash);
  } catch(e) {
    $("#hashOutputRipemd160").val("[Error]" + e.message);
    console.log("RIPEMD160 e=" + e.message);
  }

  // sha512
  try {
    var hash = CryptoJS.SHA512(valueHex).toString();
    $("#hashOutputSha512").val(hash);
    console.log("SHA512=" + hash);
  } catch(e) {
    $("#hashOutputSha512").val("[Error]" + e.message);
    console.log("SHA512 e=" + e.message);
  }

  // sha3_224
  try {
    var hash = CryptoJS.SHA3(valueHex, {outputLength : 224}).toString();
    $("#hashOutputSha3_224").val(hash);
    console.log("SHA3_224=" + hash);
  } catch(e) {
    $("#hashOutputSha3_224").val("[Error]" + e.message);
    console.log("SHA3_224 e=" + e.message);
  }

  // sha3_256
  try {
    var hash = CryptoJS.SHA3(valueHex, {outputLength : 256}).toString();
    $("#hashOutputSha3_256").val(hash);
    console.log("SHA3_256=" + hash);
  } catch(e) {
    $("#hashOutputSha3_256").val("[Error]" + e.message);
    console.log("SHA3_256 e=" + e.message);
  }

  // sha3_384
  try {
    var hash = CryptoJS.SHA3(valueHex, {outputLength : 384}).toString();
    $("#hashOutputSha3_384").val(hash);
    console.log("SHA3_384=" + hash);
  } catch(e) {
    $("#hashOutputSha3_384").val("[Error]" + e.message);
    console.log("SHA3_384 e=" + e.message);
  }

  // sha3_512
  try {
    var hash = CryptoJS.SHA3(valueHex, {outputLength : 512}).toString();
    $("#hashOutputSha3_512").val(hash);
    console.log("SHA3_512=" + hash);
  } catch(e) {
    $("#hashOutputSha3_512").val("[Error]" + e.message);
    console.log("SHA3_512 e=" + e.message);
  }
}

function hexStringToUint8Array(hexStr) {
  // var hexStr = wordArray.toString();
  if(hexStr === "undefined" || hexStr == null) {
    return new (typeof Uint8Array !== "undefined" && Uint8Array !== null ? Uint8Array : Buffer)(0);
  }
  var result = new (typeof Uint8Array !== "undefined" && Uint8Array !== null ? Uint8Array : Buffer)(hexStr.length/2);
//   console.log("hexStr=" + hexStr);
  for(var i=0;i<hexStr.length/2;i++) {
//    console.log("hexStr fori=" + hexStr.substr(i*2, 2));
    result[i] = parseInt(hexStr.substr(i*2, 2), 16) & 0xff;
  }
//  for(var index = 0;index<result.length;index++) {
//    console.log("result " + index + " " + result[index].toString(16));
//  }
  return result;
}

function uint8ArrayToHexString(u8Array) {
  if(u8Array.length === 0) {
    return "";
  }

  // Convert
  var hexChars = [];
  for(var i = 0;i < u8Array.length;i++) {
    hexChars.push((u8Array[i] >>> 4).toString(16));
    hexChars.push((u8Array[i] & 0x0f).toString(16));
  }

  return hexChars.join('');
}

function baseEncodeHex() {
  var input = $("#baseInputText").val();
    // 如果输入的hex串不是偶数，那么Hex.parse解析出来的数据在base64以后WordArray.toString()出来的hex会变化，所以先转化为hex串再转回去
    var valueHexStr = CryptoJS.enc.Hex.parse(input).toString();
    var valueHex = CryptoJS.enc.Hex.parse(valueHexStr);
    console.log("valueHex=" + valueHexStr);
    $("#baseInputHexValue").val(valueHexStr);
    if(input !== valueHexStr) {
      layui.layer.msg('输入的hex值不合法，查看\"输入的HEX\"来查看实际解析值');
    }

    // base64
    try {
      var result = CryptoJS.enc.Base64.stringify(valueHex);
      $("#base64Output").val(result);
      console.log("base64 encode=" + result);
    } catch(e) {
      $("#base64Output").val("[Error]" + e.message);
      console.log("base64 e=" + e.message);
    }

    // base58
    try {
      var u8Array = hexStringToUint8Array(valueHexStr);
      var result = Base58.encode(u8Array);
      $("#base58Output").val(result);
      console.log("base58 encode=" + result);
    } catch(e) {
      $("#base58Output").val("[Error]" + e.message);
      console.log("base58 e=" + e.message);
    }
}

function baseEncodeUtf8() {
  var input = $("#baseInputText").val();
  // 如果输入的hex串不是偶数，那么Hex.parse解析出来的数据在base64以后WordArray.toString()出来的hex会变化，所以先转化为hex串再转回去
  var valueHexStr = CryptoJS.enc.Utf8.parse(input).toString();
  var valueHex = CryptoJS.enc.Hex.parse(valueHexStr);
  console.log("valueHex=" + valueHexStr);
  $("#baseInputHexValue").val(valueHexStr);

  // base64
  try {
    var result = CryptoJS.enc.Base64.stringify(valueHex);
    $("#base64Output").val(result);
    console.log("base64 encode=" + result);
  } catch(e) {
    $("#base64Output").val("[Error]" + e.message);
    console.log("base64 e=" + e.message);
  }

  // base58
  try {
    var u8Array = hexStringToUint8Array(valueHexStr);
    var result = Base58.encode(u8Array);
    $("#base58Output").val(result);
    console.log("base58 encode=" + result);
  } catch(e) {
    $("#base58Output").val("[Error]" + e.message);
    console.log("base58 e=" + e.message);
  }
}

function baseDecodeToHex() {
  var input = $("#baseInputText").val();
  console.log("input text=" + input);
  $("#baseInputHexValue").val("解码时无效");

  // base64
  try {
    var resultHex = CryptoJS.enc.Base64.parse(input).toString();
    $("#base64Output").val(resultHex);
    console.log("base64 encode=" + resultHex);
  } catch(e) {
    $("#base64Output").val("[Error]" + e.message);
    console.log("base64 e=" + e.message);
  }

  console.log("input text=" + input);
  // base58
  try {
    var u8Array = Base58.decode(input);
    var resultHex = uint8ArrayToHexString(u8Array);
    $("#base58Output").val(resultHex);
    console.log("base64 encode=" + resultHex);
  } catch(e) {
    $("#base58Output").val("[Error]" + e.message);
    console.log("base64 e=" + e.message);
  }
}

function baseDecodeToUtf8() {
  var input = $("#baseInputText").val();
  console.log("input text=" + input);
  $("#baseInputHexValue").val("解码时无效");

  // base64
  try {
    var result = CryptoJS.enc.Base64.parse(input).toString(CryptoJS.enc.Utf8);
    $("#base64Output").val(result);
    console.log("base64 encode=" + result);
  } catch(e) {
    $("#base64Output").val("[Error]" + e.message);
    console.log("base64 e=" + e.message);
  }

  console.log("input text=" + input);
  // base58
  try {
    var u8Array = Base58.decode(input);
    var resultHex = uint8ArrayToHexString(u8Array);
    var resultU8 = CryptoJS.enc.Hex.parse(resultHex).toString(CryptoJS.enc.Utf8);
    $("#base58Output").val(resultU8);
    console.log("base64 encode=" + resultU8);
  } catch(e) {
    $("#base58Output").val("[Error]" + e.message);
    console.log("base64 e=" + e.message);
  }
}