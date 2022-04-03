var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider)

const account = web3.eth.accounts.create()


// var msg = 'hello worlds'
// var hash = web3.utils.sha3(msg);
// const encrypted = web3.eth.accounts.sign(hash, account.privateKey);
// console.log(encrypted);

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
console.log("----------- Sophisticated Investor Certificate Generator -----------")
rl.question("Investor's Address: ", function(addr) {
    rl.question("Effective Year: ", function(year) {
        const msg = "The owner of Ethereum address" + addr + " is a sophisticated investor for year " + year + ".";
        var hash = web3.utils.sha3(msg);
        const encrypted = web3.eth.accounts.sign(hash, account.privateKey);

        console.log("---------------------------------");
        console.log("[Public key]: " + account.address);
        console.log("[Private key]: " + account.privateKey);
        console.log("---------------------------------");
        console.log("[Plain text]: " + msg);
        console.log("[Hashed text]:  " + hash);
        console.log("[Signature]: " + encrypted.signature);
        console.log("---------------------------------");
        console.log("Please send [Signature] and [Public key] to investor.")
        process.exit(0);
    })
})