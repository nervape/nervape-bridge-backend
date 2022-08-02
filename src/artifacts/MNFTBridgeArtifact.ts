export const MNFTBridgeABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes24",
          "name": "_issuerAndClassIdHash",
          "type": "bytes24"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "_nftAddress",
          "type": "address"
        }
      ],
      "name": "ClassContractRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes20",
          "name": "_issuerId",
          "type": "bytes20"
        },
        {
          "internalType": "uint32",
          "name": "_classId",
          "type": "uint32"
        }
      ],
      "name": "getRegisteredClassContract",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes20",
          "name": "_issuerId",
          "type": "bytes20"
        },
        {
          "internalType": "uint32",
          "name": "_classId",
          "type": "uint32"
        }
      ],
      "name": "hash",
      "outputs": [
        {
          "internalType": "bytes24",
          "name": "",
          "type": "bytes24"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes24",
          "name": "",
          "type": "bytes24"
        }
      ],
      "name": "issuerAndClassIdToNFTMapping",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes24",
          "name": "_issuerAndClassIdHash",
          "type": "bytes24"
        },
        {
          "internalType": "address",
          "name": "_nftAddress",
          "type": "address"
        }
      ],
      "name": "registerNFTClassContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]