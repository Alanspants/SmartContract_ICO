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

async function assertRevert (promise) {
  try {
    await promise;
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
    return;
  }
  assert.fail('Expected revert not received');
}

contract('SIC sign check', (accounts) => {

  beforeEach(async () => {
    instance = await SICAR.new();
  });

  it('Sign check success', async () => {
    await generator(accounts[0]);
    const recover = await instance.recoverSigner.call(signed, accounts[0]);
    assert.equal(recover, publicKey);
  })

  it('Sign check failed', async () => {
    await generator(accounts[1]);
    const recover = await instance.recoverSigner.call(signed, accounts[0]);
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

  it('Public Key removed check', async() => {
    await generator(accounts[4]);
    await instance.addPK(publicKey);
    await instance.removePK(publicKey);
    const flag = await instance.checkPK.call(publicKey);
    assert.equal(flag, false);
  })

  it ("Unauthorithed modification", async() => {
    await generator(accounts[5]);
    await assertRevert(instance.addPK(publicKey, { from: accounts[1] }));
    await assertRevert(instance.removePK(publicKey, { from: accounts[1] }));
  })

  it ("Whole process simulate", async() => {
    await generator(accounts[5]);
    await instance.addPK(publicKey);
    const recover = await instance.recoverSigner.call(signed, accounts[5]);
    const flag = await instance.checkPK.call(recover);
    assert.equal(flag, true);
  })
})

