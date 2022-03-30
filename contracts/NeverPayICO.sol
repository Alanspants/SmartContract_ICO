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
    bytes32 public blindedBid;

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
    validBid[] validBids;

    // Array to record the investor (has successful bid)
    address[] public investors;

    // Hashset to record the share belong to each investors => (investor_address, shares).
    mapping(address => uint) public shares; 

    // Total number of ETH collected during the ICO (belong to beneficial at last);
    uint public totalICOETH;

    // Flag to check whether the whole ICO part is end and bidder can start to withdraw the money
    // if their potentially successful bid is failed.
    bool ICOEndFlag;

    // Hashset to record the bid order;
    mapping(bytes32 => uint) bidOrder;

    // bid order coundter;
    uint32 order;

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
        totalICOETH = 0;
        token = new ERC20NeverPayToken(10000, "NeverPay Tokens", 0, "NPT");
        // token = _token;
        order = 0;
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

    function ICOEnd()
        public
        onlyAfter(revealEnd)
        onlyBeforeICOEnd()
        onlyBeneficiary()
    {
        ICOEndFlag = true;
        uint totalShare = 0;

        // Sort validBids by quick sort by decending order;
        // quickSort(0, int(validBids.length) - 1);
        insertionSort();

        // Loop through validBids
        for(uint i = 0; i < validBids.length; i++) {
            // If already over 10000 shares.
            // Refund full price of this bid.
            if (totalShare >= 10000) {
                refunds[validBids[i].addr] += validBids[i].price * validBids[i].shares;
                continue;
            }

            uint successfulShares = validBids[i].shares;
            uint refundPrice = 0;
            // If current bid make total share over 10000
            // Calculate partial share and partial refund amount.
            // Update refund list.
            totalShare += validBids[i].shares;
            if (totalShare >= 10000) {
                // Calculate the valid shares.
                successfulShares = validBids[i].shares - (totalShare - 10000);
                // Calculate the refund price caused by invslid shares (shares over 10000).
                refundPrice = (validBids[i].shares - successfulShares) * validBids[i].price;
                // Update the refunds records.
                refunds[validBids[i].addr] += refundPrice;
            }

            // Calculate current total amount of ETH from all shares
            totalICOETH += successfulShares * validBids[i].price;

            // Update shares array
            shares[validBids[i].addr] += successfulShares;

            // Mark the address as successful bid's owner
            // which is a investor
            investors.push(validBids[i].addr);
        } 
    }

    // Beneficiary use this function to approve the token transaction (beneficiary => investors)
    // Beneficiary use this function to get ETH withdraw collected during ICO
    function beneficiaryGetPaid()
        public
        onlyAfterICOEnd()
        onlyBeneficiary()
    {
        uint amount = totalICOETH;
        if (amount > 0) {
            totalICOETH = 0;
            // Transfer ETH to beneficiary.
            beneficiary.transfer(ETHtoWei(amount));
        }
    }

    // Investor use this function to get their shares.
    function getShares() 
        public
        onlyAfterICOEnd()
    {
        uint amount = shares[msg.sender];
        if (amount > 0) {
            shares[msg.sender] = 0;
            // Shares transfer.
            token.transfer(msg.sender, amount);
        }
    }

    // Failed investors (unsuccessful bid and invalid bid) use this function to 
    // withdraw their ETH.
    function withdraw()
        public
        onlyAfterICOEnd()
    {
        uint amount = refunds[msg.sender];
        if (amount > 0) {
            refunds[msg.sender] = 0;
            payable(msg.sender).transfer(ETHtoWei(amount));
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

    // function sort() 
    //     internal
    //     view
    //     returns (validBid[] memory sorted)
    // {
    //     sorted = new validBid[] (validBids.length);
    //     uint minimalPrice = validBids[0].price;

    // }

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
    
    function getTokenAllowance(address a1, address a2)
        view
        public
        returns (uint allowance) {
            allowance = token.allowance(a1, a2);
        }

    function getAddress()
        view
        public
        returns (address addr) {
            addr = address(this);
        }

    function hashTest(uint _shares, uint _price, bytes32 _nonce)
        pure
        public
        returns (bytes32 hashAns) {
            hashAns = keccak256(abi.encodePacked(_shares, _price, _nonce));
        }

    function paidTest()
        payable
        public {
            
        }

}
