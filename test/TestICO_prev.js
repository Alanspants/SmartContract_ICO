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


contract("ICO test", async accounts => {

    var encoded;

    beforeEach(async () => {
        // NPT = await NeverPayToken.new(10000, "NeverPay Tokens", 0, "NPT", { from: accounts[0] });
        ICO = await NeverPayICO.new(accounts[0], { from: accounts[0] });
    });

    it("Initial Setup Check", async () => {
        const beneficiary = await ICO.beneficiary.call();
        assert.equal(beneficiary, accounts[0], "account[0] is beneficiary of ICO");

        const totalICOETH = await ICO.totalICOETH.call();
        assert.equal(totalICOETH, 0, "total ETH colleted by ICO is 0");
    });


    it("Bid Check", async() => {
        // const snapshot = await takeSnapshot();
        // const snapshotID = await snapshot['result'];
        // await advanceTime(86400*18);
        
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "2", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc1, { from: accounts[1] });

        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["1000", "5", web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc2, { from: accounts[2] });

        // Account1 bid success check
        var bidsAcc1Check = await ICO.bids.call(accounts[1], bidAcc1);
        assert.equal(bidsAcc1Check, true);

        // Account2 bid success check
        var bidsAcc2Check = await ICO.bids.call(accounts[2], bidAcc2);
        assert.equal(bidsAcc2Check, true);

        // Check bids hashmap with wrong index
        const bidsFalseCheck = await ICO.bids.call(accounts[1], bidAcc2);
        assert.equal(bidsFalseCheck, false);

        // Account1 bid withdraw
        await ICO.cancelBid(bidAcc1, { from: accounts[1] });
        bidsAcc1Check = await ICO.bids.call(accounts[1], bidAcc1);
        assert.equal(bidsAcc1Check, false);

        // Account2 bid withdraw
        await ICO.cancelBid(bidAcc2, { from: accounts[2] });
        bidsAcc2Check = await ICO.bids.call(accounts[2], bidAcc1);
        assert.equal(bidsAcc2Check, false);

        // await revertToSnapShot(snapshotID);
    });

    it ("Reveal Check", async() => {
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
        // share: 500
        // price: 2
        // nonce: "acc3"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["500", "2", web3.utils.fromAscii("acc3")]);
        const bidAcc3 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc3, { from: accounts[3] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 28);

        // success reveal
        await ICO.reveal.sendTransaction(2000, 2, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("4000", "ether") });
        const resultArray_0 = await ICO.getValidBidInfo.call(0);
        assert(resultArray_0[1].words[0], "2000")
        assert(resultArray_0[2].words[0], "2")

        // failed reveal
        // mismatch nonce
        await ICO.reveal.sendTransaction(1000, 5, web3.utils.fromAscii("abcdefg"), { from: accounts[2], to: ICO.address, value: web3.utils.toWei("5000", "ether") });
        const refund_1 = await ICO.refunds.call(accounts[2]);
        assert(refund_1.words[0], "5000");

        // failed reveal
        // not enough ETH paid
        await ICO.reveal.sendTransaction(500, 2, web3.utils.fromAscii("acc3"), { from: accounts[3], to: ICO.address, value: web3.utils.toWei("200", "ether") });
        const refund_3 = await ICO.refunds.call(accounts[3]);
        assert(refund_3.words[0], "200");

        await revertToSnapShot(snapshotID);
    })

    
    it("validBids sorted test", async() => {
        // Account[1]
        // share: 3000
        // price: 2
        // nonce: "acc1"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["3000", "2", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc1, { from: accounts[1] });

        // Account[2]
        // share: 3000
        // price: 5
        // nonce: "acc2"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["3000", "5", web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc2, { from: accounts[2] });

        // Account[3]
        // share: 2000
        // price: 5
        // nonce: "acc3"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "5", web3.utils.fromAscii("acc3")]);
        const bidAcc3 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc3, { from: accounts[3] });

        // Account[4]
        // share: 2000
        // price: 5
        // nonce: "acc4"
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "5", web3.utils.fromAscii("acc4")]);
        const bidAcc4 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc4, { from: accounts[4] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 28);

        await ICO.reveal.sendTransaction(3000, 2, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("6000", "ether") });
        await ICO.reveal.sendTransaction(3000, 5, web3.utils.fromAscii("acc2"), { from: accounts[2], to: ICO.address, value: web3.utils.toWei("15000", "ether") });
        await ICO.reveal.sendTransaction(2000, 5, web3.utils.fromAscii("acc3"), { from: accounts[3], to: ICO.address, value: web3.utils.toWei("10000", "ether") });
        await ICO.reveal.sendTransaction(2000, 5, web3.utils.fromAscii("acc4"), { from: accounts[4], to: ICO.address, value: web3.utils.toWei("10000", "ether") });

        await advanceTime(86400 * 4);

        // const validBidsLen = await ICO.getValidBidsLen.call();
        // assert(validBidsLen, 3);
        await ICO.ICOEnd({ from: accounts[0] });
        // await ICO.quickSort(0, validBidsLen - 1);

        // await ICO.insertionSort();

        const resultArray_0 = await ICO.getValidBidInfo.call(0);
        assert.equal(resultArray_0[0], accounts[2]);
        assert.equal(resultArray_0[1].words[0], "3000");
        assert.equal(resultArray_0[2].words[0], "5");

        const resultArray_1 = await ICO.getValidBidInfo.call(1);
        assert.equal(resultArray_1[0], accounts[3]);
        assert.equal(resultArray_1[1].words[0], "2000");
        assert.equal(resultArray_1[2].words[0], "5");

        const resultArray_2 = await ICO.getValidBidInfo.call(2);
        assert.equal(resultArray_2[0], accounts[4]);
        assert.equal(resultArray_2[1].words[0], "2000");
        assert.equal(resultArray_2[2].words[0], "5");

        const resultArray_3 = await ICO.getValidBidInfo.call(3);
        assert.equal(resultArray_3[0], accounts[1]);
        assert.equal(resultArray_3[1].words[0], "3000");
        assert.equal(resultArray_3[2].words[0], "2");

        await revertToSnapShot(snapshotID);

    })

    it("validBids partial valid test", async() => {
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["12000", "2", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc1, { from: accounts[1] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 28);

        await ICO.reveal.sendTransaction(12000, 2, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("24000", "ether") });

        await advanceTime(86400 * 4);

        await ICO.ICOEnd({ from: accounts[0] });
        const resultArray_0 = await ICO.getValidBidInfo.call(0);
        assert.equal(resultArray_0[0], accounts[1]);
        assert.equal(resultArray_0[1].words[0], 12000);
        assert.equal(resultArray_0[2].words[0], 2);

        const shares = await ICO.shares.call(accounts[1]);
        assert.equal(shares.words[0], 10000);

        const refunds = await ICO.refunds.call(accounts[1]);
        assert(refunds.words[0], 4000);

        await revertToSnapShot(snapshotID);
    })

    
    it("validBids invalid overflow test", async() => {
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["10000", "6", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc1, { from: accounts[1] });

        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["500", "2", web3.utils.fromAscii("acc2")]);
        const bidAcc2 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc2, { from: accounts[2] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 28);

        await ICO.reveal.sendTransaction(10000, 6, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("60000", "ether") });
        await ICO.reveal.sendTransaction(500, 2, web3.utils.fromAscii("acc2"), { from: accounts[2], to: ICO.address, value: web3.utils.toWei("1000", "ether") });

        await advanceTime(86400 * 4);

        await ICO.ICOEnd({ from: accounts[0] });

        const resultArray_0 = await ICO.getValidBidInfo.call(0);
        assert.equal(resultArray_0[0], accounts[1]);
        assert.equal(resultArray_0[1].words[0], "10000");
        assert.equal(resultArray_0[2].words[0], "6");

        const resultArray_1 = await ICO.getValidBidInfo.call(1);
        assert.equal(resultArray_1[0], accounts[2]);
        assert.equal(resultArray_1[1].words[0], "500");
        assert.equal(resultArray_1[2].words[0], "2");

        // accounts[1] bid success
        const shares_0 = await ICO.shares.call(accounts[1]);
        assert.equal(shares_0, 10000);

        // accounts[2] bid failed and get full refund
        const refunds = await ICO.refunds.call(accounts[2]);
        assert.equal(refunds, 1000);

        await revertToSnapShot(snapshotID);
    })
    
    
    it("Whole process", async() => {

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

        await ICO.ICOEnd({ from: accounts[0] });

        
        // account:     share:      price:      paid:       valid:      refund(ETH):
        // acc1         2000        2           4000        partial     2000
        // acc2         1000        5           5000        yes
        // acc3         3000        7           21000       no
        // acc4         2000        3           6000        yes
        // acc5         1000        9           9000        yes
        // acc6         2000        5           10000       yes
        // acc7         2000        1           2000        no          2000
        // acc8         2000        1           1000        no          1000
        // acc9         500         5           500         no          500
        // sorted by price: acc5 > acc3 > acc2 > acc6 > acc9 > acc4 > acc1 > acc7 > acc8
        // available: acc5(1000) > acc3(3000) > acc2(1000) > acc6(2000) > acc4(2000) > acc1(1000)
        // successful bid:  acc5: 1000 * 9 = 9000
        //                  acc3: 3000 * 7 = 21000
        //                  acc2: 1000 * 5 = 5000
        //                  acc6: 2000 * 5 = 10000
        //                  acc4: 2000 * 3 = 6000
        //                  acc1: 1000 * 2 = 2000
        // Total ETH collected = 53000
        

        // Check sorted
        const resultArray_0 = await ICO.getValidBidInfo.call(0);
        assert.equal(resultArray_0[0], accounts[5]);
        assert.equal(resultArray_0[1].words[0], "1000");
        assert.equal(resultArray_0[2].words[0], "9");

        const resultArray_1 = await ICO.getValidBidInfo.call(1);
        assert.equal(resultArray_1[0], accounts[3]);
        assert.equal(resultArray_1[1].words[0], "3000");
        assert.equal(resultArray_1[2].words[0], "7");

        const resultArray_2 = await ICO.getValidBidInfo.call(2);
        assert.equal(resultArray_2[0], accounts[2]);
        assert.equal(resultArray_2[1].words[0], "1000");
        assert.equal(resultArray_2[2].words[0], "5");

        const resultArray_3 = await ICO.getValidBidInfo.call(3);
        assert.equal(resultArray_3[0], accounts[6]);
        assert.equal(resultArray_3[1].words[0], "2000");
        assert.equal(resultArray_3[2].words[0], "5");

        const resultArray_4 = await ICO.getValidBidInfo.call(4);
        assert.equal(resultArray_4[0], accounts[4]);
        assert.equal(resultArray_4[1].words[0], "2000");
        assert.equal(resultArray_4[2].words[0], "3");

        const resultArray_5 = await ICO.getValidBidInfo.call(5);
        assert.equal(resultArray_5[0], accounts[1]);
        assert.equal(resultArray_5[1].words[0], "2000");
        assert.equal(resultArray_5[2].words[0], "2");

        // Check successful bid
        const shares_5 = await ICO.shares.call(accounts[5]);
        assert.equal(shares_5, 1000);

        const shares_3 = await ICO.shares.call(accounts[3]);
        assert.equal(shares_3, 3000);
        
        const shares_2 = await ICO.shares.call(accounts[2]);
        assert.equal(shares_2, 1000);

        const shares_6 = await ICO.shares.call(accounts[6]);
        assert.equal(shares_6, 2000);

        const shares_4 = await ICO.shares.call(accounts[4]);
        assert.equal(shares_4, 2000);

        const shares_1 = await ICO.shares.call(accounts[1]);
        assert.equal(shares_1, 1000);

        // Check refund
        const refunds_1 = await ICO.refunds.call(accounts[1]);
        assert.equal(refunds_1, 2000);

        const refunds_7 = await ICO.refunds.call(accounts[7]);
        assert.equal(refunds_7, 2000);

        const refunds_8 = await ICO.refunds.call(accounts[8]);
        assert.equal(refunds_8, 1000);

        const refunds_9 = await ICO.refunds.call(accounts[9]);
        assert.equal(refunds_9, 500);

        // Check total ETH collecter
        const totalICOETH = await ICO.totalICOETH.call();
        assert.equal(totalICOETH.words[0], 53000);

        // Check investors
        const invest_5 = await ICO.investors.call(0);
        assert.equal(invest_5, accounts[5]);

        const invest_3 = await ICO.investors.call(1);
        assert.equal(invest_3, accounts[3]);

        const invest_2 = await ICO.investors.call(2);
        assert.equal(invest_2, accounts[2]);

        const invest_6 = await ICO.investors.call(3);
        assert.equal(invest_6, accounts[6]);

        const invest_4 = await ICO.investors.call(4);
        assert.equal(invest_4, accounts[4]);

        const invest_1 = await ICO.investors.call(5);
        assert.equal(invest_1, accounts[1]);

        // Check the ETH transfer is valid.
        const beneficiaryBalanceWei_before = await web3.eth.getBalance(accounts[0]);
        const beneficiaryBalanceETH_before = await ICO.weiToETH(beneficiaryBalanceWei_before);
        await ICO.beneficiaryGetPaid({ from: accounts[0] });
        const beneficiaryBalanceWei_after = await web3.eth.getBalance(accounts[0]);
        const beneficiaryBalanceETH_after = await ICO.weiToETH(beneficiaryBalanceWei_after);
        const beneficiaryGetFromICO = beneficiaryBalanceETH_after - beneficiaryBalanceETH_before;

        assert.equal(totalICOETH.words[0], beneficiaryGetFromICO);


        // Check acc5 token transfer (expected to get 1000 NPTs)
        await ICO.getShares({ from: accounts[5] });
        var acc5NPTBalance =  await ICO.getNPTbalance.call(accounts[5]);
        assert.equal(acc5NPTBalance.toNumber(), 1000);
        

        // const allowanceChecked = await NPTaddress.allowance.call(accounts[0], accounts[5]);
        // console.log(allowanceChecked);
        // assert.equal(allowanceChecked, 1000);
        // await ICO.getShares({ from: accounts[5] })
        // assert.equal(acc5NPTBalance.toNumber(), 1000);

        await revertToSnapShot(snapshotID);
    })
    


    /*
    it ("test", async() => {
        // const bidAcc1 = web3.utils.keccak256(2000, 2, "acc1");
        const encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "2", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        console.log(bidAcc1);

        const hashFromContract = await ICO.hashTest(2000, 2, web3.utils.fromAscii("acc1"));
        console.log(hashFromContract);
        // await ICO.reveal.sendTransaction(2000, 2, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("4000", "ether") });


    })
    */

    /*
    it ("testPaid", async() => {
        await ICO.paidTest.sendTransaction({ from: accounts[1], to: ICO.address, value: web3.utils.toWei("200", "ether") });
        ICOBalance = await web3.eth.getBalance(ICO.address);
        console.log(ICOBalance);
    })
    */

    /*
    it ("revealTempTest", async() => {
        encoded = web3.eth.abi.encodeParameters(['uint', 'uint', 'bytes32'], ["2000", "2", web3.utils.fromAscii("acc1")]);
        const bidAcc1 = web3.utils.soliditySha3(encoded);
        await ICO.bid(bidAcc1, { from: accounts[1] });

        const snapshot = await takeSnapshot();
        const snapshotID = await snapshot['result'];
        await advanceTime(86400 * 28);

        await ICO.reveal.sendTransaction(2000, 2, web3.utils.fromAscii("acc1"), { from: accounts[1], to: ICO.address, value: web3.utils.toWei("4000", "ether") });

        const resultArray_0 = await ICO.getValidBidInfo.call(0, { from: accounts[0] });
        const share_0 = resultArray_0[0];
        const price_0 = resultArray_0[1];
        console.log(share_0);
        console.log(price_0);

        await revertToSnapShot(snapshotID);
    })
    */


});