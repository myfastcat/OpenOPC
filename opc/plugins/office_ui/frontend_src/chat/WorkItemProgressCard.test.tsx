import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { WorkItemProgressCard } from './WorkItemProgressCard'
import type { RoleWorkItemSummary } from '../types/kanban'

const currentOwnerRoleWorkItems: Record<string, RoleWorkItemSummary> = {
  cto: {
    roleKey: 'cto',
    roleId: 'cto',
    roleName: 'CTO',
    runtimeStatus: 'idle',
    aggregatedStatus: 'waiting',
    workItems: [
      {
        workItemId: 'wi-review',
        phase: 'awaiting_manager_review',
        kanbanColumn: 'in-review',
        title: 'Implement summary',
        kind: 'execute',
        isReviewTarget: true,
        executorRoleId: 'engineer',
        reviewerRoleId: 'cto',
        createdAt: 10,
        updatedAt: 20,
        executionTurnId: 'runtime-task-1',
        progressLog: [],
      },
    ],
  },
}

const executorRoleWorkItems: Record<string, RoleWorkItemSummary> = {
  engineer: {
    roleKey: 'engineer',
    roleId: 'engineer',
    roleName: 'Engineer',
    runtimeStatus: 'idle',
    aggregatedStatus: 'waiting',
    workItems: [
      {
        workItemId: 'wi-review',
        phase: 'awaiting_manager_review',
        kanbanColumn: 'in-review',
        title: 'Implement summary',
        kind: 'execute',
        isReviewTarget: true,
        executorRoleId: 'engineer',
        reviewerRoleId: 'cto',
        createdAt: 10,
        updatedAt: 20,
        executionTurnId: 'runtime-task-1',
        progressLog: [],
      },
    ],
  },
}

const executorMarkup = renderToStaticMarkup(
  React.createElement(WorkItemProgressCard, {
    workItemLog: [],
    roleWorkItems: currentOwnerRoleWorkItems,
    executorRoleWorkItems,
    isCompanyRuntime: true,
  }),
)

assert.match(executorMarkup, /Execution Progress/)
assert.match(executorMarkup, /Engineer/)
assert.doesNotMatch(executorMarkup, /CTO/)

const fallbackMarkup = renderToStaticMarkup(
  React.createElement(WorkItemProgressCard, {
    workItemLog: [],
    roleWorkItems: currentOwnerRoleWorkItems,
    isCompanyRuntime: true,
  }),
)

assert.match(fallbackMarkup, /CTO/)
assert.doesNotMatch(fallbackMarkup, /Engineer/)

const preparingMarkup = renderToStaticMarkup(
  React.createElement(WorkItemProgressCard, {
    workItemLog: [],
    isCompanyRuntime: true,
  }),
)

assert.match(preparingMarkup, /Execution Progress/)
assert.match(preparingMarkup, /Preparing company roles/)
assert.match(preparingMarkup, /role="status"/)

console.log('WorkItemProgressCard.test.tsx: OK (executor rollup preferred with current-owner fallback)')

// ── Topological order: fan-out from intake, fan-in to delivery ─────────────
// intake (no deps) → { execA, execB } (both depend on intake) → delivery
// (depends on execA + execB). Each work item is its own chip in a single
// row; locks intake-first / delivery-last and stable left-to-right order.
const dagRoleWorkItems: Record<string, RoleWorkItemSummary> = {
  manager: {
    roleKey: 'manager', roleId: 'manager', roleName: 'Engineering Manager',
    runtimeStatus: 'idle', aggregatedStatus: 'active',
    workItems: [
      {
        workItemId: 'intake', phase: 'approved', kanbanColumn: 'done',
        title: 'Manager Intake', kind: 'intake', createdAt: 1, updatedAt: 2,
        dependencies: [], progressLog: [],
      },
      {
        workItemId: 'delivery', phase: 'running', kanbanColumn: 'in-progress',
        title: 'Deliver final result', kind: 'delivery', createdAt: 5, updatedAt: 6,
        dependencies: ['execA', 'execB'], progressLog: [],
      },
    ],
  },
  backend: {
    roleKey: 'backend', roleId: 'backend', roleName: 'Backend Engineer',
    runtimeStatus: 'idle', aggregatedStatus: 'done',
    workItems: [
      {
        workItemId: 'execA', phase: 'approved', kanbanColumn: 'done',
        title: 'Build API', kind: 'execute', createdAt: 3, updatedAt: 4,
        dependencies: ['intake'], progressLog: [],
      },
    ],
  },
  frontend: {
    roleKey: 'frontend', roleId: 'frontend', roleName: 'Frontend Engineer',
    runtimeStatus: 'idle', aggregatedStatus: 'done',
    workItems: [
      {
        workItemId: 'execB', phase: 'approved', kanbanColumn: 'done',
        title: 'Build UI', kind: 'execute', createdAt: 3, updatedAt: 4,
        dependencies: ['intake'], progressLog: [],
      },
    ],
  },
}

const dagMarkup = renderToStaticMarkup(
  React.createElement(WorkItemProgressCard, {
    workItemLog: [],
    executorRoleWorkItems: dagRoleWorkItems,
    isCompanyRuntime: true,
  }),
)

// One chip per work item (4 chips) → 3 connectors, no stacked stages.
assert.equal((dagMarkup.match(/wi-projection-stage/g) || []).length, 0)
assert.equal((dagMarkup.match(/wi-projection-connector/g) || []).length, 3)

// All four work items render by their task name.
for (const label of ['Manager Intake', 'Build API', 'Build UI', 'Deliver final result']) {
  assert.match(dagMarkup, new RegExp(label))
}

// Intake first, delivery last, executors in between.
const iIntake = dagMarkup.indexOf('Manager Intake')
const iApi = dagMarkup.indexOf('Build API')
const iUi = dagMarkup.indexOf('Build UI')
const iDelivery = dagMarkup.indexOf('Deliver final result')
assert.ok(iIntake < iApi && iIntake < iUi, 'intake must precede executors')
assert.ok(iApi < iDelivery && iUi < iDelivery, 'delivery must follow executors')

console.log('WorkItemProgressCard.test.tsx: OK (flat topological chips: intake → execs → delivery)')
