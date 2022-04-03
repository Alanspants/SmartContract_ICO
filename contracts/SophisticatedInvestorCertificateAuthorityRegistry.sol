pragma solidity >= 0.8.0;

contract SophisticatedInvestorCertificateAuthorityRegistry {

    mapping(address => bool) publicKeys;

    address ASIC;

    constructor() {
        ASIC = msg.sender;
    }

    function addPK(address pk)
        public 
        {
            require(msg.sender == ASIC);
            publicKeys[pk] = true;
        }

    function removePK(address pk)
        public
        {
            require(msg.sender == ASIC);
            publicKeys[pk] = false;
        }

    function checkPK(address pk)
        public
        view
        returns (bool flag) {
            flag = publicKeys[pk];
        }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
            // second 32 bytes.
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function recoverSigner(bytes memory sig, address addr)
        public
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        bytes32 addr_hash = keccak256(abi.encodePacked(addr));

        bytes32 encoded_message = prefixed(addr_hash);

        return ecrecover(encoded_message, v, r, s);
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}