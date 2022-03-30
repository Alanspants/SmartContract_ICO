const NeverPayToken = artifacts.require('ERC20NeverPayToken');

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

contract("NPT test", async accounts => {
    it("first account and totalSuplly has 10000 NPT", async () => {
        // Init with 10000 NPTs
        const NPT = await NeverPayToken.new(10000, "NeverPay Tokens", 0, "NPT");

        // Check accounts[0]'s balance = 10000
        const acc0Balance = await NPT.balanceOf.call(accounts[0]);
        assert.equal(acc0Balance, 10000);

        // Check total supply tokens is 10000
        const totalSupply = await NPT.totalSupply.call();
        assert.equal(totalSupply, 10000);
    })

    it("approved transaction", async () => {
        // Init with 10000 NPTs
        const NPT = await NeverPayToken.new(10000, "NeverPay Tokens", 0, "NPT");

        // Approved transfer (accounts[0] => transfer 500 => accounts[1])
        await NPT.approve(accounts[1], 500, { from: accounts[0] });
        const allowanceChecked = await NPT.allowance.call(accounts[0], accounts[1]);
        assert.equal(allowanceChecked, 500);

        // Make a transfer and check
        await NPT.transferFrom(accounts[0], accounts[1], 500, { from: accounts[1] });
        const acc0Balance = await NPT.balanceOf.call(accounts[0]);
        const acc1Balance = await NPT.balanceOf.call(accounts[1]);
        assert.equal(acc0Balance, 9500);
        assert.equal(acc1Balance, 500);
    })

    it("Unapproced transaction", async () => {
        // Init with 10000 NPTs
        const NPT = await NeverPayToken.new(10000, "NeverPay Tokens", 0, "NPT");
        await assertRevert(NPT.transferFrom.call(accounts[0], accounts[1], 500, { from: accounts[1] }));
    })
});