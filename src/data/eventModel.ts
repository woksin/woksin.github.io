// One real slice of the Varde event model (https://github.com/woksin/Varde): a parent defines a
// chore, a member completes it, and experience and reward are projected. Every name below is a
// type in the Varde source; `source` is the file it lives in. To show another slice, replace
// this file; the section renders whatever is here.

export type ModelKind = 'ui' | 'command' | 'event' | 'view';
export type ModelLane = 'ui' | 'middle' | 'chore' | 'member';

export type ModelCard = {
  id: string;
  kind: ModelKind;
  name: string;
  lane: ModelLane;
  /** Column on the board, left to right in time. */
  col: number;
  source: string;
  note: string;
};

export type ModelStep = { title: string; text: string; cards: string[] };

export const eventModel = {
  name: 'Varde · Chores',
  repo: 'https://github.com/woksin/Varde',
  sourceRoot: 'Source/Varde',
  columns: 7,
  lanes: [
    { id: 'ui', label: 'Screens' },
    { id: 'middle', label: 'Commands · Read models' },
    { id: 'chore', label: 'Chore stream' },
    { id: 'member', label: 'Member stream' },
  ] as { id: ModelLane; label: string }[],
  cards: [
    { id: 'define-ui', kind: 'ui', name: 'DefineChoreDialog', lane: 'ui', col: 0, source: 'Chores/Catalog/DefineChoreDialog.tsx', note: 'Where a parent writes the chore.' },
    { id: 'define', kind: 'command', name: 'Define', lane: 'middle', col: 0, source: 'Chores/Define/Define.cs', note: 'Parents and administrators only. A plikt cannot pay, a reward is capped at 500, and it must earn experience.' },
    { id: 'defined', kind: 'event', name: 'ChoreDefined', lane: 'chore', col: 0, source: 'Chores/Define/Define.cs', note: 'Title, kind, unlock level, reward, experience, schedule, who it is for, and whether it is shared work.' },
    { id: 'definition', kind: 'view', name: 'ChoreDefinition', lane: 'middle', col: 1, source: 'Chores/Catalog/Catalog.cs', note: 'Projected straight off ChoreDefined; later amendments set fields from ChoreAmended.' },
    { id: 'board', kind: 'view', name: 'BoardEntry', lane: 'middle', col: 2, source: 'Chores/Board/Board.cs', note: 'One card on a member’s board: what it pays, whether it is done, and how many levels until it unlocks.' },
    { id: 'board-ui', kind: 'ui', name: 'BoardPage', lane: 'ui', col: 2, source: 'Chores/Board/BoardPage.tsx', note: 'The kitchen-wall board a member taps.' },
    { id: 'complete', kind: 'command', name: 'Complete', lane: 'middle', col: 3, source: 'Chores/Complete/Complete.cs', note: 'Appends to the member’s stream. Refused if it is already done today, or if shared work was done by someone else.' },
    { id: 'completed', kind: 'event', name: 'ChoreCompleted', lane: 'member', col: 3, source: 'Chores/Complete/Complete.cs', note: 'Carries the experience and reward awarded and the level at completion, so repricing a chore later never rewrites what was earned.' },
    { id: 'standing', kind: 'view', name: 'MemberStanding', lane: 'middle', col: 4, source: 'Progression/Standing/Standing.cs', note: 'Adds ExperienceAwarded and RewardAwarded from every ChoreCompleted.' },
    { id: 'log', kind: 'view', name: 'MemberCompletionLog', lane: 'middle', col: 5, source: 'Progression/Standing/CompletionLog.cs', note: 'The history of what a member did. The board reads it too, which is how a card turns done.' },
    { id: 'ledger', kind: 'view', name: 'MemberLedger', lane: 'middle', col: 6, source: 'Rewards/Ledger/Ledger.cs', note: 'Composed at query time from the completion, claim and settlement logs. No balance is stored.' },
    { id: 'ledger-ui', kind: 'ui', name: 'LedgerSheet', lane: 'ui', col: 6, source: 'Rewards/Ledger/LedgerSheet.tsx', note: 'Shows a member every movement, newest first.' },
  ] as ModelCard[],
  edges: [
    ['define-ui', 'define'],
    ['define', 'defined'],
    ['defined', 'definition'],
    ['definition', 'board'],
    ['board', 'board-ui'],
    ['board-ui', 'complete'],
    ['complete', 'completed'],
    ['completed', 'standing'],
    ['completed', 'log'],
    ['log', 'ledger'],
    ['ledger', 'ledger-ui'],
  ] as [string, string][],
  steps: [
    { title: 'A parent defines a chore', text: 'The dialog sends Define. The command validates the rules of the house and appends ChoreDefined to a new chore stream.', cards: ['define-ui', 'define', 'defined'] },
    { title: 'It lands on a board', text: 'ChoreDefinition is projected from the event, and each member’s BoardEntry is built from it for BoardPage.', cards: ['defined', 'definition', 'board', 'board-ui'] },
    { title: 'A member completes it', text: 'Tapping the card sends Complete, which appends ChoreCompleted to the member’s own stream, with what it was worth at that moment.', cards: ['board-ui', 'complete', 'completed'] },
    { title: 'Experience and reward are projected', text: 'MemberStanding adds up experience and reward, MemberCompletionLog keeps the history, and MemberLedger folds both into what LedgerSheet shows.', cards: ['completed', 'standing', 'log', 'ledger', 'ledger-ui'] },
  ] as ModelStep[],
};
