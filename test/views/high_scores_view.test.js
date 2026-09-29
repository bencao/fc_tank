import { describe, it, expect } from 'vitest';
import { stubKinetic } from '../helpers/kinetic_mock.js';

stubKinetic();
const { format_high_score_row } = await import('../../src/views/high_scores_view.js');

describe('format_high_score_row', () => {
  // The canvas font is monospaced, so padded columns line up.
  it('lays a run out in fixed columns', () => {
    expect(format_high_score_row({ rank: 1, name: 'ABC', score: 30000, stage: 7, difficulty: 'NIGHTMARE' }))
      .toBe(' 1ST  ABC       30000  ST 7  NIGHTMARE');
    expect(format_high_score_row({ rank: 10, name: 'ZED', score: 9999900, stage: 50, difficulty: 'EASY' }))
      .toBe('10TH  ZED     9999900  ST50  EASY');
  });

  // A friends play team takes the room a solo run leaves blank.
  it('lines a team up with the solo runs', () => {
    expect(format_high_score_row({ rank: 2, name: 'ABC&XYZ', score: 12300, stage: 4, difficulty: 'HARD' }))
      .toBe(' 2ND  ABC&XYZ   12300  ST 4  HARD');
  });

  it.each([[2, ' 2ND'], [3, ' 3RD'], [4, ' 4TH']])('says rank %i as %s', (rank, text) => {
    expect(format_high_score_row({ rank, name: 'A', score: 1, stage: 1, difficulty: 'EASY' }).startsWith(text)).toBe(true);
  });
});
