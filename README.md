- Install node packages by executing `yarn`.
- Rename `.env.example` to `.env` and update the env values
- execute `yarn gen queueId={queueId}` where `queueId` is the id of queue

Use case:

You can add your JSON input file `{queueId}_input.json` which contains these 3 parameters in `assets/inputs`:

- newRoot
- replacedNode
- replacedNodePathElements

After executing the `yarn gen queueId={queueId}` command, the script adds following parameter into the `{queueId}_input.json` file:

- root
- replacedNodeIndex
- newLeafsCommitment
- nNonZeroNewLeafs
- newLeafs
- extraInput

Example:

The `0_input.json` has been added as an example in `assets/inputs` folder. To test the script using this input file, add your Alchemy API key along with `0x526c6Ff3d7bDc991C40330197E13a2f942f2F7D2` as BussTree address and `80001` as chainId into `.env` file and execute `yarn gen queueId=0`.
