import { describe, it, expect, vi } from 'vitest';
import { install_invite_panel } from '../../src/ui/invite_panel.js';
import { flush } from '../helpers/link_pair.js';

function element(props = {}) {
  return Object.assign(new EventTarget(), { hidden: false, textContent: '', value: '', dataset: {}, ...props });
}

function setup({ share } = {}) {
  const parts = {
    '[data-invite-link]': element({ select: vi.fn() }),
    '[data-invite-copy]': element(),
    '[data-invite-share]': element()
  };
  const panel = element({ hidden: true, querySelector: selector => parts[selector] });
  const root = element();
  let show_invite;
  const game = { on_invite: listener => { show_invite = listener; } };
  const clipboard = { writeText: vi.fn(async () => {}) };
  install_invite_panel(root, panel, game, { clipboard, share, on_resize: () => {} });
  return {
    panel,
    root,
    clipboard,
    link: parts['[data-invite-link]'],
    copy: parts['[data-invite-copy]'],
    share_button: parts['[data-invite-share]'],
    show_invite: url => show_invite(url)
  };
}

const URL = 'https://fc.test/?join=K7QX2M';

describe('install_invite_panel', () => {
  it('shows the invitation link while the lobby has one', () => {
    const { panel, root, link, show_invite } = setup();

    show_invite(URL);
    expect(panel.hidden).toBe(false);
    expect(link.value).toBe(URL);
    expect(root.dataset.invite).toBe('open');

    show_invite(null);
    expect(panel.hidden).toBe(true);
    expect(root.dataset.invite).toBe('');
  });

  // Starting friends play is a key press - often recent enough for the
  // browser to allow a copy without asking again.
  it('copies the link as soon as there is one, when the browser allows', async () => {
    const { clipboard, copy, show_invite } = setup();

    show_invite(URL);
    await flush();

    expect(clipboard.writeText).toHaveBeenCalledWith(URL);
    expect(copy.textContent).toBe('COPIED!');
  });

  it('copies the link again on COPY', async () => {
    const { clipboard, copy, show_invite } = setup();
    show_invite(URL);
    await flush();

    copy.dispatchEvent(new Event('click'));
    await flush();

    expect(clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  it('falls back to selecting the link when copying is refused', async () => {
    const { clipboard, copy, link, show_invite } = setup();
    clipboard.writeText.mockRejectedValue(new Error('not allowed'));

    show_invite(URL);
    await flush();
    copy.dispatchEvent(new Event('click'));
    await flush();

    expect(link.select).toHaveBeenCalled();
    expect(copy.textContent).toBe('COPY LINK');
  });

  it('offers SHARE only where the device can share', async () => {
    const without = setup();
    expect(without.share_button.hidden).toBe(true);

    const share = vi.fn(async () => {});
    const { share_button, show_invite } = setup({ share });
    expect(share_button.hidden).toBe(false);

    show_invite(URL);
    share_button.dispatchEvent(new Event('click'));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: URL }));
  });
});
