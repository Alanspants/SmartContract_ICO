// Node.js program to demonstrate the
// crypto.privateEncrypt() method

// Including crypto and fs module
const crypto = require('crypto');
const fs = require("fs");

// Using a function generateKeyFiles
function generateKeyFiles() {

	const keyPair = crypto.generateKeyPairSync('rsa', {
		modulusLength: 520,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
		type: 'pkcs8',
		format: 'pem',
		cipher: 'aes-256-cbc',
		passphrase: '',
		}
	});
	
	// Creating private key file
	fs.writeFileSync("private.pem", keyPair.privateKey);
    fs.writeFileSync("public.pem", keyPair.publicKey);

    console.log(keyPair.publicKey);
    console.log(keyPair.privateKey);
}

// Generate keys
// generateKeyFiles();

// Creating a function to encrypt string
function encryptString (plaintext, privateKeyFile) {
	const privateKey = fs.readFileSync(privateKeyFile, "utf8");

	// privateEncrypt() method with its parameters
	// const encrypted = crypto.privateEncrypt( {
    //     key: privateKey.toString(),
    //     passphrase: "",
    // }, Buffer.from(plaintext));
	// privateEncrypt() method with its parameters
	const encrypted = crypto.privateEncrypt( {
		key: privateKey.toString(),
		passphrase: "",
		padding: crypto.constants.RSA_NO_PADDING,
	}, Buffer.from(plaintext));

	return encrypted.toString("base64");
}

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// // Defining a text to be encrypted
// const plainText = "GfG";

// // Defining encrypted text
// const encrypted = encryptString(plainText, "./private.pem");

// // Prints plain text
// console.log("Plaintext:", plainText);

// // Prints encrypted text
// console.log("Encrypted: ", encrypted);

console.log("----------- Sophisticated Investor Encrytor -----------")
rl.question("Investor's Ethereum address: ", function(addr) {
	rl.question("Certificate valid year: ", function(year) {
		generateKeyFiles()
		const plainText = "   Address: " + addr +  " year: " + year;
		const encrypted = encryptString(plainText, "./private.pem");
		console.log("Plaintext:", plainText);
		console.log("Encrypted: ", encrypted);
		process.exit(0);
	})
})

