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

    function recoverSigner(bytes32 message, bytes memory sig)
        public
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);

        bytes32 encoded_message = prefixed(message);

        return ecrecover(encoded_message, v, r, s);
    }

    /// builds a prefixed hash to mimic the behavior of eth_sign.
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}