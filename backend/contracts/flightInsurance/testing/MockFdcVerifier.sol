// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IWeb2Json } from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";

contract MockFdcVerifier {
    bool public shouldPass = true;

    function setShouldPass(bool value) external {
        shouldPass = value;
    }

    function verifyWeb2Json(IWeb2Json.Proof calldata) external view returns (bool) {
        return shouldPass;
    }
}
