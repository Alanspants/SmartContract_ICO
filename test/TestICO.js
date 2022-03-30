const NeverPayToken = artifacts.require('ERC20NeverPayToken');
const NeverPayICO = artifacts.require('NeverPayICO');

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

// issueCheck
// acc: account
// refund: refund
// share: share get
issueCheck = async (acc, refund, share) => {

    var ETHBalanceBefore_wei, ETHBalanceAfter_wei, ETHBalanceBefore_eth, ETHBalanceAfter_eth, ETHDiff, NPTBalance;

    ETHBalanceBefore_wei = await web3.eth.getBalance(acc);
    ETHBalanceBefore_eth = await ICO.weiToETH(ETHBalanceBefore_wei);
    await ICO.issue({ from: acc });
    ETHBalanceAfter_wei = await web3.eth.getBalance(acc);
    ETHBalanceAfter_eth = await ICO.weiToETH(ETHBalanceAfter_wei);
    ETHDiff = ETHBalanceAfter_eth - ETHBalanceBefore_eth;
    assert.equal(ETHDiff, refund);
    
    // NPTBalance = await ICO.getNPTbalance.call(acc);
    NPTBalance = await NPT.balanceOf.call(acc);
    assert.equal(NPTBalance.words[0], share);
}

contract("ICO test", async accounts => {

    var encoded;

    beforeEach(async () => {
        // NPT = await NeverPayToken.new(10000, "NeverPay Tokens", 0, "NPT", { from: accounts[0] });
        ICO = await NeverPayICO.new(accounts[0], { from: accounts[0] });
        NPTaddr = await ICO.token.call();
        NPT = await NeverPayToken.at(NPTaddr);
    });

    it("Initial Setup Check", async () => {
        const beneficiary = await ICO.beneficiary.call();
        assert.equal(beneficiary, accounts[0], "account[0] is beneficiary of ICO");
    });

    it ("bid test", async() => {

        // bid success

        // bid success

        // bid withdraw

        // bid withdraw
    }) 

    it ("reveal test", async() => {

        // reveal success

        // reveal failed
        // mismatch nonce

        // reveal failed
        // not enought ETH paid
    })



    it("issue test", async() => {
        // Account[1]
        // share: 2000
        // price: 2
        // nonce: "acc1"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "2", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc1, { from: accounts[1] });

        // Account[2]
        // share: 1000
        // price: 5
        // nonce: "acc2"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", "5", web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc2, { from: accounts[2] });

        // Account[3]
        // share: 3000
        // price: 7
        // nonce: "acc3"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["3000", "7", web3.utils.fromAscii("acc3")]);
        const bidAcc3 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc3, { from: accounts[3] });

        // Account[4]
        // share: 2000
        // price: 3
        // nonce: "acc4"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "3", web3.utils.fromAscii("acc4")]);
        const bidAcc4 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc4, { from: accounts[4] });

        // Account[5]
        // share: 1000
        // price: 9
        // nonce: "acc5"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", "9", web3.utils.fromAscii("acc5")]);
        const bidAcc5 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc5, { from: accounts[5] });

        // Account[6]
        // share: 2000
        // price: 5
        // nonce: "acc6"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "5", web3.utils.fromAscii("acc6")]);
        const bidAcc6 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc6, { from: accounts[6] });

        // Account[7]
        // share: 2000
        // price: 1
        // nonce: "acc7"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "1", web3.utils.fromAscii("acc7")]);
        const bidAcc7 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc7, { from: accounts[7] });

        // Account[8]
        // share: 2000
        // price: 1
        // nonce: "acc8"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "1", web3.utils.fromAscii("acc8")]);
        const bidAcc8 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc8, { from: accounts[8] });

        // Account[9]
        // share: 500
        // price: 5
        // nonce: "acc9"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["500", "5", web3.utils.fromAscii("acc9")]);
        const bidAcc9 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc9, { from: accounts[9] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 25);

        // Partial success reveal (total share > 10000) => get partial refund in ICOEnd (2000 ETH)
        await ICO.reveal.sendTransaction(2000, 2, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("4000", "ether") });

        // Success reveal
        await ICO.reveal.sendTransaction(1000, 5, web3.utils.fromAscii("acc2"), { from: accounts[2], to: ICO.address, value: web3.utils.toWei("5000", "ether") });
        
        // Success reveal
        await ICO.reveal.sendTransaction(3000, 7, web3.utils.fromAscii("acc3"), { from: accounts[3], to: ICO.address, value: web3.utils.toWei("21000", "ether") });

        // Success reveal
        await ICO.reveal.sendTransaction(2000, 3, web3.utils.fromAscii("acc4"), { from: accounts[4], to: ICO.address, value: web3.utils.toWei("6000", "ether") });

        // Success reveal
        await ICO.reveal.sendTransaction(1000, 9, web3.utils.fromAscii("acc5"), { from: accounts[5], to: ICO.address, value: web3.utils.toWei("9000", "ether") });

        // Success reveal
        await ICO.reveal.sendTransaction(2000, 5, web3.utils.fromAscii("acc6"), { from: accounts[6], to: ICO.address, value: web3.utils.toWei("10000", "ether") });

        // Failed reveal (total share > 10000) => get refund in ICOEnd (2000 ETH)
        await ICO.reveal.sendTransaction(2000, 1, web3.utils.fromAscii("acc7"), { from: accounts[7], to: ICO.address, value: web3.utils.toWei("2000", "ether") });

        // Failed reveal (dismatched reveal) => get refund (1000 ETH)
        await ICO.reveal.sendTransaction(1000, 1, web3.utils.fromAscii("acc8"), { from: accounts[8], to: ICO.address, value: web3.utils.toWei("1000", "ether") });
        
        // Failed reveal (dismatched ETH paid) => get refund (2500 ETH)
        await ICO.reveal.sendTransaction(500, 5, web3.utils.fromAscii("acc9"), { from: accounts[9], to: ICO.address, value: web3.utils.toWei("500", "ether") });

        await advanceTime(86400 * 7);

        // account:     share:      price:      paid:       valid:      reason:             refund(ETH):
        // acc1         2000        2           4000        partial     share overflow      2000
        // acc2         1000        5           5000        yes
        // acc3         3000        7           21000       yes               
        // acc4         2000        3           6000        yes
        // acc5         1000        9           9000        yes
        // acc6         2000        5           10000       yes
        // acc7         2000        1           2000        no          share overflow      2000
        // acc8         2000        1           1000        no          share overflow      1000
        // acc9         500         5           500         no          wrong payment       500
        // sorted by price: acc5 > acc3 > acc2 > acc6 > acc9 > acc4 > acc1 > acc7 > acc8
        // available: acc5(1000) > acc3(3000) > acc2(1000) > acc6(2000) > acc4(2000) > acc1(1000)
        // successful bid:  acc5: 1000 * 9 = 9000
        //                  acc3: 3000 * 7 = 21000
        //                  acc2: 1000 * 5 = 5000
        //                  acc6: 2000 * 5 = 10000
        //                  acc4: 2000 * 3 = 6000
        //                  acc1: 1000 * 2 = 2000
        // Total ETH collected = 53000
        
        await issueCheck(accounts[5], 0, 1000);

        await issueCheck(accounts[3], 0, 3000);

        await issueCheck(accounts[2], 0, 1000);

        await issueCheck(accounts[6], 0, 2000);

        await issueCheck(accounts[4], 0, 2000);

        await issueCheck(accounts[1], 2000, 1000);

        await issueCheck(accounts[7], 2000, 0);

        await issueCheck(accounts[8], 1000, 0);

        await issueCheck(accounts[0], 53000, 0);

        // TODO:
        // 1. one account multiple bid
        // 2. unbider issue
        // 3. over-paid issue -> get refund

        await revertToSnapShot(snapshotID);
    })


});