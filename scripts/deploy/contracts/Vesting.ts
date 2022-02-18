import { ethers } from "ethers";
import { deployContract } from "../utils";

export const contractNames = () => ["vesting"];

export const constructorArguments = () => [
  process.env.CONSTRUCTOR_BENEFICIARIES.split(","),
  process.env.CONSTRUCTOR_VESTING_AMOUNT.split(",").map((x) =>
    ethers.utils.parseEther(x)
  ),
  process.env.CONSTRUCTOR_VESTING_PERIOD.split(","),
  process.env.CONSTRUCTOR_START,
  process.env.CONSTRUCTOR_TOKEN,
  process.env.CONSTRUCTOR_CLAIM_INTERVAL
];

export const deploy = async (deployer, setAddresses) => {
  console.log("deploying Vesting");
  const vesting = await deployContract(
    "Vesting",
    constructorArguments(),
    deployer,
    1
  );
  console.log(`deployed Vesting ${vesting.address}`);
  setAddresses({ vesting: vesting.address });
  return vesting;
};
