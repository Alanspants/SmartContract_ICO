pragma solidity >= 0.8.0;
import "./ERC20NeverPayToken.sol";

contract NeverPayICO {

    // Token => 10000 shares
    ERC20NeverPayToken public token;

    // address of NeverPay (beneficiary of ICO).
    address payable public beneficiary;

    // DDL of round 1.
    uint public bidEnd;

    // DDL of round 2.
    uint public revealEnd;

    // The hash value of blind bid in first round => H(shares, price, nonce).
    bytes32 bindedBid;

    // Hashset to record the first round bids => (addr, blindedBid[]).
    mapping(address => mapping(bytes32 => bool)) public bids;

    // Hashset to record the refund to be paid => (addr, ETH).
    mapping(address => uint) public refunds;

    // Struct type to store every valid bid in round 2.
    struct validBid {
        address addr;
        uint shares;
        uint price;
        uint bid_order;
    }
    
    // Array to store all valid bids.
    validBid[] public validBids;

    // Flag to check whether the whole ICO part is end and bidder can start to withdraw the money
    // if their potentially successful bid is failed.
    bool ICOEndFlag;

    // Hashset to record the bid order;
    mapping(bytes32 => uint) bidOrder;

    // bid order coundter;
    uint32 order;

    // record whether bider has beed issued before
    mapping(address => bool) issued;

    modifier onlyBefore(uint _time) { require(block.timestamp < _time); _; }
    modifier onlyAfter(uint _time) { require(block.timestamp > _time); _; }
    modifier onlyBeforeICOEnd() {require(!ICOEndFlag); _; }
    modifier onlyAfterICOEnd() {require(ICOEndFlag); _; }
    modifier onlyBeneficiary() {require(msg.sender == beneficiary); _;}

    // Initial DDL of round1 and round2,
    // initial addr of beneficiary.
    constructor(address payable _beneficiary) {
        bidEnd = 1650412800;
        revealEnd = 1651017600;
        beneficiary = _beneficiary;
        ICOEndFlag = false;
        token = new ERC20NeverPayToken(10000, "NeverPay Tokens", 0, "NPT");
        // token = _token;
        order = 0;
        issued[_beneficiary] = true;
    }

    /*
    [Round1] Make a bid
    _bindedBid: hash value of bid message send by bidder => H(shares, price, nonce)   
    */
    function bid(bytes32 _bindedBid)
        public 
        onlyBefore(bidEnd)
    {
        bids[msg.sender][_bindedBid] = true;
        bidOrder[_bindedBid] = order;
        order += 1;
        issued[msg.sender] = true;
    }

    /*
    [Round1] Withdraw a bid
    _bindedBid: hash value of bid message send by bidder => H(shares, price, nonce) 
    */
    function cancelBid(bytes32 _bindedBid)
        public
        onlyBefore(bidEnd)
    {
        // Make the corresponding bid unavailable to reveal.
        bids[msg.sender][_bindedBid] = false;
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
        if (bids[msg.sender][hashedReveal] != true) {
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

    function issue()
        public
        onlyAfter(revealEnd)
    {   
        require(issued[msg.sender]);
        issued[msg.sender] = false;

        insertionSort();

        uint totalShare = 0;
        uint overflowShare = 0;
        uint refund = 0;
        uint share = 0;

        if (msg.sender == beneficiary) {
            uint totalETH = 0;
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
            beneficiary.transfer(ETHtoWei(totalETH));
        } else {
            for(uint i = 0; i < validBids.length; i++) {
                if (validBids[i].addr == msg.sender) {
                    if (totalShare >= 10000) {
                        refund += validBids[i].shares * validBids[i].price;
                    } else {
                        totalShare += validBids[i].shares;
                        if (totalShare > 10000) {
                            overflowShare = totalShare - 10000;
                            share += validBids[i].shares - overflowShare;
                            refund += overflowShare * validBids[i].price;
                            totalShare = 10000;
                        } else {
                            share += validBids[i].shares;
                        }
                    }
                } else {
                    totalShare += validBids[i].shares;
                    if (totalShare >= 10000) totalShare = 10000;
                }
            }

            if (share > 0) token.transfer(msg.sender, share);

            uint refundAmount = refund + refunds[msg.sender];
            if (refundAmount > 0) payable(msg.sender).transfer(ETHtoWei(refundAmount));
        } 
    }

    function quickSort(int left, int right)
        public
    {
        int i = left;
        int j = right;
        if (i == j) return;
        uint pivot = validBids[uint(left + (right - left) / 2)].price;
        while (i <= j) {
            while (validBids[uint(i)].price > pivot) i++;
            while (pivot < validBids[uint(j)].price) j--;
            if (i <= j) {
                validBid memory temp = validBids[uint(i)];
                validBids[uint(i)] = validBids[uint(j)];
                validBids[uint(j)] = temp;
                // (validBids[uint(i)], validBids[uint(j)]) = (validBids[uint(j)], validBids[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j) quickSort(left, j); 
        if (i < right) quickSort(i, right);
    }


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

    // 3,5,2,1,6,5

    // preIndex    current     validBids
    // 0           1=>5        3,5,2,1,6,5
    //                         3,3,2,1,6,5
    //                         5,3,2,1,6,5
    // 1           2=>2        5,3,2,1,6,5
    // 2           3=>1        5,3,2,1,6,5
    // 3           4=>6        5,3,2,1,6,5 => 5,3,2,1,1,5 => 5,3,2,2,1,5 => 5,3,3,2,1,5 => 5,5,3,2,1,5 => 6,5,3,2,1,5
    // 4           5=>5        6,5,3,2,1,5 => 6,5,3,2,1,1 => 6,5,3,2,2,1 => 6,5,3,3,2,1 => 

    function weiToETH(uint w)
        pure
        public
        returns (uint e) {
            e = w / 1000000000000000000;
        }
    
    function ETHtoWei(uint e)
        pure
        public
        returns (uint w) {
            w = e * 1000000000000000000;
        }

    function getValidBidInfo(uint index)
        view
        public
        returns (address a, uint s, uint p, uint o) {
            a = validBids[index].addr;
            s = validBids[index].shares;
            p = validBids[index].price;
            o = validBids[index].bid_order;
        }

    function getNPTbalance(address a)
        view
        public
        returns (uint balance) {
            balance = token.balanceOf(a);
        }

}
