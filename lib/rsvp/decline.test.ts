import test from 'node:test';
import assert from 'node:assert/strict';
import { declineChoices, declineGuestIds } from './decline';
import type { Guest } from './types';
const guest = (
  id: string,
  plus: boolean,
  name: string | null = null,
): Guest => ({
  id,
  isUnnamedPlusOne: plus,
  firstName: name,
  lastName: name ? 'Jones' : null,
  preferredName: null,
  events: [],
});
test('primary includes their unnamed or named plus-one without another checkbox', () => {
  for (const name of [null, 'Sam']) {
    const guests = [
      guest('primary', false, 'Kelly'),
      guest('plus', true, name),
    ];
    assert.deepEqual(
      declineChoices(guests).map((g) => g.id),
      ['primary'],
    );
    assert.deepEqual(declineGuestIds(guests, ['primary']), ['primary', 'plus']);
    assert.deepEqual(declineGuestIds(guests, []), []);
    assert.deepEqual(declineGuestIds(guests, ['primary', 'plus']), [
      'primary',
      'plus',
    ]);
  }
});
test('ordinary named partners stay independent; larger households do not guess plus-one ownership', () => {
  const named = [guest('one', false, 'John'), guest('two', false, 'Sarah')];
  assert.deepEqual(declineGuestIds(named, ['one']), ['one']);
  const household = [...named, guest('plus', true)];
  assert.deepEqual(declineGuestIds(household, ['one']), ['one']);
  assert.deepEqual(declineGuestIds(household, ['one', 'two']), [
    'one',
    'two',
    'plus',
  ]);
});
