import type { Runbook } from '../../app/types/types'

export const sampleRunbook: Runbook = {
  id: 'test-runbook-1',
  path: 'test/sample.runbook.yml',
  name: 'sample',
  description: 'Sample test runbook',
  steps: 3,
  lastModified: new Date('2024-01-01'),
  variables: {
    TEST_VAR: {
      name: 'TEST_VAR',
      type: 'string',
      required: true,
      defaultValue: 'default-value',
    },
    OPTIONAL_VAR: {
      name: 'OPTIONAL_VAR',
      type: 'string',
      required: false,
    },
  },
  labels: ['test', 'sample'],
}

export const runbookWithoutVariables: Runbook = {
  id: 'test-runbook-2',
  path: 'test/simple.runbook.yml',
  name: 'simple',
  description: 'Simple runbook without variables',
  steps: 1,
  lastModified: new Date('2024-01-02'),
  variables: {},
  labels: [],
}

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

export const invalidRunbookYaml = `
invalid: yaml: content
  - this: is
    - not: valid
`