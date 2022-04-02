const NeverPayToken = artifacts.require('ERC20NeverPayToken');
const NeverPayFR = artifacts.require('NeverPayFundraising');

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

advanceTime = (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err) }
        return resolve(result)
      })
    })
}

takeSnapshot = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime()
      }, (err, snapshotId) => {
        if (err) { return reject(err) }
        return resolve(snapshotId)
      })
    })
}

revertToSnapShot = (id) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [id],
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err) }
        return resolve(result)
      })
    })
}

ETHtoBN = (price) => {
  // return web3.utils.toWei(web3.utils.toBN(price), 'ether');
  return web3.utils.toBN(web3.utils.toWei(price, 'ether'));
}

// issueCheck
// acc: account
// refund: refund
// share: share get
issueCheck = async (acc, refund, share) => {

    var ETHBalanceBefore_wei, ETHBalanceAfter_wei, ETHBalanceBefore_eth, ETHBalanceAfter_eth, ETHDiff, NPTBalance;
    // var ETHBalanceBefore, ETHBalanceBefore, ETHDiff, NPTBalance;

    ETHBalanceBefore_wei = await web3.eth.getBalance(acc);
    ETHBalanceBefore_eth = await NPFR.weiToETH(ETHBalanceBefore_wei);
    await NPFR.issue({ from: acc });
    ETHBalanceAfter_wei = await web3.eth.getBalance(acc);
    ETHBalanceAfter_eth = await NPFR.weiToETH(ETHBalanceAfter_wei);
    ETHDiff = ETHBalanceAfter_eth - ETHBalanceBefore_eth;
    // ETHDiff = ETHBalanceAfter - ETHBalanceBefore;
    assert.equal(ETHDiff, refund);
    
    NPTBalance = await NPT.balanceOf.call(acc);
    assert.equal(NPTBalance.words[0], share);
}

contract("Fundraising test", async accounts => {

    var encoded;

    beforeEach(async () => {
        NPFR = await NeverPayFR.new(accounts[0], { from: accounts[0] });
        NPTaddr = await NPFR.getTokenAddress.call();
        NPT = await NeverPayToken.at(NPTaddr);
    });

    it("Initial Setup Check", async () => {
        // Beneficiary address check
        const beneficiary = await NPFR.beneficiary.call();
        assert.equal(beneficiary, accounts[0], "account[0] is beneficiary of fundraising");

        // Total token supply check
        const totalToken = await NPT.totalSupply.call();
        assert.equal(totalToken, 10000);

        // Contract hold 10000 tokens
        const contractBalance = await NPT.balanceOf.call(NPFR.address);
        assert.equal(contractBalance, 10000);
    });

    it ("bid test", async() => {

        // Account1 bid successful
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "2000000000000000000", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc1, { from: accounts[1] });

        // Account2 bid successful
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", "5000000000000000000", web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc2, { from: accounts[2] });

        // Account1 bid check => success
        var bidsAcc1Check = await NPFR.getBidStatus.call(accounts[1], bidAcc1);
        assert.equal(bidsAcc1Check, true);

        // Account2 bid check => success
        var bidsAcc2Check = await NPFR.getBidStatus.call(accounts[2], bidAcc2);
        assert.equal(bidsAcc2Check, true);

        // Check bids hashmap with wrong index
        const bidsFalseCheck = await NPFR.getBidStatus.call(accounts[1], bidAcc2);
        assert.equal(bidsFalseCheck, false);

        // Account1 bid withdraw
        // Account1 bid check => failed
        await NPFR.withdrawBid(bidAcc1, { from: accounts[1] });
        bidsAcc1Check = await NPFR.getBidStatus.call(accounts[1], bidAcc1);
        assert.equal(bidsAcc1Check, false);

        // Account2 bid withdraw
        // Account2 bid check => failed
        await NPFR.withdrawBid(bidAcc2, { from: accounts[2] });
        bidsAcc2Check = await NPFR.getBidStatus.call(accounts[2], bidAcc2);
        assert.equal(bidsAcc2Check, false);

    }) 

    it ("reveal test", async() => {

        // Account[1]
        // share: 2000
        // price: 2
        // nonce: "acc1"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", ETHtoBN('2'), web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc1, { from: accounts[1] });

        // Account[2]
        // share: 1000
        // price: 5
        // nonce: "acc2"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", ETHtoBN('5'), web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc2, { from: accounts[2] });

        // Account[3]
        // share: 500
        // price: 2
        // nonce: "acc3"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["500", ETHtoBN('2'), web3.utils.fromAscii("acc3")]);
        const bidAcc3 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc3, { from: accounts[3] });

        // Account[4]
        // share: 500
        // price: 0.5
        // nonce: "acc4"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["500", ETHtoBN('0.5'), web3.utils.fromAscii("acc4")]);
        const bidAcc4 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc4, { from: accounts[4] });

        // Account[5]
        // share: 4000
        // price: 2
        // nonce: "acc5"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["4000", ETHtoBN('2'), web3.utils.fromAscii("acc5")]);
        const bidAcc5 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc5, { from: accounts[5] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 24);

        // success reveal
        // await NPFR.reveal.sendTransaction(2000, web3.utils.toBN(web3.utils.toWei("2", 'ether')), web3.utils.fromAscii("acc1"), { from: accounts[1], to: NPFR.address, value: web3.utils.toWei("4000", "ether") });
        await NPFR.reveal.sendTransaction(2000, ETHtoBN('2'), web3.utils.fromAscii("acc1"), { from: accounts[1], to: NPFR.address, value: web3.utils.toWei("4000", "ether") });
        const resultArray_0 = await NPFR.getValidBidInfo.call(0);
        const share_0 = await resultArray_0[1].toNumber();
        const price_0 = await BigInt(resultArray_0[2]);
        assert.equal(share_0, 2000)
        assert.equal(price_0, ETHtoBN('2'));
        // assert.equal(resultArray_0[2].words[0], web3.utils.toWei((web3.utils.toBN("2000")), 'ether'));

        // failed reveal
        // mismatch nonce
        await NPFR.reveal.sendTransaction(1000, ETHtoBN('5'), web3.utils.fromAscii("abcdefg"), { from: accounts[2], to: NPFR.address, value: web3.utils.toWei("5000", "ether") });
        await assertRevert(NPFR.getValidBidInfo.call(1));
        const refundAcc2 = await NPFR.getRefunds.call({ from: accounts[2] });
        assert.equal(refundAcc2, web3.utils.toWei("5000", "ether"));

        // failed reveal
        // not enough ETH paid
        await NPFR.reveal.sendTransaction(500, ETHtoBN('2'), web3.utils.fromAscii("acc3"), { from: accounts[3], to: NPFR.address, value: web3.utils.toWei("200", "ether") });
        await assertRevert(NPFR.getValidBidInfo.call(1));
        const refundAcc3 = await NPFR.getRefunds.call({ from: accounts[3] });
        assert.equal(refundAcc3, web3.utils.toWei("200", "ether"));

        // failed reveal
        // price < 1 Ether
        await NPFR.reveal.sendTransaction(500, ETHtoBN('0.5'), web3.utils.fromAscii("acc4"), { from: accounts[4], to: NPFR.address, value: web3.utils.toWei("250", "ether") });
        await assertRevert(NPFR.getValidBidInfo.call(1));
        const refundAcc4 = await NPFR.getRefunds.call({ from: accounts[4] });
        assert.equal(refundAcc4, web3.utils.toWei("250", "ether"));

        // failed reveal
        // mismatch price
        await NPFR.reveal.sendTransaction(4000, ETHtoBN('4'), web3.utils.fromAscii("acc5"), { from: accounts[5], to: NPFR.address, value: web3.utils.toWei("16000", "ether") });
        await assertRevert(NPFR.getValidBidInfo.call(1));
        const refundAcc5 = await NPFR.getRefunds.call({ from: accounts[5] });
        assert.equal(refundAcc5, web3.utils.toWei("16000", "ether"));

        await revertToSnapShot(snapshotID);
    })



    it("issue test", async() => {
        // Account[1]
        // share: 2000
        // price: 2
        // nonce: "acc1"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", ETHtoBN("2"), web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc1, { from: accounts[1] });

        // Account[2]
        // share: 1000
        // price: 5
        // nonce: "acc2"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", ETHtoBN("5"), web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc2, { from: accounts[2] });

        // Account[3]
        // share: 3000
        // price: 7
        // nonce: "acc3"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["3000", ETHtoBN("7"), web3.utils.fromAscii("acc3")]);
        const bidAcc3 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc3, { from: accounts[3] });

        // Account[4]
        // share: 2000
        // price: 3
        // nonce: "acc4"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", ETHtoBN("3"), web3.utils.fromAscii("acc4")]);
        const bidAcc4 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc4, { from: accounts[4] });

        // Account[5]
        // share: 1000
        // price: 9
        // nonce: "acc5"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", ETHtoBN("9"), web3.utils.fromAscii("acc5")]);
        const bidAcc5 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc5, { from: accounts[5] });

        // Account[1]
        // share: 2000
        // price: 5
        // nonce: "acc1"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", ETHtoBN("5"), web3.utils.fromAscii("acc1")]);
        const bidAcc1_again = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc1_again, { from: accounts[1] });

        // Account[6]
        // share: 2000
        // price: 1
        // nonce: "acc6"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", ETHtoBN("1"), web3.utils.fromAscii("acc6")]);
        const bidAcc6 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc6, { from: accounts[6] });

        // Account[7]
        // share: 2000
        // price: 1
        // nonce: "acc7"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", ETHtoBN("1"), web3.utils.fromAscii("acc7")]);
        const bidAcc7 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc7, { from: accounts[7] });

        // Account[8]
        // share: 500
        // price: 5
        // nonce: "acc8"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["500", ETHtoBN("5"), web3.utils.fromAscii("acc8")]);
        const bidAcc8 = web3.utils.soliditySha3(encoded);
        await NPFR.bid(bidAcc8, { from: accounts[8] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 25);

        // Partial success reveal (total share > 10000) => get partial refund in ICOEnd (2000 ETH)
        await NPFR.reveal.sendTransaction(2000, ETHtoBN('2'), web3.utils.fromAscii("acc1"), { from: accounts[1], to: NPFR.address, value: web3.utils.toWei("4000", "ether") });

        // Success reveal
        await NPFR.reveal.sendTransaction(1000, ETHtoBN('5'), web3.utils.fromAscii("acc2"), { from: accounts[2], to: NPFR.address, value: web3.utils.toWei("5000", "ether") });
        
        // Success reveal
        await NPFR.reveal.sendTransaction(3000, ETHtoBN('7'), web3.utils.fromAscii("acc3"), { from: accounts[3], to: NPFR.address, value: web3.utils.toWei("21000", "ether") });

        // Success reveal
        await NPFR.reveal.sendTransaction(2000, ETHtoBN('3'), web3.utils.fromAscii("acc4"), { from: accounts[4], to: NPFR.address, value: web3.utils.toWei("7000", "ether") });

        // Success reveal
        await NPFR.reveal.sendTransaction(1000, ETHtoBN('9'), web3.utils.fromAscii("acc5"), { from: accounts[5], to: NPFR.address, value: web3.utils.toWei("9000", "ether") });

        // Success reveal
        await NPFR.reveal.sendTransaction(2000, ETHtoBN('5'), web3.utils.fromAscii("acc1"), { from: accounts[1], to: NPFR.address, value: web3.utils.toWei("10000", "ether") });

        // Failed reveal (total share > 10000) => get refund in ICOEnd (2000 ETH)
        await NPFR.reveal.sendTransaction(2000, ETHtoBN('1'), web3.utils.fromAscii("acc6"), { from: accounts[6], to: NPFR.address, value: web3.utils.toWei("2000", "ether") });

        // Failed reveal (dismatched reveal) => get refund (1000 ETH)
        await NPFR.reveal.sendTransaction(1000, ETHtoBN('1'), web3.utils.fromAscii("acc7"), { from: accounts[7], to: NPFR.address, value: web3.utils.toWei("1000", "ether") });
        
        // Failed reveal (dismatched ETH paid) => get refund (2500 ETH)
        await NPFR.reveal.sendTransaction(500, ETHtoBN('5'), web3.utils.fromAscii("acc8"), { from: accounts[8], to: NPFR.address, value: web3.utils.toWei("500", "ether") });

        await advanceTime(86400 * 5);

        // account:     share:      price:      paid:       valid:      reason:             refund(ETH):
        // acc1         2000        2           4000        partial     share overflow      2000
        // acc2         1000        5           5000        yes
        // acc3         3000        7           21000       yes               
        // acc4         2000        3           7000        yes                             1000 (overpaid)
        // acc5         1000        9           9000        yes
        // acc1         2000        5           10000       yes
        // acc7         2000        1           2000        no          share overflow      2000
        // acc8         2000        1           1000        no          share overflow      1000
        // acc9         500         5           500         no          wrong payment       500
        // sorted by price: acc5 > acc3 > acc2 > acc1 > acc9 > acc4 > acc1 > acc7 > acc8
        // available: acc5(1000) > acc3(3000) > acc2(1000) > acc1(2000) > acc4(2000) > acc1(1000)
        // successful bid:  acc5: 1000 * 9 = 9000
        //                  acc3: 3000 * 7 = 21000
        //                  acc2: 1000 * 5 = 5000
        //                  acc4: 2000 * 3 = 6000
        //                  acc1: 1000 * 2 + 2000 * 5= 12000
        // Total ETH collected = 53000
        
        // acc5
        // share: 1000
        // refund: 0
        await issueCheck(accounts[5], "0", 1000);

        // acc3
        // share: 3000
        // refund: 0
        await issueCheck(accounts[3], "0", 3000);

        // acc2
        // share: 1000
        // refund: 0
        await issueCheck(accounts[2], "0", 1000);

        // acc4
        // share: 2000
        // refund: 1000 (over paid)
        await issueCheck(accounts[4], "1000", 2000);

        // acc1
        // share: 2000 + 1000
        // refund: 2000 (partial paid successful, share overflow)
        await issueCheck(accounts[1], "2000", 3000);

        // acc6
        // share: 0
        // refund: 2000 (share overflow)
        await issueCheck(accounts[6], "2000", 0);

        // acc7
        // share: 0
        // refund: 1000 (share overflow)
        await issueCheck(accounts[7], "1000", 0);

        // acc8
        // share: 0
        // refund 500 (wrong payment, expected 2500 ETH payment)
        await issueCheck(accounts[8], "500", 0);

        // acc9
        // issue failed (never bid before)
        await assertRevert(issueCheck(accounts[9], 0, 0));

        // acc5
        // issue failed (already issue before)
        await assertRevert(issueCheck(accounts[5], 0, 1000));

        // acc0 (beneficiary)
        // Get 53000 ETH collected from NPFR
        await issueCheck(accounts[0], 53000, 0);

        await revertToSnapShot(snapshotID);
    })


});