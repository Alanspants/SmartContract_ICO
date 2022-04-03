var SICAR = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry')

var publicKey
var signed

generator = async (investorAddr) => {
  const account = await web3.eth.accounts.create()
  var hash = await web3.utils.soliditySha3(investorAddr);
  const encrypted = await web3.eth.accounts.sign(hash, account.privateKey);
  publicKey = await account.address;
  signed = await encrypted.signature;
}

contract('SIC sign check', (accounts) => {

  beforeEach(async () => {
    instance = await SICAR.new();
  });

  // it('ecrecover result matches address', async function() {
  //   const sign = '0xe69338edbeaf7ec2900582f4a69cfb4b33104e941799dcd959c6ef77f99c4f6f75e0dce78b59eb8f66c60dcaa7cb5c917dfe2888e0fc50ce112f5acf2f92fe191c'
  //   const recover = await instance.recoverSigner.call(sign, { from: accounts[0] });
  //   console.log("public key: " + recover);
  // })

  it('Sign check success', async () => {
    await generator(accounts[0]);
    const recover = await instance.recoverSigner.call(signed, { from: accounts[0] });
    assert.equal(recover, publicKey);
  })

  it('Sign check failed', async () => {
    await generator(accounts[1]);
    const recover = await instance.recoverSigner.call(signed, { from: accounts[0] });
    assert.notEqual(recover, publicKey);
  })

  it('Public Key exist check', async() => {
    await generator(accounts[2]);
    await instance.addPK(publicKey);
    const flag = await instance.checkPK.call(publicKey);
    assert.equal(flag, true);
  })

  it('Public Key non-exist check', async() => {
    await generator(accounts[3]);
    const flag = await instance.checkPK.call(publicKey);
    assert.equal(flag, false);
  })
})

