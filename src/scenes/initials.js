// Three arcade-style initials, entered with a d-pad: up and down roll the
// selected letter through the alphabet, left and right pick a letter, fire
// locks one in and moves on.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const INITIALS_LENGTH = 3;

export class Initials {
  constructor() {
    this.letters = Array(INITIALS_LENGTH).fill(0);
    this.cursor = 0;
  }

  text() {
    return this.letters.map(letter => ALPHABET[letter]).join("");
  }

  up() {
    this.roll(1);
  }

  down() {
    this.roll(-1);
  }

  left() {
    this.cursor = Math.max(this.cursor - 1, 0);
  }

  right() {
    this.cursor = Math.min(this.cursor + 1, INITIALS_LENGTH - 1);
  }

  // True once the last letter is locked in.
  fire() {
    if (this.cursor === INITIALS_LENGTH - 1) {
      return true;
    }
    this.right();
    return false;
  }

  roll(step) {
    this.letters[this.cursor] = (this.letters[this.cursor] + step + ALPHABET.length) % ALPHABET.length;
  }
}
