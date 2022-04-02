pragma solidity >= 0.8.0;

contract SophisticatedInvestorCertificateAuthorityRegistry {
    
    mapping(bytes32 => bool) publicKeys;

    address ASIC;

    constructor() {
        ASIC = msg.sender;
    }

    function addPK(bytes32 pk)
        public 
        {
            require(msg.sender == ASIC);
            publicKeys[pk] = true;
        }
    
    function removePK(bytes32 pk)
        public
        {
            require(msg.sender == ASIC);
            publicKeys[pk] = false;
        }

    function checkPK(bytes32 pk)
        public
        view
        returns (bool flag) {
            flag = publicKeys[pk];
        }
}