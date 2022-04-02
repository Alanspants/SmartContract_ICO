var crypto = require('crypto');
var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider)

var prime_length = 60;
var diffHell = crypto.createDiffieHellman(prime_length);

diffHell.generateKeys('base64');
console.log("Public Key : " ,diffHell.getPublicKey('base64'));
console.log("Private Key : " ,diffHell.getPrivateKey('base64'));

console.log("Public Key : " ,diffHell.getPublicKey('hex'));
console.log("Private Key : " ,diffHell.getPrivateKey('hex'));

var encryptStringWithRsaPublicKey = function(toEncrypt) {
    var publicKey = diffHell.getPublicKey('hex');
    var buffer = Buffer.from(toEncrypt);
    var encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
};

const encrypted = encryptStringWithRsaPublicKey("hello");
console.log(encrypted);