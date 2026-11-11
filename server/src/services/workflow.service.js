/**
 * Server-side workflow definition.
 * Every status change must be listed here; anything else is rejected with 409.
 * The rows are also rendered by the frontend "How it works" page from the API
 * meta endpoint (documented in 05_AI_Integration / 02_System_Architecture).
 */
const TRANSITIONS = [
  {
    from: 'Submitted',
    to: 'Under Review',
    roles: ['CMO_ADMIN'],
    label: 'CMO takes up the grievance for review',
  },
  {
    from: 'Reopened',
    to: 'Under Review',
    roles: ['CMO_ADMIN'],
    label: 'CMO re-reviews a reopened grievance',
  },
  {
    from: 'In Progress',
    to: 'Resolved',
    roles: ['CMO_ADMIN'],
    label: 'CMO resolves after reviewing the action-taken report',
  },
  {
    from: 'In Progress',
    to: 'In Progress',
    roles: ['DEPT_OFFICER'],
    label: 'Officer records that investigation has started',
  },
  {
    from: 'Resolved',
    to: 'Reopened',
    roles: ['CITIZEN'],
    label: 'Citizen reopens a resolved grievance',
  },
];

/**
 * Assignment is a distinct action that moves the grievance to In Progress.
 * It is only allowed after the CMO has reviewed the grievance.
 */
const ASSIGNABLE_STATUSES = ['Under Review', 'Reopened'];

function findTransition(from, to) {
  return TRANSITIONS.find((t) => t.from === from && t.to === to) || null;
}

function canTransition(from, to, role) {
  const transition = findTransition(from, to);
  return Boolean(transition && transition.roles.includes(role));
}

module.exports = { TRANSITIONS, ASSIGNABLE_STATUSES, findTransition, canTransition };
