const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { config } = require("dotenv");
config({ path: path.resolve("./.env") });

const busTreeAddress = process.env.BUS_TREE_ADDRESS;
const alchemyKey = process.env.ALCHEMY_API_KEY;
const chainId = +process.env.CHAIN_ID;

const extraInput = "0x7BAe1c04e5Cef0E5d635ccC0D782A21aCB920BeB";
const zeroLeaf = "0x667764c376602b72ef22218e1673c2cc8546201f9a77807570b3e5de137680d";
const queueSize = 2 ** 6;

// getting QueueId from node arg
function getQueueId() {
  try {
    const id = process.argv[2].split("=")[1];
    return id;
  } catch (error) {
    throw new Error("please define the queueId arg, i.e. queueId=1");
  }
}

function getProvider() {
  return new ethers.AlchemyProvider(chainId, alchemyKey);
}

function getBusTreeContract() {
  const busTreeAbi = [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "utxo",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "queueId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      name: "UtxoBusQueued",
      type: "event",
    },

    {
      inputs: [],
      name: "busRoot",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },

    {
      inputs: [],
      name: "nLeafs",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint32",
          name: "",
          type: "uint32",
        },
      ],
      name: "busQueues",
      outputs: [
        {
          internalType: "bytes32",
          name: "commitment",
          type: "bytes32",
        },
        {
          internalType: "uint8",
          name: "nUtxos",
          type: "uint8",
        },
        {
          internalType: "uint96",
          name: "reward",
          type: "uint96",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];
  return new ethers.Contract(busTreeAddress, busTreeAbi, getProvider());
}

// Gets UTXOs by reading event based on queue id
async function getUtxos(queueId) {
  const bussTree = getBusTreeContract();

  const eventFilter = bussTree.filters.UtxoBusQueued(null, queueId);

  let result = await bussTree.queryFilter(eventFilter, 0, "latest");

  return result.map((el) => el.args[0]);
}

function getInputsPath(queueId) {
  return path.resolve("assets", "inputs", `${queueId}_input.json`);
}

function readInputs(queueId) {
  const inputPath = getInputsPath(queueId);
  return JSON.parse(fs.readFileSync(inputPath));
}

async function updateInputs(queueId, inputs) {
  const inputPath = getInputsPath(queueId);
  fs.writeFileSync(inputPath, JSON.stringify(inputs));
}

// Add zero leaves to UTXO[] to expand it to 64 elements
function expandLeaves(leaves) {
  const zeroLeavesLength = queueSize - leaves.length;
  if (zeroLeavesLength == 0) return;

  const expanded = [...leaves];

  console.log({ expanded: expanded.length });
  for (let index = 0; index < zeroLeavesLength; index++) {
    expanded[leaves.length + index] = zeroLeaf;
  }

  return expanded;
}

async function main() {
  const bussTree = getBusTreeContract();

  const queueId = getQueueId();

  const root = await bussTree.busRoot();
  const replacedNodeIndex = BigInt(await bussTree.nLeafs()) / BigInt(queueSize);
  const newLeafsCommitment = (await bussTree.busQueues(queueId)).commitment;
  const newLeafs = await getUtxos(queueId);
  const nNonZeroNewLeafs = newLeafs.length;

  const localInputs = readInputs(queueId);

  updateInputs(queueId, {
    ...localInputs, // newRoot, replacedNode, replacedNodePathElements
    root,
    replacedNodeIndex: replacedNodeIndex.toString(),
    newLeafsCommitment,
    nNonZeroNewLeafs,
    newLeafs: expandLeaves(newLeafs),
    extraInput,
  });
}

main().catch((e) => {
  console.log(e);
});
