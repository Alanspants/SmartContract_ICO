var SICAR = artifacts.require('SophisticatedInvestorCertificateAuthorityRegistry')

contract('Example', (accounts) => {
  var address = accounts[0]

//   public: 0x277f4e39295322C2B9ED3c15622828dEC8Ee49c0
//   private: 0xe444da384fbacebe72c7f26293c204ab83a185f74dee1ea6fc24a3d3c61fdcef
//   {
//     message: '0xa51232b1d3fbaf461f8054317c30fa1f5f590fe13fb056ea0fa1dbd55b1c0283',
//     messageHash: '0xb7eccd6267c6bb436c84ee76b75ead643bb12fbad4ca2126a085500767f66c59',
//     v: '0x1c',
//     r: '0x10b60a003e58435b498b2c5187bb325b6e5c1d7456ccede4a360f46adc9ab7b4',
//     s: '0x5b6c7bdc2de30e2360ddca5fa85baae0cd55d13c7b9179552916bbaf8e8c4b5e',
//     signature: '0x10b60a003e58435b498b2c5187bb325b6e5c1d7456ccede4a360f46adc9ab7b45b6c7bdc2de30e2360ddca5fa85baae0cd55d13c7b9179552916bbaf8e8c4b5e1c'
//   }

    // 1. CA 调用script：sign和public
    // 2. contract调用recoverSigner(hashed(msg), sign) 给出public
    // 3. check 1和2给出的public address是否吻合

  it('ecrecover result matches address', async function() {
    instance = await SICAR.new();

    const msg = 'hello worlds';
    // const encoded = web3.eth.abi.encodeParameters(['bytes32'], [msg]);
    const msg_hash = web3.utils.soliditySha3(msg);

    const sign = '0x10b60a003e58435b498b2c5187bb325b6e5c1d7456ccede4a360f46adc9ab7b45b6c7bdc2de30e2360ddca5fa85baae0cd55d13c7b9179552916bbaf8e8c4b5e1c'

    const recover = await instance.recoverSigner.call(msg_hash, sign);
    console.log(recover)
  })
})