// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    struct Beneficiary {
        uint256 lastClaimDate;
        uint256 vestingAmount;
        uint256 vestingPeriod;
    }

    // beneficiary of tokens after they are released
    mapping(address => Beneficiary) beneficiaries;

    uint256 public start;
    uint256 public duration;

    uint256 public claimInterval;

    ERC20 public token;

    constructor(
        address[] memory _beneficiaries,
        uint256[] memory _vestingAmount,
        uint256[] memory _vestingPeriod,
        uint256 _start,
        address _token,
        uint256 _claimInterval
    ) {
        require(
            _beneficiaries.length == _vestingAmount.length &&
                _beneficiaries.length == _vestingPeriod.length,
            "Check for same lengths"
        );

        require(
            _claimInterval > 0,
            "Claim interval should be greater than zero"
        );

        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            require(
                _vestingPeriod[i] % _claimInterval == 0,
                "Vesting period must be divisible by claim interval"
            );
            require(_vestingAmount[i] > 0, "Vesting amount is greater than 0");
            require(_vestingPeriod[i] > 0, "Vesting period is greater than 0");
            beneficiaries[_beneficiaries[i]] = Beneficiary({
                lastClaimDate: 0,
                vestingAmount: _vestingAmount[i],
                vestingPeriod: _vestingPeriod[i]
            });
        }

        start = _start;
        token = ERC20(_token);
        claimInterval = _claimInterval;
    }

    function claim() external {
        Beneficiary storage beneficiary = beneficiaries[msg.sender];
        require(beneficiary.vestingAmount > 0, "User is not a beneficiary");
        uint256 checkBalance = accruedBalanceOf(msg.sender);
        require(checkBalance > 0, "No balance accrued yet");
        uint256 beneficiaryAccrualEnd = start + beneficiary.vestingPeriod;
        uint256 passedClaimIntervals = block.timestamp >= beneficiaryAccrualEnd
            ? 52
            : (block.timestamp - start) / claimInterval;
        beneficiary.lastClaimDate =
            start +
            passedClaimIntervals *
            claimInterval;
        token.transfer(msg.sender, checkBalance);
    }

    function accruedBalanceOf(address beneficiaryAddress)
        public
        view
        returns (uint256)
    {
        Beneficiary storage beneficiary = beneficiaries[beneficiaryAddress];
        require(beneficiary.vestingAmount > 0, "User is not a beneficiary");
        uint256 lastClaimDate = beneficiary.lastClaimDate;
        if (lastClaimDate == 0) {
            lastClaimDate = start;
        }
        uint256 beneficiaryAccrualEnd = start + beneficiary.vestingPeriod;
        uint256 accrualEndCalculation = block.timestamp >= beneficiaryAccrualEnd
            ? beneficiaryAccrualEnd
            : block.timestamp;
        uint256 timeSinceLastClaim = accrualEndCalculation - lastClaimDate;
        uint256 claimIntervals = timeSinceLastClaim / claimInterval;
        return
            (claimIntervals * claimInterval * beneficiary.vestingAmount) /
            beneficiary.vestingPeriod;
    }
}
