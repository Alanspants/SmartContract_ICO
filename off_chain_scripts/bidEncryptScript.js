// npm install web3
var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider)

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("----------- Neverpay fundraising contract bid encrypter -----------")
rl.question("shares: ", function(shares) {
    rl.question("price: ", function(price) {
        rl.question("nonce: ", function(nonce) {
            encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], [shares, price, web3.utils.fromAscii(nonce)]);
            hashvalue = web3.utils.soliditySha3(encoded);
            console.log("Encrypted hash value:");
            console.log(hashvalue);
            process.exit(0);
        });
    });
});