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
            if (price < 1) {
                console.log("Warning: You cannot bid less than 1 Ether.");
                process.exit(0);
            }
            encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'string'], [shares, price, nonce]);
            hashvalue = web3.utils.soliditySha3(encoded);
            console.log("Encrypted hash value:");
            console.log(hashvalue);
            // bytes32Nonce = web3.utils.padLeft(web3.utils.fromAscii(nonce), 64)
            // console.log("nonce bytes32: " + bytes32Nonce);
            process.exit(0);
        });
    });
});