export const sampleRunbookYaml = `
desc: Sample test runbook
vars:
  TEST_VAR: default-value
  OPTIONAL_VAR:
labels:
  - test
  - sample
steps:
  - desc: Step 1
    http:
      url: https://example.com
      method: GET
  - desc: Step 2
    exec:
      command: echo "Hello \${TEST_VAR}"
  - desc: Step 3
    test:
      - current.res.status == 200
`

export const simpleRunbookYaml = `
desc: Simple runbook without variables
steps:
  - desc: Simple step
    exec:
      command: echo "Hello World"
`
