var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider)

const account = web3.eth.accounts.create()

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
console.log("----------- Sophisticated Investor Certificate Generator -----------")
rl.question("Investor's Address: ", function(addr) {
    var hash = web3.utils.soliditySha3(addr);
    const encrypted = web3.eth.accounts.sign(hash, account.privateKey);

    console.log("---------------------------------");
    console.log("[Public key]: " + account.address);
    console.log("[Private key]: " + account.privateKey);
    console.log("---------------------------------");
    console.log("[Signed address]: " + addr);
    console.log("[Hashed text]: " + hash);
    console.log("[Signature]: " + encrypted.signature);
    console.log("---------------------------------");
    console.log("Please send [Signature] and [Public key] to investor.")
    process.exit(0);
})