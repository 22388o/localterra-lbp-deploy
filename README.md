# LocalTerra Protocol Integration Tests

Integration tests that calls Contracts using LCD.

# Instructions
Run `yarn install` and then `node index.js`.

# ENV Variables
**NETWORK**: (bombay) - default: localterra.

**DEPLOY**: name of contract (name of the wasm file without the extension) or `all` to upload all the contracts.

**CONTRACTS**: the folder with the optmized wasm files.

Example:

`DEPLOY=factory NETWORK=bombay CONTRACTS=../contracts node index.js`

