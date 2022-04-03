pragma solidity >= 0.8.0;
import "./ERC20NeverPayToken.sol";
import "./SophisticatedInvestorCertificateAuthorityRegistry.sol";

contract NeverPayFundraising {

    // Token => 10000 shares
    ERC20NeverPayToken token;

    // Token => 10000 shares
    SophisticatedInvestorCertificateAuthorityRegistry CA;

    // address of NeverPay (beneficiary of fundrasing).
    address payable public beneficiary;

    // DDL of round 1.
    uint public bidEnd;

    // DDL of round 2.
    uint public revealEnd;

    // Hashset to record the first round bids => (addr, blindedBid[]).
    mapping(address => mapping(bytes32 => bool)) bids;

    // Hashset to record the refund to be paid => (addr, ETH).
    mapping(address => uint) refunds;

    // Struct type to store every valid bid in round 2.
    struct validBid {
        address addr;
        uint shares;
        uint price;
        uint bid_order;
    }
    
    // Array to store all valid bids.
    validBid[] validBids;

    // Hashset to record the bid order;
    mapping(bytes32 => uint) bidOrder;

    // bid order coundter;
    uint32 order;

    // record whether bider has beed issued before
    mapping(address => bool) issued;

    modifier onlyBefore(uint _time) { require(block.timestamp < _time); _; }
    modifier onlyAfter(uint _time) { require(block.timestamp > _time); _; }
    modifier onlyBeneficiary() {require(msg.sender == beneficiary); _;}

    // Initial DDL of round1 and round2,
    // initial addr of beneficiary.
    constructor(address payable _beneficiary, SophisticatedInvestorCertificateAuthorityRegistry _ca) {
        bidEnd = 1650412800;
        revealEnd = 1651017600;
        beneficiary = _beneficiary;
        token = new ERC20NeverPayToken(10000, "NeverPay Tokens", 0, "NPT");
        CA = _ca;
        order = 0;
        issued[_beneficiary] = true;
    }

    /*
    [Round1] Make a bid
    _bindedBid: hash value of bid message send by bidder => H(shares, price, nonce)  
    sign: Signature 
    */
    function bid(bytes32 _bindedBid, bytes memory sign)
        public 
        onlyBefore(bidEnd)
    {   
        // signature verification
        address publicKey = CA.recoverSigner(sign, msg.sender);
        require(CA.checkPK(publicKey));
        
        bids[msg.sender][_bindedBid] = true;
        bidOrder[_bindedBid] = order;
        order += 1;
        issued[msg.sender] = true;
    }

    /*
    [Round1] Withdraw a bid
    _bindedBid: hash value of bid message send by bidder => H(shares, price, nonce) 
    */
    function withdrawBid(bytes32 _blindedBid)
        public
        onlyBefore(bidEnd)
    {
        // Make the corresponding bid unavailable to reveal.
        bids[msg.sender][_blindedBid] = false;
    }
    
    /*
    [Round2] Reveal bid
    _shares: shares contain in bid in round1
    _price: price contain in bid in round1
    _nonce: nonce used to calculate hash with price and shares of bid in round1
    */
    function reveal(uint _shares, uint _price, bytes32 _nonce)
        payable
        public
        onlyAfter(bidEnd)
        onlyBefore(revealEnd)
    {
        // Calculating the hash of shares, price and nonce in round2
        bytes32 hashedReveal = keccak256(abi.encodePacked(_shares, _price, _nonce));
        
        // Check whether these three parameters are matched with certain bid in round1
        // or price is smaller than 1 Ether.
        if (bids[msg.sender][hashedReveal] != true || _price < 1 || _price == 0) {
            // Bid not found || already been revealed
            // Refund the ETH
            refunds[msg.sender] += weiToETH(msg.value);
        } else {
            // calculate the full price of this bid.
            uint totalPrice = _shares * _price;
            // Check whether the payment is enough for this bid.
            if (msg.value >= ETHtoWei(totalPrice)) {
                // Enough
                // Mark this bid as valid
                validBids.push(validBid({
                    addr: msg.sender,
                    shares: _shares,
                    price: _price,
                    bid_order: bidOrder[hashedReveal]
                }));
                // Refund the extra ETH
                refunds[msg.sender] += (weiToETH(msg.value) - totalPrice);
                // Make this bid unabailable to reveal
                bids[msg.sender][hashedReveal] = false;
            } else {
                // Not enough
                // Refund all ETH
                refunds[msg.sender] += weiToETH(msg.value);
            }
        }
    }

    /*
    [after Round2] Issue bid
    If investor has successful bid => get share
    If investor has failed bid => get refund
    Beneficiary => get ETH paid
    */
    function issue()
        public
        onlyAfter(revealEnd)
    {   
        // Only account which has bid before can call issue
        require(issued[msg.sender]);
        // Mark this account has already issued, in case of double calling
        issued[msg.sender] = false;

        // Sort every valid bid
        insertionSort();

        uint totalShare = 0;
        uint overflowShare = 0;
        uint refund = 0;
        uint share = 0;

        // If called by beneficiary
        if (msg.sender == beneficiary) {
            uint totalETH = 0;
            // Get all ETH collected in Fundraising (Only successful bid)
            for (uint i = 0; i < validBids.length; i++){
                if (validBids[i].shares + totalShare > 10000) {
                    overflowShare = validBids[i].shares + totalShare - 10000;
                    totalETH += (validBids[i].shares - overflowShare) * validBids[i].price;
                    break;
                } else {
                    totalShare += validBids[i].shares;
                    totalETH += validBids[i].shares * validBids[i].price;
                }
            }
            // Get paid
            beneficiary.transfer(ETHtoWei(totalETH));
        } else {
            // If called by investor
            for(uint i = 0; i < validBids.length; i++) {
                if (validBids[i].addr == msg.sender) {
                // Find his/her bid, calculate the share and refund
                    if (totalShare >= 10000) {
                        // share overflow, get full refund
                        refund += validBids[i].shares * validBids[i].price;
                    } else {
                        totalShare += validBids[i].shares;
                        if (totalShare > 10000) {
                            // share partial overflow, get partial refund
                            overflowShare = totalShare - 10000;
                            share += validBids[i].shares - overflowShare;
                            refund += overflowShare * validBids[i].price;
                            totalShare = 10000;
                        } else {
                            share += validBids[i].shares;
                        }
                    }
                } else {
                    // calculate the current share amount
                    totalShare += validBids[i].shares;
                    if (totalShare >= 10000) totalShare = 10000;
                }
            }

            // get token transfer
            if (share > 0) token.transfer(msg.sender, share);

            // get refund transfer
            uint refundAmount = refund + refunds[msg.sender];
            if (refundAmount > 0) payable(msg.sender).transfer(ETHtoWei(refundAmount));
        } 
    }

    // 3,5,2,1,6,5
    // preIndex    current     validBids
    // 0           1=>5        3,5,2,1,6,5 => 3,3,2,1,6,5 => 5,3,2,1,6,5
    // 1           2=>2        5,3,2,1,6,5
    // 2           3=>1        5,3,2,1,6,5
    // 3           4=>6        5,3,2,1,6,5 => 5,3,2,1,1,5 => 5,3,2,2,1,5 => 5,3,3,2,1,5 => 5,5,3,2,1,5 => 6,5,3,2,1,5
    // 4           5=>5        6,5,3,2,1,5 => 6,5,3,2,1,1 => 6,5,3,2,2,1 => 6,5,3,3,2,1 => 

    function insertionSort()
        public
    {
        int len = int(validBids.length);
        int preIndex;
        validBid memory current;
        for(int i = 1; i < len; i++) {
            preIndex = i - 1;
            current = validBids[uint(i)];
            while(preIndex >= 0 && validBids[uint(preIndex)].price < current.price) {
                validBid memory temp = validBids[uint(preIndex)];
                validBids[uint(preIndex + 1)] = temp;
                preIndex--;
            }
            while(preIndex >= 0 && validBids[uint(preIndex)].price == current.price && validBids[uint(preIndex)].bid_order > current.bid_order) {
                validBids[uint(preIndex + 1)] = validBids[uint(preIndex)];
                preIndex--;
            }
            validBids[uint(preIndex + 1)] = current;
        }
    }

    // Helper func: wei to ETH
    function weiToETH(uint w)
        pure
        public
        returns (uint e) {
            e = w / 1000000000000000000;
        }
    
    // Helper func: ETH to wei
    function ETHtoWei(uint e)
        pure
        public
        returns (uint w) {
            w = e * 1000000000000000000;
        }

    // Helper func: get Token's contract address
    function getTokenAddress()
        view
        public
        returns (ERC20NeverPayToken addr) {
            addr = token;
        }

    // Helper func: return valid bid's information
    function getValidBidInfo(uint index)
        view
        public
        returns (address a, uint s, uint p, uint o) {
            a = validBids[index].addr;
            s = validBids[index].shares;
            p = validBids[index].price;
            o = validBids[index].bid_order;
        }

    // Helper func: check bid status
    function getBidStatus(address addr, bytes32 h)
        view
        public
        returns (bool status) {
            status = bids[addr][h];
        }
    
    // Helper func: get current refund amount
    function getRefunds()
        view
        public
        returns (uint refunds_amount) {
            refunds_amount = refunds[msg.sender];
        }
}